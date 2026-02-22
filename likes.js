const { firebaseRequest, getCollection } = require('./firebase-realtime-client');

const response = (statusCode, body) => ({ statusCode, headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method Not Allowed' });

  try {
    const { noteId, userId, action = 'like' } = JSON.parse(event.body || '{}');
    if (!noteId || !userId) return response(400, { error: 'Missing noteId or userId.' });

    const likePath = `likes/${encodeURIComponent(noteId)}/${encodeURIComponent(userId)}`;
    if (action === 'unlike') {
      await firebaseRequest(likePath, { method: 'DELETE' });
    } else {
      await firebaseRequest(likePath, { method: 'PUT', body: { createdAt: Date.now() } });
    }

    const likesMap = await getCollection(`likes/${encodeURIComponent(noteId)}`);
    const total = Object.keys(likesMap || {}).length;

    const note = await firebaseRequest(`notes/${encodeURIComponent(noteId)}`);
    if (note) {
      await firebaseRequest(`notes/${encodeURIComponent(noteId)}`, { method: 'PATCH', body: { likes: total } });
    }

    const communityNote = await firebaseRequest(`community_notes/${encodeURIComponent(noteId)}`);
    if (communityNote) {
      await firebaseRequest(`community_notes/${encodeURIComponent(noteId)}`, { method: 'PATCH', body: { likes: total } });
    }

    return response(200, { success: true, likes: total });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
