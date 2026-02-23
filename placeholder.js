const { runVercelHandler } = require('./vercel-adapter');

const SVG_NS = 'http://www.w3.org/2000/svg';

const clampDimension = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 32), 2000);
};

const buildPlaceholderSvg = (width, height) => {
  const fontSize = Math.max(14, Math.round(Math.min(width, height) * 0.1));
  const label = `${width} × ${height}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Placeholder ${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#eef2f7" />
      <stop offset="100%" stop-color="#d9e2ec" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)" />
  <g stroke="#9fb3c8" stroke-width="2" opacity="0.75">
    <line x1="0" y1="0" x2="${width}" y2="${height}" />
    <line x1="${width}" y1="0" x2="0" y2="${height}" />
  </g>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
    fill="#4f5d75" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600">${label}</text>
</svg>`;
};

const resolvePathPart = (query = {}) => {
  const fromPath = query.path;
  if (typeof fromPath === 'string' && fromPath.length > 0) return fromPath;

  const fromFn = query.fn;
  if (typeof fromFn === 'string' && fromFn.length > 0) {
    const prefix = 'placeholder/';
    return fromFn.startsWith(prefix) ? fromFn.slice(prefix.length) : fromFn;
  }

  return '';
};

exports.handler = async (event = {}) => {
  const pathPart = resolvePathPart(event?.queryStringParameters || {});
  const [rawWidth, rawHeight] = String(pathPart).split('/');
  const width = clampDimension(rawWidth, 400);
  const height = clampDimension(rawHeight, 600);

  const svg = buildPlaceholderSvg(width, height);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    },
    body: svg
  };
};

const placeholderVercelHandler = async (req, res) => runVercelHandler(exports.handler, req, res);

module.exports = placeholderVercelHandler;
module.exports.handler = exports.handler;
