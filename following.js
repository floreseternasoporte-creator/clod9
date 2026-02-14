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
    const { userId, targetUserId, action } = JSON.parse(event.body);
    const followKey = `following/${userId}/${targetUserId}.json`;
    
    if (action === 'follow') {
      await s3.putObject({
        Bucket: BUCKET,
        Key: followKey,
        Body: JSON.stringify({ userId, targetUserId, timestamp: Date.now() }),
        ContentType: 'application/json'
      }).promise();
    } else if (action === 'unfollow') {
      await s3.deleteObject({
        Bucket: BUCKET,
        Key: followKey
      }).promise();
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
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
