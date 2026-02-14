const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.ZENVIO_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.ZENVIO_AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.ZENVIO_AWS_REGION || process.env.AWS_REGION || 'us-east-2'
});

const BUCKET = process.env.ZENVIO_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET;

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
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
      coverImageFileName,
      coverImageContentType
    } = JSON.parse(event.body);

    if (!userId || !coverImageData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId and coverImageData are required' })
      };
    }

    const storyId = `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    // Procesar imagen base64
    const base64Data = coverImageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Subir imagen de portada
    const imageKey = `story-covers/${userId}/${storyId}.jpg`;
    await s3.putObject({
      Bucket: BUCKET,
      Key: imageKey,
      Body: buffer,
      ContentType: coverImageContentType || 'image/jpeg',
      ACL: 'public-read'
    }).promise();

    const coverImageUrl = `https://${BUCKET}.s3.amazonaws.com/${imageKey}`;

    // Crear objeto de historia
    const story = {
      id: storyId,
      title: title || 'Story',
      category: category || 'story',
      rating: rating || 'all',
      language: language || 'es',
      synopsis: synopsis || '',
      userId,
      username: username || email?.split('@')[0] || 'Usuario',
      email,
      coverImage: coverImageUrl,
      timestamp,
      views: 0,
      likes: 0,
      createdAt: timestamp
    };

    // Guardar metadata de la historia
    const storyKey = `stories/${userId}/${storyId}.json`;
    await s3.putObject({
      Bucket: BUCKET,
      Key: storyKey,
      Body: JSON.stringify(story),
      ContentType: 'application/json'
    }).promise();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        story,
        storyId,
        coverImageUrl
      })
    };

  } catch (error) {
    console.error('Error uploading story:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
const { runVercelHandler } = require('../vercel-adapter');

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
