// Root Vitest config — makes a bare `npx vitest run` from the repo root equal the
// canonical suite (apps/odyssey-one/vite.config.js `test` block). Without this,
// root runs used Vitest's default globs and picked up noise: mirrored copies under
// .claude/worktrees/ and tools/domain-usage.test.mjs (a node:test file, run via
// `node --test`, not Vitest) — 7 failed files of pure noise.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./apps/odyssey-one/vitest.setup.js'],
    include: [
      'apps/odyssey-one/src/**/*.test.{js,jsx,ts,tsx}',
      'packages/ui/src/**/*.test.{js,jsx}',
    ],
    exclude: ['**/node_modules/**', '**/.claude/**'],
  },
})
