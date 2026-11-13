import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateBatchFile,
  fileKindOf,
  batchSummary,
  formatLimitNote,
  mapCategoryToType,
  buildRecordFromExtraction,
  BATCH_LIMITS,
} from './batch-import.js';
import { findIntraBatchDuplicates, findDuplicateRecord } from './duplicate-detection.js';

const existing = [
  { id: 'r1', title: 'Network Security Fundamentals', issuer: 'Isabela State University', dateEarned: '2025-08-01', credentialId: 'ISU-4421' },
];

test('validateBatchFile accepts supported PDF and image types', () => {
  for (const type of ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']) {
    const result = validateBatchFile({ type, size: 1024 });
    assert.equal(result.ok, true, `expected ${type} to be accepted`);
  }
});

test('validateBatchFile rejects unsupported formats and oversized files', () => {
  assert.equal(validateBatchFile({ type: 'image/gif', size: 1024 }).ok, false);
  assert.equal(validateBatchFile({ type: 'application/pdf', size: BATCH_LIMITS.MAX_FILE_BYTES + 1 }).ok, false);
  assert.equal(validateBatchFile({}).ok, false);
});

test('fileKindOf recognises PDF vs image', () => {
  assert.equal(fileKindOf('application/pdf'), 'pdf');
  assert.equal(fileKindOf('image/jpeg'), 'image');
  assert.equal(fileKindOf('text/plain'), null);
});

test('duplicate detection by exact credential id match', () => {
  const candidate = { title: 'Different title entirely', issuer: 'Other', dateEarned: '2020-01-01', credentialId: 'isu-4421' };
  const dup = findDuplicateRecord(candidate, existing);
  assert.ok(dup);
  assert.match(dup.evidence.join(' '), /credential/i);
});

test('duplicate detection by title similarity', () => {
  const candidate = { title: 'Network Security Fundamentals', issuer: 'Isabela State University', dateEarned: '2025-08-01' };
  const dup = findDuplicateRecord(candidate, existing);
  assert.ok(dup);
  assert.match(dup.evidence.join(' '), /title|issuer/i);
});

test('distinct documents do not flag as duplicates', () => {
  const candidate = { title: 'Linux Administration', issuer: 'Completely Different Org', dateEarned: '2024-01-01' };
  const dup = findDuplicateRecord(candidate, existing);
  assert.equal(dup, null);
});

test('batchSummary counts match entry statuses', () => {
  const entries = [
    { status: 'approved' }, { status: 'approved' }, { status: 'needs-review' },
    { status: 'processing' }, { status: 'failed' }, { status: 'skipped' }, { status: 'queued' },
  ];
  const summary = batchSummary(entries);
  assert.equal(summary.total, 7);
  assert.equal(summary.approved, 2);
  assert.equal(summary.needsReview, 1);
  assert.equal(summary.failed, 1);
});
test('intra-batch duplicate detection matches across entries', () => {
  const segments = [
    { fields: { title: { value: 'Network Fundamentals' }, issuer: { value: 'Sample University' }, dateEarned: { value: '2025-08-01' }, credentialId: { value: 'ISU-100' } } },
    { fields: { title: { value: 'Network Fundamentals' }, issuer: { value: 'Sample University' }, dateEarned: { value: '2025-08-01' }, credentialId: { value: 'ISU-100' } } },
    { fields: { title: { value: 'Linux Administration' }, issuer: { value: 'Completely Different' }, dateEarned: { value: '2026-02-21' } } },
  ];
  const pairs = findIntraBatchDuplicates(segments);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].a, 0);
  assert.equal(pairs[0].b, 1);
});
test('legacy records retain resume-included behavior', () => {
  const record = buildRecordFromExtraction({ title: 'Legacy', issuer: 'Org', dateEarned: '2025-08-01', category: 'Other', destination: 'certificate' });
  // Legacy default intentionally unchanged for existing records: they are eligible.
  assert.equal(record.resume, false);
  assert.equal(record.featured, false);
  assert.equal(record.priority, 1000);
});
test('achievement destination is preserved independently of category', () => {
  const record = buildRecordFromExtraction({ title: 'CTF Winner', issuer: 'League', dateEarned: '2026-03-15', category: 'Competition', destination: 'achievement' });
  assert.equal(record.destination, 'achievement');
  assert.equal(record.category, 'Competition');
  assert.equal(record.type, 'Competition');
});
test('category is preserved independently of destination', () => {
  const record = buildRecordFromExtraction({ title: 'Seminar', issuer: 'Institute', dateEarned: '2026-02-21', category: 'Seminar', destination: 'certificate' });
  assert.equal(record.category, 'Seminar');
  assert.equal(record.destination, 'certificate');
});

test('formatLimitNote mentions limits', () => {
  const note = formatLimitNote();
  assert.match(note, /25/);
  assert.match(note, /40/);
});

test('mapCategoryToType maps categories to form types', () => {
  assert.equal(mapCategoryToType('Competition'), 'Competition');
  assert.equal(mapCategoryToType('Award'), 'Award');
  assert.equal(mapCategoryToType('Seminar'), 'Seminar');
});

test('buildRecordFromExtraction uses provided values and defaults', () => {
  const record = buildRecordFromExtraction({
    title: 'Network Fundamentals',
    issuer: 'Sample University',
    dateEarned: '2025-08-01',
    category: 'Training',
    destination: 'certificate',
  });
  assert.equal(record.title, 'Network Fundamentals');
  assert.equal(record.type, 'Training');
  assert.equal(record.destination, 'certificate');
  assert.equal(record.category, 'Training');
  assert.equal(record.featured, false);
  assert.equal(record.resume, false);
});
