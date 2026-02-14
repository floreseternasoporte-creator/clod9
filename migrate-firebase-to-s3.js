exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // La app intenta ejecutar una migración automática tras autenticación.
  // La migración real no está implementada en este repo; este endpoint evita
  // que el usuario quede con errores constantes en consola y loaders/parpadeos.
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      migrated: 0,
      message: 'Migration not configured in this deployment.'
    })
  };
};
const { runVercelHandler } = require('../vercel-adapter');

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
