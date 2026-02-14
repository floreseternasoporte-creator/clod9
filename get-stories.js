const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.ZENVIO_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.ZENVIO_AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.ZENVIO_AWS_REGION || process.env.AWS_REGION || 'us-east-2'
});

const BUCKET = process.env.ZENVIO_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET;

exports.handler = async (event) => {
  try {
    const { userId, limit = 100 } = event.queryStringParameters || {};
    
    let prefix = 'stories/';
    if (userId) {
      prefix = `stories/${userId}/`;
    }
    
    const params = {
      Bucket: BUCKET,
      Prefix: prefix,
      MaxKeys: parseInt(limit)
    };
    
    const data = await s3.listObjectsV2(params).promise();
    
    if (!data.Contents || data.Contents.length === 0) {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        body: JSON.stringify({ stories: [] })
      };
    }
    
    // Obtener el contenido de cada historia
    const stories = await Promise.all(
      data.Contents.map(async (item) => {
        try {
          const obj = await s3.getObject({ 
            Bucket: BUCKET, 
            Key: item.Key 
          }).promise();
          
          const story = JSON.parse(obj.Body.toString());
          return story;
        } catch (error) {
          console.error(`Error reading story ${item.Key}:`, error);
          return null;
        }
      })
    );
    
    // Filtrar historias nulas y ordenar por timestamp descendente
    const validStories = stories
      .filter(story => story !== null)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ 
        stories: validStories,
        count: validStories.length
      })
    };
    
  } catch (error) {
    console.error('Error getting stories:', error);
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
