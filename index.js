const { runVercelHandler } = require('./vercel-adapter');
const { getFirebaseConfig, firebaseRequest } = require('./firebase-realtime-client');

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
  'notes',
  'notifications',
  'placeholder',
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
  const route = Array.isArray(rawPath) ? rawPath[0] : rawPath;
  if (typeof route !== 'string') return route;
  return route.split('/')[0];
};

const getSubPath = (query, route) => {
  const rawPath = query?.path || query?.fn || '';
  const source = Array.isArray(rawPath) ? rawPath[0] : rawPath;
  if (typeof source !== 'string') return '';
  if (!route) return '';
  if (source === route) return '';
  const prefix = `${route}/`;
  return source.startsWith(prefix) ? source.slice(prefix.length) : '';
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
  const path = getSubPath(req.query, route);

  if (route === 'health') {
    res.status(200).json({ ok: true, runtime: 'vercel-node', firebase: getFirebaseConfig() });
    return;
  }

  if (route === 'health-firebase') {
    try {
      await firebaseRequest('users', { queryParams: { limitToFirst: 1 } });
      res.status(200).json({ ok: true, reachable: true, firebase: getFirebaseConfig() });
      return;
    } catch (error) {
      res.status(500).json({ ok: false, reachable: false, error: error.message, firebase: getFirebaseConfig() });
      return;
    }
  }

  const loadedModule = loadRouteModule(route);
  const handler = resolveHandler(loadedModule);
  if (!handler) return res.status(404).json({ error: 'Function not found.' });

  try {
    if (handler === loadedModule) return await handler(req, res);
    const reqWithPath = { ...req, query: { ...req.query, path } };
    await runVercelHandler(handler, reqWithPath, res);
  } catch (error) {
    res.status(500).json({ error: `Failed to run handler "${route}".`, details: error.message });
  }
};
