const { supabaseCount } = require('./supabase-client');

exports.handler = async (event) => {
  try {
    const { userId, type } = event.queryStringParameters || {};

    if (!userId || !type) {
      return { statusCode: 400, body: JSON.stringify({ error: 'userId and type are required' }) };
    }

    let count = 0;

    if (type === 'stories') {
      count = await supabaseCount(`stories?user_id=eq.${encodeURIComponent(userId)}&select=story_id`, { useServiceRole: true });
    } else if (type === 'notes') {
      count = await supabaseCount(`notes?user_id=eq.${encodeURIComponent(userId)}&select=note_id`, { useServiceRole: true });
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid type. Use "stories" or "notes"' }) };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ userId, type, count })
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
