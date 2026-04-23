# Turborepo Monorepo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the single-app `odyssey-shipments` repo into a Turborepo monorepo (in place, preserving git history) so future apps (homepage, carriers, orders) can share UI components, design tokens, and a Supabase client.

**Architecture:** npm workspaces + Turborepo. Current app moves to `apps/shipments/`. Shared code lives in `packages/ui`, `packages/tokens`, `packages/db`. Vercel deploys each app as its own project with `rootDirectory` pointing into `apps/<name>/`. Tailwind v4's `@source` directive scans packages for classes used by apps.

**Tech Stack:** npm workspaces, Turborepo, Vite 8, React 19, Tailwind v4 (`@tailwindcss/vite`), Vercel.

**Key constraints:**
- Preserve git history — use `git mv`, never delete-and-recreate
- Preserve root-level docs: `progress.md`, `decision-log.md`, `MEMORY.md`, `CLAUDE.md`, `README.md`, `design.md`, `change-notes.md`, `button-styles.md`
- Vercel auto-deploy must keep working (project id `prj_d7bHwlscJ9ZfgcUiEBEv2LbvuGXf` already linked)
- `playground/`, `shipments-documentation/`, `tools/convert-docs.sh` stay at root (cross-cutting, not app-specific)
- Each phase ends in a commit — safe to pause/rollback between phases

---

## File Structure (Target)

```
odyssey-shipments/                      ← same git repo
├── apps/
│   └── shipments/                      ← current app lives here
│       ├── src/                        ← git mv from root/src
│       ├── public/                     ← git mv from root/public
│       ├── tools/generate.mjs          ← git mv from root/tools/generate.mjs
│       ├── index.html                  ← git mv from root/index.html
│       ├── vite.config.js              ← git mv from root/vite.config.js
│       ├── eslint.config.js            ← git mv from root/eslint.config.js
│       └── package.json                ← new (app-specific)
├── packages/
│   ├── ui/
│   │   ├── src/
│   │   │   ├── Badge.jsx               ← git mv from apps/shipments/src/components/ui/Badge.jsx
│   │   │   └── index.js                ← new (re-exports)
│   │   └── package.json                ← new
│   ├── tokens/
│   │   ├── tokens.css                  ← git mv from apps/shipments/src/styles/tokens.css
│   │   └── package.json                ← new
│   └── db/
│       ├── src/index.js                ← new (empty placeholder)
│       ├── README.md                   ← new (future Supabase scaffold)
│       └── package.json                ← new
├── progress.md                         ← stays at root
├── decision-log.md                     ← stays at root (if exists)
├── CLAUDE.md                           ← stays at root
├── MEMORY.md                           ← stays in .claude/ (not affected)
├── README.md                           ← stays at root
├── design.md                           ← stays at root
├── change-notes.md                     ← stays at root
├── button-styles.md                    ← stays at root
├── playground/                         ← stays at root (cross-cutting)
├── shipments-documentation/            ← stays at root
├── tools/convert-docs.sh               ← stays at root (cross-cutting)
├── turbo.json                          ← new
└── package.json                        ← converted to workspace root
```

**File responsibility boundaries:**
- `apps/shipments/package.json` — only shipments-app dependencies (React, lucide-react, @vercel/analytics, faker, etc.) and `dev`/`build` scripts
- Root `package.json` — workspace definition only, plus `turbo` devDep and top-level scripts like `dev`, `build`, `lint` that delegate to turbo
- `packages/tokens/package.json` — exports `tokens.css` only, no deps
- `packages/ui/package.json` — peerDeps on react/react-dom; runtime dep on `@odyssey/tokens` for CSS variable consumption
- `packages/db/package.json` — placeholder, will later hold Supabase client

**Vercel config:** Post-migration, Vercel dashboard setting `rootDirectory` changes from repo root → `apps/shipments`. Vercel auto-detects Vite there. Install command auto-handles workspace hoisting.

---

## Phase 0: Pre-flight & clean baseline

### Task 0.1: Confirm clean working tree and commit pending changes

**Files:**
- Modify: `.claude/settings.local.json` (already modified per git status)
- Modify: `progress.md`
- Modify: `shipments-documentation/Documentation/backlog.html`

- [ ] **Step 1: View current state**

Run: `git status`
Expected: Shows modifications to `.claude/settings.local.json`, `progress.md`, `shipments-documentation/Documentation/backlog.html`.

- [ ] **Step 2: Decide per-file whether to commit or stash**

Review each diff:
```bash
git diff .claude/settings.local.json
git diff progress.md
git diff shipments-documentation/Documentation/backlog.html
```

If they are in-flight work unrelated to migration, commit them separately with a descriptive message. If they are trivial, include them in a "pre-migration checkpoint" commit. **Ask the user** before committing — they may want to keep them as work-in-progress.

- [ ] **Step 3: Confirm bun.lock removal**

Run: `ls -la bun.lock package-lock.json`
Expected: Both exist. `package-lock.json` is the active lockfile (more recent, matches Vercel's default).

Delete `bun.lock` (project is on npm now):
```bash
git rm bun.lock
git commit -m "chore: remove stale bun.lock, npm is active"
```

- [ ] **Step 4: Verify clean baseline works**

Run: `npm install && npm run dev`
Expected: Dev server starts, app renders at `http://localhost:5173` (or whatever Vite picks), no errors. Hit Ctrl-C to stop.

- [ ] **Step 5: Commit checkpoint (if anything was staged in step 2)**

```bash
git commit -m "chore: pre-monorepo-migration checkpoint"
```

---

## Phase 1: Monorepo scaffold (root only, no file moves yet)

### Task 1.1: Create workspace root configuration

**Files:**
- Modify: `package.json` (convert to workspace root)
- Create: `turbo.json`

- [ ] **Step 1: Read current root package.json**

Read `package.json`. Note current `name`, `dependencies`, `devDependencies`, `scripts`. You will move dependencies out in Phase 2, but for now only change the top-level structure.

- [ ] **Step 2: Rewrite root package.json as workspace root**

Replace the entire file contents with:
```json
{
  "name": "odyssey-monorepo",
  "private": true,
  "version": "0.0.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "dev:shipments": "turbo run dev --filter=shipments"
  },
  "devDependencies": {
    "turbo": "^2.3.0"
  }
}
```

Note: This intentionally removes the app dependencies from root. They will reappear in `apps/shipments/package.json` in Phase 2. `npm install` will fail until Phase 2 is complete — that's expected.

- [ ] **Step 3: Create turbo.json**

Create `turbo.json` with:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    }
  }
}
```

- [ ] **Step 4: Create apps/ and packages/ directories**

```bash
mkdir -p apps packages
touch apps/.gitkeep packages/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
git add package.json turbo.json apps/.gitkeep packages/.gitkeep
git commit -m "feat(monorepo): scaffold Turborepo workspace root"
```

---

## Phase 2: Move shipments app into apps/shipments/

### Task 2.1: Move app files using git mv (preserves history)

**Files:**
- Modify: `src/` → `apps/shipments/src/`
- Modify: `public/` → `apps/shipments/public/`
- Modify: `index.html` → `apps/shipments/index.html`
- Modify: `vite.config.js` → `apps/shipments/vite.config.js`
- Modify: `eslint.config.js` → `apps/shipments/eslint.config.js`
- Modify: `tools/generate.mjs` → `apps/shipments/tools/generate.mjs`

- [ ] **Step 1: Move source files**

Run each command individually and verify no errors:
```bash
git mv src apps/shipments/src
git mv public apps/shipments/public
git mv index.html apps/shipments/index.html
git mv vite.config.js apps/shipments/vite.config.js
git mv eslint.config.js apps/shipments/eslint.config.js
```

- [ ] **Step 2: Move app-specific tool (keep tools/convert-docs.sh at root)**

```bash
mkdir -p apps/shipments/tools
git mv tools/generate.mjs apps/shipments/tools/generate.mjs
```

Keep `tools/convert-docs.sh` at root — it's cross-cutting documentation tooling.

- [ ] **Step 3: Verify git history is preserved**

```bash
git log --follow apps/shipments/src/App.jsx | head -5
```
Expected: Shows commit history going back beyond the rename.

- [ ] **Step 4: Remove old node_modules and package-lock (will regenerate)**

```bash
rm -rf node_modules package-lock.json dist
```
These aren't tracked by git (or are gitignored), so no git commands needed.

### Task 2.2: Create apps/shipments/package.json

**Files:**
- Create: `apps/shipments/package.json`

- [ ] **Step 1: Create the app package.json**

Create `apps/shipments/package.json`:
```json
{
  "name": "shipments",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "generate-data": "node tools/generate.mjs"
  },
  "dependencies": {
    "@faker-js/faker": "^9.3.0",
    "@odyssey/tokens": "*",
    "@odyssey/ui": "*",
    "@tailwindcss/vite": "^4.2.2",
    "@vercel/analytics": "^2.0.1",
    "@vercel/speed-insights": "^2.0.0",
    "lucide-react": "^1.6.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-window": "^2.2.7",
    "tailwindcss": "^4.2.2"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.4.0",
    "vite": "^8.0.1"
  }
}
```

Notes:
- Added `"@odyssey/tokens": "*"` and `"@odyssey/ui": "*"` — these resolve to workspace packages
- Changed `generate-data` to use `node` instead of `bun` (since we removed bun.lock)
- Name is `shipments` (matches `turbo run dev --filter=shipments`)

- [ ] **Step 2: Commit the move (before install)**

```bash
git add apps/shipments/package.json apps/shipments/
git commit -m "feat(monorepo): move shipments app to apps/shipments"
```

Install will fail at this point because `@odyssey/tokens` and `@odyssey/ui` don't exist yet — that's the next phase.

---

## Phase 3: Extract packages/tokens

### Task 3.1: Create packages/tokens

**Files:**
- Create: `packages/tokens/package.json`
- Modify: `apps/shipments/src/styles/tokens.css` → `packages/tokens/tokens.css`
- Modify: `apps/shipments/src/index.css` (update import path)

- [ ] **Step 1: Move tokens.css**

```bash
mkdir -p packages/tokens
git mv apps/shipments/src/styles/tokens.css packages/tokens/tokens.css
```

- [ ] **Step 2: Create packages/tokens/package.json**

Create `packages/tokens/package.json`:
```json
{
  "name": "@odyssey/tokens",
  "private": true,
  "version": "0.0.0",
  "exports": {
    "./tokens.css": "./tokens.css"
  },
  "files": [
    "tokens.css"
  ]
}
```

- [ ] **Step 3: Update import in apps/shipments/src/index.css**

Read `apps/shipments/src/index.css` (it currently has `@import "./styles/tokens.css";`).

Replace that line with:
```css
@import "@odyssey/tokens/tokens.css";
```

Leave all other imports and `@theme` block unchanged.

- [ ] **Step 4: Install workspace deps**

Run from repo root: `npm install`
Expected: Creates `node_modules/` with workspace symlinks for `@odyssey/tokens`. No errors.

- [ ] **Step 5: Verify dev server still renders with tokens**

Run: `npm run dev:shipments`
Expected: Vite starts, app loads, tokens are applied (background color, text color match design). Visually confirm the app looks identical to pre-migration. Hit Ctrl-C.

- [ ] **Step 6: Commit**

```bash
git add packages/tokens apps/shipments/src/index.css package.json package-lock.json
git commit -m "feat(monorepo): extract packages/tokens"
```

---

## Phase 4: Extract packages/ui (Badge first)

### Task 4.1: Create packages/ui with Badge

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/src/index.js`
- Modify: `apps/shipments/src/components/ui/Badge.jsx` → `packages/ui/src/Badge.jsx`
- Modify: all files importing Badge from `./components/ui/Badge` → `@odyssey/ui`

- [ ] **Step 1: Find all Badge import sites**

Run: `grep -rn "from.*components/ui/Badge" apps/shipments/src/`
Expected: Lists every file that imports Badge. Save this list — you need to update each one.

- [ ] **Step 2: Move Badge.jsx to packages/ui**

```bash
mkdir -p packages/ui/src
git mv apps/shipments/src/components/ui/Badge.jsx packages/ui/src/Badge.jsx
```

- [ ] **Step 3: Create packages/ui/src/index.js**

Create `packages/ui/src/index.js`:
```js
export { default as Badge } from './Badge.jsx';
```

- [ ] **Step 4: Create packages/ui/package.json**

Create `packages/ui/package.json`:
```json
{
  "name": "@odyssey/ui",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "peerDependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "dependencies": {
    "@odyssey/tokens": "*"
  }
}
```

- [ ] **Step 5: Update Badge imports in all apps/shipments files**

For each file found in Step 1, change the import. Example:
```js
// BEFORE
import Badge from './components/ui/Badge'
// or
import Badge from '../ui/Badge'

// AFTER
import { Badge } from '@odyssey/ui'
```

Use the exact list from Step 1. Don't grep-and-replace blindly — handle relative paths correctly.

- [ ] **Step 6: Tell Tailwind to scan packages/ui**

Read `apps/shipments/src/index.css`. At the top, after `@import "tailwindcss";`, add:
```css
@source "../../../packages/ui/src/**/*.{js,jsx,ts,tsx}";
```

This tells Tailwind v4 to include utility classes found in `packages/ui` when building.

- [ ] **Step 7: Install and verify**

Run: `npm install`
Expected: Adds `@odyssey/ui` to the workspace symlinks.

Run: `npm run dev:shipments`
Expected: App loads. Navigate to a view with Badges (e.g., Shipments table). Confirm badges render with correct colors and styling. Hit Ctrl-C.

- [ ] **Step 8: Commit**

```bash
git add packages/ui apps/shipments/src apps/shipments/package.json package.json package-lock.json
git commit -m "feat(monorepo): extract packages/ui with Badge component"
```

### Task 4.2: Decide on remaining UI components

**Files:**
- Potentially: `apps/shipments/src/components/ui/Button.jsx` → `packages/ui/src/Button.jsx`
- Potentially: `apps/shipments/src/components/ui/DarkTooltip.jsx` → `packages/ui/src/DarkTooltip.jsx`

- [ ] **Step 1: Pause and check with user**

Badge is moved and verified. Before moving Button and DarkTooltip, confirm with the user:
> "Badge is extracted and working. Want me to also move Button and DarkTooltip to packages/ui now, or keep them app-local for now and migrate one-by-one later as they get normalized?"

Reason to pause: normalization work happens in place; moving un-normalized components adds churn. User may prefer to move a component only after normalizing it.

- [ ] **Step 2: If yes, repeat Task 4.1 steps for each additional component**

For each component:
1. `git mv apps/shipments/src/components/ui/X.jsx packages/ui/src/X.jsx`
2. Add `export { default as X } from './X.jsx';` to `packages/ui/src/index.js`
3. Find/update import sites in `apps/shipments/src/`
4. `npm run dev:shipments`, verify visually
5. Commit: `git commit -m "feat(monorepo): move <Component> to packages/ui"`

Each component is its own commit — easy to revert if something breaks.

---

## Phase 5: Scaffold packages/db (empty placeholder)

### Task 5.1: Create empty db package

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/src/index.js`
- Create: `packages/db/README.md`

- [ ] **Step 1: Create directory and files**

```bash
mkdir -p packages/db/src
```

Create `packages/db/package.json`:
```json
{
  "name": "@odyssey/db",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  }
}
```

Create `packages/db/src/index.js`:
```js
// Placeholder — Supabase client will live here.
// When ready: install @supabase/supabase-js, export a configured client,
// and export shared schema types consumed by apps/shipments, apps/homepage, etc.
export {};
```

Create `packages/db/README.md`:
```markdown
# @odyssey/db

Placeholder for the shared Supabase client and schema types.

When all apps (shipments, homepage, carriers, orders) share a single Supabase
project, this package will export:
- A configured Supabase client (reading env vars for URL + anon key)
- TypeScript/JSDoc types generated from the schema
- Shared query helpers used across apps
```

- [ ] **Step 2: Install and commit**

```bash
npm install
git add packages/db package.json package-lock.json
git commit -m "feat(monorepo): scaffold packages/db placeholder"
```

---

## Phase 6: Update Vercel deployment config

### Task 6.1: Update Vercel project rootDirectory

**Files:**
- None (changes are in Vercel dashboard, not repo)
- Create: `apps/shipments/vercel.json` (optional, only if build command needs override)

- [ ] **Step 1: Pause and coordinate with user**

Before pushing to main (which triggers auto-deploy), the Vercel project needs reconfiguring. Tell the user:
> "The next push would trigger an auto-deploy, but Vercel is still pointed at the repo root. I need you to update two settings in the Vercel dashboard first:
>
> 1. Go to https://vercel.com/odyssey-logistics-iris/odyssey-shipments/settings
> 2. Under **Build & Development Settings → Root Directory**, change from `.` (or blank) to `apps/shipments`
> 3. Save
>
> After that, the next push will deploy correctly. Let me know when it's done."

- [ ] **Step 2: Push to a test branch first (do NOT push to main yet)**

```bash
git checkout -b monorepo-migration
git push -u origin monorepo-migration
```

Expected: Vercel creates a preview deployment for this branch using the new `rootDirectory` setting. Check the preview URL renders correctly.

- [ ] **Step 3: If preview deploy fails, diagnose**

Common issues:
- **"Cannot find module @odyssey/ui"** → Vercel didn't hoist workspace deps. Fix: in Vercel dashboard, set **Install Command** to `npm install` (not `cd apps/shipments && npm install`). Vercel should auto-detect workspaces from the root `package.json`.
- **"vite: not found"** → same root cause as above.
- **Tailwind classes missing** → `@source` directive in `index.css` is wrong. Verify the relative path resolves to `packages/ui/src`.
- **Build output wrong** → Vercel expects `dist/` inside `rootDirectory` (i.e. `apps/shipments/dist/`). Vite produces that by default, so no change needed.

- [ ] **Step 4: Verify preview deploy works**

Open the preview URL Vercel generated. Confirm:
- Page loads
- Shipments table renders
- Badges show correct colors
- Filters/search work
- No console errors

- [ ] **Step 5: Merge to main**

After preview is verified:
```bash
git checkout main
git merge monorepo-migration
git push origin main
```

Expected: Production deploy at `odyssey-shipments.vercel.app` succeeds and renders identically.

- [ ] **Step 6: Clean up branch**

```bash
git branch -d monorepo-migration
git push origin --delete monorepo-migration
```

---

## Phase 7: Update docs and close the loop

### Task 7.1: Update progress.md and CLAUDE.md

**Files:**
- Modify: `progress.md` (add session entry)
- Modify: `CLAUDE.md` (add monorepo guidance)

- [ ] **Step 1: Add progress.md session entry**

Read the latest session entry in `progress.md` to match the existing format. Append a new session entry describing:
- Why we migrated to a monorepo (future apps: homepage, carriers, orders; shared DB, tokens, components)
- What the new structure looks like (apps/, packages/)
- How to run dev (`npm run dev:shipments` from root, or `npm run dev` from `apps/shipments/`)
- What's next (future apps, Supabase integration in packages/db)

- [ ] **Step 2: Update CLAUDE.md**

Read current `CLAUDE.md`. Append a new section:
```markdown
## Monorepo Structure

This repo is a Turborepo monorepo. The shipments app lives in `apps/shipments/`.
Shared code lives in `packages/ui`, `packages/tokens`, `packages/db`.

When adding components to be shared across apps, put them in `packages/ui/src/`
and export them from `packages/ui/src/index.js`. When adding design tokens,
update `packages/tokens/tokens.css`.

Run the app: `npm run dev:shipments` from repo root, or `npm run dev` from
`apps/shipments/`.

Deploy: each app has its own Vercel project with `rootDirectory` set to
`apps/<name>/`. Pushing to main triggers auto-deploy for all configured apps.
```

- [ ] **Step 3: Commit docs update**

```bash
git add progress.md CLAUDE.md
git commit -m "docs: document monorepo structure and migration"
git push origin main
```

### Task 7.2: Save a memory for future sessions

**Files:**
- Create: `.claude/projects/-Users-manuelramirez-Documents-iris-Odyssey-Shipments-odyssey-shipments/memory/project_monorepo_structure.md`
- Modify: `.claude/projects/-Users-manuelramirez-Documents-iris-Odyssey-Shipments-odyssey-shipments/memory/MEMORY.md`

- [ ] **Step 1: Write the project memory**

Create the memory file with frontmatter:
```markdown
---
name: Monorepo structure
description: Repo is Turborepo monorepo. Shipments at apps/shipments, shared code in packages/ui, packages/tokens, packages/db. Future apps (homepage, carriers, orders) will live in apps/.
type: project
---

The repo was restructured from a single Vite/React app at root into a Turborepo
monorepo on 2026-04-23.

**Why:** Future apps (homepage, carriers, orders) will share the same Supabase
DB, design tokens, and React components. Monorepo avoids the sync friction of
publishing `@odyssey/ui` as a private npm package across 4 repos.

**How to apply:** When adding shared components, put them in packages/ui/src/
and export from packages/ui/src/index.js. When adding design tokens, edit
packages/tokens/tokens.css. Run dev with `npm run dev:shipments` from root.
Each app deploys as its own Vercel project with rootDirectory = apps/<name>.
```

- [ ] **Step 2: Add index entry to MEMORY.md**

Append to `MEMORY.md`:
```markdown
- [project_monorepo_structure.md](project_monorepo_structure.md) — Repo is Turborepo monorepo: apps/shipments + packages/ui, packages/tokens, packages/db
```

No commit needed (memory files are in user config, not repo).

---

## Post-migration smoke test checklist

After all phases are done, run this once end-to-end to confirm nothing silently broke:

- [ ] `npm install` from repo root — no errors, workspaces symlinked
- [ ] `npm run dev:shipments` — dev server starts, app loads at localhost
- [ ] Shipments table renders — badges colored correctly, data populates
- [ ] Filter panel opens and applies filters
- [ ] Column panel opens and toggles columns
- [ ] Search and saved queries work
- [ ] Bottom bar (shipment details) opens on row click
- [ ] Export CSV produces a valid file
- [ ] `npm run build` from root — `apps/shipments/dist/` is produced, no errors
- [ ] Production deploy on main — preview URL renders identically to local dev
- [ ] `git log --follow apps/shipments/src/App.jsx` — history goes back pre-migration
- [ ] `git log --follow packages/ui/src/Badge.jsx` — history goes back pre-migration

---

## Rollback strategy

Each phase is a single commit. To roll back any phase:
```bash
git log --oneline  # find the commit before the phase
git revert <commit-sha>  # or git reset --hard <previous-sha> if not pushed
```

If Phase 6 (Vercel) fails and you need to revert to single-app deploy immediately:
1. In Vercel dashboard, change `rootDirectory` back to `.`
2. `git revert` the monorepo commits back to the last single-app commit
3. Force-push to main (only if necessary and coordinated with team)

Phases 1-5 are purely local changes and safe to revert without touching Vercel.
