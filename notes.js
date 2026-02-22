const { firebaseRequest, listByTimestamp } = require('./firebase-realtime-client');

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  },
  body: JSON.stringify(body)
});

function toClientNote(noteId, note) {
  return {
    id: noteId,
    userId: note.userId,
    authorName: note.authorName,
    authorImage: note.authorImage,
    content: note.content || '',
    imageUrl: note.imageUrl || null,
    imageData: note.imageData || null,
    fileName: note.fileName || null,
    timestamp: note.timestamp || 0,
    likes: Number(note.likes || 0),
    blocked: Boolean(note.blocked)
  };
}

function mapNotesToSortedList(notesMap, userId) {
  return Object.entries(notesMap || {})
    .map(([id, note]) => toClientNote(id, note || {}))
    .filter((note) => (userId ? note.userId === userId : true))
    .sort((a, b) => b.timestamp - a.timestamp);
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });

    if (event.httpMethod === 'GET') {
      const { userId, limit = 50 } = event.queryStringParameters || {};
      const notesMap = await listByTimestamp('notes', limit);
      const notes = mapNotesToSortedList(notesMap, userId);
      return response(200, { notes });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};

      if (body.action === 'delete' && body.noteId && body.userId) {
        const note = await firebaseRequest(`notes/${body.noteId}`);
        if (!note || note.userId !== body.userId) {
          return response(404, { error: 'Note not found.' });
        }

        await firebaseRequest(`notes/${body.noteId}`, { method: 'DELETE' });
        return response(200, { success: true });
      }

      const content = body.content ? String(body.content) : '';
      const userId = body.userId ? String(body.userId) : '';
      const authorName = body.authorName ? String(body.authorName) : '';
      const authorImage = body.authorImage ? String(body.authorImage) : '';
      const imageData = body.imageData ? String(body.imageData) : null;
      const fileName = body.fileName ? String(body.fileName) : null;
      const imageUrl = body.imageUrl ? String(body.imageUrl) : null;

      if (!userId) return response(400, { error: 'Missing userId.' });
      if (!content && !imageData && !imageUrl) {
        return response(400, { error: 'Missing note content or image.' });
      }

      const noteId = `note_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const note = {
        userId,
        authorName: authorName || body.username || 'Usuario',
        authorImage: authorImage || 'https://via.placeholder.com/150',
        content,
        imageUrl,
        imageData,
        fileName,
        timestamp: Date.now(),
        likes: 0,
        blocked: false
      };

      await firebaseRequest(`notes/${noteId}`, {
        method: 'PUT',
        body: note
      });

      return response(200, { success: true, note: toClientNote(noteId, note) });
    }

    if (event.httpMethod === 'DELETE') {
      const { noteId, userId } = JSON.parse(event.body || '{}');
      if (!noteId || !userId) return response(400, { error: 'Missing noteId or userId.' });

      const note = await firebaseRequest(`notes/${noteId}`);
      if (!note || note.userId !== userId) {
        return response(404, { error: 'Note not found.' });
      }

      await firebaseRequest(`notes/${noteId}`, { method: 'DELETE' });
      return response(200, { success: true });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
