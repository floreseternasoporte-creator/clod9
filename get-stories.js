const { listByTimestamp, asSortedArray } = require('./firebase-realtime-client');

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
    const { userId, limit = 100 } = event.queryStringParameters || {};
    const stories = asSortedArray(await listByTimestamp('stories', limit), toClientStory, userId);

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ stories, count: stories.length }) };
  } catch (error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
