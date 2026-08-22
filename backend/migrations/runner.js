// Forward-only migration runner.
//
// Migrations live in ./NNN-name.js, each exporting { version, name, up({ container }) }.
// They run in version order at pod startup, before the server accepts traffic, and
// each one is recorded as a `schema-migration` document so it never runs twice.
//
// Failure is deliberately fatal: an unrecorded migration crashes the boot, which
// fails the deploy. A half-migrated database that serves traffic is worse than a
// deploy that stops.
//
// Cosmos has no cross-document transaction, so every migration must be written to
// be safely re-runnable — it may die partway through and be retried from the top.

import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MIGRATIONS_DIR = dirname(fileURLToPath(import.meta.url));
const SYSTEM_PARTITION = 'system';

// Migration files are NNN-some-name.js; anything else in this directory is support code.
const MIGRATION_FILE = /^(\d{3})-[a-z0-9-]+\.js$/;

async function loadMigrations() {
  const entries = await readdir(MIGRATIONS_DIR);
  const files = entries.filter((name) => MIGRATION_FILE.test(name)).sort();

  const migrations = [];
  for (const file of files) {
    const module = await import(pathToFileURL(join(MIGRATIONS_DIR, file)).href);
    const { version, name, up } = module.default ?? module;

    if (typeof version !== 'number' || typeof up !== 'function') {
      throw new Error(`Migration ${file} must export { version, name, up }`);
    }
    if (version !== Number(file.slice(0, 3))) {
      throw new Error(`Migration ${file} declares version ${version}, which disagrees with its filename`);
    }
    migrations.push({ version, name: name ?? file, file, up });
  }
  return migrations;
}

async function appliedVersions(container) {
  const { resources } = await container.items
    .query({
      query: 'SELECT c.version FROM c WHERE c.type = @type',
      parameters: [{ name: '@type', value: 'schema-migration' }]
    })
    .fetchAll();
  return new Set(resources.map((r) => r.version));
}

// Which migrations this database has not seen yet, in the order they would run.
export async function pendingMigrations({ container }) {
  const migrations = await loadMigrations();
  const applied = await appliedVersions(container);
  return migrations.filter((migration) => !applied.has(migration.version));
}

export async function runMigrations({ container, log = console }) {
  const migrations = await loadMigrations();
  const pending = await pendingMigrations({ container });

  if (pending.length === 0) {
    log.info?.(`Migrations: up to date (${migrations.length} applied)`);
    return { applied: [] };
  }

  log.info?.(`Migrations: ${pending.length} pending`);
  const ran = [];

  for (const migration of pending) {
    const startedAt = Date.now();
    log.info?.(`Migrations: running ${migration.file}`);

    const result = await migration.up({ container });

    await container.items.create({
      id: `schema-migration-${String(migration.version).padStart(3, '0')}`,
      type: 'schema-migration',
      userId: SYSTEM_PARTITION,
      version: migration.version,
      name: migration.name,
      appliedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      result: result ?? null
    });

    log.info?.(`Migrations: applied ${migration.file} in ${Date.now() - startedAt}ms`);
    ran.push(migration.version);
  }

  return { applied: ran };
}
