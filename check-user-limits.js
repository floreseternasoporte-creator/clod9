exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const userId = body.userId ? String(body.userId) : '';
    const action = body.action ? String(body.action) : 'unknown';

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          canPerformAction: false,
          message: 'Falta userId para validar límites.'
        })
      };
    }

    // Nota: este proyecto tiene lógica de límites en el frontend.
    // Esta function existe para evitar fallos (404) y desbloquear flujos
    // mientras se define una política real de límites en el backend.
    return {
      statusCode: 200,
      body: JSON.stringify({
        canPerformAction: true,
        message: '',
        action
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        canPerformAction: true,
        message: '',
        error: error?.message || String(error)
      })
    };
  }
};
const { runVercelHandler } = require('../vercel-adapter');

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
