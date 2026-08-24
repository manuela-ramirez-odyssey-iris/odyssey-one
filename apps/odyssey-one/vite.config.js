import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const LOCAL_API = 'http://localhost:3001'   // tools/local-api.mjs
const DEPLOYED_API = 'https://odyssey-one-stage.vercel.app'

/**
 * Which API answers `/api`. An explicit VITE_API_PROXY_TARGET always wins;
 * otherwise the local runner is preferred WHENEVER IT IS UP.
 *
 * Auto-detected rather than left to a second npm script because the failure is
 * silent and asymmetric: forgetting the flag means the browser quietly talks to
 * the DEPLOYED function, so a change under api/ reads as "the feature is broken"
 * instead of "the feature isn't here yet" — it cost a full debugging round trip
 * on the very first use, and `bun dev` / `npm run dev` / the turbo task are three
 * more entry points that would each need remembering.
 *
 * ANY response counts as up, including a 404 — this only asks whether something
 * is listening on the port. fetch rejects on connection refused / timeout.
 */
async function resolveApiTarget(explicit) {
  if (explicit) return explicit
  if (process.env.VITEST) return DEPLOYED_API // no dev server, no proxy — don't pay the probe per run
  try {
    await fetch(`${LOCAL_API}/api/__probe`, { signal: AbortSignal.timeout(300) })
    return LOCAL_API
  } catch {
    return DEPLOYED_API
  }
}

export default defineConfig(async ({ mode }) => {
  // Load all env vars (no prefix filter) so the proxy can read non-VITE_ values
  // server-side without exposing them to the client bundle.
  // process.env is read BEFORE the file value so an inline
  // `VITE_API_PROXY_TARGET=… vite` on the command line beats .env.local.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = await resolveApiTarget(
    process.env.VITE_API_PROXY_TARGET || env.VITE_API_PROXY_TARGET,
  )

  // Which one won is invisible from the browser until an endpoint 404s. Print it
  // — but not under vitest, where there is no proxy and the warning is noise.
  if (!process.env.VITEST) console.log(apiTarget === DEPLOYED_API
    ? `[api proxy] /api → ${apiTarget}  (DEPLOYED — changes under api/ will NOT appear; run "npm run dev:api" in another terminal, then restart)`
    : `[api proxy] /api → ${apiTarget}  (local API runner)`)

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // Local live-mode: forward /api to the deployed Vercel function (reads Neon).
        // `vercel dev` clobbers vite module URLs (S92), so this is the local-DB path.
        //
        // `npm run dev:local` overrides the target to the local API runner
        // (tools/local-api.mjs) so changes under api/ are visible WITHOUT a
        // deploy. process.env is read FIRST — an inline `VITE_API_PROXY_TARGET=…`
        // on the command line has to beat the .env.local file, or the one-off
        // override is silently ignored.
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
        '/odyssey-tracking-api': {
          target: env.VITE_ODYSSEY_TRACKING_API_BASE || 'https://odyssey-one.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/odyssey-tracking-api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const token = env.VITE_ODYSSEY_TRACKING_TOKEN
              const session = env.VITE_ODYSSEY_TRACKING_SESSION
              if (token) proxyReq.setHeader('Authorization', `Bearer ${token}`)
              if (session) proxyReq.setHeader('Cookie', `SESSION=${session}`)
              proxyReq.setHeader('Origin', 'https://odyssey-one.com')
            })
          },
        },
      },
    },
    build: {
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'vendor'
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'icons'
            }
          },
        },
      },
    },
    // Vitest — pure-logic unit tests (search adapter, @odyssey/ui helpers, etc).
    // Node env, no DOM. `globals: true` exposes test/expect/describe without imports.
    test: {
      globals: true,
      environment: 'node',
      include: [
        'src/**/*.test.{js,jsx,ts,tsx}',
        '../../packages/ui/src/**/*.test.{js,jsx}',
      ],
      setupFiles: ['./vitest.setup.js'],
      // A local .env.local with VITE_API_MODE=live made the service layer fetch
      // a relative URL under node — tests are mock-mode, always.
      env: { VITE_API_MODE: 'mock', VITE_API_BASE_URL: '' },
    },
  }
})
