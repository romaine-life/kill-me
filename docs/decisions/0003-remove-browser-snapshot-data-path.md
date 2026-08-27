# 0003: Remove the browser snapshot data path

- Status: Accepted
- Date: 2026-08-26
- Deciders: Nelson

## Context

Anonymous visitors previously downloaded a committed SQLite database and sql.js
WebAssembly runtime, while authenticated visitors read Cosmos DB through the API.
A scheduled workflow regenerated the database every four hours, committed it to
Git, rebuilt the application image, and rolled the AKS pod.

That distribution mechanism coupled ordinary data refreshes to code releases.
Dormant browser tabs retained references to retired Vite asset hashes, and the
server's broad SPA fallback returned `index.html` for those missing assets. The
browser rejected the HTML responses as JavaScript and CSS, leaving an empty page.

The original snapshot avoided backend cold starts. The application now runs as
an always-on Express pod in AKS, and its public API payload is substantially
smaller than the SQLite database plus WebAssembly runtime.

## Decision

- Cosmos DB is the sole application data source.
- Anonymous and authenticated reads use the same public, same-origin API.
- Authentication resolves independently and only enables protected editing.
- Remove the snapshot generator, committed database, sql.js runtime, and scheduled
  snapshot workflow.
- Database backup remains an infrastructure concern and never publishes frontend
  data or triggers an application deployment.
- Serve the SPA HTML without caching, serve existing hashed assets as immutable,
  and return a real 404 for missing assets.
- Use a single-replica `Recreate` rollout while the frontend and API share one
  image, preventing old and new pods from serving incompatible builds together.

## Rationale

One live data path removes schema duplication, four-hour staleness, scheduled
image churn, and the browser-side SQLite startup gate. AKS already supplies the
long-lived compute the public API needs. A database backup protects recovery;
it does not need to be a user-facing read replica.

## Alternatives considered

### Generate the snapshot with an AKS CronJob

Rejected because it preserves two query implementations and two schemas while
only moving the scheduler. It does not solve stale data or frontend complexity.

### Publish the SQLite database separately to Blob Storage

Rejected for the current scale. It would stop application rollouts but retain
the duplicate browser database and WASM runtime without a demonstrated latency
or availability need.

### Add Redis or another shared API cache

Deferred. Current traffic and payload sizes do not justify another stateful
service. Add caching only after observed Cosmos request charges or latency demand
it.

## Consequences

- Public reads require the AKS API and Cosmos DB to be available.
- Data changes become visible immediately instead of after the next snapshot job.
- Local frontend development always starts the backend; there is no frontend-only
  snapshot mode.
- Real application releases can briefly interrupt the single pod during a
  `Recreate` rollout.
- If multi-replica zero-downtime delivery becomes necessary, immutable frontend
  assets should move to durable static storage that retains old hashes.

## Safety constraints

- Public endpoints must continue returning only data intentionally designated for
  public viewing.
- Protected writes remain fail-closed when authentication is unavailable.
- Missing static assets must never fall through to the SPA HTML response.

## Revisit when

- Public API latency or Cosmos request charges become material.
- Offline viewing becomes a product requirement.
- The application moves to multiple serving replicas or requires zero-downtime
  frontend releases.

## Evidence and references

- Live Azure inspection on 2026-08-26 confirmed that
  `infra-cosmos-serverless` uses the Cosmos DB `Continuous` backup policy.
- Production measurement on 2026-08-26: all public JSON endpoints totalled about
  118 KB, while `snapshot.db` plus `sql-wasm.wasm` totalled about 815 KB before
  the browser-side sql.js code.
- [Azure Cosmos DB partitioning](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

## Related work

- Supersedes the snapshot architecture previously documented in `CLAUDE.md`.
- Removes `.github/workflows/snapshot.yaml` and the `snapshot/` generator.
