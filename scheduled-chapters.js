const { firebaseRequest, getCollection } = require('./firebase-realtime-client');
const { runVercelHandler } = require('./vercel-adapter');

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
    if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });

    if (event.httpMethod === 'GET') {
      const chapters = Object.values(await getCollection('scheduled_chapters'))
        .filter(Boolean)
        .sort((a, b) => Number(a.publishDate || 0) - Number(b.publishDate || 0));
      return response(200, { chapters });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const { action, chapterId } = body;
      if (!chapterId) return response(400, { error: 'chapterId is required.' });

      const path = `scheduled_chapters/${encodeURIComponent(chapterId)}`;

      if (action === 'publish') {
        const chapter = await firebaseRequest(path);
        if (!chapter) return response(404, { error: 'Scheduled chapter not found.' });
        const updated = { ...chapter, status: 'published', publishedAt: Date.now() };
        await firebaseRequest(path, { method: 'PUT', body: updated });
        return response(200, { success: true, chapter: updated });
      }

      const { storyId, publishDate } = body;
      if (!storyId || !publishDate) return response(400, { error: 'storyId and publishDate are required.' });

      const scheduled = { chapterId, storyId, publishDate, status: 'pending', createdAt: Date.now() };
      await firebaseRequest(path, { method: 'PUT', body: scheduled });
      return response(200, { success: true, chapter: scheduled });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
