// Runs every pending migration against an in-memory copy of the live container and
// prints what would change. Nothing is written — the fake container records writes
// instead of performing them.
//
//   node migrations/dry-run.js
//
// Run this before merging anything that adds a migration. It reads production, so it
// needs the same Cosmos access the pod has (locally: `az login`).
//
// It also re-runs every migration a second time against the already-migrated result,
// because the runner has no transaction to fall back on: a migration that dies partway
// gets retried from the top, and one that isn't safe to repeat will corrupt data when
// that happens. The second pass must report no creates and no deletes.

import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { fetchConfig } from '../config.js';
import { memoryContainer } from './memory-container.js';

const DATABASE = process.env.COSMOS_DB_NAME ?? 'WorkoutTrackerDB';
const CONTAINER = process.env.COSMOS_CONTAINER_NAME ?? 'workouts';

// Timestamps legitimately differ between runs, and the replay deliberately clears the
// applied-migration records so the migrations run again. Everything else must not move.
const stable = (store) =>
  JSON.stringify([...store.entries()].filter(([, doc]) => doc.type !== 'schema-migration').sort())
    .replace(/"(createdAt|updatedAt|retiredAt|appliedAt)":"[^"]*"/g, '');

async function main() {
  const { cosmosDbEndpoint } = await fetchConfig();
  const client = new CosmosClient({ endpoint: cosmosDbEndpoint, aadCredentials: new DefaultAzureCredential() });
  const live = client.database(DATABASE).container(CONTAINER);
  const { resources: documents } = await live.items.query('SELECT * FROM c').fetchAll();
  console.log(`Read ${documents.length} documents from ${DATABASE}/${CONTAINER} (nothing will be written)\n`);

  const { runMigrations } = await import('./runner.js');
  const { container, store, operations } = memoryContainer(documents);

  await runMigrations({ container });

  const tally = operations.reduce((acc, [kind]) => ({ ...acc, [kind]: (acc[kind] ?? 0) + 1 }), {});
  console.log('\nWould perform:', tally);

  const model = [...store.values()].find((doc) => doc.type === 'workout-model' && doc.active);
  if (model) {
    const byDay = {};
    for (const exercise of [...store.values()].filter((doc) => doc.type === 'exercise')) {
      (byDay[exercise.daySlug] ??= []).push(exercise.name);
    }
    console.log(`\nResulting model: ${model.name}`);
    for (const day of model.days) {
      console.log(`  ${String(day.number).padStart(2)}. ${day.name.padEnd(18)} ${(byDay[day.slug] ?? []).join(', ') || '(none)'}`);
    }
    const stranded = Object.keys(byDay).filter((slug) => !model.days.some((day) => day.slug === slug));
    if (stranded.length) console.log(`\n  Exercises left on days the model no longer has: ${stranded.join(', ')}`);
  }

  // Second pass: prove the migrations survive being retried.
  const beforeReplay = stable(store);
  operations.length = 0;
  const applied = [...store.values()].filter((doc) => doc.type === 'schema-migration');
  for (const record of applied) store.delete(record.id);

  await runMigrations({ container, log: { info: () => {} } });

  const changes = operations.filter(([kind, id]) => kind !== 'update' && !id.startsWith('schema-migration-'));
  const unchanged = stable(store) === beforeReplay;

  console.log(`\nSafe to retry: ${changes.length === 0 && unchanged ? 'yes' : 'NO'}`);
  if (changes.length) console.log('  unexpected writes on replay:', changes);
  if (!unchanged) console.log('  replay changed document contents');

  if (changes.length || !unchanged) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
