import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FEATURED_LIMITS,
  RESUME_SOFT_LIMITS,
  isFeatured,
  isResumeSelected,
  priorityOf,
  selectFeatured,
  selectResume,
  sortByPriority,
  splitRecords,
} from './prioritize.js';

const rec = (id, extra = {}) => ({ id, name: id, ...extra });

test('priorityOf defaults, clamps, and parses values', () => {
  assert.equal(priorityOf(undefined), 1000);
  assert.equal(priorityOf(rec('a')), 1000);
  assert.equal(priorityOf(rec('a', { priority: '' })), 1000);
  assert.equal(priorityOf(rec('a', { priority: '5' })), 5);
  assert.equal(priorityOf(rec('a', { priority: 10 })), 10);
  assert.equal(priorityOf(rec('a', { priority: 'not-a-number' })), 1000);
});

test('sortByPriority orders ascending and is stable for ties', () => {
  const items = [rec('b'), rec('a', { priority: 1 }), rec('c', { priority: 1 })];
  assert.deepEqual(sortByPriority(items).map((item) => item.id), ['a', 'c', 'b']);
});

test('sortByPriority applies an optional tie-break', () => {
  const items = [rec('b', { priority: 1 }), rec('a', { priority: 1 })];
  const tieBreak = (first, second) => first.id.localeCompare(second.id);
  assert.deepEqual(sortByPriority(items, tieBreak).map((item) => item.id), ['a', 'b']);
});

test('selectFeatured returns top-N by priority when nothing is marked', () => {
  const items = Array.from({ length: 12 }, (_, index) => rec(`s${index}`, { priority: index + 1 }));
  const selected = selectFeatured(items, FEATURED_LIMITS.skills);
  assert.equal(selected.length, 8);
  assert.deepEqual(selected.map((item) => item.id), ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7']);
});

test('selectFeatured prefers explicitly featured records over the fallback', () => {
  const items = Array.from({ length: 12 }, (_, index) => rec(`s${index}`));
  items[10].featured = true;
  items[3].featured = true;
  const selected = selectFeatured(items, 8);
  assert.deepEqual(selected.map((item) => item.id), ['s3', 's10']);
});

test('selectFeatured does not drop records from the underlying collection', () => {
  const items = Array.from({ length: 12 }, (_, index) => rec(`s${index}`));
  assert.equal(selectFeatured(items, 8).length, 8);
  assert.equal(items.length, 12);
});

test('resume and featured flags are independent', () => {
  const onWebsiteOnly = rec('site', { featured: true });
  const resumeOnly = rec('resume', { resume: true });
  assert.equal(isFeatured(resumeOnly), false);
  assert.equal(isResumeSelected(onWebsiteOnly), true); // legacy default
  const excluded = rec('no-resume', { resume: false, featured: true });
  assert.equal(isFeatured(excluded), true);
  assert.equal(isResumeSelected(excluded), false);
});

test('selectResume includes legacy records up to the soft limit', () => {
  const items = Array.from({ length: 15 }, (_, index) => rec(`s${index}`, { priority: index + 1 }));
  const selected = selectResume(items, RESUME_SOFT_LIMITS.skills);
  assert.equal(selected.length, 10);
  assert.deepEqual(selected.map((item) => item.id), items.slice(0, 10).map((item) => item.id));
});

test('selectResume respects explicit opt-outs', () => {
  const items = [
    rec('a', { resume: false }),
    rec('b'),
    rec('c', { resume: false }),
    rec('d'),
  ];
  const selected = selectResume(items, 10);
  assert.deepEqual(selected.map((item) => item.id), ['b', 'd']);
});

test('selectResume explicit selections are not capped', () => {
  const items = Array.from({ length: 15 }, (_, index) => rec(`s${index}`, { resume: true }));
  assert.equal(selectResume(items, 3).length, 15);
});

test('splitRecords divides certificates from achievements', () => {
  const { certificates, achievements } = splitRecords([
    { id: 'c1', type: 'IT Certification' },
    { id: 'a1', type: 'Award' },
    { id: 'a2', type: 'Achievement' },
    { id: 'c2', type: 'Workshop' },
  ]);
  assert.deepEqual(certificates.map((item) => item.id), ['c1', 'c2']);
  assert.deepEqual(achievements.map((item) => item.id), ['a1', 'a2']);
});
