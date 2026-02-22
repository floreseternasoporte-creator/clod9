const { firebaseRequest, getCollection } = require('./firebase-realtime-client');
const { runVercelHandler } = require('./vercel-adapter');

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const { userId } = event.queryStringParameters || {};
      if (!userId) return { statusCode: 400, body: JSON.stringify({ error: 'userId is required' }) };

      const notifications = Object.values(await getCollection(`notifications/${encodeURIComponent(userId)}`))
        .filter(Boolean)
        .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));

      return { statusCode: 200, body: JSON.stringify({ notifications }) };
    }

    if (event.httpMethod === 'POST') {
      const { userId, type, message, fromUserId } = JSON.parse(event.body || '{}');
      if (!userId || !type || !message) {
        return { statusCode: 400, body: JSON.stringify({ error: 'userId, type and message are required' }) };
      }

      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const notification = { id: notifId, userId, type, message, fromUserId: fromUserId || null, timestamp: Date.now(), read: false };

      await firebaseRequest(`notifications/${encodeURIComponent(userId)}/${notifId}`, { method: 'PUT', body: notification });
      return { statusCode: 200, body: JSON.stringify({ success: true, notification }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
