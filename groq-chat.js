exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const apiKey =
      process.env.GROQ_API_KEY ||
      process.env.GROQ_API_TOKEN ||
      process.env.GROQ_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error:
            'Missing Groq credentials: set GROQ_API_KEY (recommended) in Vercel environment variables.'
        })
      };
    }

    const payload = event.body ? JSON.parse(event.body) : {};
    const model = payload.model || 'llama3-8b-8192';
    const temperature =
      typeof payload.temperature === 'number' ? payload.temperature : 0.7;
    const max_tokens =
      typeof payload.max_tokens === 'number' ? payload.max_tokens : 250;

    const messages = Array.isArray(payload.messages)
      ? payload.messages
      : payload.message
        ? [{ role: 'user', content: String(payload.message) }]
        : [];

    if (messages.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing message(s) in request body.' })
      };
    }

    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens
      })
    });

    const text = await resp.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      // leave as null; handled below
    }

    if (!resp.ok) {
      const upstreamError =
        (data && (data.error?.message || data.error)) || text || 'Groq error';
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: upstreamError })
      };
    }

    const content = data?.choices?.[0]?.message?.content ?? '';
    return {
      statusCode: 200,
      body: JSON.stringify({
        content,
        raw: data
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || String(error) })
    };
  }
};
const { runVercelHandler } = require('../vercel-adapter');

module.exports = async (req, res) => runVercelHandler(exports.handler, req, res);
