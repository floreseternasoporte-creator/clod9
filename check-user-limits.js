const { runVercelHandler } = require('./vercel-adapter');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const response = (statusCode, body) => ({ statusCode, headers: corsHeaders, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method Not Allowed' });

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const userId = body.userId ? String(body.userId) : '';
    const action = body.action ? String(body.action) : 'unknown';

    if (!userId) {
      return response(400, {
        canPerformAction: false,
        message: 'Falta userId para validar límites.'
      });
    }

    return response(200, {
      canPerformAction: true,
      message: '',
      action
    });
  } catch (error) {
    return response(500, {
      canPerformAction: true,
      message: '',
      error: error?.message || String(error)
    });
  }
};

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
