import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnoseSupabaseConfig } from './supabase.js';

const okUrl = 'https://dbgiqrsytrkmqfugtsvs.supabase.co';
const okKey = 'sb_publishable_abc123';

test('returns null for a valid configuration', () => {
  assert.equal(diagnoseSupabaseConfig({ url: okUrl, key: okKey }), null);
  assert.equal(diagnoseSupabaseConfig({ url: 'http://127.0.0.1:54321', key: okKey }), null);
});

test('reports a missing project URL without revealing values', () => {
  assert.equal(diagnoseSupabaseConfig({ url: '', key: okKey }), 'VITE_SUPABASE_URL is empty at build time');
  assert.equal(diagnoseSupabaseConfig({ url: '   ', key: okKey }), 'VITE_SUPABASE_URL is empty at build time');
});

test('reports the placeholder project origin', () => {
  assert.equal(
    diagnoseSupabaseConfig({ url: 'https://REPLACE_WITH_SUPABASE_PROJECT_ORIGIN', key: okKey }),
    'VITE_SUPABASE_URL still contains the placeholder project origin',
  );
  assert.equal(
    diagnoseSupabaseConfig({ url: 'https://your-project.supabase.co', key: okKey }),
    'VITE_SUPABASE_URL still contains the placeholder project origin',
  );
});

test('rejects malformed or non-https project URLs', () => {
  assert.equal(diagnoseSupabaseConfig({ url: 'not-a-url', key: okKey }), 'VITE_SUPABASE_URL is not a valid URL');
  assert.equal(
    diagnoseSupabaseConfig({ url: 'http://dbgiqrsytrkmqfugtsvs.supabase.co', key: okKey }),
    'VITE_SUPABASE_URL must be an https:// project origin without credentials',
  );
  assert.equal(
    diagnoseSupabaseConfig({ url: 'https://user:pass@dbgiqrsytrkmqfugtsvs.supabase.co', key: okKey }),
    'VITE_SUPABASE_URL must be an https:// project origin without credentials',
  );
});

test('rejects project URLs that are not Supabase origins', () => {
  assert.equal(
    diagnoseSupabaseConfig({ url: 'https://example.com', key: okKey }),
    'VITE_SUPABASE_URL does not look like a Supabase project origin',
  );
});

test('reports a missing or placeholder anon key', () => {
  assert.equal(diagnoseSupabaseConfig({ url: okUrl, key: '' }), 'VITE_SUPABASE_ANON_KEY is empty at build time');
  assert.equal(
    diagnoseSupabaseConfig({ url: okUrl, key: 'REPLACE_WITH_SUPABASE_ANON_KEY' }),
    'VITE_SUPABASE_ANON_KEY still contains the placeholder key',
  );
});
