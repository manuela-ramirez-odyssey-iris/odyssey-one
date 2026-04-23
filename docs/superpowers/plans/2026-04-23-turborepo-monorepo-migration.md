# Turborepo Monorepo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This is a structural migration, not a feature.** There are no new behaviors to unit-test. Each phase ends with a smoke test (app renders identically) and a commit. TDD does not apply in the traditional sense — the visual/functional parity of the shipments prototype IS the test.

**Goal:** Restructure the single-app `odyssey-shipments` repo into a Turborepo monorepo *in place* (same repo, same name, git history preserved), so future domain apps (Home, Carriers, Orders) can share one Supabase database, one set of design tokens, and one React component library with the Shipments app.

**Architecture:** npm workspaces + Turborepo. Current app → `apps/shipments/`. Shared code → `packages/ui` (React components), `packages/tokens` (CSS custom properties), `packages/db` (Supabase client placeholder — populated later). Tailwind v4's `@source` directive scans `packages/ui` for classes used at build time. Each app becomes its own Vercel project with `rootDirectory` pointing at `apps/<name>/`. Deploys remain CLI-only (`npx vercel --prod`) — GitHub auto-deploy is intentionally off to avoid Odyssey IT alerts.

**Tech Stack:** npm workspaces, Turborepo, Vite 8, React 19, Tailwind v4 (`@tailwindcss/vite`), Vercel.

**Multi-domain framing (why this migration matters):**
- Shipments is domain #1. Home, Carriers, and possibly Orders follow.
- All domains will share one Supabase project (single source of truth; Home can display shipment data, Carriers can join against shipments, etc.).
- All domains consume the same design tokens and React components — the normalization work happening in Shipments right now becomes the seed library for every future app.
- Monorepo avoids the sync pain of publishing `@odyssey/*` as private npm packages across 4 separate repos.

**Key constraints:**
- Preserve git history — use `git mv` for tracked files; filesystem `mv` only for gitignored content.
- Repo name stays `odyssey-shipments` during this migration. A rename (e.g. to `odyssey-monorepo`) is separate, later work.
- Vercel deploys remain manual via `npx vercel --prod`. Do NOT enable GitHub auto-deploy.
- Root-level docs stay at root: `progress.md`, `decision-log.md` (if present), `CLAUDE.md`, `README.md`, `design.md`, `change-notes.md`, `button-styles.md`.
- `playground/`, `shipments-documentation/`, `tools/convert-docs.sh` stay at root (cross-cutting, not app-specific).
- Normalization is paused mid-epic. Only the already-normalized `Badge` component moves to `packages/ui`. `Button` and `DarkTooltip` stay app-local and migrate one at a time as they get normalized.
- Each phase ends in a commit — safe to pause or rollback between phases.
- Do NOT add feature code, refactor opportunistically, or start new domains during this migration. Structure-only.

---

## File Structure (Target)

```
odyssey-shipments/                       (same git repo, same name)
├── apps/
│   └── shipments/
│       ├── src/                         (git mv from root/src)
│       ├── public/
│       │   ├── <tracked assets>         (git mv from root/public)
│       │   └── details/                 (fs mv from root/public/details — gitignored, 1200 files, 26 MB)
│       ├── tools/generate.mjs           (git mv from root/tools/generate.mjs)
│       ├── index.html                   (git mv)
│       ├── vite.config.js               (git mv)
│       ├── eslint.config.js             (git mv)
│       └── package.json                 (new — shipments-specific deps)
├── packages/
│   ├── ui/
│   │   ├── src/
│   │   │   ├── Badge.jsx                (git mv from apps/shipments/src/components/ui/Badge.jsx)
│   │   │   └── index.js                 (new — re-exports)
│   │   └── package.json                 (new)
│   ├── tokens/
│   │   ├── tokens.css                   (git mv from apps/shipments/src/styles/tokens.css)
│   │   └── package.json                 (new)
│   └── db/
│       ├── src/index.js                 (new — empty placeholder with usage sketch)
│       ├── README.md                    (new — Supabase integration contract)
│       └── package.json                 (new)
├── progress.md                          (unchanged)
├── CLAUDE.md                            (appended with monorepo guidance)
├── README.md                            (unchanged)
├── design.md                            (unchanged)
├── change-notes.md                      (unchanged)
├── button-styles.md                     (unchanged)
├── playground/                          (unchanged — stays at root, cross-cutting)
├── shipments-documentation/             (unchanged — stays at root)
├── tools/convert-docs.sh                (unchanged — stays at root, cross-cutting)
├── docs/superpowers/                    (unchanged)
├── turbo.json                           (new)
├── package.json                         (rewritten as workspace root)
└── package-lock.json                    (regenerated after restructure)
```

**File responsibility boundaries:**
- `apps/shipments/package.json` — only shipments-app runtime deps (React, lucide-react, @vercel/analytics, faker, etc.) + `@odyssey/tokens` and `@odyssey/ui` as workspace deps.
- Root `package.json` — workspace definition only + `turbo` devDep + top-level orchestration scripts (`dev`, `build`, `lint`, `dev:shipments`).
- `packages/tokens/package.json` — exports `tokens.css` only, no runtime deps.
- `packages/ui/package.json` — `peerDependencies` on react/react-dom, runtime `dependencies` on `@odyssey/tokens`.
- `packages/db/package.json` — placeholder; gets `@supabase/supabase-js` when SHP-55 starts.

**Future packages (documented, not created this migration):**
- `@odyssey/schemas` — shared TypeScript/JSDoc types generated from Supabase schema. Carve out when >1 app consumes the same types.
- `@odyssey/config` — shared ESLint/Tailwind/tsconfig. Carve out once a second app exists and duplication hurts.

Do not create these in this migration — YAGNI until Home or Carriers actually starts.

---

## Phase 0: Pre-flight & clean baseline

**Purpose:** verify the working tree is clean post-freeze-checkpoint, remove the stale `bun.lock`, and confirm the current app still builds/runs before we touch structure.

### Task 0.1: Verify clean baseline

**Files:** none modified.

- [ ] **Step 1: Check working tree is clean**

Run:
```bash
git status
```
Expected: `nothing to commit, working tree clean` and `Your branch is up to date with 'origin/main'`. If not clean, stop and ask the user — the freeze checkpoint should have handled all pending changes (commit SHA `809b10e`).

- [ ] **Step 2: Confirm we're on main**

Run:
```bash
git rev-parse --abbrev-ref HEAD
```
Expected: `main`. If on a different branch, stop and ask the user before proceeding.

### Task 0.2: Remove stale bun.lock

**Files:**
- Delete: `bun.lock`

**Why:** the repo switched to npm when `@vercel/analytics` was installed (2026-04-23). `bun.lock` is a leftover and will confuse future agents about which package manager is active.

- [ ] **Step 1: Confirm bun.lock exists and package-lock.json exists**

Run:
```bash
ls bun.lock package-lock.json
```
Expected: both files listed. If `bun.lock` does not exist, skip Task 0.2 entirely.

- [ ] **Step 2: Verify generate.mjs has no Bun-specific APIs**

Run:
```bash
grep -E "Bun\.|import.*['\"]bun:" tools/generate.mjs
```
Expected: no output. This confirms the generator is portable to Node. If any match appears, STOP and flag to the user — the bun→node swap in Phase 2 won't be safe.

- [ ] **Step 3: Remove bun.lock**

Run:
```bash
git rm bun.lock
```

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove stale bun.lock — npm is active package manager"
```

### Task 0.3: Baseline smoke test

**Purpose:** prove the app works pre-migration, so any later breakage is clearly attributable to migration steps.

- [ ] **Step 1: Clean install from current lockfile**

Run:
```bash
rm -rf node_modules
npm install
```
Expected: no errors, `node_modules/` created.

- [ ] **Step 2: Start dev server**

Run:
```bash
npm run dev
```
Expected: Vite starts, prints a local URL (default `http://localhost:5173` or whatever port Vite picks).

- [ ] **Step 3: Open the app in a browser**

Open the URL Vite printed. Verify:
- Shipments table renders with badges colored correctly
- At least one row can be selected and the bottom bar opens
- Filter panel opens
- No console errors

- [ ] **Step 4: Stop the dev server**

Hit `Ctrl-C` in the terminal running `npm run dev`.

- [ ] **Step 5: No commit needed**

No files changed. This is a read-only verification.

---

## Phase 1: Monorepo scaffold (root only, no file moves yet)

**Purpose:** lay down the workspace configuration without moving any source yet. `npm install` will fail at the end of this phase — that is expected and gets resolved in Phase 2.

### Task 1.1: Rewrite root package.json as workspace root

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Read the current root package.json for reference**

Run:
```bash
cat package.json
```
Note the current `dependencies` and `devDependencies` — they will reappear in `apps/shipments/package.json` in Phase 2.

- [ ] **Step 2: Overwrite package.json with workspace root contents**

Replace the entire file with:

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
    "dev:shipments": "turbo run dev --filter=shipments",
    "build:shipments": "turbo run build --filter=shipments"
  },
  "devDependencies": {
    "turbo": "^2.3.0"
  }
}
```

Note: `"name": "odyssey-monorepo"` is an internal name only — it does NOT rename the repo folder or the GitHub remote.

### Task 1.2: Create turbo.json

**Files:**
- Create: `turbo.json`

- [ ] **Step 1: Create turbo.json**

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

### Task 1.3: Create empty workspace directories

**Files:**
- Create: `apps/.gitkeep`
- Create: `packages/.gitkeep`

- [ ] **Step 1: Create directories with .gitkeep**

Run:
```bash
mkdir -p apps packages
touch apps/.gitkeep packages/.gitkeep
```

- [ ] **Step 2: Commit Phase 1**

```bash
git add package.json turbo.json apps/.gitkeep packages/.gitkeep
git commit -m "feat(monorepo): scaffold Turborepo workspace root"
```

**Expected state after Phase 1:** `npm install` from root will fail because there are no workspace packages yet. Do not run it. Phase 2 resolves this.

---

## Phase 2: Move shipments app into apps/shipments/

### Task 2.1: Move tracked app source files with git mv

**Files:**
- Modify: `src/` → `apps/shipments/src/`
- Modify: `public/` → `apps/shipments/public/` (tracked files only)
- Modify: `index.html` → `apps/shipments/index.html`
- Modify: `vite.config.js` → `apps/shipments/vite.config.js`
- Modify: `eslint.config.js` → `apps/shipments/eslint.config.js`

**Why `git mv` not `mv`:** `git mv` records the move as a rename, so `git log --follow` preserves file history across the move. This matters for `git blame` on components like Badge.jsx that have months of design-decision history.

- [ ] **Step 1: Create the apps/shipments directory**

Run:
```bash
mkdir -p apps/shipments
```

- [ ] **Step 2: git mv src/**

Run:
```bash
git mv src apps/shipments/src
```

- [ ] **Step 3: git mv public/ (tracked portion)**

Run:
```bash
git mv public apps/shipments/public
```

Note: this moves only the files git knows about. The `public/details/` subdirectory is gitignored (1200 files, 26 MB) — it is handled separately in Task 2.3.

- [ ] **Step 4: git mv index.html**

Run:
```bash
git mv index.html apps/shipments/index.html
```

- [ ] **Step 5: git mv vite.config.js**

Run:
```bash
git mv vite.config.js apps/shipments/vite.config.js
```

- [ ] **Step 6: git mv eslint.config.js**

Run:
```bash
git mv eslint.config.js apps/shipments/eslint.config.js
```

- [ ] **Step 7: Verify git recorded these as renames**

Run:
```bash
git status
```
Expected: see `renamed:` lines (not `deleted:` + `new file:` pairs). If you see deletes and adds, history was NOT preserved and you must reset and retry.

### Task 2.2: Move app-specific tooling

**Files:**
- Modify: `tools/generate.mjs` → `apps/shipments/tools/generate.mjs`

Keep `tools/convert-docs.sh` at root — it's cross-cutting documentation tooling used by any future domain.

- [ ] **Step 1: Create apps/shipments/tools directory**

Run:
```bash
mkdir -p apps/shipments/tools
```

- [ ] **Step 2: git mv generate.mjs**

Run:
```bash
git mv tools/generate.mjs apps/shipments/tools/generate.mjs
```

- [ ] **Step 3: Confirm tools/convert-docs.sh stayed at root**

Run:
```bash
ls tools/
```
Expected: `convert-docs.sh` present (and nothing else). If `tools/` is now empty, that's fine — leave the directory so future cross-cutting tools have a home.

### Task 2.3: Move the gitignored public/details/ directory

**Files:**
- Move: `public/details/` → `apps/shipments/public/details/` (filesystem only, 1200 files)

**Why this is a separate task:** `public/details/` contains 1200 per-shipment JSON files generated by `tools/generate.mjs`. It is in `.gitignore`, so `git mv public apps/shipments/public` in Task 2.1 does NOT move it. If skipped, the first `npm run dev:shipments` will 404 on every detail fetch because `LRUCache` calls `fetch('/details/<id>.json')` and the files won't exist at that path.

- [ ] **Step 1: Check if public/details/ exists**

Run:
```bash
ls -d public/details 2>/dev/null && echo "EXISTS" || echo "MISSING"
```

- [ ] **Step 2a (if EXISTS): Move the directory**

Run:
```bash
mv public/details apps/shipments/public/details
```

- [ ] **Step 2b (if MISSING): Regenerate after the package.json exists**

Skip this step for now. After Task 2.4 and after `npm install` succeeds in Phase 3, regenerate with:
```bash
cd apps/shipments && node tools/generate.mjs && cd ../..
```

- [ ] **Step 3: Clean up empty public/ at root if anything remains**

Run:
```bash
rmdir public 2>/dev/null || true
```
This removes `public/` at root only if it's empty. If it's not empty, that means some file was missed in Task 2.1 — inspect with `ls public/` and move remaining items manually.

### Task 2.4: Create apps/shipments/package.json

**Files:**
- Create: `apps/shipments/package.json`

- [ ] **Step 1: Create the app package.json**

Create `apps/shipments/package.json` with:

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

Key details:
- `"name": "shipments"` matches `turbo run dev --filter=shipments` in the root scripts.
- `"@odyssey/tokens": "*"` and `"@odyssey/ui": "*"` are workspace package references — npm resolves them as symlinks once those packages exist (Phases 3 and 4).
- `"generate-data": "node tools/generate.mjs"` — swapped from `bun` to `node`. Verified in Task 0.2 Step 2 that generate.mjs uses no Bun-specific APIs.

- [ ] **Step 2: Delete stale root artifacts**

These are gitignored or tracked-but-now-wrong. They will regenerate in Phase 3.
```bash
rm -rf node_modules package-lock.json dist
```

Note: we committed `package-lock.json` in the freeze checkpoint. Deleting it now is intentional — the new one produced by `npm install` from workspace root will be hoisted/deduped and will look different. That's correct behavior.

- [ ] **Step 3: Commit Phase 2**

```bash
git add apps/shipments/package.json apps/shipments/ package-lock.json
git commit -m "feat(monorepo): move shipments app to apps/shipments/"
```

Note: `package-lock.json` is included here as a deletion (`git rm` happens implicitly because it was tracked). If git complains, use `git add -u` to pick up the deletion.

**Expected state after Phase 2:** running `npm install` from root will still fail because `@odyssey/tokens` and `@odyssey/ui` don't exist yet. Phase 3 creates tokens; Phase 4 creates ui.

---

## Phase 3: Extract packages/tokens

### Task 3.1: Move tokens.css into packages/tokens/

**Files:**
- Create: `packages/tokens/package.json`
- Modify: `apps/shipments/src/styles/tokens.css` → `packages/tokens/tokens.css`

- [ ] **Step 1: Create packages/tokens directory**

Run:
```bash
mkdir -p packages/tokens
```

- [ ] **Step 2: git mv tokens.css**

Run:
```bash
git mv apps/shipments/src/styles/tokens.css packages/tokens/tokens.css
```

- [ ] **Step 3: Verify no other files remain in the old styles directory**

Run:
```bash
ls apps/shipments/src/styles/
```
If `components.css` or anything else is still there, leave it — those stay app-local. Only `tokens.css` is shared across domains.

### Task 3.2: Create packages/tokens/package.json

**Files:**
- Create: `packages/tokens/package.json`

- [ ] **Step 1: Create the package.json**

Create `packages/tokens/package.json` with:

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

Note: no `type` field because this package exports CSS only, no JS. No `main` field for the same reason.

### Task 3.3: Update the tokens import in apps/shipments/src/index.css

**Files:**
- Modify: `apps/shipments/src/index.css`

The current `index.css` starts with (verified in Phase 0 discovery):
```css
@import "tailwindcss";
@import "./styles/tokens.css";
@import "./styles/components.css";
```

- [ ] **Step 1: Replace the tokens.css import**

In `apps/shipments/src/index.css`, replace the line:
```css
@import "./styles/tokens.css";
```
with:
```css
@import "@odyssey/tokens/tokens.css";
```

Leave the other two `@import` lines (`tailwindcss` and `./styles/components.css`) and the `@theme` block unchanged.

### Task 3.4: Install workspaces and smoke test

- [ ] **Step 1: Install from workspace root**

Run:
```bash
npm install
```
Expected: creates `node_modules/` and symlinks `@odyssey/tokens` into `apps/shipments/node_modules/@odyssey/tokens`. No errors.

- [ ] **Step 2: (If Task 2.3 was skipped because details was missing) regenerate detail files now**

```bash
cd apps/shipments && node tools/generate.mjs && cd ../..
```
Otherwise skip this step.

- [ ] **Step 3: Start dev server from root**

Run:
```bash
npm run dev:shipments
```
Expected: Turborepo starts Vite inside `apps/shipments`, prints local URL.

- [ ] **Step 4: Visually verify tokens are applied**

Open the printed URL. Check:
- Background colors, text colors, borders match what they looked like in Phase 0 smoke test.
- Badges (in the Shipments table) render with correct colors — this is the key visual signal that `@odyssey/tokens/tokens.css` is resolving correctly.
- No console errors.

- [ ] **Step 5: Stop dev server**

Hit `Ctrl-C`.

- [ ] **Step 6: Commit Phase 3**

```bash
git add packages/tokens apps/shipments/src/index.css package.json package-lock.json
git commit -m "feat(monorepo): extract packages/tokens for cross-domain token sharing"
```

---

## Phase 4: Extract packages/ui (Badge only)

### Task 4.1: Move Badge into packages/ui

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/src/index.js`
- Modify: `apps/shipments/src/components/ui/Badge.jsx` → `packages/ui/src/Badge.jsx`
- Modify: `apps/shipments/src/components/shipments/ShipmentTable.jsx` (Badge import path)
- Modify: `apps/shipments/src/components/detail/BottomBar.jsx` (Badge import path)

**Why only Badge:** Badge is the only component that has been normalized (Session 10). `Button` and `DarkTooltip` still live in `apps/shipments/src/components/ui/` and will stay there until they get normalized in later sessions. Moving un-normalized components now creates churn — they will be rewritten during normalization anyway, so each move would become a double edit. Task 4.2 explicitly pauses on this decision.

- [ ] **Step 1: Create packages/ui/src directory**

Run:
```bash
mkdir -p packages/ui/src
```

- [ ] **Step 2: git mv Badge.jsx**

Run:
```bash
git mv apps/shipments/src/components/ui/Badge.jsx packages/ui/src/Badge.jsx
```

- [ ] **Step 3: Verify Button and DarkTooltip stayed put**

Run:
```bash
ls apps/shipments/src/components/ui/
```
Expected: `Button.jsx` and `DarkTooltip.jsx` present. If either is missing, stop — something went wrong in step 2.

- [ ] **Step 4: Create packages/ui/src/index.js**

Create `packages/ui/src/index.js` with:

```js
export { default as Badge } from './Badge.jsx';
```

- [ ] **Step 5: Create packages/ui/package.json**

Create `packages/ui/package.json` with:

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

Note: React is a `peerDependency` so the package doesn't pull in a second copy — it uses whatever React the consuming app installed.

- [ ] **Step 6: Update Badge import in ShipmentTable.jsx**

Open `apps/shipments/src/components/shipments/ShipmentTable.jsx`. The current line 5 is:
```js
import Badge from '../ui/Badge'
```
Replace with:
```js
import { Badge } from '@odyssey/ui'
```

Note the shape change: default import → named import, because `packages/ui/src/index.js` re-exports Badge by name.

- [ ] **Step 7: Update Badge import in BottomBar.jsx**

Open `apps/shipments/src/components/detail/BottomBar.jsx`. The current line 4 is:
```js
import Badge from '../ui/Badge'
```
Replace with:
```js
import { Badge } from '@odyssey/ui'
```

- [ ] **Step 8: Verify no other Badge imports were missed**

Run:
```bash
grep -rn "from.*['\"].*ui/Badge['\"]" apps/shipments/src/
```
Expected: no output. If any match appears, update each one to `import { Badge } from '@odyssey/ui'`.

- [ ] **Step 9: Tell Tailwind to scan packages/ui**

In `apps/shipments/src/index.css`, after the existing `@import "tailwindcss";` line, add:

```css
@source "../../../packages/ui/src/**/*.{js,jsx,ts,tsx}";
```

Path breakdown: `apps/shipments/src/index.css` → `../` reaches `apps/shipments/src/` → `../../` reaches `apps/shipments/` → `../../../` reaches repo root → then into `packages/ui/src/**`. Tailwind v4 uses this to pick up utility classes used inside shared components.

- [ ] **Step 10: Install to refresh workspace links**

Run:
```bash
npm install
```
Expected: adds `@odyssey/ui` symlink; no errors.

- [ ] **Step 11: Smoke test**

Run:
```bash
npm run dev:shipments
```
Open the URL. Navigate to the Shipments table and the bottom bar (click a row).
- Badges render with correct colors (amber order badges, green/red status badges, etc.)
- Bottom bar opens and its internal badges render (tender status, hazmat, etc.)
- No console errors.

Hit `Ctrl-C` when satisfied.

- [ ] **Step 12: Commit Phase 4.1**

```bash
git add packages/ui apps/shipments/src apps/shipments/package.json package.json package-lock.json
git commit -m "feat(monorepo): extract packages/ui with Badge component"
```

### Task 4.2: Keep Button and DarkTooltip app-local (no action)

`Button.jsx` and `DarkTooltip.jsx` are not normalized yet and deliberately stay at `apps/shipments/src/components/ui/` until their normalization pass in a later session. Moving them now would create double work — each would be rewritten during normalization anyway, so the `git mv` would just be churn.

Decision pre-committed by the user (2026-04-23): keep them local.

- [ ] **Step 1: Confirm they're still in place**

Run:
```bash
ls apps/shipments/src/components/ui/
```
Expected: `Button.jsx` and `DarkTooltip.jsx` present. No action needed.

No files change. No commit in this task.

---

## Phase 5: Scaffold packages/db (empty placeholder)

### Task 5.1: Create the db package

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/src/index.js`
- Create: `packages/db/README.md`

**Why a placeholder now:** when SHP-55 (Supabase integration) starts, the package already exists with a documented shape. Apps can reference `@odyssey/db` in their future workspace deps from day one. The `README.md` captures the contract for every future consumer.

- [ ] **Step 1: Create directories**

Run:
```bash
mkdir -p packages/db/src
```

- [ ] **Step 2: Create packages/db/package.json**

Create `packages/db/package.json` with:

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

No dependencies yet — `@supabase/supabase-js` gets added when SHP-55 starts.

- [ ] **Step 3: Create packages/db/src/index.js**

Create `packages/db/src/index.js` with:

```js
// Placeholder — Supabase client and schema types will live here.
//
// When SHP-55 (Supabase integration) starts:
//   1. Install @supabase/supabase-js in this package.
//   2. Export a `createClient(url, anonKey)` factory (not a preconfigured
//      client), so each app can inject its own VITE_SUPABASE_URL and
//      VITE_SUPABASE_ANON_KEY. This keeps env-var ownership with the app.
//   3. Export shared schema types (generated via `supabase gen types`)
//      so apps/shipments, apps/home, apps/carriers all consume the same
//      source of truth.

export {};
```

- [ ] **Step 4: Create packages/db/README.md**

Create `packages/db/README.md` with:

```markdown
# @odyssey/db

Placeholder for the shared Supabase client and schema types.

All Odyssey domain apps (Shipments, Home, Carriers, Orders) share a single
Supabase project. This package centralizes the client setup and the
type definitions so no app has to re-implement them.

## Contract (when populated)

- **`createClient(url, anonKey)`** — factory that returns a Supabase client.
  Apps call this in their own bootstrap code with their own env vars, so
  env-var ownership stays with the app.
- **Schema types** — generated via `supabase gen types typescript` and
  re-exported here. Any app importing `@odyssey/db` gets the same types.
- **Query helpers** — reusable queries that span domains (e.g.
  "get active shipments for a carrier") live here, not duplicated
  per-app.

## Populate when

- SHP-55 (Supabase schema design) produces a live schema.
- At least one app actually reads/writes via Supabase.

Do not install `@supabase/supabase-js` speculatively. YAGNI until a real
consumer exists.
```

- [ ] **Step 5: Install and smoke test**

Run:
```bash
npm install
```
Expected: adds `@odyssey/db` to workspace links, even though no app depends on it yet.

No dev-server smoke needed — nothing consumes the package.

- [ ] **Step 6: Commit Phase 5**

```bash
git add packages/db package.json package-lock.json
git commit -m "feat(monorepo): scaffold packages/db placeholder for shared Supabase client"
```

---

## Phase 6: Vercel reconfiguration (CLI-only deploy workflow)

**This is the most manual phase.** It touches external configuration (Vercel dashboard) and involves deploys. Go slowly.

**Workflow reminder:** this project does NOT use GitHub auto-deploy. Every deploy happens via `npx vercel` (preview) or `npx vercel --prod` (production), run from the app directory. That stays true post-migration — we just tell Vercel where the new app directory lives.

### Task 6.1: Update Vercel dashboard Root Directory

**Files:** none in repo.

- [ ] **Step 1: Pause and instruct the user to update Vercel**

Tell the user:

> The next deploy will fail unless the Vercel project knows the app moved. You need to update two settings in the Vercel dashboard. I cannot do this via the CLI or MCP — it's dashboard-only.
>
> 1. Open: `https://vercel.com/manuyetilee-6094s-projects/odyssey-shipments/settings`
> 2. Find **Build & Development Settings → Root Directory**. Change from `.` (or blank) to `apps/shipments`.
> 3. **Install Command** — leave as default (`npm install`). Vercel runs this from the repo root, which correctly hoists the monorepo workspaces.
> 4. **Build Command** — leave as default (`npm run build`, which Turborepo resolves correctly when pointed at `apps/shipments`).
> 5. Save.
>
> Tell me when it's done.

Wait for the user to confirm before Step 2.

### Task 6.2: Preview deploy from the new app directory

- [ ] **Step 1: Change into the app directory**

Run:
```bash
cd apps/shipments
```

- [ ] **Step 2: Run a preview deploy**

Run:
```bash
npx vercel
```

The CLI will print a preview URL. Copy it.

- [ ] **Step 3: Open the preview URL**

Verify:
- Shipments table renders
- Badges colored correctly (amber order badges, red/green status, yellow hazmat)
- Row selection → bottom bar opens
- Filter panel opens and applies filters
- Column arrangement panel works
- Bottom bar tabs (Order, Stops, Product, Tender, Cost, Instructions, Documents, Notes) all load without console errors

- [ ] **Step 4: If preview deploy failed, diagnose**

Common failures and fixes:
- **"Cannot find module `@odyssey/ui`" or `@odyssey/tokens`** — Install Command is wrong. It should be `npm install` (from root), not `cd apps/shipments && npm install`. Update in Vercel dashboard.
- **"vite: not found"** — same root cause; Install Command isn't hoisting workspace deps.
- **Tailwind classes missing from shared components** — `@source` directive in `apps/shipments/src/index.css` has the wrong path. Verify relative path resolves to `packages/ui/src` from the `index.css` location.
- **404 on `/details/<id>.json`** — `public/details/` didn't migrate. Go back to Task 2.3 Step 2b and regenerate.

- [ ] **Step 5: Return to repo root**

Run:
```bash
cd ../..
```

### Task 6.3: Production deploy

- [ ] **Step 1: Change into the app directory**

Run:
```bash
cd apps/shipments
```

- [ ] **Step 2: Run production deploy**

Run:
```bash
npx vercel --prod
```

- [ ] **Step 3: Open the production URL**

URL: `https://odyssey-shipments.vercel.app`

Re-run the same verification checklist from Task 6.2 Step 3. The production app must render identically to before the migration.

- [ ] **Step 4: Return to repo root**

Run:
```bash
cd ../..
```

- [ ] **Step 5: No commit in this phase**

Vercel configuration changes live in Vercel, not in the repo. The `.vercel/project.json` file was created pre-migration and the `projectId` / `orgId` still resolve correctly.

---

## Phase 7: Documentation, tracker updates, and permissions

### Task 7.1: Update progress.md

**Files:**
- Modify: `progress.md`

- [ ] **Step 1: Read the most recent session entry in progress.md**

Run:
```bash
grep -n "^## Session " progress.md | tail -3
```
Note the format of the last session entry (e.g. `## Session 12 — April 23, 2026`).

- [ ] **Step 2: Remove the PAUSED section**

The PAUSED section added during the freeze checkpoint (between "Project Overview" and "Phase 1") is no longer accurate — the migration is complete. Delete the section bounded by `## ⏸ PAUSED FOR MONOREPO MIGRATION (2026-04-23)` and the `---` that follows it.

- [ ] **Step 3: Append a new session entry**

Append to `progress.md`, following the format of the most recent session entry. Content to include:
- Session number (next integer after the last one) and today's date.
- Goal: restructure into Turborepo monorepo to support multi-domain (Home, Carriers, Orders).
- Structural change only — no feature or behavior change.
- New layout: `apps/shipments/`, `packages/ui`, `packages/tokens`, `packages/db`.
- How to run dev: `npm run dev:shipments` from repo root (preferred) or `npm run dev` from `apps/shipments/`.
- How to deploy: `cd apps/shipments && npx vercel --prod` (still CLI-only, auto-deploy remains off).
- Verification: production prototype at `odyssey-shipments.vercel.app` renders identically.
- What's unblocked: future `apps/home`, `apps/carriers`, `apps/orders` can now share `@odyssey/ui`, `@odyssey/tokens`, `@odyssey/db`.
- Normalization resumes next session — Badge already at the new location (`packages/ui/src/Badge.jsx`); next up is `HazmatTag` + inline `ShipmentTable` Hazmat.

### Task 7.2: Rewrite CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (full replace — keep the doc conversion section, add everything else)

**Why a full rewrite:** the current `CLAUDE.md` has a single section (doc conversion). Post-migration it needs to carry the monorepo's structural context, the CLI-only deploy rule, shared-package convention, normalization policy, and pointers to other sources of truth — all of which future Claude sessions benefit from seeing at startup. Target: ~90 lines of dense, scannable content.

**Note on the deploy rule:** the CLI-only deploy rule appears without its rationale here. The reasoning is intentionally kept in user-local memory (`project_vercel_deploy_via_cli.md`), not in this repo-committed file. The rule itself is public; the reason is not.

- [ ] **Step 1: Overwrite `CLAUDE.md` with the new content**

Replace the entire contents of `CLAUDE.md` with:

````markdown
# Odyssey Monorepo — Project Instructions

Multi-domain platform prototype. Shipments is live; Home, Carriers, and possibly Orders will be added as sibling apps sharing the same design system, component library, and (future) Supabase database.

## Directory map

```
odyssey-shipments/                      (repo — rename deferred)
├── apps/
│   └── shipments/                      (the Shipments prototype)
│       ├── src/
│       ├── public/details/             (1200 generated JSONs, gitignored)
│       ├── tools/generate.mjs          (data generator, node runtime)
│       └── package.json
├── packages/
│   ├── ui/src/                         (shared React components — see "Normalization policy")
│   ├── tokens/tokens.css               (shared design tokens)
│   └── db/                             (placeholder — Supabase client goes here)
├── playground/                         (design-system visualization + tracker)
├── shipments-documentation/            (domain analysis, grooming transcripts, backlog)
├── docs/superpowers/plans/             (implementation plans)
├── tools/convert-docs.sh               (cross-cutting: .docx/.pptx → Markdown)
├── .claude/skills/                     (/normalize, /wrap)
├── progress.md                         (session log)
├── CLAUDE.md                           (this file)
├── turbo.json
└── package.json                        (workspace root)
```

## Key commands

From repo root:

- `npm run dev:shipments` — start dev server (preferred)
- `npm run build:shipments` — build the shipments app
- `cd apps/shipments && node tools/generate.mjs` — regenerate the 1200 shipment JSONs (seed 42, reproducible)

## Deploys

**CLI only.** All deploys happen via `npx vercel --prod` run from the relevant app's directory (e.g. `cd apps/shipments && npx vercel --prod`). Do not enable GitHub auto-deploy. Do not `git push` expecting a deploy to fire.

## Shared packages

Shared code lives under `packages/`:

- `@odyssey/ui` — React components shared across all domain apps.
- `@odyssey/tokens` — CSS custom properties for the design system.
- `@odyssey/db` — Supabase client + schema types (placeholder, populated when SHP-55 starts).

Consumers import via the workspace name: `import { Badge } from '@odyssey/ui'`. Never use relative paths to reach into a shared package.

## Normalization policy

Only **normalized** components belong in `@odyssey/ui`. Un-normalized components stay app-local in `apps/<app>/src/components/`.

A component is "normalized" when it has been run through the `/normalize` routine: tokens bound, no hardcoded values, documented in `playground/normalization-tracker.md`.

Do not bulk-move un-normalized components into `@odyssey/ui` — they will be rewritten during normalization and the move would become churn.

## Where context lives

- `progress.md` — session-by-session project log; read the latest session to understand current state.
- `shipments-documentation/Documentation/shipments-domain-analysis.md` — source of truth for the Shipments domain.
- `shipments-documentation/Documentation/decision-log.md` — every implemented decision traced to source + previous state.
- `shipments-documentation/Documentation/backlog.html` — current backlog with statuses.
- `playground/normalization-tracker.md` — design system sync state (what's normalized, what's ad-hoc, what's pending Figma push).
- `docs/superpowers/plans/` — implementation plans for multi-step work.

## Skills

Located in `.claude/skills/`:

- `/normalize <figma-url>` — intake a Figma component, align against design tokens, classify, update playground, implement after approval.
- `/wrap` — end-of-session routine. Summarize, update `progress.md`, commit, push.

## Reading `.docx` and `.pptx` files

Before analyzing any `.docx` or `.pptx` file, run the conversion script first:

```bash
bash tools/convert-docs.sh
```

This converts all documents in `shipments-documentation/` to readable Markdown in `shipments-documentation/Documentation/converted/`:

- `.pptx` → Markdown (text + tables)
- `.docx` → Markdown (text + tables + extracted images in `<name>_images/`)

Then read the `.md` files instead of the originals. For docx images, read the extracted `.png` files from the `<name>_images/` folder.

The script skips files already converted (checks timestamps), so re-running is fast.

**Dependencies:** python-pptx + python-docx (venv auto-created at `/tmp/pptx_env` if missing).

## Stakeholders

- **Janardhana (Jana)** — domain expert, source of truth for Shipments.
- **David Johns** — operational feedback (TL/LTL, PGI, cost allocation).
- **Manuela, Efrain** — designers.
````

- [ ] **Step 2: Verify length**

Run:
```bash
wc -l CLAUDE.md
```
Expected: ~95-110 lines. If significantly over 150, trim the least-load-bearing section (candidates in order of tolerability: Stakeholders → Skills → Normalization policy). If under 60, you dropped content — re-check against Step 1.

### Task 7.3: Update normalization tracker paths

**Files:**
- Modify: `playground/normalization-tracker.md`

- [ ] **Step 1: Update the Badge file path**

In `playground/normalization-tracker.md`, find the row in the "Normalized Components" table where the Component is `Badge`. Change the `File` column value from:
```
`src/components/ui/Badge.jsx`
```
to:
```
`packages/ui/src/Badge.jsx`
```

- [ ] **Step 2: Update Ad-hoc Implementations file paths**

In the "Ad-hoc Implementations (NOT yet normalized)" table, update the `File` column for rows that still point at app-local paths. They now live under `apps/shipments/`:

| Element | Old File | New File |
|---------|----------|----------|
| StatusBadge | `RoutingGuideTab.jsx` | `apps/shipments/src/components/detail/RoutingGuideTab.jsx` |
| TypeBadge | `DocumentsTab.jsx` | `apps/shipments/src/components/detail/DocumentsTab.jsx` |
| HazmatTag | `ProductTab.jsx` | `apps/shipments/src/components/detail/ProductTab.jsx` |
| Hazmat inline | `ShipmentTable.jsx:147-163` | `apps/shipments/src/components/shipments/ShipmentTable.jsx` (line numbers may drift — grep for `TriangleAlert`) |
| Appointment badge | `OrderTab.jsx` | `apps/shipments/src/components/detail/OrderTab.jsx` |
| History action badges | `HistoryTab.jsx` | `apps/shipments/src/components/detail/HistoryTab.jsx` |
| Cost order tabs | `CostAllocationTab.jsx` | `apps/shipments/src/components/detail/CostAllocationTab.jsx` |
| Tab count pills | `ShipmentTabs.jsx` | `apps/shipments/src/components/shipments/ShipmentTabs.jsx` |
| Notification circle | `Navbar.jsx` | `apps/shipments/src/components/layout/Navbar.jsx` |

- [ ] **Step 3: Remove the PAUSED 2026-04-23 section**

Delete the `## ⏸ PAUSED 2026-04-23 — Monorepo Migration` section at the top of `normalization-tracker.md`. The migration is no longer pending.

### Task 7.4: Update the Claude permissions allowlist

**Files:**
- Modify: `.claude/settings.local.json`

- [ ] **Step 1: Read current settings**

Read `.claude/settings.local.json` to see the current `permissions.allow` array.

- [ ] **Step 2: Add Turborepo command patterns**

Add these entries to the `permissions.allow` array (don't remove any existing entries):

```json
"Bash(turbo run *)",
"Bash(turbo *)",
"Bash(npm run dev:shipments)",
"Bash(npm run build:shipments)"
```

`Bash(npx vercel:*)` and `Bash(npm run:*)` already cover the other new commands — no change needed there.

### Task 7.5: Commit docs and config updates

- [ ] **Step 1: Commit everything in Phase 7**

```bash
git add progress.md CLAUDE.md playground/normalization-tracker.md .claude/settings.local.json
git commit -m "docs(monorepo): update progress/CLAUDE/tracker and broaden permissions"
```

- [ ] **Step 2: Push main**

Run:
```bash
git push origin main
```

Confirm the push succeeded. No Vercel deploy fires (auto-deploy is off by design). The production prototype keeps rendering the last CLI-deployed version from Phase 6.3.

---

## Post-migration smoke test checklist

Run this end-to-end once all phases are committed. This is the final gate.

- [ ] From repo root, `rm -rf node_modules && npm install` — no errors, workspace symlinks created.
- [ ] `npm run dev:shipments` — dev server starts, app loads in browser.
- [ ] Shipments table renders with 1200 rows, badges colored correctly (amber order badges, red/green status badges, yellow hazmat).
- [ ] Clicking a row opens the bottom bar; all 9 tabs load (Order, Stops, Product, Tender, Cost, Instructions, Documents, Notes, History).
- [ ] Filter panel opens and applies filters; saved searches pill appears.
- [ ] Column arrangement panel opens; preset switch works.
- [ ] Search bar chip-column promotion works.
- [ ] Export modal produces a valid CSV.
- [ ] `npm run build:shipments` — `apps/shipments/dist/` is produced, no errors.
- [ ] `cd apps/shipments && npx vercel --prod` succeeds; production URL renders identically to local dev.
- [ ] `git log --follow apps/shipments/src/App.jsx | head -5` — shows commit history going back pre-migration (file history preserved).
- [ ] `git log --follow packages/ui/src/Badge.jsx | head -5` — shows Badge commit history going back pre-migration.
- [ ] `git log --follow packages/tokens/tokens.css | head -5` — shows tokens history going back pre-migration.
- [ ] `tools/convert-docs.sh` still exists at repo root and still runs.
- [ ] `playground/DesignSystemMap.html` still opens at repo root.
- [ ] `shipments-documentation/` is untouched.

If any item fails, use the rollback strategy for the phase that introduced the regression.

---

## Rollback strategy

Each phase is a single commit. To roll back a phase before the push to main:

```bash
git log --oneline           # find the commit before the broken phase
git reset --hard <prev-sha> # if not yet pushed
```

After push to main:
```bash
git revert <commit-sha>     # creates a new commit that undoes the phase
```

If Phase 6 (Vercel) fails after dashboard changes:
1. In Vercel dashboard, change Root Directory back to `.` (repo root).
2. `git revert` the monorepo commits back to the freeze checkpoint (`809b10e`).
3. Run `cd . && npx vercel --prod` to redeploy the single-app version.

Phases 0-5 are purely local repo changes and safe to revert without touching Vercel. The production prototype keeps rendering the last CLI-deploy from before the migration during those phases, so nothing user-facing changes until Phase 6.3 produces a new `--prod` deploy.

---

## Out of scope for this migration

These are real needs but **deliberately not included** — they add risk without helping structure land cleanly. Do them in separate follow-up sessions.

- Adding `apps/home`, `apps/carriers`, `apps/orders` (those are new domains — scaffold after structure is proven).
- Creating `packages/schemas` or `packages/config` (YAGNI until a second app exists).
- TypeScript migration (the current codebase is all `.jsx` — don't mix in a language migration).
- Repo rename from `odyssey-shipments` to anything else (separate GitHub rename + remote update later).
- Populating `packages/db` with a real Supabase client (that's SHP-55).
- Moving `Button` or `DarkTooltip` if the user picks option A in Task 4.2.
- Opportunistic refactors in the shipments code during the move (`git mv` only — no content edits except the narrow import-path updates required for the move).

If scope creep pressure shows up during execution, defer and keep the phase structural.
