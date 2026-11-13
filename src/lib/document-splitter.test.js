import assert from 'node:assert/strict';
import test from 'node:test';
import { segmentPages, splitSegment, mergeSegments } from './document-splitter.js';

const page = (index, text) => ({ index, text });

test('single page yields one segment', () => {
  const segments = segmentPages([page(0, 'Certificate of Completion awarded to Jasmine Rotugal.')]);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].pageRangeLabel, 'page 1');
});

test('multiple independent single-page certificates are split automatically', () => {
  const pages = [
    page(0, 'CERTIFICATE OF COMPLETION\nThis is presented to Jasmine L. Rotugal for completing Network Security Fundamentals.\nIsabela State University'),
    page(1, 'CERTIFICATE OF ATTENDANCE\nCisco is awarded this certificate for attending the Web Security Seminar.'),
    page(2, 'AWARD FOR OUTSTANDING PERFORMANCE\nPresented to Jasmine L. Rotugal, first place in the 2026 CTF.'),
  ];
  const segments = segmentPages(pages);
  assert.equal(segments.length, 3);
  assert.deepEqual(segments.map((s) => s.pageStart), [0, 1, 2]);
});

test('multi-page certificate groups consecutive pages into one segment', () => {
  const pages = [
    page(0, 'Certificate of Completion\nThis is awarded to Jasmine L. Rotugal for the 2026 program.'),
    page(1, 'continued from previous page. Terms and conditions. Certificate no: 4421.'),
    page(2, 'AWARD FOR DEMONSTRATED EXCELLENCE\nJasmine L. Rotugal, first place overall.'),
  ];
  const segments = segmentPages(pages);
  assert.equal(segments.length, 2);
  assert.deepEqual(segments[0].pages, [0, 1]);
  assert.deepEqual(segments[1].pages, [2]);
});

test('blank page does not start a new segment', () => {
  const pages = [
    page(0, 'CERTIFICATE OF COMPLETION\nThis certificate is awarded to Jasmine L. Rotugal for completing the network program.\nTerms and conditions apply.'),
    page(1, '\n\n\n'),
    page(2, 'continued obligations and terms carry forward.'),
  ];
  const segments = segmentPages(pages);
  assert.equal(segments.length, 1);
  assert.deepEqual(segments[0].pages, [0, 1, 2]);
});

test('manual split creates a new segment and preserves pages', () => {
  const pages = [
    page(0, 'CERTIFICATE OF COMPLETION\nThis certificate is awarded to Jasmine L. Rotugal for completing the network program.\nTerms and conditions attached.'),
    page(1, 'continued obligations and terms carry forward.'),
    page(2, 'Certificate of Achievement\nAwarded to Jasmine L. Rotugal for the advanced course.'),
  ];
  const initial = segmentPages(pages);
  assert.equal(initial.length, 2);
  const split = splitSegment(initial, initial[0].id, [1]);
  assert.equal(split.length, 3);
  const ranges = split.map((s) => s.pageRangeLabel);
  assert.deepEqual(ranges, ['page 1', 'page 2', 'page 3']);
});

test('manual merge combines two adjacent segments', () => {
  const pages = [
    page(0, 'CERTIFICATE OF COMPLETION\nCertificate of Completion awarded to Jasmine L. Rotugal for the network studies program.\nIsabela State University.'),
    page(1, 'CERTIFICATE OF ACHIEVEMENT\nCertificate of Achievement awarded to Jasmine L. Rotugal for the advanced studies program.\nIsabela State University.'),
  ];
  const initial = segmentPages(pages);
  assert.equal(initial.length, 2);
  const merged = mergeSegments(initial, initial[0].id, initial[1].id);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].pages, [0, 1]);
});
