// Applies pending migrations for real.
//
//   npm run migrate
//
// The pod does this itself at startup (RUN_MIGRATIONS_ON_BOOT), so this is for
// applying them deliberately from a workstation — before a deploy, or to recover a
// database that was rolled forward out of order.
//
// It writes to whatever Cosmos account the config resolves to, which locally is the
// live one. Run `npm run migrate:dry-run` first; it reads the same data and prints
// exactly what this will change.

import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { fetchConfig } from '../config.js';
import { runMigrations, pendingMigrations } from './runner.js';

const DATABASE = process.env.COSMOS_DB_NAME ?? 'WorkoutTrackerDB';
const CONTAINER = process.env.COSMOS_CONTAINER_NAME ?? 'workouts';

async function main() {
  const { cosmosDbEndpoint } = await fetchConfig();
  const client = new CosmosClient({ endpoint: cosmosDbEndpoint, aadCredentials: new DefaultAzureCredential() });
  const container = client.database(DATABASE).container(CONTAINER);

  console.log(`Target: ${cosmosDbEndpoint}${DATABASE}/${CONTAINER}`);

  const pending = await pendingMigrations({ container });
  if (pending.length === 0) {
    console.log('Nothing to apply.');
    return;
  }

  console.log(`Applying ${pending.length}: ${pending.map((m) => m.file).join(', ')}`);
  const { applied } = await runMigrations({ container });
  console.log(`Applied ${applied.length} migration(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
