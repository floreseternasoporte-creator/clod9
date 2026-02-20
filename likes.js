const { supabaseRequest, supabaseCount } = require('./supabase-client');

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
    const { noteId, userId, action = 'like' } = JSON.parse(event.body || '{}');

    if (!noteId || !userId) {
      return response(400, { error: 'Missing noteId or userId.' });
    }

    if (action === 'unlike') {
      await supabaseRequest(`likes?note_id=eq.${encodeURIComponent(noteId)}&user_id=eq.${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      }, { useServiceRole: true });
    } else {
      await supabaseRequest('likes?on_conflict=note_id,user_id', {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify([{ note_id: noteId, user_id: userId, created_at: new Date().toISOString() }])
      }, { useServiceRole: true });
    }

    const total = await supabaseCount(`likes?note_id=eq.${encodeURIComponent(noteId)}&select=id`, { useServiceRole: true });

    return response(200, { success: true, likes: total });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

const { runVercelHandler } = require('./vercel-adapter');

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
