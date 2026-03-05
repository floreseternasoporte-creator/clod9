const { firebaseRequest, getCollection } = require('./firebase-realtime-client');
const { runVercelHandler } = require('./vercel-adapter');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

const response = (statusCode, body) => ({ statusCode, headers: corsHeaders, body: JSON.stringify(body) });

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });

    if (event.httpMethod === 'GET') {
      const { userId } = event.queryStringParameters || {};
      if (!userId) return response(400, { error: 'userId is required' });

      const notifications = Object.values(await getCollection(`notifications/${encodeURIComponent(userId)}`))
        .filter(Boolean)
        .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));

      return response(200, { notifications });
    }

    if (event.httpMethod === 'POST') {
      const { userId, type, message, fromUserId } = JSON.parse(event.body || '{}');
      if (!userId || !type || !message) {
        return response(400, { error: 'userId, type and message are required' });
      }

      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const notification = { id: notifId, userId, type, message, fromUserId: fromUserId || null, timestamp: Date.now(), read: false };

      await firebaseRequest(`notifications/${encodeURIComponent(userId)}/${notifId}`, { method: 'PUT', body: notification });
      return response(200, { success: true, notification });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
