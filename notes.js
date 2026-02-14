const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.ZENVIO_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.ZENVIO_AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.ZENVIO_AWS_REGION || process.env.AWS_REGION || 'us-east-2'
});

const BUCKET = process.env.ZENVIO_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET;

exports.handler = async (event) => {
  try {
    if (!BUCKET) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error:
            'Missing S3 bucket: set ZENVIO_AWS_S3_BUCKET (recommended) or AWS_S3_BUCKET.'
        })
      };
    }

    if (event.httpMethod === 'GET') {
      const { userId, limit = 50 } = event.queryStringParameters || {};
      
      const params = {
        Bucket: BUCKET,
        Prefix: userId ? `notes/${userId}/` : 'notes/'
      };
      
      const data = await s3.listObjectsV2(params).promise();

      if (!data.Contents || data.Contents.length === 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ notes: [] })
        };
      }

      const rawNotes = await Promise.all(
        data.Contents.map(async (item) => {
          try {
            const obj = await s3
              .getObject({ Bucket: BUCKET, Key: item.Key })
              .promise();
            return JSON.parse(obj.Body.toString());
          } catch (error) {
            console.error('Error reading note:', item.Key, error);
            return null;
          }
        })
      );

      const notes = rawNotes
        .filter(Boolean)
        .map((note) => ({
          ...note,
          authorName: note.authorName || note.username || 'Usuario',
          authorImage: note.authorImage || 'https://via.placeholder.com/150'
        }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, parseInt(limit));
      
      return {
        statusCode: 200,
        body: JSON.stringify({ notes })
      };
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};

      // Compat: el frontend elimina notas con POST { noteId, userId }
      if (body.noteId && !body.content && !body.imageData) {
        const noteId = String(body.noteId);
        const userId = body.userId ? String(body.userId) : '';

        if (!userId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing userId for delete.' })
          };
        }

        const noteKey = `notes/${userId}/${noteId}.json`;
        await s3.deleteObject({ Bucket: BUCKET, Key: noteKey }).promise();

        // Intentar eliminar imagen asociada si existe
        const imageKeyPrefix = `images/notes/${userId}/${noteId}`;
        try {
          const listed = await s3
            .listObjectsV2({ Bucket: BUCKET, Prefix: imageKeyPrefix })
            .promise();
          const deletions = (listed.Contents || []).map((o) => ({
            Key: o.Key
          }));
          if (deletions.length > 0) {
            await s3
              .deleteObjects({
                Bucket: BUCKET,
                Delete: { Objects: deletions }
              })
              .promise();
          }
        } catch (e) {
          console.warn('Could not delete note image(s):', e?.message || e);
        }

        return {
          statusCode: 200,
          body: JSON.stringify({ success: true })
        };
      }

      const content = body.content ? String(body.content) : '';
      const userId = body.userId ? String(body.userId) : '';
      const authorName = body.authorName ? String(body.authorName) : '';
      const authorImage = body.authorImage ? String(body.authorImage) : '';
      const imageData = body.imageData ? String(body.imageData) : null;
      const fileName = body.fileName ? String(body.fileName) : null;
      const contentType = body.contentType ? String(body.contentType) : null;

      if (!userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing userId.' })
        };
      }

      const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = Date.now();

      let imageUrl = null;
      if (imageData) {
        const match = /^data:([^;]+);base64,(.*)$/.exec(imageData);
        const inferredContentType = match ? match[1] : null;
        const base64Payload = match ? match[2] : imageData.replace(/^data:image\/\w+;base64,/, '');

        const buffer = Buffer.from(base64Payload, 'base64');
        const safeExt =
          (contentType || inferredContentType || '').includes('png')
            ? 'png'
            : 'jpg';
        const imageKey = `images/notes/${userId}/${noteId}.${safeExt}`;

        await s3
          .putObject({
            Bucket: BUCKET,
            Key: imageKey,
            Body: buffer,
            ContentType: contentType || inferredContentType || 'image/jpeg',
            ACL: 'public-read'
          })
          .promise();

        imageUrl = `https://${BUCKET}.s3.amazonaws.com/${imageKey}`;
      }

      const note = {
        id: noteId,
        userId,
        authorName: authorName || body.username || 'Usuario',
        authorImage: authorImage || 'https://via.placeholder.com/150',
        content,
        imageUrl,
        fileName,
        timestamp,
        likes: 0,
        blocked: false
      };
      
      await s3.putObject({
        Bucket: BUCKET,
        Key: `notes/${userId}/${noteId}.json`,
        Body: JSON.stringify(note),
        ContentType: 'application/json'
      }).promise();
      
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, note })
      };
    }

    if (event.httpMethod === 'DELETE') {
      const { noteId, userId } = JSON.parse(event.body);
      
      await s3.deleteObject({
        Bucket: BUCKET,
        Key: `notes/${userId}/${noteId}.json`
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
