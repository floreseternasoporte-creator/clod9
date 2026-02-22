exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      migrated: 0,
      message: 'Endpoint deprecated: the deployment uses Firebase only.'
    })
  };
};

const { runVercelHandler } = require('./vercel-adapter');
module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
