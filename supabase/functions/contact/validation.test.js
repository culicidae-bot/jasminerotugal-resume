import assert from 'node:assert/strict';
import test from 'node:test';
import {
  corsHeaders,
  normalizeAllowedOrigin,
  readJsonBody,
  validPreflight,
  validateContactBody,
} from './validation.js';

const allowedOrigin = 'https://portfolio.example';

test('allowed website Origin is exact and must be an origin without a path', () => {
  assert.equal(normalizeAllowedOrigin(allowedOrigin), allowedOrigin);
  assert.equal(normalizeAllowedOrigin(`${allowedOrigin}/`), null);
  const unexpectedOrigin = `${allowedOrigin}.attacker.example`;
  assert.equal(normalizeAllowedOrigin(unexpectedOrigin), unexpectedOrigin);
  assert.equal(normalizeAllowedOrigin('javascript:alert(1)'), null);
  assert.equal(normalizeAllowedOrigin('http://portfolio.example'), null);
  assert.equal(normalizeAllowedOrigin('http://localhost:5173'), 'http://localhost:5173');

  const headers = corsHeaders(unexpectedOrigin, allowedOrigin);
  assert.equal(headers.has('access-control-allow-origin'), false);
});

test('CORS preflight permits only POST and approved request headers from the allowed Origin', () => {
  const accepted = new Request(`${allowedOrigin}/functions/v1/contact`, {
    method: 'OPTIONS',
    headers: {
      origin: allowedOrigin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'authorization, apikey, content-type, x-client-info',
    },
  });
  assert.equal(validPreflight(accepted, allowedOrigin), true);

  const wrongMethod = new Request(`${allowedOrigin}/functions/v1/contact`, {
    method: 'OPTIONS',
    headers: {
      origin: allowedOrigin,
      'access-control-request-method': 'DELETE',
    },
  });
  assert.equal(validPreflight(wrongMethod, allowedOrigin), false);

  const wrongHeader = new Request(`${allowedOrigin}/functions/v1/contact`, {
    method: 'OPTIONS',
    headers: {
      origin: allowedOrigin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'x-unauthorized',
    },
  });
  assert.equal(validPreflight(wrongHeader, allowedOrigin), false);
});

test('request body limit counts UTF-8 bytes and rejects invalid JSON', async () => {
  const multibyteBody = JSON.stringify({ message: '😀'.repeat(2500) });
  assert.ok(new TextEncoder().encode(multibyteBody).byteLength > 10000);
  await assert.rejects(
    readJsonBody(new Request(`${allowedOrigin}/contact`, { method: 'POST', body: multibyteBody })),
    /too large/,
  );
  await assert.rejects(
    readJsonBody(new Request(`${allowedOrigin}/contact`, { method: 'POST', body: '{invalid' })),
  );
});

test('contact validation retains the honeypot and field constraints', () => {
  assert.deepEqual(
    validateContactBody({
      name: ' Jasmine ',
      email: 'jasmine@example.com',
      message: 'Hello',
      honeypot: '',
    }),
    {
      valid: true,
      name: 'Jasmine',
      email: 'jasmine@example.com',
      message: 'Hello',
      honeypot: false,
    },
  );
  assert.equal(
    validateContactBody({ name: 'Bot', email: 'bot@example.com', message: 'Hello', honeypot: 'filled' })
      .honeypot,
    true,
  );
  assert.equal(
    validateContactBody({ name: 'Jasmine', email: 'invalid', message: 'Hello', honeypot: '' }).valid,
    false,
  );
});
