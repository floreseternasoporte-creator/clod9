const { firebaseRequest } = require('./firebase-realtime-client');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

const response = (statusCode, body) => ({ statusCode, headers: corsHeaders, body: JSON.stringify(body) });

const toClientStory = (id, row = {}) => ({
  id,
  title: row.title,
  category: row.category,
  rating: row.rating,
  language: row.language,
  synopsis: row.synopsis,
  userId: row.userId,
  username: row.username,
  email: row.email,
  coverImage: row.coverImage,
  timestamp: row.timestamp,
  views: row.views,
  likes: row.likes,
  createdAt: row.createdAt,
  lastUpdated: row.updatedAt
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });
    if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });

    const { storyId, userId, updates } = JSON.parse(event.body || '{}');
    if (!storyId || !updates || !userId) return response(400, { error: 'storyId, userId and updates are required' });

    const path = `stories/${encodeURIComponent(storyId)}`;
    const current = await firebaseRequest(path);
    if (!current) return response(404, { error: 'Story not found' });
    if (String(current.userId || '') !== String(userId)) {
      return response(403, { error: 'Forbidden: only the owner can update this story.' });
    }

    const allowed = ['title', 'category', 'rating', 'language', 'synopsis', 'views', 'likes', 'coverImage', 'isPrivate', 'timestamp'];
    const payload = { updatedAt: Date.now() };
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(updates, key)) payload[key] = updates[key];

    await firebaseRequest(path, { method: 'PATCH', body: payload });
    const updated = await firebaseRequest(path);

    return response(200, { success: true, story: toClientStory(storyId, updated) });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
