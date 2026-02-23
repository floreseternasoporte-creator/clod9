const { firebaseRequest } = require('./firebase-realtime-client');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

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
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };

    const { storyId, updates } = JSON.parse(event.body || '{}');
    if (!storyId || !updates) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'storyId and updates are required' }) };

    const path = `stories/${encodeURIComponent(storyId)}`;
    const current = await firebaseRequest(path);
    if (!current) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Story not found' }) };

    const allowed = ['title', 'category', 'rating', 'language', 'synopsis', 'views', 'likes', 'coverImage', 'isPrivate', 'timestamp'];
    const payload = { updatedAt: Date.now() };
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(updates, key)) payload[key] = updates[key];

    await firebaseRequest(path, { method: 'PATCH', body: payload });
    const updated = await firebaseRequest(path);

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, story: toClientStory(storyId, updated) }) };
  } catch (error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
