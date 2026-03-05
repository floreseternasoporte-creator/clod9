const { firebaseRequest, listByTimestamp, asSortedArray } = require('./firebase-realtime-client');

const response = (statusCode, body) => ({ statusCode, headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}, body: JSON.stringify(body) });

const extractHashtags = (text) => {
  const tags = String(text || '').toLowerCase().match(/#[\p{L}0-9_]+/gu) || [];
  return Array.from(new Set(tags));
};

const toClientNote = (id, note = {}) => ({
  id,
  content: note.content || '',
  userId: note.userId,
  authorName: note.authorName || 'Usuario',
  authorImage: note.authorImage || 'https://via.placeholder.com/40',
  imageUrl: note.imageUrl || null,
  imageData: note.imageData || null,
  timestamp: note.timestamp || 0,
  likes: Number(note.likes || 0),
  hashtags: Array.isArray(note.hashtags) ? note.hashtags : extractHashtags(note.content)
});

async function updateCommunityHashtagStats(userId, hashtags) {
  if (!userId || !hashtags.length) return;

  await Promise.all(hashtags.map(async (tag) => {
    const path = `community_hashtags/${encodeURIComponent(tag)}`;
    const current = (await firebaseRequest(path).catch(() => null)) || {};
    const users = { ...(current.users || {}) };
    const isNewUser = !users[userId];
    users[userId] = true;

    await firebaseRequest(path, {
      method: 'PUT',
      body: {
        tag,
        count: Number(current.count || 0) + 1,
        usersCount: Number(current.usersCount || 0) + (isNewUser ? 1 : 0),
        users,
        lastUsedAt: Date.now()
      }
    });
  }));
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });

    if (event.httpMethod === 'GET') {
      const { limit = 50, tags = '' } = event.queryStringParameters || {};
      const notes = asSortedArray(await listByTimestamp('community_notes', limit), toClientNote);

      const tagList = String(tags)
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

      if (tagList.length === 0) return response(200, { notes });

      const stats = {};
      await Promise.all(tagList.map(async (tag) => {
        const value = await firebaseRequest(`community_hashtags/${encodeURIComponent(tag)}`).catch(() => null);
        stats[tag] = {
          count: Number(value?.count || 0),
          usersCount: Number(value?.usersCount || 0),
          lastUsedAt: Number(value?.lastUsedAt || 0)
        };
      }));

      return response(200, { notes, hashtagStats: stats });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};

      if (body.action === 'like' && body.noteId) {
        const notePath = `community_notes/${encodeURIComponent(body.noteId)}`;
        const current = await firebaseRequest(notePath);
        if (!current) return response(404, { error: 'Note not found.' });
        const likes = Number(current.likes || 0) + 1;
        await firebaseRequest(notePath, { method: 'PATCH', body: { likes } });
        return response(200, { success: true, note: toClientNote(body.noteId, { ...current, likes }) });
      }

      const userId = body.userId ? String(body.userId) : '';
      if (!userId) return response(400, { error: 'Missing userId.' });

      const noteId = `note_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const hashtags = Array.isArray(body.hashtags) && body.hashtags.length
        ? Array.from(new Set(body.hashtags.map((tag) => String(tag).toLowerCase()))).slice(0, 12)
        : extractHashtags(body.content);

      const note = {
        content: body.content ? String(body.content) : '',
        userId,
        authorName: body.authorName ? String(body.authorName) : 'Usuario',
        authorImage: body.authorImage ? String(body.authorImage) : 'https://via.placeholder.com/40',
        imageUrl: body.imageUrl ? String(body.imageUrl) : null,
        imageData: body.imageData ? String(body.imageData) : null,
        timestamp: Date.now(),
        likes: 0,
        hashtags
      };

      await firebaseRequest(`community_notes/${noteId}`, { method: 'PUT', body: note });
      await updateCommunityHashtagStats(userId, hashtags);

      return response(200, { success: true, note: toClientNote(noteId, note) });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
