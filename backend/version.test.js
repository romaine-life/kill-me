import test from 'node:test';
import assert from 'node:assert/strict';
import { getVersionInfo } from './version.js';

test('returns configured release metadata', () => {
  assert.deepEqual(getVersionInfo({
    APP_VERSION: '1.4.0',
    APP_DEPLOYED_AT: '2026-08-27T16:33:46Z',
    APP_BUILD_ID: 'app-abc123',
  }), {
    version: '1.4.0',
    deployedAt: '2026-08-27T16:33:46.000Z',
    buildId: 'app-abc123',
  });
});

test('uses explicit development metadata when deployment values are absent', () => {
  assert.deepEqual(getVersionInfo({}), {
    version: '0.0.0-dev',
    deployedAt: null,
    buildId: 'dev',
  });
});

test('does not expose malformed version or date values', () => {
  assert.deepEqual(getVersionInfo({
    APP_VERSION: 'latest',
    APP_DEPLOYED_AT: 'yesterday-ish',
    APP_BUILD_ID: ' ',
  }), {
    version: '0.0.0-dev',
    deployedAt: null,
    buildId: 'dev',
  });
});
