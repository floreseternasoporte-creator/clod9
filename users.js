const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.ZENVIO_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.ZENVIO_AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.ZENVIO_AWS_REGION || process.env.AWS_REGION || 'us-east-2'
});

const BUCKET = process.env.ZENVIO_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET;

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  try {
    if (!BUCKET) {
      return response(500, {
        error: 'Missing S3 bucket: set ZENVIO_AWS_S3_BUCKET or AWS_S3_BUCKET.'
      });
    }

    if (event.httpMethod === 'GET') {
      const { userId } = event.queryStringParameters || {};

      if (userId) {
        try {
          const obj = await s3
            .getObject({ Bucket: BUCKET, Key: `users/${userId}.json` })
            .promise();
          return response(200, { user: JSON.parse(obj.Body.toString()) });
        } catch (error) {
          if (error.code === 'NoSuchKey') {
            return response(404, { error: 'User not found.' });
          }
          throw error;
        }
      }

      const data = await s3
        .listObjectsV2({ Bucket: BUCKET, Prefix: 'users/' })
        .promise();

      if (!data.Contents || data.Contents.length === 0) {
        return response(200, { users: [] });
      }

      const users = await Promise.all(
        data.Contents.map(async (item) => {
          try {
            const obj = await s3
              .getObject({ Bucket: BUCKET, Key: item.Key })
              .promise();
            return JSON.parse(obj.Body.toString());
          } catch (error) {
            console.error('Error reading user:', item.Key, error);
            return null;
          }
        })
      );

      return response(
        200,
        { users: users.filter(Boolean).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)) }
      );
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const userId = body.userId ? String(body.userId) : '';

      if (!userId) {
        return response(400, { error: 'Missing userId.' });
      }

      const profile = {
        userId,
        username: body.username || body.displayName || 'Usuario',
        bio: body.bio || '',
        profileImage: body.profileImage || '',
        followersCount: body.followersCount || 0,
        followingCount: body.followingCount || 0,
        ratedCount: body.ratedCount || 0,
        isVerified: body.isVerified || false,
        registrationTimestamp: body.registrationTimestamp || Date.now(),
        founder: body.founder || false,
        email: body.email || '',
        updatedAt: Date.now()
      };

      await s3
        .putObject({
          Bucket: BUCKET,
          Key: `users/${userId}.json`,
          Body: JSON.stringify(profile),
          ContentType: 'application/json'
        })
        .promise();

      return response(200, { success: true, user: profile });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Users error:', error);
    return response(500, { error: error.message });
  }
};
const { runVercelHandler } = require('../vercel-adapter');

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
