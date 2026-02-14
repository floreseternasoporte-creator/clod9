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
      const { limit = 50 } = event.queryStringParameters || {};
      const data = await s3
        .listObjectsV2({ Bucket: BUCKET, Prefix: 'community-notes/' })
        .promise();

      if (!data.Contents || data.Contents.length === 0) {
        return response(200, { notes: [] });
      }

      const rawNotes = await Promise.all(
        data.Contents.map(async (item) => {
          try {
            const obj = await s3
              .getObject({ Bucket: BUCKET, Key: item.Key })
              .promise();
            return JSON.parse(obj.Body.toString());
          } catch (error) {
            console.error('Error reading community note:', item.Key, error);
            return null;
          }
        })
      );

      const notes = rawNotes
        .filter(Boolean)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, parseInt(limit));

      return response(200, { notes });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};

      if (body.action === 'like' && body.noteId) {
        const noteKey = `community-notes/${body.noteId}.json`;
        const noteObj = await s3.getObject({ Bucket: BUCKET, Key: noteKey }).promise();
        const note = JSON.parse(noteObj.Body.toString());
        const updated = { ...note, likes: (note.likes || 0) + 1 };
        await s3
          .putObject({
            Bucket: BUCKET,
            Key: noteKey,
            Body: JSON.stringify(updated),
            ContentType: 'application/json'
          })
          .promise();
        return response(200, { success: true, note: updated });
      }

      const content = body.content ? String(body.content) : '';
      const userId = body.userId ? String(body.userId) : '';
      const authorName = body.authorName ? String(body.authorName) : 'Usuario';
      const authorImage = body.authorImage
        ? String(body.authorImage)
        : 'https://via.placeholder.com/40';
      const imageUrl = body.imageUrl ? String(body.imageUrl) : null;

      if (!userId) {
        return response(400, { error: 'Missing userId.' });
      }

      const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = Date.now();

      const note = {
        id: noteId,
        content,
        userId,
        authorName,
        authorImage,
        imageUrl,
        timestamp,
        likes: 0
      };

      await s3
        .putObject({
          Bucket: BUCKET,
          Key: `community-notes/${noteId}.json`,
          Body: JSON.stringify(note),
          ContentType: 'application/json'
        })
        .promise();

      return response(200, { success: true, note });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Community notes error:', error);
    return response(500, { error: error.message });
  }
};
const { runVercelHandler } = require('../vercel-adapter');

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
