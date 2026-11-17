import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getVersionInfo } from './version.js';

// The image's self-test: the compiled frontend is complete (its page, scripts and styles)
// and carries the image's own build id, so the update-available check compares the right
// values, and the server reports that id with a release version. Its result is the exit code.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'dist');
try {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<div id="root">/);
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(assets.some((p) => p.endsWith('.js')), 'a script');
  assert.ok(assets.some((p) => p.endsWith('.css')), 'a stylesheet');
  for (const asset of assets) assert.ok(fs.statSync(path.join(root, asset)).size > 0, asset);
  const buildId = process.env.APP_BUILD_ID;
  assert.ok(buildId, 'the image has a build id');
  const bundle = fs.readdirSync(path.join(root, 'assets')).filter((p) => p.endsWith('.js'))
    .map((p) => fs.readFileSync(path.join(root, 'assets', p), 'utf8')).join('\n');
  assert.ok(bundle.includes(buildId), `the bundle carries build id ${buildId}`);
  assert.deepEqual(getVersionInfo({ APP_VERSION: '1.5.3', APP_BUILD_ID: buildId }), { version: '1.5.3', deployedAt: null, buildId });
  console.log(`kill-me self-test passed: ${assets.length} assets, build id ${buildId}`);
} catch (error) {
  console.error('kill-me self-test failed:', error.message);
  process.exitCode = 1;
}
