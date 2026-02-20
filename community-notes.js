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

const toClientNote = (row) => ({
  id: row.note_id,
  content: row.content,
  userId: row.user_id,
  authorName: row.author_name,
  authorImage: row.author_image,
  imageUrl: row.image_url,
  timestamp: row.timestamp,
  likes: row.likes
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });

    if (event.httpMethod === 'GET') {
      const { limit = 50 } = event.queryStringParameters || {};
      const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
      const rows = await supabaseRequest(`community_notes?select=*&order=timestamp.desc&limit=${safeLimit}`, {}, { useServiceRole: true });
      return response(200, { notes: rows.map(toClientNote) });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};

      if (body.action === 'like' && body.noteId) {
        const rows = await supabaseRequest(`community_notes?note_id=eq.${encodeURIComponent(body.noteId)}&select=*`, {}, { useServiceRole: true });
        if (!rows.length) return response(404, { error: 'Note not found.' });

        const current = rows[0];
        const likes = (current.likes || 0) + 1;
        await supabaseRequest(`community_notes?note_id=eq.${encodeURIComponent(body.noteId)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ likes })
        }, { useServiceRole: true });

        return response(200, { success: true, note: toClientNote({ ...current, likes }) });
      }

      const userId = body.userId ? String(body.userId) : '';
      if (!userId) return response(400, { error: 'Missing userId.' });

      const row = {
        note_id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        content: body.content ? String(body.content) : '',
        user_id: userId,
        author_name: body.authorName ? String(body.authorName) : 'Usuario',
        author_image: body.authorImage ? String(body.authorImage) : 'https://via.placeholder.com/40',
        image_url: body.imageUrl ? String(body.imageUrl) : null,
        timestamp: Date.now(),
        likes: 0
      };

      await supabaseRequest('community_notes', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify([row])
      }, { useServiceRole: true });

      return response(200, { success: true, note: toClientNote(row) });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Community notes error:', error);
    return response(500, { error: error.message });
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
