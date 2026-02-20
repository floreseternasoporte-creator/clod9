const { supabaseRequest, parseDataUrl, uploadToStorage } = require('./supabase-client');

const MEDIA_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'media';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const {
      title,
      category,
      rating,
      language,
      synopsis,
      userId,
      username,
      email,
      coverImageData,
      coverImageContentType
    } = JSON.parse(event.body || '{}');

    if (!userId || !coverImageData) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'userId and coverImageData are required' }) };
    }

    const storyId = `story_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const timestamp = Date.now();

    const parsed = parseDataUrl(coverImageData);
    const imagePath = `story-covers/${userId}/${storyId}.jpg`;
    const uploadResult = await uploadToStorage({
      bucket: MEDIA_BUCKET,
      path: imagePath,
      buffer: parsed.buffer,
      contentType: coverImageContentType || parsed.contentType || 'image/jpeg',
      upsert: true
    });

    const row = {
      story_id: storyId,
      title: title || 'Story',
      category: category || 'story',
      rating: rating || 'all',
      language: language || 'es',
      synopsis: synopsis || '',
      user_id: userId,
      username: username || (email ? String(email).split('@')[0] : 'Usuario'),
      email: email || '',
      cover_image: uploadResult.publicUrl,
      timestamp,
      views: 0,
      likes: 0,
      created_at: timestamp,
      updated_at: timestamp
    };

    await supabaseRequest('stories', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([row])
    }, { useServiceRole: true });

    const story = {
      id: row.story_id,
      title: row.title,
      category: row.category,
      rating: row.rating,
      language: row.language,
      synopsis: row.synopsis,
      userId: row.user_id,
      username: row.username,
      email: row.email,
      coverImage: row.cover_image,
      timestamp: row.timestamp,
      views: row.views,
      likes: row.likes,
      createdAt: row.created_at
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, story, storyId, coverImageUrl: row.cover_image })
    };
  } catch (error) {
    console.error('Error uploading story:', error);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
