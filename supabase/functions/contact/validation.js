const MAX_BODY_BYTES = 10000;
const ALLOWED_HEADERS = new Set(['apikey', 'authorization', 'content-type', 'x-client-info']);

export function normalizeAllowedOrigin(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    const isLocalHttp =
      url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !isLocalHttp) ||
      url.origin !== value ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function isAllowedOrigin(requestOrigin, allowedOrigin) {
  return Boolean(allowedOrigin && requestOrigin && requestOrigin === allowedOrigin);
}

export function corsHeaders(origin, allowedOrigin) {
  const headers = new Headers({
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  });
  if (isAllowedOrigin(origin, allowedOrigin)) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
  }
  return headers;
}

export function validPreflight(request, allowedOrigin) {
  if (!isAllowedOrigin(request.headers.get('origin') ?? '', allowedOrigin)) return false;
  if ((request.headers.get('access-control-request-method') ?? '').toUpperCase() !== 'POST') return false;

  const requestedHeaders = (request.headers.get('access-control-request-headers') ?? '')
    .split(',')
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);
  return requestedHeaders.every((header) => ALLOWED_HEADERS.has(header));
}

export async function readJsonBody(request, maximumBytes = MAX_BODY_BYTES) {
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > maximumBytes) {
    throw new Error('Request body is too large.');
  }
  if (!request.body) throw new Error('Request body is empty.');

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new Error('Request body is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const body = JSON.parse(text);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Request body must be a JSON object.');
  }
  return body;
}

function normalizedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateContactBody(body) {
  const name = normalizedString(body.name);
  const email = normalizedString(body.email);
  const message = normalizedString(body.message);
  const honeypot = normalizedString(body.honeypot);

  if (honeypot) return { valid: false, honeypot: true };
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (
    !name ||
    name.length > 100 ||
    !email ||
    !validEmail ||
    email.length > 254 ||
    !message ||
    message.length > 1200
  ) {
    return { valid: false, honeypot: false };
  }
  return { valid: true, name, email, message, honeypot: false };
}
