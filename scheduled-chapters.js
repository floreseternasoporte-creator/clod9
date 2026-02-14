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
      const data = await s3
        .listObjectsV2({ Bucket: BUCKET, Prefix: 'scheduled-chapters/' })
        .promise();

      if (!data.Contents || data.Contents.length === 0) {
        return response(200, { chapters: [] });
      }

      const chapters = await Promise.all(
        data.Contents.map(async (item) => {
          try {
            const obj = await s3
              .getObject({ Bucket: BUCKET, Key: item.Key })
              .promise();
            return JSON.parse(obj.Body.toString());
          } catch (error) {
            console.error('Error reading scheduled chapter:', item.Key, error);
            return null;
          }
        })
      );

      return response(200, { chapters: chapters.filter(Boolean) });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const { action, chapterId } = body;

      if (!chapterId) {
        return response(400, { error: 'chapterId is required.' });
      }

      if (action === 'publish') {
        const obj = await s3
          .getObject({ Bucket: BUCKET, Key: `scheduled-chapters/${chapterId}.json` })
          .promise();
        const chapter = JSON.parse(obj.Body.toString());
        const updated = { ...chapter, status: 'published', publishedAt: Date.now() };
        await s3
          .putObject({
            Bucket: BUCKET,
            Key: `scheduled-chapters/${chapterId}.json`,
            Body: JSON.stringify(updated),
            ContentType: 'application/json'
          })
          .promise();
        return response(200, { success: true, chapter: updated });
      }

      const { storyId, publishDate } = body;
      if (!storyId || !publishDate) {
        return response(400, { error: 'storyId and publishDate are required.' });
      }

      const scheduled = {
        chapterId,
        storyId,
        publishDate,
        status: 'pending',
        createdAt: Date.now()
      };

      await s3
        .putObject({
          Bucket: BUCKET,
          Key: `scheduled-chapters/${chapterId}.json`,
          Body: JSON.stringify(scheduled),
          ContentType: 'application/json'
        })
        .promise();

      return response(200, { success: true, chapter: scheduled });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Scheduled chapters error:', error);
    return response(500, { error: error.message });
  }
};
const { runVercelHandler } = require('../vercel-adapter');

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
