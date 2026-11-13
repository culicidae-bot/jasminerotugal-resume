import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyDocument } from './document-classifier.js';

const CERT_CTF = 'Capture the Flag competition certificate. Awarded to Jasmine L. Rotugal for participating in the 2025 CTF.';
const CERT_SEMINAR = 'Certificate of Attendance awarded to Jasmine L. Rotugal for attending the Web Security Seminar presented by Sample Institute.';
const AWARD_ATTENDANCE = 'Certificate of Participation in the 2026 regional CTF competition. This is awarded to the top finishers.';
const ACH_WINNER = 'This certificate is awarded to Jasmine L. Rotugal, Winner of the 2026 National Cybersecurity Competition.';
const ACH_ACADEMIC = 'Academic Distinction — Dean\'s List awarded to Jasmine L. Rotugal for outstanding academic performance.';
const AMBIGUOUS = 'This document certifies that Jasmine L. Rotugal attended an event hosted by Sample Institute.';

test('competition participation certificate is suggested as Certificate / Competition', () => {
  const result = classifyDocument(CERT_SEMINAR);
  assert.equal(result.destination, 'certificate');
  assert.equal(result.category, 'Seminar');
});

test('CTF participation is certificate destination and CTF or Competition category', () => {
  const result = classifyDocument(CERT_CTF);
  assert.equal(result.destination, 'certificate');
  assert.ok(result.category === 'CTF' || result.category === 'Competition');
});

test('competition winner is achievement destination with high confidence', () => {
  const result = classifyDocument(ACH_WINNER);
  assert.equal(result.destination, 'achievement');
  assert.equal(result.destinationConfidence, 'high');
  assert.equal(result.category, 'Award');
});

test('academic distinction maps to Academic Recognition', () => {
  const result = classifyDocument(ACH_ACADEMIC);
  assert.equal(result.destination, 'achievement');
  assert.equal(result.category, 'Academic Recognition');
});

test('ambiguous text marks needsReview instead of asserting', () => {
  const result = classifyDocument(AMBIGUOUS);
  assert.equal(result.needsReview, true);
  assert.ok(['low', 'medium'].includes(result.destinationConfidence));
});

test('certificate of participation never defaults to Award', () => {
  const result = classifyDocument(AWARD_ATTENDANCE);
  assert.equal(result.destination, 'certificate');
});

test('evidence list is non-empty and strings', () => {
  const result = classifyDocument(CERT_SEMINAR);
  assert.ok(Array.isArray(result.destinationEvidence));
  assert.ok(result.destinationEvidence.length > 0);
  for (const item of result.destinationEvidence) assert.equal(typeof item, 'string');
});
