import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAutoRotate,
  nextCredentialIndex,
  CREDENTIAL_ROTATION_INTERVAL,
} from './credential-highlight.js';

test('credential rotation interval matches the specification', () => {
  assert.equal(CREDENTIAL_ROTATION_INTERVAL, 2500);
});

test('rotation is disabled for reduced motion and single records', () => {
  assert.equal(canAutoRotate(true, 3), false);
  assert.equal(canAutoRotate(false, 1), false);
  assert.equal(canAutoRotate(false, 0), false);
  assert.equal(canAutoRotate(false, 2), true);
});

test('rotation cycles through all records', () => {
  assert.equal(nextCredentialIndex(0, 3), 1);
  assert.equal(nextCredentialIndex(2, 3), 0);
  assert.equal(nextCredentialIndex(0, 0), 0);
});
