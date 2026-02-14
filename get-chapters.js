const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.ZENVIO_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.ZENVIO_AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.ZENVIO_AWS_REGION || process.env.AWS_REGION || 'us-east-2'
});

const BUCKET = process.env.ZENVIO_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET;

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const storyId = event.queryStringParameters?.storyId;
  if (!storyId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing storyId' })
    };
  }

  if (!BUCKET) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Missing S3 bucket: set ZENVIO_AWS_S3_BUCKET or AWS_S3_BUCKET.'
      })
    };
  }

  try {
    const data = await s3
      .listObjectsV2({ Bucket: BUCKET, Prefix: `chapters/${storyId}/` })
      .promise();

    if (!data.Contents || data.Contents.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ chapters: [] })
      };
    }

    const chapters = await Promise.all(
      data.Contents.map(async (item) => {
        try {
          const obj = await s3
            .getObject({ Bucket: BUCKET, Key: item.Key })
            .promise();
          return JSON.parse(obj.Body.toString());
        } catch (error) {
          console.error('Error reading chapter:', item.Key, error);
          return null;
        }
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ chapters: chapters.filter(Boolean) })
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
