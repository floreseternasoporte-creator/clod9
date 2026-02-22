const { firebaseRequest, getCollection } = require('./firebase-realtime-client');

const response = (statusCode, body) => ({ statusCode, headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}, body: JSON.stringify(body) });

const toClientUser = (userId, row = {}) => ({
  userId,
  username: row.username || 'Usuario',
  bio: row.bio || '',
  profileImage: row.profileImage || '',
  followersCount: Number(row.followersCount || 0),
  followingCount: Number(row.followingCount || 0),
  ratedCount: Number(row.ratedCount || 0),
  isVerified: Boolean(row.isVerified),
  registrationTimestamp: row.registrationTimestamp || Date.now(),
  founder: Boolean(row.founder),
  email: row.email || '',
  updatedAt: row.updatedAt || Date.now()
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });

    if (event.httpMethod === 'GET') {
      const { userId, q = '', limit = 50 } = event.queryStringParameters || {};
      if (userId) {
        const user = await firebaseRequest(`users/${encodeURIComponent(userId)}`);
        if (!user) return response(404, { error: 'User not found.' });
        return response(200, { user: toClientUser(userId, user) });
      }

      const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
      const needle = String(q).trim().toLowerCase();
      const users = Object.entries(await getCollection('users'))
        .map(([id, row]) => toClientUser(id, row))
        .filter((u) => !needle || u.username.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle))
        .sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
        .slice(0, safeLimit);

      return response(200, { users });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const userId = body.userId ? String(body.userId) : '';
      if (!userId) return response(400, { error: 'Missing userId.' });

      const existing = await firebaseRequest(`users/${encodeURIComponent(userId)}`) || {};
      const merged = {
        ...existing,
        username: body.username || body.displayName || existing.username || 'Usuario',
        bio: body.bio ?? existing.bio ?? '',
        profileImage: body.profileImage ?? existing.profileImage ?? '',
        followersCount: body.followersCount ?? existing.followersCount ?? 0,
        followingCount: body.followingCount ?? existing.followingCount ?? 0,
        ratedCount: body.ratedCount ?? existing.ratedCount ?? 0,
        isVerified: body.isVerified ?? existing.isVerified ?? false,
        registrationTimestamp: body.registrationTimestamp || existing.registrationTimestamp || Date.now(),
        founder: body.founder ?? existing.founder ?? false,
        email: body.email ?? existing.email ?? '',
        updatedAt: Date.now()
      };

      await firebaseRequest(`users/${encodeURIComponent(userId)}`, { method: 'PUT', body: merged });
      return response(200, { success: true, user: toClientUser(userId, merged) });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
