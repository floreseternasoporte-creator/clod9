const { listByTimestamp } = require('./firebase-realtime-client');

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  },
  body: JSON.stringify(body)
});

const extractHashtags = (text) => String(text || '').toLowerCase().match(/#[\p{L}0-9_]+/gu) || [];

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });
    if (event.httpMethod !== 'GET') return response(405, { error: 'Method Not Allowed' });

    const { limit = 20 } = event.queryStringParameters || {};
    const top = Math.max(5, Math.min(Number(limit) || 20, 50));
    const [notesMap, communityMap] = await Promise.all([
      listByTimestamp('notes', 300),
      listByTimestamp('community', 300)
    ]);

    const tagMap = new Map();

    [notesMap, communityMap].forEach((sourceMap) => {
      Object.values(sourceMap || {}).forEach((item) => {
        const text = `${item?.content || ''} ${item?.title || ''} ${item?.description || ''}`;
        const uniqueTags = new Set(extractHashtags(text));
        uniqueTags.forEach((tag) => {
          const data = tagMap.get(tag) || { tag, uses: 0, engagement: 0, lastTimestamp: 0 };
          data.uses += 1;
          data.engagement += Number(item?.likes || 0);
          data.lastTimestamp = Math.max(data.lastTimestamp, Number(item?.timestamp || 0));
          tagMap.set(tag, data);
        });
      });
    });

    const tags = Array.from(tagMap.values())
      .map((entry) => ({
        ...entry,
        trendScore: Number((entry.uses * 2 + Math.log10(entry.engagement + 1) * 4).toFixed(3))
      }))
      .sort((a, b) => b.trendScore - a.trendScore || b.lastTimestamp - a.lastTimestamp)
      .slice(0, top);

    return response(200, {
      ok: true,
      count: tags.length,
      tags
    });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
