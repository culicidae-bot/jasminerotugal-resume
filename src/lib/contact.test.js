import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMailto,
  submitContactMessage,
  validateContact,
} from './contact.js';

const message = {
  name: 'Jasmine Rotugal',
  email: 'jasmine@example.org',
  message: 'Hello, I would like to connect.',
  subject: 'Portfolio enquiry',
  fallbackEmail: 'jasmine@example.org',
};

test('contact fallback requires validated user input and uses the configured email', async () => {
  assert.deepEqual(validateContact(message).errors, {});
  const response = await submitContactMessage(message, { endpoint: '' });

  assert.equal(response.ok, false);
  assert.equal(response.status, 'email-draft');
  assert.match(response.mailto, /^mailto:jasmine%40example\.org\?/);
  assert.match(decodeURIComponent(response.mailto), /Hello, I would like to connect/);
  assert.equal(buildMailto({ ...message, to: 'not-an-email' }), null);
});

test('only an explicit successful backend response is reported as sent', async () => {
  const success = await submitContactMessage(message, {
    endpoint: 'https://contact.example.test',
    fetcher: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    }),
  });
  const ambiguous = await submitContactMessage(message, {
    endpoint: 'https://contact.example.test',
    fetcher: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ message: 'accepted' }),
    }),
  });

  assert.equal(success.ok, true);
  assert.equal(success.status, 'success');
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.status, 'error');
});

test('unavailable contact backend offers mailto fallback without bypassing server rejections', async () => {
  const unavailable = await submitContactMessage(message, {
    endpoint: 'https://contact.example.test',
    fetcher: async () => ({
      ok: false,
      status: 503,
    }),
  });
  const rejected = await submitContactMessage(message, {
    endpoint: 'https://contact.example.test',
    fetcher: async () => ({
      ok: false,
      status: 429,
    }),
  });

  assert.equal(unavailable.status, 'email-draft');
  assert.match(unavailable.mailto, /^mailto:/);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.status, 'error');
  assert.equal(rejected.mailto, undefined);
});

test('network failure falls back to email but never claims the message was sent', async () => {
  const response = await submitContactMessage(message, {
    endpoint: 'https://contact.example.test',
    fetcher: async () => {
      throw new Error('network unavailable');
    },
  });

  assert.equal(response.ok, false);
  assert.equal(response.status, 'email-draft');
  assert.match(response.mailto, /^mailto:/);
});

test('contact fallback fails explicitly when no valid professional email is configured', async () => {
  const unavailable = await submitContactMessage(
    { ...message, fallbackEmail: null },
    { endpoint: '' },
  );
  const networkFailure = await submitContactMessage(
    { ...message, fallbackEmail: null },
    {
      endpoint: 'https://contact.example.test',
      fetcher: async () => {
        throw new Error('network unavailable');
      },
    },
  );

  assert.equal(unavailable.ok, false);
  assert.equal(unavailable.status, 'error');
  assert.equal(unavailable.mailto, undefined);
  assert.equal(networkFailure.ok, false);
  assert.equal(networkFailure.status, 'error');
  assert.equal(networkFailure.mailto, undefined);
});
