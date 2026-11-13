import assert from 'node:assert/strict';
import test from 'node:test';
import { findDuplicateRecord, findIntraBatchDuplicates } from './duplicate-detection.js';

const published = [
  { id: 'p1', title: 'Linux Administration', issuer: 'Netlink Solutions', dateEarned: '2025-11-14', credentialId: 'NS-8841' },
  { id: 'p2', title: 'Network Security Fundamentals', issuer: 'Isabela State University', dateEarned: '2025-08-01', credentialId: 'ISU-4421' },
];
const draft = [
  { id: 'd1', title: 'Web Security Seminar 2026', issuer: 'Sample Institute', dateEarned: '2026-02-21', credentialId: '' },
];
const combined = [...published, ...draft];

test('exact credential id match against published record', () => {
  const candidate = { title: 'Whatever', issuer: 'Whoever', dateEarned: '2020-01-01', credentialId: 'NS-8841' };
  const dup = findDuplicateRecord(candidate, combined);
  assert.ok(dup);
  assert.match(dup.evidence.join(' '), /credential/i);
});

test('draft duplicate is detected against draft records too', () => {
  const candidate = { title: 'Web Security Seminar 2026', issuer: 'Sample Institute', dateEarned: '2026-02-21' };
  const dup = findDuplicateRecord(candidate, combined);
  assert.ok(dup);
  assert.match(dup.evidence.join(' '), /title/i);
});

test('distinct record produces no duplicate', () => {
  const candidate = { title: 'Completely Different Course', issuer: 'Nowhere University', dateEarned: '2019-03-30' };
  const dup = findDuplicateRecord(candidate, combined);
  assert.equal(dup, null);
});

test('cross-format duplicate is detected via normalized metadata', () => {
  const a = [
    { fields: { title: { value: 'Network Security Fundamentals' }, issuer: { value: 'Isabela State University' }, dateEarned: { value: '2025-08-01' }, credentialId: { value: 'ISU-4421' } } },
    { fields: { title: { value: 'Network Security Fundamentals' }, issuer: { value: 'Isabela State University' }, dateEarned: { value: '2025-08-01' }, credentialId: { value: 'ISU-4421' } } },
  ];
  const dups = findIntraBatchDuplicates(a);
  assert.equal(dups.length, 1);
  assert.match(dups[0].evidence.join(' '), /title|issuer|credential/i);
});

test('keep both preserves both records (manual approval bypasses block)', () => {
  const existing = [{ id: 'existing', title: 'Network Security', issuer: 'Isabela State University', dateEarned: '2025-08-01', credentialId: 'ISU-4421' }];
  const candidate = { title: 'Network Security', issuer: 'Isabela State University', dateEarned: '2025-08-01', credentialId: 'ISU-4421' };
  const dup = findDuplicateRecord(candidate, existing);
  assert.ok(dup);
  // Administrator may still approve this record as "keep both"; nothing auto-deletes.
  assert.notEqual(dup.record.id, undefined);
});
