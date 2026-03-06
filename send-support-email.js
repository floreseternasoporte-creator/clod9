const { firebaseRequest } = require('./firebase-realtime-client');
const { runVercelHandler } = require('./vercel-adapter');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, problemType, description } = JSON.parse(event.body || '{}');
    if (!email || !problemType || !description) {
      return { statusCode: 400, body: JSON.stringify({ error: 'email, problemType and description are required' }) };
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

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, ticketId })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
