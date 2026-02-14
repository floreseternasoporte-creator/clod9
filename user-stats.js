const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.ZENVIO_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.ZENVIO_AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.ZENVIO_AWS_REGION || process.env.AWS_REGION || 'us-east-2'
});

const BUCKET = process.env.ZENVIO_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET;

exports.handler = async (event) => {
  try {
    const { userId, type } = event.queryStringParameters || {};
    
    if (!userId || !type) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId and type are required' })
      };
    }

    let count = 0;

    if (type === 'stories') {
      // Contar historias del usuario
      const params = {
        Bucket: BUCKET,
        Prefix: `stories/${userId}/`
      };
      
      const data = await s3.listObjectsV2(params).promise();
      count = data.Contents ? data.Contents.length : 0;
      
    } else if (type === 'notes') {
      // Contar notas del usuario
      const params = {
        Bucket: BUCKET,
        Prefix: `notes/${userId}/`
      };
      
      const data = await s3.listObjectsV2(params).promise();
      count = data.Contents ? data.Contents.length : 0;
      
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid type. Use "stories" or "notes"' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ 
        userId,
        type,
        count 
      })
    };
    
  } catch (error) {
    console.error('Error getting user stats:', error);
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
