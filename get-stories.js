const { supabaseRequest } = require('./supabase-client');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

const toClientStory = (row) => ({
  id: row.story_id,
  title: row.title,
  category: row.category,
  rating: row.rating,
  language: row.language,
  synopsis: row.synopsis,
  userId: row.user_id,
  username: row.username,
  email: row.email,
  coverImage: row.cover_image,
  timestamp: row.timestamp,
  views: row.views,
  likes: row.likes,
  createdAt: row.created_at,
  lastUpdated: row.updated_at
});

exports.handler = async (event) => {
  try {
    const { userId, limit = 100 } = event.queryStringParameters || {};
    const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 200));
    const userFilter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : '';

    const rows = await supabaseRequest(
      `stories?select=*&order=timestamp.desc&limit=${safeLimit}${userFilter}`,
      {},
      { useServiceRole: true }
    );

    const stories = rows.map(toClientStory);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ stories, count: stories.length })
    };
  } catch (error) {
    console.error('Error getting stories:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message })
    };
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
