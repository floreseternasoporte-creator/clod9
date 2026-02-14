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

    const { storyId, updates } = JSON.parse(event.body);

    if (!storyId || !updates) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'storyId and updates are required' })
      };
    }

    // Buscar la historia para actualizarla
    const listParams = {
      Bucket: BUCKET,
      Prefix: 'stories/'
    };

    const data = await s3.listObjectsV2(listParams).promise();
    
    let storyToUpdate = null;
    let storyKey = null;

    // Buscar la historia específica
    for (const item of data.Contents || []) {
      if (item.Key.includes(storyId)) {
        try {
          const obj = await s3.getObject({ 
            Bucket: BUCKET, 
            Key: item.Key 
          }).promise();
          
          const story = JSON.parse(obj.Body.toString());
          if (story.id === storyId) {
            storyToUpdate = story;
            storyKey = item.Key;
            break;
          }
        } catch (error) {
          console.error(`Error reading story ${item.Key}:`, error);
        }
      }
    }

    if (!storyToUpdate || !storyKey) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Story not found' })
      };
    }

    // Aplicar actualizaciones
    const updatedStory = {
      ...storyToUpdate,
      ...updates,
      lastUpdated: Date.now()
    };

    // Guardar historia actualizada
    await s3.putObject({
      Bucket: BUCKET,
      Key: storyKey,
      Body: JSON.stringify(updatedStory),
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
        story: updatedStory
      })
    };

  } catch (error) {
    console.error('Error updating story:', error);
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
