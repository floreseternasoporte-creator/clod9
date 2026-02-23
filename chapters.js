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
      const { storyId, chapterId } = event.queryStringParameters || {};
      if (!storyId) return response(400, { error: 'storyId is required.' });

      if (chapterId) {
        const chapter = await firebaseRequest(`chapters/${encodeURIComponent(storyId)}/${encodeURIComponent(chapterId)}`);
        return response(200, { chapter: chapter || null });
      }

      const chapters = Object.values(await getCollection(`chapters/${encodeURIComponent(storyId)}`))
        .filter(Boolean)
        .sort((a, b) => Number(a.chapterNumber || 0) - Number(b.chapterNumber || 0));
      return response(200, { chapters });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const { action, storyId, chapterId } = body;
      if (!storyId) return response(400, { error: 'storyId is required.' });

      const base = `chapters/${encodeURIComponent(storyId)}`;

      if (action === 'delete') {
        if (!chapterId) return response(400, { error: 'chapterId is required.' });
        await firebaseRequest(`${base}/${encodeURIComponent(chapterId)}`, { method: 'DELETE' });
        return response(200, { success: true });
      }

      if (action === 'rate') {
        const { userId, rating } = body;
        if (!chapterId || !userId) return response(400, { error: 'chapterId and userId are required.' });
        const path = `${base}/${encodeURIComponent(chapterId)}`;
        const chapter = await firebaseRequest(path);
        if (!chapter) return response(404, { error: 'Chapter not found.' });
        const ratings = { ...(chapter.ratings || {}), [userId]: rating };
        const updated = { ...chapter, ratings };
        await firebaseRequest(path, { method: 'PUT', body: updated });
        return response(200, { success: true, chapter: updated });
      }

      if (action === 'view') {
        if (!chapterId) return response(400, { error: 'chapterId is required.' });
        const path = `${base}/${encodeURIComponent(chapterId)}`;
        const chapter = await firebaseRequest(path);
        if (!chapter) return response(404, { error: 'Chapter not found.' });
        const updated = { ...chapter, views: Number(chapter.views || 0) + 1 };
        await firebaseRequest(path, { method: 'PUT', body: updated });
        return response(200, { success: true, chapter: updated });
      }

      const payload = body.chapter || {};
      const nextChapterId = chapterId || `chapter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const chapterPath = `${base}/${encodeURIComponent(nextChapterId)}`;
      const existingChapter = chapterId ? (await firebaseRequest(chapterPath)) || {} : {};

      const chapter = {
        ...existingChapter,
        id: nextChapterId,
        storyId,
        chapterNumber: payload.chapterNumber ?? existingChapter.chapterNumber ?? 1,
        content: payload.content ?? existingChapter.content ?? '',
        createdAt: payload.createdAt ?? existingChapter.createdAt ?? Date.now(),
        status: payload.status ?? existingChapter.status ?? 'published',
        ratings: payload.ratings ?? existingChapter.ratings ?? {},
        views: payload.views ?? existingChapter.views ?? 0,
        updatedAt: Date.now()
      };

      await firebaseRequest(chapterPath, { method: 'PUT', body: chapter });
      return response(200, { success: true, chapter });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
