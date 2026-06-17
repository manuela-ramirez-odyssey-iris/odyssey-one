# DSM Modal + Domain Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two upgrades to BOTH DSMs — a Details-in-modal panel and a per-domain component filter driven by an auto-generated usage scan.

**Architecture:** A repo-root Node scanner (`tools/domain-usage.mjs`) reads the React app's per-domain source, extracts direct `@odyssey/ui` imports, and writes `domain-usage.json` into both DSMs; it runs on every app build via the existing `apps/odyssey-one` prebuild. Each DSM imports that JSON, adds a domain `<select>` beside the header that filters tier lists + counts, and renders component Details in a single top-level modal instead of inline.

**Tech Stack:** Node ESM (scanner, `node:test`), React + Vite + Vitest (React DSM), Angular 17 NgModule + Karma (Angular DSM).

**Spec:** `docs/superpowers/specs/2026-06-16-dsm-modal-and-domain-filter-design.md`

## File structure

- `tools/domain-usage.mjs` (new) — scanner: pure `extractOdysseyImports` + `DOMAIN_SOURCES` config + CLI writer.
- `tools/domain-usage.test.mjs` (new) — `node:test` unit tests for `extractOdysseyImports`.
- `apps/odyssey-one/src/routes/design-system/domain-usage.json` (generated, committed).
- `../odyssey-angular-dsm/src/app/dsm/domain-usage.json` (generated, committed).
- `apps/odyssey-one/package.json` — append scan to `prebuild`; root `package.json` — add `domain-usage` script.
- React DSM: `collectDemos.js` (+ `collectDemos.test.js`) gain a pure domain filter; `DesignSystem.jsx` + `DesignSystem.css` gain the dropdown + modal.
- Angular DSM: `app.component.*` gain domain state + modal host; new `dsm/ds-modal/`; `ds-comp.component.*` drop inline details; `design-system.css` gains modal + dropdown styles.

---

### Task 1: Scanner — pure `extractOdysseyImports`

**Files:**
- Create: `tools/domain-usage.mjs`
- Test: `tools/domain-usage.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tools/domain-usage.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractOdysseyImports } from './domain-usage.mjs'

test('single-line named import', () => {
  assert.deepEqual(
    extractOdysseyImports(`import { Button, EmptyState } from '@odyssey/ui'`),
    ['Button', 'EmptyState'],
  )
})

test('multi-line import block', () => {
  const src = `import {\n  Widget,\n  WidgetCtaRow,\n} from '@odyssey/ui'`
  assert.deepEqual(extractOdysseyImports(src), ['Widget', 'WidgetCtaRow'])
})

test('strips aliases to the imported (export) name', () => {
  assert.deepEqual(
    extractOdysseyImports(`import { Button as Btn } from '@odyssey/ui'`),
    ['Button'],
  )
})

test('multiple @odyssey/ui imports in one file are unioned', () => {
  const src = `import { Button } from '@odyssey/ui'\nconst x = 1\nimport { Badge } from '@odyssey/ui'`
  assert.deepEqual(extractOdysseyImports(src).sort(), ['Badge', 'Button'])
})

test('ignores imports from other packages and returns [] when none', () => {
  assert.deepEqual(extractOdysseyImports(`import { useState } from 'react'`), [])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/domain-usage.test.mjs`
Expected: FAIL — `extractOdysseyImports` is not exported / module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// tools/domain-usage.mjs
// Extract the component names directly imported from '@odyssey/ui' in a source
// string. Handles single- and multi-line `import { ... } from '@odyssey/ui'`,
// strips `X as Y` aliases to the export name X, and unions repeated imports.
export function extractOdysseyImports(source) {
  const re = /import\s*\{([\s\S]*?)\}\s*from\s*['"]@odyssey\/ui['"]/g
  const names = new Set()
  let m
  while ((m = re.exec(source)) !== null) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim()
      if (name) names.add(name)
    }
  }
  return [...names]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/domain-usage.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/domain-usage.mjs tools/domain-usage.test.mjs
git commit -m "feat(dsm): domain-usage scanner — @odyssey/ui import extractor"
```

---

### Task 2: Scanner — CLI (walk domains, build map, write both JSONs)

**Files:**
- Modify: `tools/domain-usage.mjs`
- Modify: `package.json` (root — add `domain-usage` script)
- Generate: `apps/odyssey-one/src/routes/design-system/domain-usage.json`, `../odyssey-angular-dsm/src/app/dsm/domain-usage.json`

- [ ] **Step 1: Append the config + walker + writer to `tools/domain-usage.mjs`**

```js
// --- appended to tools/domain-usage.mjs ---
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const APP_SRC = path.join(REPO_ROOT, 'apps/odyssey-one/src')
const DEMOS_DIR = path.join(APP_SRC, 'routes/design-system/demos')
const REACT_OUT = path.join(APP_SRC, 'routes/design-system/domain-usage.json')
const ANGULAR_OUT = path.resolve(REPO_ROOT, '../odyssey-angular-dsm/src/app/dsm/domain-usage.json')

// domain -> source roots under apps/odyssey-one/src. dirs walked recursively;
// files read directly. routes/design-system is NEVER a source. Globs for the
// fuzzier domains (home/users) are confirmed against the real dirs at build time
// (missing paths are skipped, so listing an absent dir is harmless).
const DOMAIN_SOURCES = {
  home: { dirs: ['components/home'], files: ['routes/Home.jsx'] },
  orders: { dirs: ['components/orders', 'routes/orders'], files: [] },
  shipments: { dirs: ['components/shipments', 'components/detail', 'routes/shipments'], files: [] },
  carriers: { dirs: [], files: ['routes/Carriers.jsx'] },
  tracking: { dirs: [], files: ['routes/Tracking.jsx'] },
  users: { dirs: [], files: ['routes/Users.jsx', 'components/CustomersModal.jsx'] },
  'global-search': { dirs: ['components/global-search'], files: [] },
}

function walk(absDir, acc) {
  if (!fs.existsSync(absDir)) return acc
  for (const e of fs.readdirSync(absDir, { withFileTypes: true })) {
    const p = path.join(absDir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (/\.(jsx?|tsx?)$/.test(e.name)) acc.push(p)
  }
  return acc
}

function demoNames() {
  return fs.readdirSync(DEMOS_DIR)
    .filter((f) => f.endsWith('.demo.jsx'))
    .map((f) => f.replace(/\.demo\.jsx$/, ''))
}

export function buildDomainMap() {
  const known = new Set(demoNames())
  const map = {}
  for (const [domain, { dirs = [], files = [] }] of Object.entries(DOMAIN_SOURCES)) {
    const fileList = []
    for (const d of dirs) walk(path.join(APP_SRC, d), fileList)
    for (const f of files) { const p = path.join(APP_SRC, f); if (fs.existsSync(p)) fileList.push(p) }
    const names = new Set()
    for (const f of fileList) {
      for (const name of extractOdysseyImports(fs.readFileSync(f, 'utf8'))) {
        if (known.has(name)) names.add(name)
      }
    }
    map[domain] = [...names].sort()
  }
  return map
}

function writeJson(target, data) {
  if (!fs.existsSync(path.dirname(target))) {
    console.log(`domain-usage: skipped (dir absent) ${target}`)
    return
  }
  fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n')
  console.log(`domain-usage: wrote ${target}`)
}

// CLI entry (only when run directly, not when imported by the test)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const map = buildDomainMap()
  writeJson(REACT_OUT, map)
  writeJson(ANGULAR_OUT, map)
}
```

- [ ] **Step 2: Add the root npm script**

In `package.json` (repo root) `scripts`, add after `tokens:audit`:

```json
"domain-usage": "node tools/domain-usage.mjs"
```

- [ ] **Step 3: Run the scanner**

Run: `npm run domain-usage`
Expected: logs `wrote …/design-system/domain-usage.json` and `wrote …/odyssey-angular-dsm/src/app/dsm/domain-usage.json`.

- [ ] **Step 4: Verify the output shape**

Run: `node -e "const d=require('./apps/odyssey-one/src/routes/design-system/domain-usage.json'); console.log(Object.keys(d)); console.log('orders=',d.orders)"`
Expected: keys `home, orders, shipments, carriers, tracking, users, global-search`; `orders` is a non-empty sorted array including at least `Button`, `EmptyState`, `PageHeader`.

- [ ] **Step 5: Commit**

```bash
git add tools/domain-usage.mjs package.json apps/odyssey-one/src/routes/design-system/domain-usage.json ../odyssey-angular-dsm/src/app/dsm/domain-usage.json
git commit -m "feat(dsm): domain-usage CLI + generated domain-usage.json (both DSMs)"
```
(Commit the Angular JSON separately in that repo if git boundaries require: `cd ../odyssey-angular-dsm && git add src/app/dsm/domain-usage.json && git commit -m "feat(dsm): domain-usage.json"`.)

---

### Task 3: Wire the scan into the app build (prebuild)

**Files:**
- Modify: `apps/odyssey-one/package.json:prebuild`

- [ ] **Step 1: Append the scanner to the existing prebuild**

Current: `"prebuild": "node tools/generate.mjs && node tools/generate-orders.mjs"`.
Change to:

```json
"prebuild": "node tools/generate.mjs && node tools/generate-orders.mjs && node ../../tools/domain-usage.mjs"
```

(The app's prebuild runs from `apps/odyssey-one`; the scanner resolves its own paths from `import.meta.url`, so cwd doesn't matter. Vercel's prod build runs `build`, which fires `prebuild` → the deployed DSM always reflects current usage.)

- [ ] **Step 2: Verify build regenerates the JSON**

Run: `npm run build:odyssey-one`
Expected: build succeeds; the scanner ran (`domain-usage: wrote …` appears in output); `git status` shows `domain-usage.json` unchanged (already current from Task 2) or with only fresh content.

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/package.json
git commit -m "build(dsm): regenerate domain-usage on every app build"
```

---

### Task 4: React filter — pure helper + vitest

**Files:**
- Modify: `apps/odyssey-one/src/routes/design-system/collectDemos.js`
- Test: `apps/odyssey-one/src/routes/design-system/collectDemos.test.js`

- [ ] **Step 1: Add the failing test**

Append to `collectDemos.test.js`:

```js
import { DOMAINS, filterTiersByDomain, filterDemosByDomain } from './collectDemos.js'

const usage = { orders: ['Button', 'EmptyState'], shipments: ['PageHeader'] }
const tiers = [
  { key: 'atom', label: 'Atoms', demos: [
    { meta: { name: 'Button' } }, { meta: { name: 'Badge' } }, { meta: { name: 'EmptyState' } },
  ] },
]

test('DOMAINS lists All first then the 7 domains', () => {
  expect(DOMAINS[0]).toEqual({ key: 'all', label: 'All' })
  expect(DOMAINS.map((d) => d.key)).toEqual(
    ['all', 'home', 'orders', 'shipments', 'carriers', 'tracking', 'users', 'global-search'])
})

test('filterTiersByDomain: all returns every demo', () => {
  const out = filterTiersByDomain(tiers, usage, 'all')
  expect(out[0].demos.map((d) => d.meta.name)).toEqual(['Button', 'Badge', 'EmptyState'])
})

test('filterTiersByDomain: orders keeps only orders demos', () => {
  const out = filterTiersByDomain(tiers, usage, 'orders')
  expect(out[0].demos.map((d) => d.meta.name)).toEqual(['Button', 'EmptyState'])
})

test('filterDemosByDomain: unknown domain → empty', () => {
  expect(filterDemosByDomain(tiers[0].demos, usage, 'carriers')).toEqual([])
})
```

(The file already imports `test`/`expect` via vitest globals or explicit import — match the existing import style at the top of `collectDemos.test.js`.)

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:odyssey-one`
Expected: FAIL — `DOMAINS`/`filterTiersByDomain` not exported.

- [ ] **Step 3: Implement in `collectDemos.js`**

Append:

```js
export const DOMAINS = [
  { key: 'all', label: 'All' },
  { key: 'home', label: 'Home' },
  { key: 'orders', label: 'Orders' },
  { key: 'shipments', label: 'Shipments' },
  { key: 'carriers', label: 'Carriers' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'users', label: 'Users' },
  { key: 'global-search', label: 'Global Search' },
]

// True if the component should show under the active domain. 'all' shows everything.
export function inDomain(usage, domain, name) {
  return domain === 'all' || (usage[domain]?.includes(name) ?? false)
}

export function filterDemosByDomain(demos, usage, domain) {
  if (domain === 'all') return demos
  return demos.filter((d) => inDomain(usage, domain, d.meta.name))
}

export function filterTiersByDomain(tiers, usage, domain) {
  if (domain === 'all') return tiers
  return tiers.map((t) => ({ ...t, demos: filterDemosByDomain(t.demos, usage, domain) }))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:odyssey-one`
Expected: PASS (existing collectDemos tests + the 4 new).

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/routes/design-system/collectDemos.js apps/odyssey-one/src/routes/design-system/collectDemos.test.js
git commit -m "feat(dsm): React domain-filter helpers + tests"
```

---

### Task 5: React — dropdown + filtered tabs in `DesignSystem.jsx`

**Files:**
- Modify: `apps/odyssey-one/src/routes/design-system/DesignSystem.jsx`
- Modify: `apps/odyssey-one/src/routes/design-system/DesignSystem.css`

- [ ] **Step 1: Imports + state + filtered data**

Top of `DesignSystem.jsx`, extend the existing import and add the JSON import:

```js
import { TIERS, groupDemosByTier, collectNormalizing, DOMAINS, filterTiersByDomain, filterDemosByDomain } from './collectDemos.js'
import domainUsage from './domain-usage.json'
```

Inside `DesignSystem()`, after the existing `useState` lines, add:

```js
const [activeDomain, setActiveDomain] = useState('all')
const viewTiers = filterTiersByDomain(tiers, domainUsage, activeDomain)
const viewNormalizing = filterDemosByDomain(normalizing, domainUsage, activeDomain)
```

Then replace the existing `active` line to read from the filtered tiers:

```js
const active = onNormalize ? null : viewTiers.find((t) => t.key === activeTier)
```

- [ ] **Step 2: Add the dropdown to the header**

Replace the `<header className="ds-header">…</header>` block with:

```jsx
<header className="ds-header">
  <div className="ds-header__row">
    <h1>Odyssey Design System</h1>
    <label className="ds-domain">
      <span className="ds-domain__label">Domain</span>
      <select
        className="ds-domain__select"
        value={activeDomain}
        onChange={(e) => setActiveDomain(e.target.value)}
      >
        {DOMAINS.map((d) => (
          <option key={d.key} value={d.key}>{d.label}</option>
        ))}
      </select>
    </label>
  </div>
  <p>
    Live <code>@odyssey/ui</code> components — hover, focus, type. The real
    thing, not a static reproduction.
  </p>
</header>
```

- [ ] **Step 3: Point the tabs + lists at the filtered data**

In the `<nav className="ds-tabs">`, change `tiers.map` → `viewTiers.map` and the Normalizing count `{normalizing.length}` → `{viewNormalizing.length}`. In `<div className="ds-list">`, change `normalizing.length === 0`/`normalizing.map(renderSection)` → `viewNormalizing.length`/`viewNormalizing.map(renderSection)` (the `active.demos` branch already uses the filtered `active`).

- [ ] **Step 4: Add CSS**

Append to `DesignSystem.css`:

```css
.ds-header__row { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-4); }
.ds-domain { display: inline-flex; align-items: center; gap: var(--spacing-2); }
.ds-domain__label { font-size: var(--font-size-sm); color: var(--text-secondary); }
.ds-domain__select {
  font: inherit; font-size: var(--font-size-sm); color: var(--text-primary);
  padding: var(--spacing-1) var(--spacing-2); border: 1px solid var(--border-default);
  border-radius: var(--radius-md); background: var(--white); cursor: pointer;
}
```

- [ ] **Step 5: Verify build + manual**

Run: `npm run build:odyssey-one`
Expected: PASS. Manually (`npm run dev:odyssey-one`): `/design-system` shows the Domain dropdown; selecting Orders shrinks the Atoms/Molecules/Organisms lists + counts to the Orders set; All restores everything.

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/routes/design-system/DesignSystem.jsx apps/odyssey-one/src/routes/design-system/DesignSystem.css
git commit -m "feat(dsm): React domain-filter dropdown + filtered tabs"
```

---

### Task 6: React — Details in a modal

**Files:**
- Modify: `apps/odyssey-one/src/routes/design-system/DesignSystem.jsx`
- Modify: `apps/odyssey-one/src/routes/design-system/DesignSystem.css`

- [ ] **Step 1: Drop the inline panel from `DemoSection`**

In `DemoSection`, remove the `{open && <DetailsPanel … />}` line (line ~102) and change the toggle button to always read "Details" and call `onToggle` (which now opens the modal):

```jsx
<button type="button" className="ds-comp__toggle" onClick={onToggle}>Details</button>
```

(Remove the `open`/`aria-expanded` usage from the button; keep the `open`/`onToggle` props — `onToggle` now means "open details for this component".)

- [ ] **Step 2: Build a name→demo lookup + render one modal**

Inside `DesignSystem()`, after `viewNormalizing`, add the lookup (over ALL demos, unfiltered, so details work regardless of filter):

```js
const allDemos = [...tiers.flatMap((t) => t.demos), ...normalizing]
const detailsDemo = openDetails ? allDemos.find((d) => d.meta.name === openDetails) : null
```

Change `renderSection`'s `onToggle` to set (not toggle) and not depend on prior open:

```js
onToggle={() => setOpenDetails(demo.meta.name)}
```

Add an Esc handler:

```js
useEffect(() => {
  if (!openDetails) return
  const onKey = (e) => { if (e.key === 'Escape') setOpenDetails(null) }
  document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)
}, [openDetails])
```

(Add `useEffect` to the React import on line 1.)

Just before the closing `</main>` (or after it, inside `.ds-root`), render the modal:

```jsx
{detailsDemo && (
  <div className="ds-modal__backdrop" onClick={() => setOpenDetails(null)}>
    <div className="ds-modal" role="dialog" aria-modal="true" aria-label={`${detailsDemo.meta.name} details`} onClick={(e) => e.stopPropagation()}>
      <div className="ds-modal__head">
        <h2 className="ds-modal__title">{detailsDemo.meta.name}</h2>
        <button type="button" className="ds-modal__close" aria-label="Close" onClick={() => setOpenDetails(null)}>✕</button>
      </div>
      <div className="ds-modal__body">
        <DetailsPanel meta={detailsDemo.meta} props={detailsDemo.props} tokens={detailsDemo.tokens} />
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: Add modal CSS**

Append to `DesignSystem.css`:

```css
.ds-modal__backdrop {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.4); padding: var(--spacing-6);
}
.ds-modal {
  background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow-2xl);
  max-width: 720px; width: 100%; max-height: 80vh; display: flex; flex-direction: column;
}
.ds-modal__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-4) var(--spacing-6); border-bottom: 1px solid var(--border-default);
}
.ds-modal__title { margin: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); }
.ds-modal__close { background: transparent; border: 0; cursor: pointer; font-size: var(--font-size-lg); color: var(--text-tertiary); line-height: 1; }
.ds-modal__body { padding: var(--spacing-6); overflow-y: auto; }
```

(If `--shadow-2xl` is absent in `tokens.css`, use `--shadow-lg`; confirm by grep before writing.)

- [ ] **Step 4: Verify build + manual**

Run: `npm run build:odyssey-one`
Expected: PASS. Manually: clicking "Details" opens the modal with props/token tables; ✕ / backdrop / Esc close it; the inline bottom panel is gone.

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/routes/design-system/DesignSystem.jsx apps/odyssey-one/src/routes/design-system/DesignSystem.css
git commit -m "feat(dsm): React Details panel opens in a modal"
```

---

### Task 7: Angular filter — JSON import + state + filtered getters + specs

**Files:**
- Modify: `odyssey-angular-dsm/src/app/app.component.ts`, `app.component.html`
- Modify: `odyssey-angular-dsm/src/app/dsm/collect-demos.ts` (add `DOMAINS` + `inDomain`)
- Modify: `odyssey-angular-dsm/tsconfig.json` (ensure `resolveJsonModule`)
- Test: `odyssey-angular-dsm/src/app/app.component.spec.ts`

- [ ] **Step 1: Ensure `resolveJsonModule`**

In `odyssey-angular-dsm/tsconfig.json` `compilerOptions`, confirm `"resolveJsonModule": true` (add if missing).

- [ ] **Step 2: Add domain constants + predicate to `collect-demos.ts`**

```ts
export const DOMAINS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'home', label: 'Home' },
  { key: 'orders', label: 'Orders' },
  { key: 'shipments', label: 'Shipments' },
  { key: 'carriers', label: 'Carriers' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'users', label: 'Users' },
  { key: 'global-search', label: 'Global Search' },
];

export function inDomain(usage: Record<string, string[]>, domain: string, name: string): boolean {
  return domain === 'all' || (usage[domain]?.includes(name) ?? false);
}
```

- [ ] **Step 3: Write the failing spec**

Append to `app.component.spec.ts` (inside the existing `describe`):

```ts
it('filters the Atoms tab by the active domain', () => {
  const fixture = TestBed.createComponent(AppComponent);
  const app = fixture.componentInstance;
  fixture.detectChanges();
  app.setTier('atom');
  fixture.detectChanges();
  const allCount = app.filteredTiers.find((t) => t.key === 'atom')!.demos.length;
  app.setDomain('carriers'); // a near-empty domain
  fixture.detectChanges();
  const carriersCount = app.filteredTiers.find((t) => t.key === 'atom')!.demos.length;
  expect(carriersCount).toBeLessThan(allCount);
  app.setDomain('all');
  fixture.detectChanges();
  expect(app.filteredTiers.find((t) => t.key === 'atom')!.demos.length).toBe(allCount);
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `cd odyssey-angular-dsm && npx ng test dsm-explorer --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `setDomain`/`filteredTiers` not on AppComponent.

- [ ] **Step 5: Implement in `app.component.ts`**

Add imports + members:

```ts
import { DOMAINS, inDomain } from './dsm/collect-demos';
import domainUsage from './dsm/domain-usage.json';
// ...
readonly DOMAINS = DOMAINS;
activeDomain = 'all';
private usage: Record<string, string[]> = domainUsage as Record<string, string[]>;

setDomain(key: string): void { this.activeDomain = key; }
private show = (name: string) => inDomain(this.usage, this.activeDomain, name);

get filteredTiers(): TierGroup[] {
  if (this.activeDomain === 'all') return this.tiers;
  return this.tiers.map((t) => ({ ...t, demos: t.demos.filter((d) => this.show(d.meta.name)) }));
}
get filteredNormalizing(): CollectedDemo[] {
  if (this.activeDomain === 'all') return this.normalizing;
  return this.normalizing.filter((d) => this.show(d.meta.name));
}
```

Change the existing `active` getter to read filtered tiers:

```ts
get active(): TierGroup | undefined {
  return this.onNormalize ? undefined : this.filteredTiers.find((t) => t.key === this.activeTier);
}
```

- [ ] **Step 6: Update `app.component.html`**

In the header, after the `<p>`, add the dropdown inside `.ds-header`:

```html
<label class="ds-domain">
  <span class="ds-domain__label">Domain</span>
  <select class="ds-domain__select" (change)="setDomain($any($event.target).value)">
    <option *ngFor="let d of DOMAINS" [value]="d.key">{{ d.label }}</option>
  </select>
</label>
```

Point the tabs + lists at filtered data: tab `*ngFor="let t of filteredTiers"` (was `tiers`); the Normalizing tab count `{{ filteredNormalizing.length }}` (was `normalizing.length`); the Normalizing list `*ngIf="filteredNormalizing.length === 0"` + `*ngFor="let demo of filteredNormalizing"`.

- [ ] **Step 7: Add CSS to `design-system.css`**

```css
.ds-domain { display: inline-flex; align-items: center; gap: var(--spacing-2); margin-top: var(--spacing-2); }
.ds-domain__label { font-size: var(--font-size-sm); color: var(--text-secondary); }
.ds-domain__select {
  font: inherit; font-size: var(--font-size-sm); color: var(--text-primary);
  padding: var(--spacing-1) var(--spacing-2); border: 1px solid var(--border-default);
  border-radius: var(--radius-md); background: var(--white); cursor: pointer;
}
```

- [ ] **Step 8: Run tests + build**

Run: `npx ng test dsm-explorer --watch=false --browsers=ChromeHeadless` (PASS) then `npx ng build` (PASS).

- [ ] **Step 9: Commit**

```bash
cd odyssey-angular-dsm && git add -A && git commit -m "feat(dsm): Angular domain-filter dropdown + filtered tabs"
```

---

### Task 8: Angular — Details in a modal (`ds-modal`)

**Files:**
- Create: `odyssey-angular-dsm/src/app/dsm/ds-modal/ds-modal.component.ts`, `ds-modal.component.html`
- Test: `odyssey-angular-dsm/src/app/dsm/ds-modal/ds-modal.component.spec.ts`
- Modify: `app.module.ts` (declare DsModalComponent), `app.component.ts`/`.html` (host the modal), `ds-comp.component.html`/`.ts` (drop inline details, emit open), `design-system.css` (modal styles)

- [ ] **Step 1: Write the failing `ds-modal` spec**

```ts
// ds-modal.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { DsModalComponent } from './ds-modal.component';

describe('DsModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CommonModule], declarations: [DsModalComponent] }).compileComponents();
  });
  it('renders nothing when closed, content when open, and emits close on Escape', () => {
    const f = TestBed.createComponent(DsModalComponent);
    f.componentInstance.open = false;
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('.ds-modal')).toBeNull();
    f.componentInstance.open = true;
    f.componentInstance.title = 'Button';
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('.ds-modal__title')?.textContent).toContain('Button');
    let closed = false;
    f.componentInstance.close.subscribe(() => (closed = true));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test dsm-explorer --watch=false --browsers=ChromeHeadless`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ds-modal`**

```ts
// ds-modal.component.ts
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({ selector: 'ds-modal', templateUrl: './ds-modal.component.html' })
export class DsModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Output() close = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEsc(): void { if (this.open) this.close.emit(); }
}
```

```html
<!-- ds-modal.component.html -->
<div class="ds-modal__backdrop" *ngIf="open" (click)="close.emit()">
  <div class="ds-modal" role="dialog" aria-modal="true" [attr.aria-label]="title + ' details'" (click)="$event.stopPropagation()">
    <div class="ds-modal__head">
      <h2 class="ds-modal__title">{{ title }}</h2>
      <button type="button" class="ds-modal__close" aria-label="Close" (click)="close.emit()">✕</button>
    </div>
    <div class="ds-modal__body">
      <ng-content></ng-content>
    </div>
  </div>
</div>
```

Declare `DsModalComponent` in `app.module.ts` (`declarations`).

- [ ] **Step 4: Host the modal in `app.component`; drop inline details from `ds-comp`**

`app.component.ts`: rename intent of `openDetails` to hold the component name to show (it already does). Add a lookup getter:

```ts
get detailsDemo(): CollectedDemo | undefined {
  return this.openDetails ? collectAll(DEMOS).find((d) => d.meta.name === this.openDetails) : undefined;
}
```

(Add a small `collectAll(DEMOS)` helper to `collect-demos.ts` returning every demo across tiers + normalizing in `CollectedDemo` shape — OR reuse: `[...groupDemosByTier(DEMOS).flatMap(t=>t.demos), ...collectNormalizing(DEMOS)]`. Define it once as `export function collectAll(entries: DemoEntry[]): CollectedDemo[]`.)

Change `toggleDetails` to set (open) rather than toggle:

```ts
openDetailsFor(name: string): void { this.openDetails = name; }
closeDetails(): void { this.openDetails = null; }
```

`app.component.html`: at the end of `.ds-root`, add:

```html
<ds-modal [open]="!!openDetails" [title]="detailsDemo?.meta?.name || ''" (close)="closeDetails()">
  <ds-details *ngIf="detailsDemo" [meta]="detailsDemo.meta" [props]="detailsDemo.props" [tokens]="detailsDemo.tokens"></ds-details>
</ds-modal>
```

`ds-comp.component.html`: remove the inline `<ds-details … *ngIf="open">` line; change the toggle button to emit an open event:

```html
<button type="button" class="ds-comp__toggle" (click)="openDetails.emit()">Details</button>
```

`ds-comp.component.ts`: replace the `toggle` output with `@Output() openDetails = new EventEmitter<void>()` (and drop the `open` input if no longer used by the template). In `app.component.html` where `<ds-comp>` is rendered, change `(toggle)="toggleDetails(demo.meta.name)"` → `(openDetails)="openDetailsFor(demo.meta.name)"` and remove the `[open]` binding.

- [ ] **Step 5: Add modal CSS to `design-system.css`**

```css
.ds-modal__backdrop {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.4); padding: var(--spacing-6);
}
.ds-modal {
  background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow-2xl);
  max-width: 720px; width: 100%; max-height: 80vh; display: flex; flex-direction: column;
}
.ds-modal__head { display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-4) var(--spacing-6); border-bottom: 1px solid var(--border-default); }
.ds-modal__title { margin: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); }
.ds-modal__close { background: transparent; border: 0; cursor: pointer; font-size: var(--font-size-lg); color: var(--text-tertiary); line-height: 1; }
.ds-modal__body { padding: var(--spacing-6); overflow-y: auto; }
```

(Confirm `--shadow-2xl` exists in the Angular `_tokens.scss`; else use `--shadow-lg`.)

- [ ] **Step 6: Fix the existing app.component.spec details assertion**

The old spec referenced `toggleDetails`/inline details — update any such reference to the new `openDetailsFor`/modal. Ensure the suite compiles.

- [ ] **Step 7: Run tests + build**

Run: `npx ng test dsm-explorer --watch=false --browsers=ChromeHeadless` (PASS, incl. new ds-modal spec) then `npx ng build` (PASS).

- [ ] **Step 8: Commit**

```bash
cd odyssey-angular-dsm && git add -A && git commit -m "feat(dsm): Angular Details opens in ds-modal"
```

---

### Task 9: Final verification (both DSMs)

- [ ] **Step 1: React** — `npm run build:odyssey-one` PASS; `npm run test:odyssey-one` PASS.
- [ ] **Step 2: Angular** — `cd odyssey-angular-dsm && npx ng build odyssey-ui && npx ng build && npx ng test odyssey-ui --watch=false --browsers=ChromeHeadless && npx ng test dsm-explorer --watch=false --browsers=ChromeHeadless` ALL PASS.
- [ ] **Step 3: Manual two-window** — rebuild dist + restart :4200; in both windows: Domain dropdown filters Atoms/Molecules/Organisms (+ counts); "Details" opens a modal (✕/backdrop/Esc close); `All` matches today.
- [ ] **Step 4** — confirm `domain-usage.json` present + committed in both repos.

---

## Self-review notes

- **Spec coverage:** Part A (modal) → Tasks 6, 8. Part B (scanner + prebuild + both JSONs) → Tasks 1–3. Part C (dropdown + filter + counts) → Tasks 4, 5, 7. Domain set → DOMAINS in Tasks 4/7. Edge cases (no-domain → All only; empty tier; missing domain key via `?.`) → covered by helpers. Testing → Tasks 1, 4, 7, 8, 9.
- **Type consistency:** `inDomain(usage, domain, name)` / `DOMAINS` shape identical in React (`collectDemos.js`) and Angular (`collect-demos.ts`); JSON shape `Record<string,string[]>` consistent across scanner output + both consumers.
- **Open confirmations for the executor** (not blockers): exact `--shadow-2xl` token name (grep both token files; fall back to `--shadow-lg`); the `home`/`users` source dirs in `DOMAIN_SOURCES` (verify `components/home`, `components/CustomersModal.jsx` exist — absent paths are skipped safely).
