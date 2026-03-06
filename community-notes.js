const { firebaseRequest, listByTimestamp, asSortedArray } = require('./firebase-realtime-client');

const response = (statusCode, body) => ({ statusCode, headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}, body: JSON.stringify(body) });

const toClientNote = (id, note = {}) => ({
  id,
  content: note.content || '',
  userId: note.userId,
  authorName: note.authorName || 'Usuario',
  authorImage: note.authorImage || 'https://via.placeholder.com/40',
  imageUrl: note.imageUrl || null,
  imageData: note.imageData || null,
  timestamp: note.timestamp || 0,
  likes: Number(note.likes || 0)
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });

    if (event.httpMethod === 'GET') {
      const { limit = 50 } = event.queryStringParameters || {};
      const notes = asSortedArray(await listByTimestamp('community_notes', limit), toClientNote);
      return response(200, { notes });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};

      if (body.action === 'like' && body.noteId) {
        const notePath = `community_notes/${encodeURIComponent(body.noteId)}`;
        const current = await firebaseRequest(notePath);
        if (!current) return response(404, { error: 'Note not found.' });
        const likes = Number(current.likes || 0) + 1;
        await firebaseRequest(notePath, { method: 'PATCH', body: { likes } });
        return response(200, { success: true, note: toClientNote(body.noteId, { ...current, likes }) });
      }

      const userId = body.userId ? String(body.userId) : '';
      if (!userId) return response(400, { error: 'Missing userId.' });

      const noteId = `note_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const note = {
        content: body.content ? String(body.content) : '',
        userId,
        authorName: body.authorName ? String(body.authorName) : 'Usuario',
        authorImage: body.authorImage ? String(body.authorImage) : 'https://via.placeholder.com/40',
        imageUrl: body.imageUrl ? String(body.imageUrl) : null,
        imageData: body.imageData ? String(body.imageData) : null,
        timestamp: Date.now(),
        likes: 0
      };

      await firebaseRequest(`community_notes/${noteId}`, { method: 'PUT', body: note });
      return response(200, { success: true, note: toClientNote(noteId, note) });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
