const { listByTimestamp, asSortedArray, getCollection } = require('./firebase-realtime-client');

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
  timestamp: row.timestamp || row.createdAt || row.updatedAt || Date.now(),
  views: row.views,
  likes: row.likes,
  createdAt: row.createdAt || row.timestamp || Date.now(),
  lastUpdated: row.updatedAt || row.createdAt || row.timestamp || Date.now(),
  isPrivate: Boolean(row.isPrivate)
});

exports.handler = async (event) => {
  try {
    const { userId, limit = 100 } = event.queryStringParameters || {};
    const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 300));

    let storiesMap = {};
    try {
      storiesMap = await listByTimestamp('stories', safeLimit);
    } catch (queryError) {
      // Fallback cuando la consulta por índice/orderBy falla en RTDB
      storiesMap = await getCollection('stories');
    }

    const stories = asSortedArray(storiesMap || {}, toClientStory, userId)
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
      .slice(0, safeLimit);

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ stories, count: stories.length }) };
  } catch (error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
