const { supabaseRequest } = require('./supabase-client');

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return response(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method Not Allowed' });
  }

  try {
    const { userId, targetUserId, action } = JSON.parse(event.body || '{}');

    if (!userId || !targetUserId || !action) {
      return response(400, { error: 'Missing userId, targetUserId or action.' });
    }

    if (action === 'follow') {
      await supabaseRequest('following?on_conflict=follower_id,following_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([
          {
            follower_id: userId,
            following_id: targetUserId,
            created_at: new Date().toISOString()
          }
        ])
      }, { useServiceRole: true });
    } else if (action === 'unfollow') {
      await supabaseRequest(`following?follower_id=eq.${encodeURIComponent(userId)}&following_id=eq.${encodeURIComponent(targetUserId)}`, {
        method: 'DELETE'
      }, { useServiceRole: true });
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
