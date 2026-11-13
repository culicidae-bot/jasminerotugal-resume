import assert from 'node:assert/strict';
import test from 'node:test';
import { content } from '../data/content.js';

function collectStrings(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, output));
  else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStrings(item, output));
  }
  return output;
}

test('public fallback content is a structural skeleton with no personal data', () => {
  const strings = collectStrings(content);
  assert.ok(
    strings.every(
      (value) => !/Jasmine|Rotugal|Isabela|PacketCapture|Cauayan|\bBSIT\b/i.test(value),
    ),
    'the base content must not contain personal or institutional details',
  );
  assert.ok(strings.every((value) => !/@/.test(value)), 'the base content must not contain an email address');

  assert.equal(content.hero.name, '');
  assert.equal(content.hero.title, '');
  assert.equal(content.hero.focus, '');
  assert.equal(content.about.introduction, '');
  assert.equal(content.about.careerObjective, '');
  assert.equal(content.about.educationSummary, '');
  assert.deepEqual(content.about.interests, []);
  assert.equal(content.contact.email, null);
  assert.equal(content.contact.github, null);
  assert.equal(content.contact.linkedin, null);
  assert.equal(content.resumePath, '');
  assert.equal(Object.hasOwn(content.meta, 'siteName'), false);
  assert.equal(content.education.tertiary.institution, null);
  assert.equal(content.education.tertiary.course, null);
  assert.equal(content.education.tertiary.yearGraduated, null);
});

test('public fallback content contains no template instructions or fictional records', () => {
  const strings = collectStrings(content);
  assert.ok(strings.every(
    (value) => !/\[TODO:|Not yet added|Image placeholder|\$ whoami|edit the source files/i.test(value),
  ));
  assert.equal(content.skills.length, 0);
  assert.equal(content.certificates.length, 0);
  assert.equal(content.eligibility.length, 0);
  assert.deepEqual(content.experience, {
    work: [],
    internship: [],
    volunteer: [],
    academic: [],
  });
  assert.equal(content.projects.length, 0);
  assert.deepEqual(content.securityFocus, { profiles: [], writeups: [] });
});

test('public certificate and contact copy is accurate and avoids backend details', () => {
  assert.equal(content.ui.statusLabels['issuer-verifiable'], 'Verification link available');
  assert.equal(content.ui.statusLabels['document-on-file'], 'Document on file');
  assert.equal(content.ui.statusLabels['self-reported'], 'Self-reported');
  assert.match(content.ui.statusDescriptions['issuer-verifiable'], /does not independently confirm/i);
  assert.equal(content.ui.portraitPlaceholder, 'Portrait photograph not provided');
  assert.equal(content.ui.contactLabels.sent, 'Your message was received. Thank you.');
  assert.doesNotMatch(content.ui.contactLabels.hint, /supabase|backend|server|api/i);
  assert.equal(
    content.ui.contactLabels.emailDraft,
    'Your email app should open with a draft. Nothing is sent until you press send.',
  );
});
