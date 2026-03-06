const { getCollection, listByTimestamp } = require('./firebase-realtime-client');

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  },
  body: JSON.stringify(body)
});

const extractHashtags = (text) => {
  const source = String(text || '').toLowerCase();
  return Array.from(new Set(source.match(/#[\p{L}0-9_]+/gu) || []));
};

const scoreItem = (item, userInterests, now) => {
  const likes = Number(item.likes || 0);
  const ageHours = Math.max(1, (now - Number(item.timestamp || now)) / 36e5);
  const freshScore = 1 / ageHours;
  const text = `${item.content || ''} ${(item.title || '')}`;
  const itemTags = extractHashtags(text);
  const interestMatch = itemTags.filter((tag) => userInterests.has(tag)).length;
  const engagement = Math.log10(likes + 1) * 2;

  return Number((engagement + freshScore * 8 + interestMatch * 4).toFixed(3));
};

const mapFeedItems = (map, type) =>
  Object.entries(map || {}).map(([id, value]) => ({
    id,
    type,
    userId: value?.userId || null,
    authorName: value?.authorName || value?.username || 'Usuario',
    content: value?.content || value?.description || '',
    title: value?.title || '',
    coverImage: value?.coverImage || value?.imageUrl || value?.imageData || null,
    likes: Number(value?.likes || 0),
    timestamp: Number(value?.timestamp || 0)
  }));

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });
    if (event.httpMethod !== 'GET') return response(405, { error: 'Method Not Allowed' });

    const { userId = '', interests = '', limit = 30 } = event.queryStringParameters || {};
    const size = Math.max(10, Math.min(Number(limit) || 30, 100));
    const userInterests = new Set(
      String(interests)
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    );

    const [notesMap, communityMap, followingMap] = await Promise.all([
      listByTimestamp('notes', 180),
      listByTimestamp('community', 180),
      userId ? getCollection(`following/${userId}`) : Promise.resolve({})
    ]);

    const following = new Set(Object.keys(followingMap || {}));
    const now = Date.now();

    const feed = [
      ...mapFeedItems(notesMap, 'note'),
      ...mapFeedItems(communityMap, 'community_note')
    ]
      .filter((item) => Boolean(item.timestamp))
      .map((item) => {
        const score = scoreItem(item, userInterests, now);
        const followingBoost = following.has(item.userId) ? 3 : 0;
        return {
          ...item,
          score: Number((score + followingBoost).toFixed(3)),
          isFromFollowing: following.has(item.userId)
        };
      })
      .sort((a, b) => b.score - a.score || b.timestamp - a.timestamp)
      .slice(0, size);

    return response(200, {
      ok: true,
      userId: userId || null,
      count: feed.length,
      feed
    });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
