const { parseDataUrl, uploadToStorage } = require('./supabase-client');

const MEDIA_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'media';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { imageData, fileName = 'image.jpg', userId, timestamp = Date.now(), contentType, imageType = 'misc' } = JSON.parse(event.body || '{}');

    if (!imageData || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'imageData and userId are required' })
      };
    }

    const parsed = parseDataUrl(imageData);
    const key = `${imageType}/${userId}/${timestamp}_${String(fileName).replace(/\s+/g, '_')}`;
    const uploaded = await uploadToStorage({
      bucket: MEDIA_BUCKET,
      path: key,
      buffer: parsed.buffer,
      contentType: contentType || parsed.contentType,
      upsert: true
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ imageUrl: uploaded.publicUrl, path: uploaded.path })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
