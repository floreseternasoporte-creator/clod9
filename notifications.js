const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.ZENVIO_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.ZENVIO_AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.ZENVIO_AWS_REGION || process.env.AWS_REGION || 'us-east-2'
});

const BUCKET = process.env.ZENVIO_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET;

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const { userId } = event.queryStringParameters || {};
      
      const data = await s3.listObjectsV2({
        Bucket: BUCKET,
        Prefix: `notifications/${userId}/`
      }).promise();
      
      const notifications = await Promise.all(
        data.Contents.map(async (item) => {
          const obj = await s3.getObject({ Bucket: BUCKET, Key: item.Key }).promise();
          return JSON.parse(obj.Body.toString());
        })
      );
      
      return {
        statusCode: 200,
        body: JSON.stringify({ notifications: notifications.sort((a, b) => b.timestamp - a.timestamp) })
      };
    }

    if (event.httpMethod === 'POST') {
      const { userId, type, message, fromUserId } = JSON.parse(event.body);
      
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const notification = {
        id: notifId,
        userId,
        type,
        message,
        fromUserId,
        timestamp: Date.now(),
        read: false
      };
      
      await s3.putObject({
        Bucket: BUCKET,
        Key: `notifications/${userId}/${notifId}.json`,
        Body: JSON.stringify(notification),
        ContentType: 'application/json'
      }).promise();
      
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
const { runVercelHandler } = require('../vercel-adapter');

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
