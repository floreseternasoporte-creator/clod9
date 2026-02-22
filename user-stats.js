const { getCollection } = require('./firebase-realtime-client');

exports.handler = async (event) => {
  try {
    const { userId, type } = event.queryStringParameters || {};
    if (!userId || !type) return { statusCode: 400, body: JSON.stringify({ error: 'userId and type are required' }) };

    let count = 0;
    if (type === 'stories') {
      const stories = await getCollection('stories');
      count = Object.values(stories).filter((story) => story && story.userId === userId).length;
    } else if (type === 'notes') {
      const notes = await getCollection('notes');
      count = Object.values(notes).filter((note) => note && note.userId === userId).length;
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid type. Use "stories" or "notes"' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' },
      body: JSON.stringify({ userId, type, count })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' },
      body: JSON.stringify({ error: error.message })
    };
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
