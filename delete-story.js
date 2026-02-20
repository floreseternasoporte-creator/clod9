const { supabaseRequest, deleteFromStorage } = require('./supabase-client');

const MEDIA_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'media';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

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
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const { storyId } = JSON.parse(event.body || '{}');
    if (!storyId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'storyId is required' }) };
    }

    const rows = await supabaseRequest(`stories?story_id=eq.${encodeURIComponent(storyId)}&select=*`, {}, { useServiceRole: true });
    if (!rows.length) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Story not found' }) };
    }

    const story = rows[0];
    const storagePath = extractStoragePath(story.cover_image) || `story-covers/${story.user_id}/${story.story_id}.jpg`;

    await deleteFromStorage({ bucket: MEDIA_BUCKET, path: storagePath }, { useServiceRole: true });

    await supabaseRequest(`stories?story_id=eq.${encodeURIComponent(storyId)}`, {
      method: 'DELETE'
    }, { useServiceRole: true });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, message: 'Story deleted successfully', storyId })
    };
  } catch (error) {
    console.error('Error deleting story:', error);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
