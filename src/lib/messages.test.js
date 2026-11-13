import assert from 'node:assert/strict';
import test from 'node:test';
import { userFacingMessage, successMessages } from './messages.js';

test('missing configuration maps to professional load failure', () => {
  assert.equal(userFacingMessage(new Error('Supabase is not configured: VITE_SUPABASE_URL is empty'), 'load'),
    'We couldn’t load your saved portfolio information. Please check your connection and try again.');
});

test('sql error maps to professional load failure', () => {
  assert.equal(userFacingMessage(new Error('new row violates row-level security policy'), 'load'),
    'We couldn’t load your saved portfolio information. Please check your connection and try again.');
});

test('insert/update error maps to save failure', () => {
  assert.equal(userFacingMessage(new Error('violates row-level security policy'), 'save'),
    'Your changes couldn’t be saved. Please try again. Your existing saved information remains unchanged.');
});

test('publish/failure maps to publish message', () => {
  assert.equal(userFacingMessage(new Error('storage.rules'), 'publish'),
    'We couldn’t publish your changes. Your current public portfolio remains unchanged.');
});

test('jwt/auth errors map to authentication failure', () => {
  assert.equal(userFacingMessage(new Error('JWT expired'), 'auth'),
    'Your sign-in could not be completed. Please verify your credentials and try again.');
});

test('invalid saved JSON maps to professional invalid data message', () => {
  assert.equal(userFacingMessage(new Error('Saved portfolio content is invalid JSON. Restore a valid backup before editing.'), 'load'),
    'Saved portfolio information is incomplete or unreadable. Please restore a known-good backup before continuing.');
});

test('network/fetch errors map to load failure', () => {
  assert.equal(userFacingMessage(new Error('Failed to fetch'), 'load'),
    'We couldn’t load your saved portfolio information. Please check your connection and try again.');
});

test('cleanup context maps to cleanup message', () => {
  assert.equal(userFacingMessage(new Error('something'), 'cleanup'),
    'Some older public assets need attention. You can retry the cleanup from this screen.');
});

test('unpublish context maps to unpublish message', () => {
  assert.equal(userFacingMessage(new Error('storage error'), 'unpublish'),
    'We couldn’t unpublish your portfolio. You can try again or contact the administrator.');
});

test('upload context maps to upload message', () => {
  assert.equal(userFacingMessage(new Error('storage error'), 'upload'),
    'The file couldn’t be uploaded. Please try again with a different file.');
});

test('success messages exist', () => {
  assert.equal(successMessages.draftSaved, 'Your changes have been saved successfully.');
  assert.equal(successMessages.published, 'Your portfolio has been published successfully.');
});
