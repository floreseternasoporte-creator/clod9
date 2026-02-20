const { runVercelHandler } = require('./vercel-adapter');
const { getSupabaseConfig, supabaseRequest } = require('./supabase-client');

const allowedRoutes = new Set([
  'chapters',
  'check-user-limits',
  'community-notes',
  'delete-story',
  'following',
  'get-chapters',
  'get-stories',
  'groq-chat',
  'likes',
  'migrate-firebase-to-s3',
  'notes',
  'notifications',
  'scheduled-chapters',
  'send-support-email',
  'update-story',
  'upload-image',
  'upload-story',
  'user-stats',
  'users'
]);

const getRoute = (query) => {
  const rawPath = query?.path || query?.fn || [];
  return Array.isArray(rawPath) ? rawPath[0] : rawPath;
};

const loadRouteModule = (route) => {
  if (!allowedRoutes.has(route)) return null;
  return require(`./${route}.js`);
};

const resolveHandler = (loadedModule) => {
  if (!loadedModule) return null;
  if (typeof loadedModule === 'function') return loadedModule;
  if (typeof loadedModule.handler === 'function') return loadedModule.handler;
  if (typeof loadedModule.default === 'function') return loadedModule.default;
  return null;
};

module.exports = async (req, res) => {
  const route = getRoute(req.query);

  if (route === 'health') {
    res.status(200).json({
      ok: true,
      runtime: 'vercel-node',
      supabase: getSupabaseConfig()
    });
    return;
  }

  if (route === 'health-supabase') {
    try {
      await supabaseRequest('users?select=user_id&limit=1', {}, { useServiceRole: true });
      res.status(200).json({ ok: true, reachable: true, supabase: getSupabaseConfig() });
      return;
    } catch (error) {
      res.status(500).json({ ok: false, reachable: false, error: error.message, supabase: getSupabaseConfig() });
      return;
    }
  }

  const loadedModule = loadRouteModule(route);
  const handler = resolveHandler(loadedModule);

  if (!handler) {
    res.status(404).json({ error: 'Function not found.' });
    return;
  }

  try {
    if (handler === loadedModule) {
      await handler(req, res);
      return;
    }

    await runVercelHandler(handler, req, res);
  } catch (error) {
    res.status(500).json({
      error: `Failed to run handler "${route}".`,
      details: error.message
    });
  }
};
