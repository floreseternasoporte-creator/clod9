const { supabaseRequest, parseDataUrl, uploadToStorage, deleteFromStorage } = require('./supabase-client');

const MEDIA_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'media';

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  },
  body: JSON.stringify(body)
});

const toClientNote = (row) => ({
  id: row.note_id,
  userId: row.user_id,
  authorName: row.author_name,
  authorImage: row.author_image,
  content: row.content,
  imageUrl: row.image_url,
  fileName: row.file_name,
  timestamp: row.timestamp,
  likes: row.likes,
  blocked: row.blocked
});

function extractStoragePath(url) {
  const marker = '/storage/v1/object/public/';
  if (!url || !url.includes(marker)) return null;
  const tail = url.split(marker)[1] || '';
  const parts = tail.split('/');
  parts.shift();
  return decodeURIComponent(parts.join('/'));
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });

    if (event.httpMethod === 'GET') {
      const { userId, limit = 50 } = event.queryStringParameters || {};
      const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
      const userFilter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : '';

      const rows = await supabaseRequest(
        `notes?select=*&order=timestamp.desc&limit=${safeLimit}${userFilter}`,
        {},
        { useServiceRole: true }
      );

      return response(200, { notes: rows.map(toClientNote) });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};

      if (body.action === 'delete' && body.noteId && body.userId) {
        const rows = await supabaseRequest(
          `notes?note_id=eq.${encodeURIComponent(body.noteId)}&user_id=eq.${encodeURIComponent(body.userId)}&select=*`,
          {},
          { useServiceRole: true }
        );

        if (!rows.length) return response(404, { error: 'Note not found.' });

        const note = rows[0];
        const storagePath = extractStoragePath(note.image_url);
        if (storagePath) {
          await deleteFromStorage({ bucket: MEDIA_BUCKET, path: storagePath }, { useServiceRole: true });
        }

        await supabaseRequest(
          `notes?note_id=eq.${encodeURIComponent(body.noteId)}&user_id=eq.${encodeURIComponent(body.userId)}`,
          { method: 'DELETE' },
          { useServiceRole: true }
        );

        return response(200, { success: true });
      }

      const content = body.content ? String(body.content) : '';
      const userId = body.userId ? String(body.userId) : '';
      const authorName = body.authorName ? String(body.authorName) : '';
      const authorImage = body.authorImage ? String(body.authorImage) : '';
      const imageData = body.imageData ? String(body.imageData) : null;
      const fileName = body.fileName ? String(body.fileName) : null;
      const contentType = body.contentType ? String(body.contentType) : null;

      if (!userId) return response(400, { error: 'Missing userId.' });

      const noteId = `note_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const timestamp = Date.now();

      let imageUrl = null;
      if (imageData) {
        const parsed = parseDataUrl(imageData);
        const safeExt = (contentType || parsed.contentType || '').includes('png') ? 'png' : 'jpg';
        const imagePath = `notes/${userId}/${noteId}.${safeExt}`;
        const uploaded = await uploadToStorage({
          bucket: MEDIA_BUCKET,
          path: imagePath,
          buffer: parsed.buffer,
          contentType: contentType || parsed.contentType || 'image/jpeg',
          upsert: true
        });
        imageUrl = uploaded.publicUrl;
      }

      const row = {
        note_id: noteId,
        user_id: userId,
        author_name: authorName || body.username || 'Usuario',
        author_image: authorImage || 'https://via.placeholder.com/150',
        content,
        image_url: imageUrl,
        file_name: fileName,
        timestamp,
        likes: 0,
        blocked: false
      };

      await supabaseRequest('notes', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify([row])
      }, { useServiceRole: true });

      return response(200, { success: true, note: toClientNote(row) });
    }

    if (event.httpMethod === 'DELETE') {
      const { noteId, userId } = JSON.parse(event.body || '{}');
      if (!noteId || !userId) return response(400, { error: 'Missing noteId or userId.' });

      await supabaseRequest(
        `notes?note_id=eq.${encodeURIComponent(noteId)}&user_id=eq.${encodeURIComponent(userId)}`,
        { method: 'DELETE' },
        { useServiceRole: true }
      );

      return response(200, { success: true });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
