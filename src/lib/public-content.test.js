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
  assert.deepEqual(content.experience, { work: [], internship: [], volunteer: [] });
  assert.equal(content.projects.length, 0);
  assert.equal(content.resumePath, '/resume/RotugalJasmine.pdf');
});

test('public profile uses only the supplied identity, study, and career focus', () => {
  assert.equal(content.hero.name, 'Jasmine L. Rotugal');
  assert.equal(content.hero.title, 'Aspiring Cybersecurity and Network Security Professional');
  assert.match(content.hero.focus, /current .* student/i);
  assert.equal(content.education.tertiary.institution, 'Isabela State University – Cauayan');
  assert.equal(content.education.tertiary.yearGraduated, null);
});

test('downloadable resume is a real one-page text PDF', () => {
  const pdf = readFileSync(new URL('../../public/resume/RotugalJasmine.pdf', import.meta.url));
  const source = pdf.toString('latin1');
  assert.equal(source.slice(0, 8), '%PDF-1.4');
  assert.match(source, /\/Type\s*\/Page\b/);
  assert.match(source, /\/Font/);
  assert.match(source, /Jasmine L\. Rotugal/);
});
