const { runVercelHandler } = require('../lib/vercel-adapter');

const handlers = {
  'chapters': require('../lib/handlers/chapters').handler,
  'check-user-limits': require('../lib/handlers/check-user-limits').handler,
  'community-notes': require('../lib/handlers/community-notes').handler,
  'delete-story': require('../lib/handlers/delete-story').handler,
  'following': require('../lib/handlers/following').handler,
  'get-chapters': require('../lib/handlers/get-chapters').handler,
  'get-stories': require('../lib/handlers/get-stories').handler,
  'groq-chat': require('../lib/handlers/groq-chat').handler,
  'likes': require('../lib/handlers/likes').handler,
  'migrate-firebase-to-s3': require('../lib/handlers/migrate-firebase-to-s3').handler,
  'notes': require('../lib/handlers/notes').handler,
  'notifications': require('../lib/handlers/notifications').handler,
  'scheduled-chapters': require('../lib/handlers/scheduled-chapters').handler,
  'send-support-email': require('../lib/handlers/send-support-email').handler,
  'update-story': require('../lib/handlers/update-story').handler,
  'upload-image': require('../lib/handlers/upload-image').handler,
  'upload-story': require('../lib/handlers/upload-story').handler,
  'user-stats': require('../lib/handlers/user-stats').handler,
  'users': require('../lib/handlers/users').handler
};

module.exports = async (req, res) => {
  const rawPath = req.query.path || req.query.fn || [];
  const route = Array.isArray(rawPath) ? rawPath[0] : rawPath;
  const handler = handlers[route];

  if (!handler) {
    res.status(404).json({ error: 'Function not found.' });
    return;
  }

  await runVercelHandler(handler, req, res);
};
