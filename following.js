const { firebaseRequest } = require('./firebase-realtime-client');

const response = (statusCode, body) => ({ statusCode, headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method Not Allowed' });

  try {
    const { userId, targetUserId, action } = JSON.parse(event.body || '{}');
    if (!userId || !targetUserId || !action) return response(400, { error: 'Missing userId, targetUserId or action.' });

    const source = encodeURIComponent(userId);
    const target = encodeURIComponent(targetUserId);

    if (action === 'follow') {
      await firebaseRequest(`following/${source}/${target}`, { method: 'PUT', body: { createdAt: Date.now() } });
      await firebaseRequest(`followers/${target}/${source}`, { method: 'PUT', body: { createdAt: Date.now() } });
    } else if (action === 'unfollow') {
      await firebaseRequest(`following/${source}/${target}`, { method: 'DELETE' });
      await firebaseRequest(`followers/${target}/${source}`, { method: 'DELETE' });
    } else {
      return response(400, { error: 'Invalid action. Use follow or unfollow.' });
    }

    return response(200, { success: true });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
