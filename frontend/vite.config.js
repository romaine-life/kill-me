import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createServer as createNetServer } from 'node:net'
import { spawn, execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Git short hash for the displayed build number. CI/Docker pass BUILD_NUMBER via
// env (the container isn't a git repo); local dev falls back to the running git.
const getGitCommit = () => {
  if (process.env.BUILD_NUMBER) return process.env.BUILD_NUMBER
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch (error) {
    console.warn('Could not get git commit hash:', error.message)
    return 'dev'
  }
}

// Ask the OS for a free port instead of hardcoding one, so parallel worktrees /
// dev servers never fight over a fixed number (several backends pinning one port
// is a crash loop). The backend and the /api proxy both use this exact port.
function getFreePort() {
  return new Promise((res, rej) => {
    const srv = createNetServer()
    srv.once('error', rej)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => res(port))
    })
  })
}

// Dev default: run the WHOLE app against the LIVE prod Cosmos DB. On `vite` dev-
// server start, spawn backend/server.js as a CHILD pointed at the live Cosmos
// account (passwordless via your `az login`, resolved through DefaultAzureCredential)
// and signed in as your real account (DEV_AUTH → the real Nelson partition), then
// proxy every /api call to it. The child is tied to vite's lifecycle — starts with
// the dev server, relaunches if it crashes, and is killed when vite exits — so
// `vite` ALONE is "full prod from dev". `apply:'serve'` means this NEVER touches a
// production build.
// The endpoint + identity are not secrets (the endpoint is a hostname; the sub is a
// user id); override any via the env.
function devBackend(port) {
  const backendDir = fileURLToPath(new URL('../backend', import.meta.url))
  // Per-worktree pidfile in the OS temp dir. On start we kill any backend left
  // running by a previously force-killed dev server, so orphans (each holding a
  // live Cosmos connection) never stack up.
  const pidFile = join(tmpdir(), `kill-me-dev-backend-${createHash('md5').update(backendDir).digest('hex').slice(0, 8)}.pid`)
  let child = null
  let stopping = false

  // A fresh worktree ships with NO backend/node_modules, so `node server.js` throws
  // `Cannot find module 'express'`. `vite` is meant to bootstrap the WHOLE app, so
  // bring the backend's deps up before the first launch. Runs at most once per
  // worktree (the sentinel check short-circuits after).
  const ensureBackendDeps = (log) => {
    if (existsSync(join(backendDir, 'node_modules', 'express'))) return
    const cmd = existsSync(join(backendDir, 'package-lock.json')) ? 'npm ci' : 'npm install'
    log.info(`[backend] installing dependencies (${cmd}) — first run in this worktree, one moment…`)
    execSync(cmd, { cwd: backendDir, stdio: 'inherit' })
    log.info('[backend] dependencies installed.')
  }
  const killStale = () => {
    try {
      if (!existsSync(pidFile)) return
      const pid = Number(readFileSync(pidFile, 'utf8').trim())
      if (pid) { try { process.kill(pid) } catch { /* already gone */ } }
      unlinkSync(pidFile)
    } catch { /* best effort */ }
  }

  return {
    name: 'kill-me-dev-backend',
    apply: 'serve',
    configureServer(server) {
      const log = server.config.logger
      killStale()

      // The backend is a HARD dependency of the dev server: the frontend needs it
      // for auth, workouts, cardio — everything under /api. If it can't come up we
      // take the WHOLE dev server DOWN with a loud message instead of serving a
      // frontend that silently fails every /api call.
      const stop = () => { stopping = true; if (child) { child.kill(); child = null } try { unlinkSync(pidFile) } catch { /* */ } }
      const fatal = (why) => {
        const bar = '━'.repeat(74)
        log.error(`\n${bar}`)
        log.error('  ✖  BACKEND FAILED TO START — taking the dev server down with it.')
        log.error('')
        log.error(`     ${why}`)
        log.error('')
        log.error('     The backend is NOT optional — the frontend talks to it for auth,')
        log.error('     workouts, cardio, everything under /api. Fix it, then re-run `npm run dev`.')
        log.error(`${bar}\n`)
        stop()
        process.exit(1)
      }

      try {
        ensureBackendDeps(log)
      } catch (e) {
        fatal(`Could not prepare backend dependencies (${e.message}). Try \`npm ci\` in ${backendDir} by hand.`)
      }

      // "Ready" = the backend logged that it's listening. Until we've seen that for a
      // given launch, an exit means it couldn't start at all (missing module, bad
      // code, Cosmos auth reject, port taken). Tolerate a couple fast retries, then
      // give up LOUDLY. A backend that ran fine and only later crashed is transient
      // and relaunched. A boot that neither succeeds nor exits (a hang) trips the
      // watchdog — also a failure to start.
      const READY_RE = /ready on port/i
      const MAX_BOOT_FAILS = 3
      const BOOT_TIMEOUT_MS = 60_000
      let bootFails = 0

      const start = () => {
        let ready = false
        const watchdog = setTimeout(() => {
          if (!ready && child) fatal(`Backend never became ready within ${BOOT_TIMEOUT_MS / 1000}s (still starting, or hung).`)
        }, BOOT_TIMEOUT_MS)
        if (watchdog.unref) watchdog.unref()

        child = spawn(process.execPath, ['server.js'], {
          cwd: backendDir,
          env: {
            ...process.env,
            // Live prod Cosmos, passwordless via your `az login` (DefaultAzureCredential).
            COSMOS_DB_ENDPOINT: process.env.COSMOS_DB_ENDPOINT || 'https://infra-cosmos-serverless.documents.azure.com:443/',
            // Signed in as the real Nelson — DEV_AUTH bypasses the auth.romaine.life
            // cookie forward and gates as admin against the real Cosmos partition.
            DEV_AUTH: process.env.DEV_AUTH || 'admin',
            DEV_AUTH_SUB: process.env.DEV_AUTH_SUB || 'e23pPWiNAUSAEMsxU6yEWrIiD2TnxZDf',
            DEV_AUTH_NAME: process.env.DEV_AUTH_NAME || 'Nelson Romaine',
            DEV_AUTH_EMAIL: process.env.DEV_AUTH_EMAIL || 'nelson@romaine.life',
            PORT: String(port),
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        try { writeFileSync(pidFile, String(child.pid)) } catch { /* best effort */ }
        log.info(`[backend] launching on :${port}`)
        child.stdout.on('data', (d) => {
          const s = String(d)
          if (!ready && READY_RE.test(s)) { ready = true; bootFails = 0; clearTimeout(watchdog) }
          log.info(`[backend] ${s.replace(/\s+$/, '')}`)
        })
        child.stderr.on('data', (d) => log.warn(`[backend] ${String(d).replace(/\s+$/, '')}`))
        child.on('exit', (code) => {
          child = null
          clearTimeout(watchdog)
          if (stopping) return
          if (!ready) {
            bootFails += 1
            if (bootFails >= MAX_BOOT_FAILS) {
              fatal(`Backend exited (code ${code}) before it was ready, ${bootFails}× in a row.`)
              return
            }
            log.warn(`[backend] exited (code ${code}) before ready — retry ${bootFails}/${MAX_BOOT_FAILS} in 1s`)
          } else {
            log.warn(`[backend] exited (code ${code}) after running — relaunching in 1s`)
          }
          setTimeout(start, 1000)
        })
      }
      start()
      server.httpServer?.once('close', stop)
      process.once('exit', stop)
      for (const sig of ['SIGINT', 'SIGTERM']) process.once(sig, () => { stop(); process.exit(0) })
    },
  }
}

// devctl — the local dev-server supervisor — refuses to mark an environment ready
// until the process holding the port proves it is the exact instance, project,
// worktree and revision it was asked for. It probes this endpoint over IPv4
// loopback, so a managed run must also bind 127.0.0.1 (see `server.host` below);
// Vite's default host resolves to ::1 only on Windows, which the probe and the
// Caddy route in front of it can't reach. Serve-only, and inert unless devctl
// launched us, so it can never exist in a production build.
function devctlHealth() {
  return {
    name: 'devctl-health',
    apply: 'serve',
    configureServer(server) {
      if (process.env.DEVCTL_MANAGED !== '1') return
      server.middlewares.use('/__devctl/health', (req, res, next) => {
        if (req.method !== 'GET') {
          next()
          return
        }
        res.statusCode = 200
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          managed: true,
          environment: process.env.DEVCTL_ENVIRONMENT_NAME || '',
          project: process.env.DEVCTL_PROJECT || '',
          repo_dir: process.env.DEVCTL_REPO_DIR || '',
          revision: process.env.DEVCTL_SOURCE_REVISION || '',
          configuration_id: process.env.DEVCTL_CONFIGURATION_ID || '',
          port: Number(process.env.DEVCTL_FRONTEND_PORT || process.env.PORT || 0),
          pid: process.pid,
        }))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(async ({ command }) => {
  // Only a dev server (command 'serve') spawns the backend + proxy; a production
  // build touches none of this. A fresh free port is chosen each start, shared by
  // both the spawned backend and the /api proxy.
  const isVitest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test'
  const useBackend = command === 'serve' && !isVitest
  const backendPort = useBackend ? await getFreePort() : 0
  // devctl owns the port when it is the launcher; honour what it assigned so the
  // health endpoint above reports the port devctl recorded even if the flag is
  // ever dropped from the command line.
  const devctlPort = Number.parseInt(process.env.DEVCTL_FRONTEND_PORT || '', 10)
  const managedPort = process.env.DEVCTL_MANAGED === '1' && devctlPort > 0 ? devctlPort : 0

  return {
    plugins: [
      react(),
      devctlHealth(),
      ...(useBackend ? [devBackend(backendPort)] : []),
    ],
    define: {
      __BUILD_NUMBER__: JSON.stringify(getGitCommit()),
    },
    server: {
      // Bind IPv4 loopback explicitly. Vite's default host is 'localhost', which
      // Node resolves verbatim to ::1 alone on this platform — an address any
      // tool reaching for 127.0.0.1 (devctl's probe, its Caddy route, curl)
      // gets connection-refused on. A CLI --host still overrides this.
      host: '127.0.0.1',
      ...(managedPort ? { port: managedPort, strictPort: true } : {}),
      ...(useBackend
        ? { proxy: { '/api': { target: `http://localhost:${backendPort}`, changeOrigin: true, secure: false, ws: true } } }
        : {}),
    },
  }
})
