const { getCollection } = require('./firebase-realtime-client');
const { runVercelHandler } = require('./vercel-adapter');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

const response = (statusCode, body) => ({ statusCode, headers: corsHeaders, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });
  if (event.httpMethod !== 'GET') return response(405, { error: 'Method not allowed' });

  try {
    const { storyId } = event.queryStringParameters || {};
    if (!storyId) return response(400, { error: 'storyId is required' });

    const chapters = Object.values(await getCollection(`chapters/${encodeURIComponent(storyId)}`))
      .filter(Boolean)
      .sort((a, b) => Number(a.chapterNumber || 0) - Number(b.chapterNumber || 0));

    return response(200, { chapters });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
