import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyRecordEdit,
  beginRecordEdit,
  cancelRecordEdit,
  updateRecordEdit,
} from './admin-records.js';

test('editing a certificate loads all existing values, updates the same record, and cancels cleanly', () => {
  const certificates = [
    { id: 'cert-1', title: 'Network Basics', issuer: 'ISU', dateEarned: '2025-03-10', publicFile: { src: 'originals:cert.pdf' } },
    { id: 'cert-2', title: 'Security Workshop', issuer: 'Org B', dateEarned: '', verifyUrl: '' },
  ];
  const edit = beginRecordEdit(certificates[0], 'id:cert-1', 0);

  assert.deepEqual(edit.value, certificates[0]);
  const changed = updateRecordEdit(edit, 'title', 'Network Security Basics');
  const updated = applyRecordEdit(certificates, changed);

  assert.equal(updated.length, 2);
  assert.equal(updated[0].id, 'cert-1');
  assert.equal(updated[0].title, 'Network Security Basics');
  assert.equal(updated[0].issuer, 'ISU');
  assert.equal(updated[0].publicFile.src, 'originals:cert.pdf');
  assert.equal(certificates[0].title, 'Network Basics');
  assert.deepEqual(edit.value, certificates[0]);
  assert.equal(cancelRecordEdit(changed), null);
});

test('project updates target the original identifier even if records are reordered', () => {
  const projects = [
    { id: 'project-a', title: 'Portfolio', role: 'Developer', screenshots: ['a.png', 'b.png'] },
    { id: 'project-b', title: 'Network Lab', role: 'Contributor', screenshots: ['c.png', 'd.png'] },
  ];
  const edit = updateRecordEdit(beginRecordEdit(projects[1], 'id:project-b', 1), 'role', 'Project lead');
  const updated = applyRecordEdit([projects[1], projects[0]], edit);

  assert.equal(updated.length, 2);
  assert.equal(updated[0].id, 'project-b');
  assert.equal(updated[0].role, 'Project lead');
  assert.deepEqual(updated[0].screenshots, ['c.png', 'd.png']);
});

test('new records are appended once and stale edits cannot create duplicates', () => {
  const original = { id: 'education-tertiary', institution: null, course: '' };
  const recordEdit = updateRecordEdit(beginRecordEdit(original, 'id:education-tertiary', 0), 'institution', 'Isabela State University');
  const updated = applyRecordEdit([original], recordEdit);

  assert.equal(updated.length, 1);
  assert.equal(updated[0].id, original.id);
  assert.equal(updated[0].institution, 'Isabela State University');
  assert.throws(() => applyRecordEdit([], recordEdit), /no longer exists/);

  const added = beginRecordEdit(null, 'new:cert-3', 1);
  added.value = { id: 'cert-3', title: 'New certificate' };
  assert.equal(applyRecordEdit(updated, added).length, 2);
  assert.throws(() => applyRecordEdit([...updated, added.value], added), /already been added/);
});
