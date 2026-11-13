import assert from 'node:assert/strict';
import test from 'node:test';
import { content } from '../data/content.js';
import { resolveSeo } from './seo.js';

function profile() {
  return {
    ...content,
    hero: {
      ...content.hero,
      name: 'Sample Owner',
      title: 'Security Analyst',
      focus: 'A short professional introduction.',
    },
    about: { ...content.about, introduction: 'A longer introduction.' },
  };
}

test('home SEO derives from the admin-managed profile when no SEO override exists', () => {
  const seo = resolveSeo(profile(), 'home');
  assert.equal(seo.title, 'Sample Owner — Security Analyst');
  assert.equal(seo.description, 'A short professional introduction.');
});

test('explicit SEO fields win over profile-derived values', () => {
  const contentWithSeo = {
    ...profile(),
    meta: { ...content.meta, homeTitle: 'Custom title', homeDescription: 'Custom description' },
  };
  const seo = resolveSeo(contentWithSeo, 'home');
  assert.equal(seo.title, 'Custom title');
  assert.equal(seo.description, 'Custom description');
});

test('certificate and not-found SEO fall back to the published identity', () => {
  const certificates = resolveSeo(profile(), 'certificates');
  assert.equal(certificates.title, 'Certificates — Sample Owner');
  assert.match(certificates.description, /Sample Owner/);

  const missing = resolveSeo(profile(), 'not-found');
  assert.equal(missing.title, 'Page not found — Sample Owner');
});

test('empty base content still produces safe generic metadata', () => {
  assert.deepEqual(resolveSeo(content, 'home'), {
    title: 'Portfolio',
    description: 'Professional portfolio.',
  });
  assert.equal(resolveSeo(content, 'certificates').title, 'Certificates');
  assert.equal(resolveSeo(content, 'not-found').title, 'Page not found');
});


import { resolveCanonicalUrl } from './seo.js';

test('canonical URL uses only a valid configured HTTPS origin and public path', () => {
  assert.equal(
    resolveCanonicalUrl('https://portfolio.example', '/certificates?cert=123'),
    'https://portfolio.example/certificates',
  );
  assert.equal(resolveCanonicalUrl('https://portfolio.example/', '/'), 'https://portfolio.example/');
});

test('canonical URL is omitted for missing, non-HTTPS, or non-origin configuration', () => {
  assert.equal(resolveCanonicalUrl('', '/'), null);
  assert.equal(resolveCanonicalUrl('http://portfolio.example', '/'), null);
  assert.equal(resolveCanonicalUrl('https://portfolio.example/path', '/'), null);
  assert.equal(resolveCanonicalUrl('https://user:pass@portfolio.example', '/'), null);
});
