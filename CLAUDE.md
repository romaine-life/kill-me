# kill-me — Workout Tracker

Personal workout tracker built around a custom 12-day training cycle called **Synergy 12**.

The repo name comes from a Tom Platz video where he screams "KILL ME" during an
agonizing set of leg extensions under hypnotherapy coaching.

## Container Build Verification

Agent pods are not expected to have Docker. Do not report missing local Docker
as a blocker. Run available repo checks first, then use PR CI as the normal
container build gate: `.github/workflows/docker-build-check.yaml` builds the
app image. Same-repo PRs and manual dispatches publish the canonical
content-fingerprint tag (`romainecr.azurecr.io/kill-me:app-<sha256>`); fork PRs
stay build-only with `push: false`. Release/deploy workflows publish or reuse
that same fingerprint tag and bump `k8s/values.yaml` to it.

## The 12-Day Synergy System

The cycle is Nelson's own design, optimized for **consistent daily activity** rather
than traditional rest-heavy programming. Three guiding principles:

1. **Daily activity over rest** — the cycle alternates intensity so every day has
   something to do. Grip, calves, and mobility days are deliberately low-impact,
   keeping the habit of daily training without taxing recovery.
2. **Wellness over hypertrophy** — the goal is muscle-mind connection and joint health,
   not progressive overload. Nelson's muscles grow readily; the priority is controlled
   movement and avoiding excessive bulk.
3. **CNS-aware sequencing** — only three days (1, 5, 9) are systemically taxing compound
   lifts. They are evenly spaced with isolation and recovery work between them to avoid
   stacking central nervous system fatigue.

### Recovery sequencing in the cycle order

The day ordering is not arbitrary — each placement accounts for what came before:

- **Day 1 (Legs/Squat)** → **Day 3 (Hamstrings)**: hamstring isolation is safe because
  Day 1's squat volume has cleared by Day 3
- **Day 7 (Torso)** is placed to save the lower back for Day 1 when the cycle wraps
- **Day 8 (Pecs Mobility)** primes the shoulder capsule for Day 9's heavy pressing —
  light flys, holds, and stretches only
- **Day 9 (Compound Push)** is where dips and heavy pressing belong — never on Day 8
- **Day 12 (Grip)** ends the cycle as a near-zero CNS load before restarting

### Day 8 shoulder safety

Nelson has historical shoulder injuries (both shoulders, 15-20 years ago). They healed
well but have underlying limitations. Day 8's strict "no heavy pressing" rule protects
the shoulder joint by keeping pec work light and mobility-focused before compound push
day. Dips are fine on Day 9 (assisted machine at -90 lbs), but never on Day 8.

## Architecture

```text
frontend/          React 19 SPA (Vite + Tailwind CSS 4)
  ├── Left sidebar tab navigation (inline styles, collapsible, lucide-react icons)
  ├── Client-side URL routing via History API (pushState/popstate, no library)
  ├── Centralized color palette (src/colors.js)
  ├── Sign-in delegated to auth.romaine.life (no MSAL in-app)
  ├── Public viewing, admin-only editing
  ├── In-browser SQLite via sql.js/WASM for anonymous visitors (instant loads)
  ├── Deployed to Azure Static Web App
  └── Calls backend API with Bearer tokens

snapshot/          SQLite snapshot generator (Node 20)
  ├── Queries Cosmos DB for all public document types (7 tables)
  ├── Writes a SQLite .db file consumed by the frontend
  └── Runs every 4 hours via GitHub Actions cron

backend/routes/    Express router factories (workouts, soreness, cardio, admin)
  ├── Imported locally by backend/server.js — no longer published to GitHub Packages
  └── Seed data included (data/seed-data.js, data/seed-soreness.js)

tofu/              OpenTofu infrastructure-as-code
  └── App-specific resources on top of shared infra (no backend — decommissioned)
```

### Auth model

"Everyone can view, only admins can edit." Anonymous visitors get instant page
loads from an in-browser SQLite snapshot (sql.js/WASM) — no backend cold start.
Authenticated users switch to the live API. Logging workouts, changing the
current day, and admin actions require signing in via auth.romaine.life — the
central identity service that owns the user table and the role claim
(`admin`/`user`/`pending`). Admins are promoted manually via
https://auth.romaine.life/admin.

### Data flow

1. Anonymous visitors load `snapshot.db` via sql.js/WASM — reads served entirely in-browser
2. On sign-in, snapshot is discarded and all reads switch to the live backend API

**Critical `useDataSource()` contract:** Every consumer of `useDataSource()` MUST check `isReady` before calling any fetch function. The snapshot loads asynchronously (WASM init + network fetch). Until it's ready, `db` is null, `isLive` evaluates to true, and fetches silently hit the live API — which doesn't exist for anonymous visitors, causing a permanent loading spinner. Pattern: `const { fetchFoo, isReady } = useDataSource(); useEffect(() => { if (!isReady) return; fetchFoo()... }, [isReady]);`
3. To edit, user clicks Sign in → redirects to `auth.romaine.life/sign-in/microsoft?callbackURL=...`
4. After Microsoft completes, auth.romaine.life sets a `.romaine.life` session cookie and bounces back here. Browser auto-attaches that cookie on every request to `workout.romaine.life` because it's scoped to the parent `.romaine.life` domain.
5. Frontend's `bootstrapAuth()` ([frontend/src/auth/index.js](frontend/src/auth/index.js)) asks the backend `GET /api/auth/me` — the backend forwards the cookie to `auth.romaine.life/api/auth/get-session` and returns the user record (or null). No tokens stored anywhere in the SPA.
6. On every request to a protected route, `requireAuth` ([backend/auth.js](backend/auth.js)) does the same cookie-forward to `auth.romaine.life/api/auth/get-session` (60s in-process cache to amortize), and gates on `role ∈ {admin, user}` — `pending` returns 403.
7. `requireAdmin` gates admin-only routes on `role === 'admin'`.
8. Backend queries/writes Cosmos DB, partitioned by userId (= `req.user.sub`, i.e. the auth.romaine.life user id).

No per-app HS256 signing, no Key Vault read, no Bearer-token handling on the frontend. auth.romaine.life is the single source of truth for sessions; this app just consults it.

### Shared infrastructure

This repo builds on shared resources provisioned by **infra-bootstrap**:

- Cosmos DB account (`infra-cosmos-serverless`) — pay-per-request, no throughput floor
- AKS cluster (`infra-aks`) — hosts the `kill-me` namespace pod
- Azure Container Registry (`romainecr`) — AcrPush granted per-app
- Azure App Configuration (`infra-appconfig`)
- DNS zone (`romaine.life`) — ExternalDNS manages records from HTTPRoute

App-specific resources created by this repo: the Cosmos DB database and container.
Microsoft sign-in is delegated to **auth.romaine.life** — kill-me holds no Entra
app registration of its own, and no per-app signing secret either (the cookie
forward to auth.romaine.life is the only auth pathway). The frontend + backend run as a single Node+Express
pod in the `kill-me` namespace, served from `workout.romaine.life` via HTTPRoute
on the shared Envoy Gateway. The prior shared-API-at-`api.romaine.life/workout`
mount was retired when the api repo was archived and deleted on 2026-04-20.

See also: **pipeline-templates** for reusable GitHub Actions workflows, and
**shell-config** for the global Claude config chain and DevOps tooling.

## Data Model (Cosmos DB)

Single container (`workouts`) partitioned by `/userId`. Document types
distinguished by a `type` field:

| Type | Purpose | Key fields |
| ---- | ------- | ---------- |
| `workout-day-definition` | Static cycle definition (days 1-12) | `dayNumber`, `name`, `focus`, `primaryMuscleGroups` |
| `exercise` | Exercise library entries per day | `dayNumber`, `name`, `equipment`, `tags[]`, `variations[]` (`{name, default, targetWeight/Reps/Sets}`) |
| `logged-workout` | A completed workout session | `userId`, `dayNumber`, `date`, `time` (HH:MM, nullable), `mode` (quick/detailed), `exercises[]` (`{name, variation, weight, reps, sets}`) |
| `cardio-session` | A completed cardio session | `userId`, `date`, `time` (HH:MM, nullable), `activity` (treadmill/bike), `durationMinutes`, `treadmill{}`, `bike{}` |
| `cardio-template` | Shared treadmill interval template (library) | `userId` (`shared`), `templateId`, `name`, `description`, `activity`, `intervals[]` (`{type, speedMph, durationMinutes}`), `sortOrder` |
| `soreness-entry` | Daily soreness journal entry | `userId`, `date`, `muscles[]` (`{group, muscle, level}`) |
| `settings` | Per-user settings (current day) | `userId`, `currentDay` |
| `account` | Microsoft auth account record | `userId`, `provider`, `name`, `email`, `role` |

All document types share the same container and partition key. The `type` field is
used in queries to distinguish them.

## CI/CD

All workflows delegate to **nelsong6/pipeline-templates** reusable templates:

| Workflow | Trigger | What it does |
| -------- | ------- | ------------ |
| `container-app-build.yml` | Push/PR to main | Builds Docker image, pushes to GHCR |
| `full-stack-deploy.yml` | After CI Build succeeds / manual | Deploys backend (Container App image update + custom domain cert), deploys frontend (SWA) |
| `tofu.yml` | Push/PR touching `tofu/` | Plan on PR, apply on main merge |
| `lint.yml` | PR to main | Trailing newlines, YAML, spelling, markdown, tofu fmt |
| `tofu-lockfile-check.yml` | PR touching `tofu/` | Validates lockfile is current |
| `tofu-lockfile-update.yml` | Manual dispatch | Regenerates lockfile across platforms |
| `generate-local-env.yml` | Manual dispatch | Generates `frontend/.env` and `backend/.env` from infra outputs |
| `snapshot.yml` | Every 4 hours / manual | Generates SQLite snapshot from Cosmos DB and commits it to the repo (`frontend/public/snapshot.db`) |

## Development

### Prerequisites

- Node 20+
- Azure CLI (`az login` for local Cosmos DB access)
- Backend `.env` with `AZURE_APP_CONFIG_ENDPOINT`
- Frontend `.env` with `VITE_API_URL` (Microsoft sign-in is delegated upstream to auth.romaine.life)

### Running locally

```bash
dev                  # Shell function — installs deps if needed, starts both servers
cd backend && npm run dev   # Backend only (Express :3000)
cd frontend && npm run dev  # Frontend only (Vite :5173)
```

The frontend reads `VITE_API_URL`. The auth service URL is fetched at runtime from the backend's `/api/config` endpoint.

Admin mode (database init, data migration) is available only on localhost in dev
mode when signed in as admin.

### Visual verification (screenshots)

"Take a screenshot" here means **render the running app to a PNG with headless
Chromium and read the file** — not the in-app/agent preview browser, whose
capture action hangs (30s timeout) in this environment regardless of page or
viewport. Its DOM/measurement tools (`read_page`, JS `getBoundingClientRect`)
still work, but geometry alone misses real bugs: e.g. content that clips off the
right edge is invisible to a `scrollWidth` check because page overflow is hidden
(the page doesn't scroll, it just cuts). Only an actual rendered image catches
those. So screenshots are required for any layout/mobile verification, not
optional.

Working method (dev server started via `devctl`, see the dev-servers skill):

```bash
chrome --headless=new --disable-gpu --hide-scrollbars \
  --user-data-dir="<temp>/chrome-prof" \
  --window-size=390,844 \          # 390w = mobile; app's isMobile triggers <760px
  --virtual-time-budget=9000 \     # let async load (sql.js WASM + snapshot.db) settle
  --screenshot="<temp>/shot.png" \
  "http://localhost:<vite-port>/<route>"
```

Then read the PNG. Notes: use an isolated `--user-data-dir` so it can't disturb
a real Chrome profile; bump `--virtual-time-budget` for data-heavy routes (the
History calendar needs ~20000); routes are `/`, `/today`, `/history`,
`/exercises`, `/cycle`, `/soreness`, `/log` (admin-gated). On Windows the binary
is typically `C:\Program Files\Google\Chrome\Application\chrome.exe` or Edge's
`msedge.exe`.

### Build number

The frontend displays a git short hash as the build number, injected at build time
via Vite's `define` config.
