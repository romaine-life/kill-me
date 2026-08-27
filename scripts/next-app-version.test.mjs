import test from 'node:test';
import assert from 'node:assert/strict';
import { nextAppVersion } from './next-app-version.mjs';

test('applies semantic-version bumps', () => {
  assert.equal(nextAppVersion('1.2.3', 'major'), '2.0.0');
  assert.equal(nextAppVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(nextAppVersion('1.2.3', 'patch'), '1.2.4');
  assert.equal(nextAppVersion('1.2.3', 'none'), '1.2.3');
});

test('rejects ambiguous version inputs', () => {
  assert.throws(() => nextAppVersion('v1.2.3', 'patch'), /stable SemVer/);
  assert.throws(() => nextAppVersion('1.2.3', 'feature'), /Bump must be/);
});
