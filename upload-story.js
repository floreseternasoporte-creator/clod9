const { firebaseRequest } = require('./firebase-realtime-client');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };

    const { title, category, rating, language, synopsis, userId, username, email, coverImageData } = JSON.parse(event.body || '{}');
    if (!userId || !coverImageData) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'userId and coverImageData are required' }) };
    }

    const storyId = `story_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const timestamp = Date.now();
    const story = {
      title: title || 'Story',
      category: category || 'story',
      rating: rating || 'all',
      language: language || 'es',
      synopsis: synopsis || '',
      userId,
      username: username || (email ? String(email).split('@')[0] : 'Usuario'),
      email: email || '',
      coverImage: String(coverImageData),
      timestamp,
      views: 0,
      likes: 0,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await firebaseRequest(`stories/${storyId}`, { method: 'PUT', body: story });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, story: { id: storyId, ...story }, storyId, coverImageUrl: story.coverImage })
    };
  } catch (error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
