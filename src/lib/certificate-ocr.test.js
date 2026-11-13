import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeLines,
  parseCertificateText,
  suggestCertificateType,
} from './certificate-ocr.js';

const CLEAN_CERT = `
Isabela State University
CERTIFICATE OF COMPLETION
This certificate is presented to
Jasmine L. Rotugal
for successfully completing the Network Security Fundamentals course
on August 9, 2026
Isabela State University Cauayan Campus
Credential No: ISU-2026-08142
https://verify.example.edu/isuone/certificates/ISU-2026-08142
`;

const OCR_CERT = `
osc\ncert|ficate of achievement\nnetlink solutions inc\nthis certifies that\nJasmine L Rotugal\nis awarded this certificate for completing the linux administration training\n09/14/2025\ncertificate no: SY-8841-2025\nvalid: https://verify.example.com/cert/8821
`;

const NO_DATE_CERT = `
Sample Training Center
Certificate of Attendance
Jasmine L. Rotugal attended the Workshop on Web Security
Certificate number WT-001
`;

test('normalizeLines normalizes and filters input', () => {
  assert.deepEqual(normalizeLines('  A  B \n\n C\r\n'), ['A B', 'C']);
  assert.equal(normalizeLines('').length, 0);
  assert.equal(normalizeLines(null).length, 0);
});

test('clean text extraction: title, issuer, date, verify URL, credential id', () => {
  const parsed = parseCertificateText(CLEAN_CERT);
  assert.equal(parsed.fields.title.value, 'Certificate of Completion');
  assert.equal(parsed.fields.title.confidence, 'high');
  assert.equal(parsed.fields.issuer.value, 'Isabela State University Cauayan Campus');
  assert.equal(parsed.fields.dateEarned.value, '2026-08-09');
  assert.equal(parsed.fields.verifyUrl.value, 'https://verify.example.edu/isuone/certificates/ISU-2026-08142');
  assert.equal(parsed.fields.verifyUrl.confidence, 'high');
  assert.equal(parsed.fields.credentialId.value, 'ISU-2026-08142');
  assert.equal(parsed.fields.recipient.value, 'Jasmine L. Rotugal');
});

test('OCR-like extraction with mixed case and noise', () => {
  const parsed = parseCertificateText(OCR_CERT);
  assert.match(parsed.fields.title.value, /achievement/i);
  assert.match(parsed.fields.issuer.value, /Netlink Solutions Inc/i);
  assert.equal(parsed.fields.dateEarned.value, '2025-09-14');
  assert.equal(parsed.fields.verifyUrl.value, 'https://verify.example.com/cert/8821');
  assert.equal(parsed.fields.credentialId.value, 'SY-8841-2025');
  assert.equal(parsed.fields.recipient.value, 'Jasmine L Rotugal');
});

test('missing date returns blank with note', () => {
  const parsed = parseCertificateText(NO_DATE_CERT);
  assert.equal(parsed.fields.dateEarned.value, '');
  assert.equal(parsed.fields.dateEarned.confidence, 'missing');
  assert.match(parsed.notes.join(' '), /date/i);
});

test('multiple dates prefer the issue-keyword date', () => {
  const text = 'Sample Institute\nCertificate of Completion\nvalid from January 2026 to December 2026\nawarded on March 14, 2026';
  const parsed = parseCertificateText(text);
  assert.equal(parsed.fields.dateEarned.value, '2026-03-14');
});

test('ambiguous numeric dates are flagged', () => {
  const text = 'Sample Institute\nCertificate of Completion\nissued 05/06/2026';
  const parsed = parseCertificateText(text);
  assert.equal(parsed.fields.dateEarned.value, '2026-05-06');
  assert.equal(parsed.fields.dateEarned.confidence, 'low');
  assert.match(parsed.notes.join(' '), /ambiguous/i);
});

test('multiple possible issuers are flagged instead of guessed', () => {
  const text = 'Isabela State University\nSample Learning Institute\nCertificate of Completion\nJasmine L. Rotugal\nawarded August 9, 2026';
  const parsed = parseCertificateText(text);
  assert.equal(parsed.fields.issuer.confidence, 'low');
  assert.match(parsed.notes.join(' '), /multiple/i);
});

test('title falls back to low-confidence longest line rather than inventing', () => {
  const text = 'Some Random Line\nAnother Very Long Line With Words And More Words\nissued 2026-08-09';
  const parsed = parseCertificateText(text);
  assert.ok(parsed.fields.title.confidence === 'low' || parsed.fields.title.confidence === 'medium');
});

test('date formats are all recognized', () => {
  const cases = [
    ['on August 9, 2026', '2026-08-09'],
    ['on 9 August 2026', '2026-08-09'],
    ['on 09 August 2026', '2026-08-09'],
    ['on 2026-08-09', '2026-08-09'],
    ['on 2026/08/09', '2026-08-09'],
  ];
  for (const [line, expected] of cases) {
    const parsed = parseCertificateText(`Sample Institute\nissued ${line}`);
    assert.equal(parsed.fields.dateEarned.value, expected, `failed for: ${line}`);
  }
});

test('expiry dates are not picked as issue dates', () => {
  const text = 'Sample Institute\nCertificate of Completion\nissued March 14, 2026\nvalid until March 2029';
  const parsed = parseCertificateText(text);
  assert.equal(parsed.fields.dateEarned.value, '2026-03-14');
});

test('invalid calendar dates are rejected', () => {
  const text = 'Sample Institute\nCertificate of Completion\nissued February 30, 2026';
  const parsed = parseCertificateText(text);
  assert.equal(parsed.fields.dateEarned.value, '');
});

test('type suggestion: award beats certificate keywords', () => {
  assert.equal(suggestCertificateType('Certificate of Outstanding Achievement Award').value, 'Award');
  assert.equal(suggestCertificateType('Certificate of Completion — Cybersecurity Training').value, 'Training');
  assert.equal(suggestCertificateType('Participation Certificate — Networking Seminar').value, 'Seminar');
  assert.equal(suggestCertificateType('certificate workshop attendant').value, 'Workshop');
  assert.equal(suggestCertificateType('Certificate of Completion — Linux Fundamentals').value, 'IT Certification');
  assert.equal(suggestCertificateType('Certificate of Completion').value, '');
});

test('empty input produces all-missing fields with notes', () => {
  const parsed = parseCertificateText('');
  for (const [key, field] of Object.entries(parsed.fields)) {
    assert.equal(field.confidence, 'missing', `expected ${key} to be missing`);
    assert.equal(field.value, '', `expected ${key} to be blank`);
  }
  assert.ok(parsed.notes.length >= 3);
});

test('verify URL ignores prose and keeps https links', () => {
  const parsed = parseCertificateText('Sample Institute\nView verification at https://registry.example.org/verify/123.\nno link here');
  assert.equal(parsed.fields.verifyUrl.value, 'https://registry.example.org/verify/123');
});

test('control characters are stripped from fields', () => {
  const parsed = parseCertificateText('Sample Institute\n   Certificate of Completion   \n\n\nissued August 9, 2026');
  assert.equal(parsed.fields.title.value.includes('\n'), false);
});

test('real-world OCR output with symbol noise extracts and maps all fields', () => {
  const text = [
    'CERTIFICATE OF COMPLETION',
    '',
    'This certificate is awarded to',
    '',
    '°',
    'Jasmine L. Rotugal',
    'for successfully completing the Network Security Fundamentals course',
    'awarded on August 9, 2026',
    'Credential No: ISU-2026-08142',
    'Verify: https: //verify.example.edu /isuone/ certificates /ISU-2026-08142',
    '',
    'Office of Continuing Education',
  ].join('\n');
  const parsed = parseCertificateText(text);
  assert.equal(parsed.fields.title.value, 'Certificate of Completion');
  assert.equal(parsed.fields.recipient.value, 'Jasmine L. Rotugal');
  assert.equal(parsed.fields.dateEarned.value, '2026-08-09');
  assert.equal(parsed.fields.verifyUrl.value, 'https://verify.example.edu/isuone/certificates/ISU-2026-08142');
  assert.equal(parsed.fields.credentialId.value, 'ISU-2026-08142');
});

test('URL broken with spaces in OCR output is recovered', () => {
  const parsed = parseCertificateText('Sample Institute\nCertified verify: https: //registry.example.com /cred /99-XYZ');
  assert.equal(parsed.fields.verifyUrl.value, 'https://registry.example.com/cred/99-XYZ');
});
