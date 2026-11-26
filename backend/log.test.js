import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { parse } from '@romaine-life/logline';
import { errorText, log, outside, OUTSIDE_LIMIT, requestLog } from './log.js';
import { createSorenessRoutes } from './routes/index.js';

// The lines the backend writes to stdout while fn runs, each read back with logline's parse:
// a line that doesn't fit the standard fails the test.
async function captured(fn) {
  const lines = [];
  const write = process.stdout.write;
  process.stdout.write = (chunk, ...rest) => {
    const text = String(chunk);
    // node:test's own report goes through stdout too; keep only the backend's lines.
    if (/^\d{4}-\d\d-\d\dT/.test(text)) { lines.push(text); return true; }
    return write.call(process.stdout, chunk, ...rest);
  };
  try { await fn(); } finally { process.stdout.write = write; }
  return lines.join('').split('\n').filter(Boolean).map((line) => {
    const entry = parse(line);
    return { ...entry, fields: Object.fromEntries(entry.fields) };
  });
}

test('log writes standard lines, leaving out absent fields', async () => {
  const [entry] = await captured(() => log.warn('migrations pending and not applied here; they apply on deploy', { count: 2, files: '007-a.js,008-b.js', extra: undefined }));
  assert.equal(entry.level, 'warn');
  assert.equal(entry.message, 'migrations pending and not applied here; they apply on deploy');
  assert.deepEqual(entry.fields, { count: '2', files: '007-a.js,008-b.js' });
  assert.equal(entry.pid, process.pid);
});

test('outside and errorText mask credentials and cap the text', () => {
  assert.equal(outside('upstream: Authorization: Bearer abc.def'), 'upstream: Authorization: Bearer ***');
  assert.equal(outside('x'.repeat(OUTSIDE_LIMIT + 10)).length, OUTSIDE_LIMIT + 3);
  assert.equal(errorText(new Error('password=hunter2'), { stack: false }), 'Error: password=***');
  assert.match(errorText(new Error('boom')), /^Error: boom\n {4}at /);
});

test('one request line per request: no query, 5xx at error, the route error masked', async () => {
  let fail = false;
  const container = {
    items: {
      query: () => ({
        fetchAll: async () => {
          if (fail) throw new Error('cosmos refused: password=secret-key');
          return { resources: [] };
        },
      }),
    },
  };
  const app = express();
  app.use(requestLog());
  app.use(createSorenessRoutes({ container, requireAuth: (_req, _res, next) => next(), requireAdmin: (_req, _res, next) => next() }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  let entries;
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    entries = await captured(async () => {
      await fetch(`${base}/api/soreness?code=secret-code`);
      fail = true;
      await fetch(`${base}/api/soreness`);
    });
  } finally { await new Promise((resolve) => server.close(resolve)); }
  const requests = entries.filter((e) => e.message === 'request');
  assert.equal(requests.length, 2);
  const [ok, failed] = requests;
  assert.equal(ok.level, 'info');
  assert.equal(ok.fields.method, 'GET');
  assert.equal(ok.fields.path, '/api/soreness');
  assert.equal(ok.fields.status, '200');
  assert.match(ok.fields.ms, /^\d+$/);
  assert.equal(failed.level, 'error');
  assert.equal(failed.fields.status, '500');
  const routeError = entries.find((e) => e.message === 'fetching soreness entries failed');
  assert.equal(routeError.level, 'error');
  assert.match(routeError.fields.error, /^Error: cosmos refused: password=\*\*\*/);
  for (const entry of entries) assert.doesNotMatch(JSON.stringify(entry.fields), /secret-code|secret-key/);
});
