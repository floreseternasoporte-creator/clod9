const { firebaseRequest } = require('./firebase-realtime-client');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

const response = (statusCode, body) => ({ statusCode, headers: corsHeaders, body: JSON.stringify(body) });

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });
    if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });

    const { storyId, userId } = JSON.parse(event.body || '{}');
    if (!storyId || !userId) return response(400, { error: 'storyId and userId are required' });

    const path = `stories/${encodeURIComponent(storyId)}`;
    const story = await firebaseRequest(path);
    if (!story) return response(404, { error: 'Story not found' });
    if (String(story.userId || '') !== String(userId)) {
      return response(403, { error: 'Forbidden: only the owner can delete this story.' });
    }

    await firebaseRequest(path, { method: 'DELETE' });
    return response(200, { success: true, message: 'Story deleted successfully', storyId });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
