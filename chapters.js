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
      const { storyId, chapterId } = event.queryStringParameters || {};
      if (!storyId) {
        return response(400, { error: 'storyId is required.' });
      }

      if (chapterId) {
        const obj = await s3
          .getObject({ Bucket: BUCKET, Key: `chapters/${storyId}/${chapterId}.json` })
          .promise();
        return response(200, { chapter: JSON.parse(obj.Body.toString()) });
      }

      const data = await s3
        .listObjectsV2({ Bucket: BUCKET, Prefix: `chapters/${storyId}/` })
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
            console.error('Error reading chapter:', item.Key, error);
            return null;
          }
        })
      );

      return response(200, { chapters: chapters.filter(Boolean) });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const { action, storyId, chapterId } = body;

      if (!storyId) {
        return response(400, { error: 'storyId is required.' });
      }

      if (action === 'delete') {
        if (!chapterId) {
          return response(400, { error: 'chapterId is required.' });
        }
        await s3
          .deleteObject({ Bucket: BUCKET, Key: `chapters/${storyId}/${chapterId}.json` })
          .promise();
        return response(200, { success: true });
      }

      if (action === 'rate') {
        const { userId, rating } = body;
        if (!chapterId || !userId) {
          return response(400, { error: 'chapterId and userId are required.' });
        }
        const obj = await s3
          .getObject({ Bucket: BUCKET, Key: `chapters/${storyId}/${chapterId}.json` })
          .promise();
        const chapter = JSON.parse(obj.Body.toString());
        const ratings = { ...(chapter.ratings || {}) };
        ratings[userId] = rating;
        const updated = { ...chapter, ratings };
        await s3
          .putObject({
            Bucket: BUCKET,
            Key: `chapters/${storyId}/${chapterId}.json`,
            Body: JSON.stringify(updated),
            ContentType: 'application/json'
          })
          .promise();
        return response(200, { success: true, chapter: updated });
      }

      if (action === 'view') {
        if (!chapterId) {
          return response(400, { error: 'chapterId is required.' });
        }
        const obj = await s3
          .getObject({ Bucket: BUCKET, Key: `chapters/${storyId}/${chapterId}.json` })
          .promise();
        const chapter = JSON.parse(obj.Body.toString());
        const updated = { ...chapter, views: (chapter.views || 0) + 1 };
        await s3
          .putObject({
            Bucket: BUCKET,
            Key: `chapters/${storyId}/${chapterId}.json`,
            Body: JSON.stringify(updated),
            ContentType: 'application/json'
          })
          .promise();
        return response(200, { success: true, chapter: updated });
      }

      const chapterPayload = body.chapter || {};
      const nextChapterId =
        chapterId || `chapter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const chapter = {
        id: nextChapterId,
        storyId,
        chapterNumber: chapterPayload.chapterNumber,
        content: chapterPayload.content || '',
        createdAt: chapterPayload.createdAt || Date.now(),
        status: chapterPayload.status || 'published',
        ratings: chapterPayload.ratings || {},
        views: chapterPayload.views || 0
      };

      await s3
        .putObject({
          Bucket: BUCKET,
          Key: `chapters/${storyId}/${nextChapterId}.json`,
          Body: JSON.stringify(chapter),
          ContentType: 'application/json'
        })
        .promise();

      return response(200, { success: true, chapter });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Chapters error:', error);
    return response(500, { error: error.message });
  }
};
const { runVercelHandler } = require('../vercel-adapter');

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
