import test from 'node:test';
import assert from 'node:assert/strict';
import {
  displayVersion,
  formatDeploymentTime,
  isUpdateAvailable,
} from './appVersion.js';

test('formats semantic versions for people', () => {
  assert.equal(displayVersion('1.4.0'), 'Running v1.4.0');
  assert.equal(displayVersion('0.0.0-dev'), 'Development build');
});

test('only reports a stale production client', () => {
  assert.equal(isUpdateAvailable('app-new', 'app-old'), true);
  assert.equal(isUpdateAvailable('app-same', 'app-same'), false);
  assert.equal(isUpdateAvailable('app-new', 'dev'), false);
});

test('formats deployment time in a requested timezone', () => {
  assert.equal(
    formatDeploymentTime('2026-08-27T16:33:46Z', 'en-US', 'America/Los_Angeles'),
    'Aug 27, 2026, 9:33 AM',
  );
  assert.equal(formatDeploymentTime('not-a-date', 'en-US', 'UTC'), null);
});
