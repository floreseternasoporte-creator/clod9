const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.ZENVIO_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.ZENVIO_AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.ZENVIO_AWS_REGION || process.env.AWS_REGION || 'us-east-2'
});

const BUCKET = process.env.ZENVIO_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { noteId, userId } = JSON.parse(event.body);
    const likeKey = `likes/${noteId}/${userId}.json`;
    
    // Verificar si ya dio like
    try {
      await s3.headObject({ Bucket: BUCKET, Key: likeKey }).promise();
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'User already liked this note' })
      };
    } catch (e) {
      // No existe, continuar
    }
    
    // Guardar like
    await s3.putObject({
      Bucket: BUCKET,
      Key: likeKey,
      Body: JSON.stringify({ userId, timestamp: Date.now() }),
      ContentType: 'application/json'
    }).promise();
    
    // Contar likes
    const data = await s3.listObjectsV2({
      Bucket: BUCKET,
      Prefix: `likes/${noteId}/`
    }).promise();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ likes: data.KeyCount })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
const { runVercelHandler } = require('../vercel-adapter');

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
