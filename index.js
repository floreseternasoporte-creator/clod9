const AWS = require('aws-sdk');
const { runVercelHandler } = require('../lib/vercel-adapter');

const handlerModules = {
  'chapters': '../lib/handlers/chapters',
  'check-user-limits': '../lib/handlers/check-user-limits',
  'community-notes': '../lib/handlers/community-notes',
  'delete-story': '../lib/handlers/delete-story',
  'following': '../lib/handlers/following',
  'get-chapters': '../lib/handlers/get-chapters',
  'get-stories': '../lib/handlers/get-stories',
  'groq-chat': '../lib/handlers/groq-chat',
  'likes': '../lib/handlers/likes',
  'migrate-firebase-to-s3': '../lib/handlers/migrate-firebase-to-s3',
  'notes': '../lib/handlers/notes',
  'notifications': '../lib/handlers/notifications',
  'scheduled-chapters': '../lib/handlers/scheduled-chapters',
  'send-support-email': '../lib/handlers/send-support-email',
  'update-story': '../lib/handlers/update-story',
  'upload-image': '../lib/handlers/upload-image',
  'upload-story': '../lib/handlers/upload-story',
  'user-stats': '../lib/handlers/user-stats',
  'users': '../lib/handlers/users'
};

const getRoute = (query) => {
  const rawPath = query?.path || query?.fn || [];
  return Array.isArray(rawPath) ? rawPath[0] : rawPath;
};

const getAwsConfigFlags = () => ({
  awsRegionConfigured: Boolean(process.env.AWS_REGION || process.env.MY_AWS_REGION),
  awsBucketConfigured: Boolean(process.env.AWS_S3_BUCKET || process.env.MY_AWS_S3_BUCKET_NAME),
  awsKeyConfigured: Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.MY_AWS_ACCESS_KEY_ID),
  awsSecretConfigured: Boolean(process.env.AWS_SECRET_ACCESS_KEY || process.env.MY_AWS_SECRET_ACCESS_KEY)
});

const resolveBucket = () => process.env.AWS_S3_BUCKET || process.env.MY_AWS_S3_BUCKET_NAME;

module.exports = async (req, res) => {
  const route = getRoute(req.query);

  if (route === 'health') {
    res.status(200).json({
      ok: true,
      runtime: 'vercel-node',
      ...getAwsConfigFlags()
    });
    return;
  }

  if (route === 'health-s3') {
    try {
      const bucket = resolveBucket();
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-2'
      });

      await s3.headBucket({ Bucket: bucket }).promise();

      res.status(200).json({ ok: true, bucketConfigured: Boolean(bucket), bucketReachable: true });
      return;
    } catch (error) {
      res.status(500).json({
        ok: false,
        bucketConfigured: Boolean(resolveBucket()),
        bucketReachable: false,
        errorCode: error.code || 'UNKNOWN',
        errorMessage: error.message || 'S3 check failed'
      });
      return;
    }
  }

  const modulePath = handlerModules[route];

  if (!modulePath) {
    res.status(404).json({ error: 'Function not found.' });
    return;
  }

  try {
    const loaded = require(modulePath);
    const handler = loaded?.handler;

    if (typeof handler !== 'function') {
      res.status(500).json({ error: `Handler "${route}" is invalid.` });
      return;
    }

    await runVercelHandler(handler, req, res);
  } catch (error) {
    res.status(500).json({
      error: `Failed to load handler "${route}".`,
      details: error.message
    });
  }
};
