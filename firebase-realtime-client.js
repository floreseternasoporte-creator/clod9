const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL;
const FIREBASE_DATABASE_SECRET = process.env.FIREBASE_DATABASE_SECRET;

function getFirebaseConfig() {
  return {
    databaseUrlConfigured: Boolean(FIREBASE_DATABASE_URL),
    databaseSecretConfigured: Boolean(FIREBASE_DATABASE_SECRET)
  };
}

function ensureDatabaseUrl() {
  if (!FIREBASE_DATABASE_URL) {
    throw new Error('Missing FIREBASE_DATABASE_URL environment variable.');
  }
}

function normalizePath(path) {
  return String(path || '').replace(/^\/+/, '').replace(/\/+$/, '');
}

function buildUrl(path, queryParams = {}) {
  ensureDatabaseUrl();
  const normalizedPath = normalizePath(path);
  const base = FIREBASE_DATABASE_URL.replace(/\/$/, '');
  const url = new URL(`${base}/${normalizedPath}.json`);

  if (FIREBASE_DATABASE_SECRET) {
    url.searchParams.set('auth', FIREBASE_DATABASE_SECRET);
  }

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function firebaseRequest(path, { method = 'GET', body, queryParams } = {}) {
  const response = await fetch(buildUrl(path, queryParams), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firebase Realtime Database request failed (${response.status}): ${errorText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return response.text();
  return response.json();
}

async function getCollection(path) {
  return (await firebaseRequest(path)) || {};
}

async function listByTimestamp(path, limit = 50) {
  const map = await firebaseRequest(path, {
    queryParams: {
      orderBy: '"timestamp"',
      limitToLast: Math.max(1, Math.min(Number(limit) || 50, 200))
    }
  });

  return map || {};
}

function asSortedArray(map, mapper, userId) {
  return Object.entries(map || {})
    .map(([id, value]) => mapper(id, value || {}))
    .filter((item) => (userId ? item.userId === userId : true))
    .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
}

module.exports = {
  getFirebaseConfig,
  firebaseRequest,
  getCollection,
  listByTimestamp,
  asSortedArray
};
