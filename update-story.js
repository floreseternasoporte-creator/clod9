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
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const { storyId, updates } = JSON.parse(event.body || '{}');
    if (!storyId || !updates) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'storyId and updates are required' }) };
    }

    const allowed = ['title', 'category', 'rating', 'language', 'synopsis', 'views', 'likes'];
    const payload = { updated_at: Date.now() };

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        payload[key] = updates[key];
      }
    }

    const rows = await supabaseRequest(`stories?story_id=eq.${encodeURIComponent(storyId)}&select=*`, {}, { useServiceRole: true });
    if (!rows.length) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Story not found' }) };
    }

    await supabaseRequest(`stories?story_id=eq.${encodeURIComponent(storyId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(payload)
    }, { useServiceRole: true });

    const updatedRows = await supabaseRequest(`stories?story_id=eq.${encodeURIComponent(storyId)}&select=*`, {}, { useServiceRole: true });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, story: toClientStory(updatedRows[0]) })
    };
  } catch (error) {
    console.error('Error updating story:', error);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
