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

    const { storyId } = JSON.parse(event.body);

    if (!storyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'storyId is required' })
      };
    }

    // Buscar la historia para obtener información del usuario
    const listParams = {
      Bucket: BUCKET,
      Prefix: 'stories/'
    };

    const data = await s3.listObjectsV2(listParams).promise();
    
    let storyToDelete = null;
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
            storyToDelete = story;
            storyKey = item.Key;
            break;
          }
        } catch (error) {
          console.error(`Error reading story ${item.Key}:`, error);
        }
      }
    }

    if (!storyToDelete || !storyKey) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Story not found' })
      };
    }

    // Eliminar imagen de portada si existe
    if (storyToDelete.coverImage) {
      try {
        const imageKey = `story-covers/${storyToDelete.userId}/${storyId}.jpg`;
        await s3.deleteObject({
          Bucket: BUCKET,
          Key: imageKey
        }).promise();
      } catch (error) {
        console.error('Error deleting cover image:', error);
        // Continuar aunque falle la eliminación de la imagen
      }
    }

    // Eliminar metadata de la historia
    await s3.deleteObject({
      Bucket: BUCKET,
      Key: storyKey
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
        message: 'Story deleted successfully',
        storyId
      })
    };

  } catch (error) {
    console.error('Error deleting story:', error);
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
