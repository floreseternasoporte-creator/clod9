const { firebaseRequest } = require('./firebase-realtime-client');
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
    const { email, problemType, description } = JSON.parse(event.body || '{}');
    if (!email || !problemType || !description) {
      return response(400, { error: 'email, problemType and description are required' });
    }

    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    await firebaseRequest(`support_tickets/${ticketId}`, {
      method: 'PUT',
      body: {
        ticketId,
        email: String(email),
        problemType: String(problemType),
        description: String(description),
        status: 'open',
        createdAt: Date.now()
      }
    });

    return response(200, { success: true, ticketId });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
