const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseConfig() {
  return {
    urlConfigured: Boolean(SUPABASE_URL),
    anonKeyConfigured: Boolean(SUPABASE_ANON_KEY),
    serviceRoleConfigured: Boolean(SUPABASE_SERVICE_ROLE_KEY)
  };
}

function getKey(useServiceRole = false) {
  if (useServiceRole && SUPABASE_SERVICE_ROLE_KEY) return SUPABASE_SERVICE_ROLE_KEY;
  return SUPABASE_ANON_KEY;
}

function buildAuthHeaders(useServiceRole = false) {
  if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL environment variable.');
  const key = getKey(useServiceRole);
  if (!key) throw new Error('Missing Supabase key. Set SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY.');

  return {
    apikey: key,
    Authorization: `Bearer ${key}`
  };
}

async function rawRequest(path, options = {}, { useServiceRole = false } = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...buildAuthHeaders(useServiceRole),
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function supabaseRequest(path, options = {}, clientOptions = {}) {
  const response = await rawRequest(path, options, clientOptions);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${errorText}`);
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return response.text();
  return response.json();
}

async function supabaseCount(path, clientOptions = {}) {
  const response = await rawRequest(path, {
    method: 'HEAD',
    headers: { Prefer: 'count=exact' }
  }, clientOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase count failed (${response.status}): ${errorText}`);
  }

  const contentRange = response.headers.get('content-range') || '0-0/0';
  return Number(contentRange.split('/')[1] || 0);
}

function encodeStoragePath(path) {
  return String(path)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function getStoragePublicUrl(bucket, path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeStoragePath(path)}`;
}

function parseDataUrl(input) {
  const raw = String(input || '');
  const match = /^data:([^;]+);base64,(.*)$/.exec(raw);
  if (!match) {
    return {
      contentType: 'application/octet-stream',
      buffer: Buffer.from(raw, 'base64')
    };
  }

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], 'base64')
  };
}

async function uploadToStorage({ bucket, path, buffer, contentType, upsert = true }, { useServiceRole = true } = {}) {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeStoragePath(path)}`, {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(useServiceRole),
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': upsert ? 'true' : 'false'
    },
    body: buffer
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase storage upload failed (${response.status}): ${errorText}`);
  }

  return {
    path,
    publicUrl: getStoragePublicUrl(bucket, path)
  };
}

async function deleteFromStorage({ bucket, path }, { useServiceRole = true } = {}) {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeStoragePath(path)}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(useServiceRole)
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Supabase storage delete failed (${response.status}): ${errorText}`);
  }

  return true;
}

module.exports = {
  getSupabaseConfig,
  supabaseRequest,
  supabaseCount,
  parseDataUrl,
  uploadToStorage,
  deleteFromStorage,
  getStoragePublicUrl
};
