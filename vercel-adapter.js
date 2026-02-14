const aliasEnvironmentVariables = () => {
  const aliases = {
    AWS_ACCESS_KEY_ID: ['MY_AWS_ACCESS_KEY_ID'],
    AWS_SECRET_ACCESS_KEY: ['MY_AWS_SECRET_ACCESS_KEY'],
    AWS_REGION: ['MY_AWS_REGION'],
    AWS_S3_BUCKET: ['MY_AWS_S3_BUCKET_NAME'],
    GROQ_API_KEY: ['MY_GROQ_API_KEY']
  };

  for (const [target, candidates] of Object.entries(aliases)) {
    if (process.env[target]) continue;

    const candidate = candidates.find((name) => process.env[name]);
    if (candidate) {
      process.env[target] = process.env[candidate];
    }
  }
};

const toEventBody = (body) => {
  if (body === undefined || body === null) return body;
  if (typeof body === 'string') return body;
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  return JSON.stringify(body);
};

const runVercelHandler = async (handler, req, res) => {
  aliasEnvironmentVariables();

  const event = {
    httpMethod: req.method,
    headers: req.headers,
    queryStringParameters: req.query,
    body: toEventBody(req.body)
  };

  const result = await handler(event);

  if (result?.headers) {
    Object.entries(result.headers).forEach(([key, value]) => {
      if (value !== undefined) {
        res.setHeader(key, value);
      }
    });
  }

  res.status(result?.statusCode || 200).send(result?.body || '');
};

module.exports = { runVercelHandler };
