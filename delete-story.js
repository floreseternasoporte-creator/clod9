const { firebaseRequest } = require('./firebase-realtime-client');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };

    const { storyId } = JSON.parse(event.body || '{}');
    if (!storyId) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'storyId is required' }) };

    const path = `stories/${encodeURIComponent(storyId)}`;
    const story = await firebaseRequest(path);
    if (!story) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Story not found' }) };

    await firebaseRequest(path, { method: 'DELETE' });
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, message: 'Story deleted successfully', storyId }) };
  } catch (error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
