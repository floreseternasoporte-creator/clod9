const AWS = require('aws-sdk');

const ses = new AWS.SES({
  accessKeyId: process.env.ZENVIO_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.ZENVIO_AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.ZENVIO_AWS_REGION || process.env.AWS_REGION || 'us-east-2'
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, problemType, description } = JSON.parse(event.body);

    const params = {
      Source: process.env.SUPPORT_EMAIL || 'support@zenvio.app',
      Destination: {
        ToAddresses: [process.env.SUPPORT_EMAIL || 'support@zenvio.app']
      },
      Message: {
        Subject: { Data: `Soporte: ${problemType}` },
        Body: {
          Text: { Data: `Email: ${email}\nTipo: ${problemType}\n\n${description}` }
        }
      }
    };

    await ses.sendEmail(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
const { runVercelHandler } = require('../vercel-adapter');

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
