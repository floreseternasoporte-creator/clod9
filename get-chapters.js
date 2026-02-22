const { getCollection } = require('./firebase-realtime-client');
const { runVercelHandler } = require('./vercel-adapter');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { storyId } = event.queryStringParameters || {};
    if (!storyId) return { statusCode: 400, body: JSON.stringify({ error: 'storyId is required' }) };

    const chapters = Object.values(await getCollection(`chapters/${encodeURIComponent(storyId)}`))
      .filter(Boolean)
      .sort((a, b) => Number(a.chapterNumber || 0) - Number(b.chapterNumber || 0));

    return { statusCode: 200, body: JSON.stringify({ chapters }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
