import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('public fallback content contains no template instructions or fictional records', () => {
  const strings = collectStrings(content);
  assert.ok(strings.every(
    (value) => !/\[TODO:|Not yet added|Image placeholder|\$ whoami|edit the source files/i.test(value),
  ));
  assert.equal(content.skills.length, 0);
  assert.equal(content.certificates.length, 0);
  assert.deepEqual(content.experience, {
    work: [],
    internship: [],
    volunteer: [],
    academic: [{
      id: 'packet-capture-ctf-osint',
      role: 'CTF participant',
      organization: 'PacketCapture CTF',
      summary: 'Solved an OSINT challenge by following clues from an image through public social media posts.',
    }],
  });
  assert.equal(content.projects.length, 0);
  assert.equal(content.resumePath, '/resume/RotugalJasmine.pdf');
});

test('public profile uses only the supplied identity, study, and career focus', () => {
  assert.equal(content.hero.name, 'Jasmine L. Rotugal');
  assert.equal(
    content.hero.title,
    'BSIT Student | Aspiring Cybersecurity and Network Security Professional',
  );
  assert.match(content.hero.focus, /BSIT student at Isabela State University – Cauayan Campus/i);
  assert.match(content.hero.focus, /cybersecurity and network security/i);
  assert.match(content.hero.focus, /PacketCapture CTF/i);
  assert.match(content.about.introduction, /public social media posts/i);
  assert.equal(content.sections.about.title, 'About');
  assert.equal(content.sections.about.intro, '');
  assert.equal(content.sections.education.title, 'Education');
  assert.equal(content.sections.education.intro, '');
  assert.equal(
    content.about.careerObjective,
    'To build a career in cybersecurity and network security by applying my information technology education and continuing to learn.',
  );
  assert.equal(content.education.tertiary.institution, 'Isabela State University – Cauayan Campus');
  assert.equal(
    content.education.tertiary.course,
    'Bachelor of Science in Information Technology (BSIT)',
  );
  assert.equal(content.education.tertiary.yearGraduated, 'Expected 2027');
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

test('downloadable resume is a real one-page text PDF', () => {
  const pdf = readFileSync(new URL('../../public/resume/RotugalJasmine.pdf', import.meta.url));
  const source = pdf.toString('latin1');
  assert.equal(source.slice(0, 8), '%PDF-1.4');
  assert.match(source, /\/Type\s*\/Page\b/);
  assert.match(source, /\/Font/);
  assert.match(source, /Jasmine L\. Rotugal/);
});
