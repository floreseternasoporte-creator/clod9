const { supabaseRequest } = require('./supabase-client');

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return response(200, { ok: true });
    }

    if (event.httpMethod === 'GET') {
      const { userId, q = '', limit = 50 } = event.queryStringParameters || {};

      if (userId) {
        const rows = await supabaseRequest(`users?user_id=eq.${encodeURIComponent(userId)}&select=*`);
        if (!rows.length) {
          return response(404, { error: 'User not found.' });
        }
        return response(200, { user: rows[0] });
      }

      const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
      const normalizedQ = String(q).trim();
      const queryFilter = normalizedQ
        ? `&or=(username.ilike.*${encodeURIComponent(normalizedQ)}*,email.ilike.*${encodeURIComponent(normalizedQ)}*)`
        : '';

      const users = await supabaseRequest(
        `users?select=*&order=updated_at.desc&limit=${safeLimit}${queryFilter}`
      );

      return response(200, { users });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const userId = body.userId ? String(body.userId) : '';

      if (!userId) {
        return response(400, { error: 'Missing userId.' });
      }

      const profile = {
        user_id: userId,
        username: body.username || body.displayName || 'Usuario',
        bio: body.bio || '',
        profile_image: body.profileImage || '',
        followers_count: body.followersCount || 0,
        following_count: body.followingCount || 0,
        rated_count: body.ratedCount || 0,
        is_verified: body.isVerified || false,
        registration_timestamp: body.registrationTimestamp || Date.now(),
        founder: body.founder || false,
        email: body.email || '',
        updated_at: new Date().toISOString()
      };

      await supabaseRequest('users?on_conflict=user_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([profile])
      }, { useServiceRole: true });

      return response(200, {
        success: true,
        user: {
          userId: profile.user_id,
          username: profile.username,
          bio: profile.bio,
          profileImage: profile.profile_image,
          followersCount: profile.followers_count,
          followingCount: profile.following_count,
          ratedCount: profile.rated_count,
          isVerified: profile.is_verified,
          registrationTimestamp: profile.registration_timestamp,
          founder: profile.founder,
          email: profile.email,
          updatedAt: profile.updated_at
        }
      });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Users error:', error);
    return response(500, { error: error.message });
  }
};

const { runVercelHandler } = require('./vercel-adapter');

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
