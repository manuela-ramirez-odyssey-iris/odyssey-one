import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Load all env vars (no prefix filter) so the proxy can read non-VITE_ values
  // server-side without exposing them to the client bundle.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // Local live-mode: forward /api to the deployed Vercel function (reads Neon).
        // `vercel dev` clobbers vite module URLs (S92), so this is the local-DB path.
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'https://odyssey-one-stage.vercel.app',
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
