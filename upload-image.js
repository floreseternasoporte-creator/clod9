const { firebaseRequest } = require('./firebase-realtime-client');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { imageData, fileName = 'image.jpg', userId, timestamp = Date.now(), imageType = 'misc' } = JSON.parse(event.body || '{}');

    if (!imageData || !userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'imageData and userId are required' }) };
    }

    const safeName = String(fileName).replace(/\s+/g, '_');
    const key = `${timestamp}_${safeName}`;
    const path = `images/${encodeURIComponent(imageType)}/${encodeURIComponent(userId)}/${encodeURIComponent(key)}`;

    await firebaseRequest(path, {
      method: 'PUT',
      body: {
        imageData: String(imageData),
        fileName: safeName,
        imageType,
        userId,
        timestamp
      }
    });

    return { statusCode: 200, body: JSON.stringify({ imageUrl: String(imageData), path }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
