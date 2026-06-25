# DSM Component Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-component version badges + a current-library-version header to the Angular DSM, and a "Latest only" filter toggle to both the React and Angular DSMs, driven by a single `version` field on each demo's meta.

**Architecture:** Each component demo's meta gains an optional `version: "x.y.z"` (the `@oneodyssey/ui` release it was created or last changed in). Everything derives from these fields: `latestVersion` = semver-max across demos; the header chip and the toggle's "latest" both use it. No `package.json` import. React renders only the toggle; Angular renders badge + header + toggle. The `/port-to-angular` release step stamps the field going forward.

**Tech stack:** React 19 + Vite + Vitest (`odyssey-one`); Angular 17 + Jasmine/Karma (`odyssey-one-library-ui`); plain CSS custom properties (design tokens).

**Two repos:**
- React: `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one`
- Angular: `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui`

**Version assignment (both repos):**
- **0.3.0** (created or changed in the pending S63/S64 batch): `Badge`, `Button`, `PaginationButton`, `MenuRow`, `DropdownMenu`, `DropdownButton`, `Dropdown` — **7 components**.
- **0.2.0**: every other released component.
- **Unversioned** (React only, not in the library): `Cell`, `EntityChip`.

Spec: `docs/superpowers/specs/2026-06-24-dsm-component-versioning-design.md`.

---

## Phase A — React DSM (version data + toggle)

All paths in this phase are relative to the **odyssey-one** repo root.

### Task A1: `latestVersion` + `filterTiersByLatest` helpers

**Files:**
- Modify: `apps/odyssey-one/src/routes/design-system/collectDemos.js`
- Test: `apps/odyssey-one/src/routes/design-system/collectDemos.test.js`

- [ ] **Step 1: Add failing tests** — append to `collectDemos.test.js`:

```javascript
import { latestVersion, filterTiersByLatest } from './collectDemos.js'

describe('latestVersion', () => {
  it('returns the highest semver among demo metas', () => {
    expect(latestVersion([
      { meta: { name: 'A', version: '0.2.0' } },
      { meta: { name: 'B', version: '0.3.0' } },
      { meta: { name: 'C', version: '0.1.0' } },
    ])).toBe('0.3.0')
  })

  it('ignores demos without a version', () => {
    expect(latestVersion([
      { meta: { name: 'A', version: '0.2.0' } },
      { meta: { name: 'B' } },
    ])).toBe('0.2.0')
  })

  it('returns null when no demo has a version', () => {
    expect(latestVersion([{ meta: { name: 'A' } }])).toBe(null)
  })

  it('compares numerically, not lexically (0.10.0 > 0.9.0)', () => {
    expect(latestVersion([
      { meta: { name: 'A', version: '0.9.0' } },
      { meta: { name: 'B', version: '0.10.0' } },
    ])).toBe('0.10.0')
  })
})

describe('filterTiersByLatest', () => {
  const tiered = [
    { key: 'atom', label: 'Atoms', demos: [
      { meta: { name: 'New', version: '0.3.0' } },
      { meta: { name: 'Old', version: '0.2.0' } },
    ] },
  ]
  it('keeps only demos whose version equals latest', () => {
    const out = filterTiersByLatest(tiered, '0.3.0')
    expect(out[0].demos.map((d) => d.meta.name)).toEqual(['New'])
  })
  it('returns tiers unchanged when latest is null', () => {
    expect(filterTiersByLatest(tiered, null)).toBe(tiered)
  })
})
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one && npx vitest run apps/odyssey-one/src/routes/design-system/collectDemos.test.js`
Expected: FAIL — `latestVersion is not a function` / `filterTiersByLatest is not a function`.

- [ ] **Step 3: Implement the helpers** — append to `collectDemos.js` (after `collectNormalizing`, end of file):

```javascript
// ── Versioning ──────────────────────────────────────────────────────────────
// Each demo meta may carry version: "x.y.z" — the @oneodyssey/ui release it was
// created or last changed in. "Latest" = the semver-max across all demos.

function parseVersion(v) {
  return String(v).split('.').map((n) => parseInt(n, 10) || 0)
}

function cmpVersion(a, b) {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0)
  }
  return 0
}

// Highest version across a flat demo list, or null if none carry one.
export function latestVersion(demos) {
  let max = null
  for (const d of demos) {
    const v = d.meta && d.meta.version
    if (!v) continue
    if (max === null || cmpVersion(v, max) > 0) max = v
  }
  return max
}

// Keep only demos whose version === latest. No-op when latest is falsy.
export function filterTiersByLatest(tiers, latest) {
  if (!latest) return tiers
  return tiers.map((t) => ({ ...t, demos: t.demos.filter((d) => d.meta.version === latest) }))
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one && npx vitest run apps/odyssey-one/src/routes/design-system/collectDemos.test.js`
Expected: PASS — all existing + 6 new tests green.

- [ ] **Step 5: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/routes/design-system/collectDemos.js apps/odyssey-one/src/routes/design-system/collectDemos.test.js
git commit -m "feat(dsm): add latestVersion + filterTiersByLatest helpers (React)"
```

---

### Task A2: Backfill `version` into React demo metas

**Files:**
- Modify: `apps/odyssey-one/src/routes/design-system/demos/*.demo.jsx` (50 of 52 — skips `Cell`, `EntityChip`)
- Create (temporary, NOT committed): `/tmp/backfill-react-version.mjs`

- [ ] **Step 1: Write the codemod**

Create `/tmp/backfill-react-version.mjs`:

```javascript
import fs from 'node:fs'
import path from 'node:path'

const dir = 'apps/odyssey-one/src/routes/design-system/demos'
const V030 = new Set(['Badge', 'Button', 'PaginationButton', 'MenuRow', 'DropdownMenu', 'DropdownButton', 'Dropdown'])
const SKIP = new Set(['Cell', 'EntityChip'])

let changed = 0
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.demo.jsx')) continue
  const name = file.replace('.demo.jsx', '')
  if (SKIP.has(name)) continue
  const p = path.join(dir, file)
  let src = fs.readFileSync(p, 'utf8')
  if (/\n\s*version:\s*'/.test(src)) continue // already stamped
  const version = V030.has(name) ? '0.3.0' : '0.2.0'
  // Insert a `version` line right after the meta object's `tier:` line.
  const next = src.replace(
    /(export const meta = \{[\s\S]*?\n)(\s*)(tier:\s*'[^']+',\n)/,
    (m, head, indent, tierLine) => `${head}${indent}${tierLine}${indent}version: '${version}',\n`
  )
  if (next === src) { console.error(`NO-MATCH: ${file}`); continue }
  fs.writeFileSync(p, next)
  changed++
}
console.log(`stamped ${changed} React demos`)
```

- [ ] **Step 2: Run it**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one && node /tmp/backfill-react-version.mjs`
Expected: `stamped 50 React demos` and **no** `NO-MATCH` lines.

- [ ] **Step 3: Verify the counts**

Run:
```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
echo "total stamped: $(grep -l "version: '0\." apps/odyssey-one/src/routes/design-system/demos/*.demo.jsx | wc -l)"
echo "0.3.0: $(grep -l "version: '0.3.0'" apps/odyssey-one/src/routes/design-system/demos/*.demo.jsx | wc -l)"
echo "Cell/EntityChip unstamped: $(grep -L "version: '0\." apps/odyssey-one/src/routes/design-system/demos/Cell.demo.jsx apps/odyssey-one/src/routes/design-system/demos/EntityChip.demo.jsx | wc -l)"
```
Expected: `total stamped: 50`, `0.3.0: 7`, `Cell/EntityChip unstamped: 2`.

- [ ] **Step 4: Build to confirm no syntax breakage**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one && npm run build:odyssey-one`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/routes/design-system/demos
git commit -m "feat(dsm): backfill version field on React demo metas (7 → 0.3.0, 43 → 0.2.0)"
```

---

### Task A3: Wire the "Latest only" toggle into the React explorer

**Files:**
- Modify: `apps/odyssey-one/src/routes/design-system/DesignSystem.jsx`
- Modify: `apps/odyssey-one/src/routes/design-system/DesignSystem.css`

- [ ] **Step 1: Import the helpers** — `DesignSystem.jsx` line 2, replace the import:

```javascript
import { TIERS, groupDemosByTier, collectNormalizing, DOMAINS, filterTiersByDomain, filterDemosByDomain, latestVersion, filterTiersByLatest } from './collectDemos.js'
```

- [ ] **Step 2: Compute the latest version at module scope** — after line 10 (`const normalizing = collectNormalizing(modules)`), add:

```javascript
const latestVer = latestVersion([...tiers.flatMap((t) => t.demos), ...normalizing])
```

- [ ] **Step 3: Add toggle state + apply the latest filter** — replace line 121–125:

Find:
```javascript
  const [activeDomain, setActiveDomain] = useState('all')
  // Section collapse state — a set of expanded component names. Empty = all
  // collapsed (the default, on load and whenever the page re-mounts).
  const [expanded, setExpanded] = useState(() => new Set())
  const viewTiers = filterTiersByDomain(tiers, domainUsage, activeDomain)
```

Replace with:
```javascript
  const [activeDomain, setActiveDomain] = useState('all')
  const [latestOnly, setLatestOnly] = useState(false)
  // Section collapse state — a set of expanded component names. Empty = all
  // collapsed (the default, on load and whenever the page re-mounts).
  const [expanded, setExpanded] = useState(() => new Set())
  const domainTiers = filterTiersByDomain(tiers, domainUsage, activeDomain)
  const viewTiers = latestOnly ? filterTiersByLatest(domainTiers, latestVer) : domainTiers
```

- [ ] **Step 4: Re-run the empty-tab guard when the toggle flips** — change the effect dependency array at line 168.

Find:
```javascript
  }, [activeDomain])
```
Replace with:
```javascript
  }, [activeDomain, latestOnly])
```

- [ ] **Step 5: Render the toggle next to the dropdown** — replace the header row (lines 186–207):

Find:
```jsx
          <div className="ds-header__row">
            <h1>Odyssey Design System</h1>
            <label className="ds-domain">
              <span className="ds-domain__label">Domain</span>
              <select
                className="ds-domain__select"
                value={activeDomain}
                onChange={(e) => setActiveDomain(e.target.value)}
              >
                {DOMAINS.flatMap((d) =>
                  // Divider before the cross-cutting domains (Global Search, Shared)
                  // to set them apart from the product domains.
                  d.key === 'global-search'
                    ? [
                        <option key="__sep" disabled>──────────</option>,
                        <option key={d.key} value={d.key}>{d.label}</option>,
                      ]
                    : [<option key={d.key} value={d.key}>{d.label}</option>]
                )}
              </select>
            </label>
          </div>
```

Replace with:
```jsx
          <div className="ds-header__row">
            <h1>Odyssey Design System</h1>
            <div className="ds-header__controls">
              <label className="ds-domain">
                <span className="ds-domain__label">Domain</span>
                <select
                  className="ds-domain__select"
                  value={activeDomain}
                  onChange={(e) => setActiveDomain(e.target.value)}
                >
                  {DOMAINS.flatMap((d) =>
                    // Divider before the cross-cutting domains (Global Search, Shared)
                    // to set them apart from the product domains.
                    d.key === 'global-search'
                      ? [
                          <option key="__sep" disabled>──────────</option>,
                          <option key={d.key} value={d.key}>{d.label}</option>,
                        ]
                      : [<option key={d.key} value={d.key}>{d.label}</option>]
                  )}
                </select>
              </label>
              <button
                type="button"
                className={`ds-latest-toggle${latestOnly ? ' is-on' : ''}`}
                aria-pressed={latestOnly}
                onClick={() => setLatestOnly((v) => !v)}
              >
                Latest only
              </button>
            </div>
          </div>
```

- [ ] **Step 6: Add the toggle CSS** — append to `DesignSystem.css` (after the `.ds-domain__select` block, ~line 430):

```css
/* "Latest only" filter toggle (sits next to the domain dropdown). */
.ds-header__controls { display: inline-flex; align-items: center; gap: var(--spacing-3); }
.ds-latest-toggle {
  font: inherit; font-size: var(--font-size-sm); color: var(--text-secondary);
  padding: var(--spacing-1) var(--spacing-3); border: 1px solid var(--border-default);
  border-radius: var(--radius-full); background: var(--white); cursor: pointer;
}
.ds-latest-toggle.is-on {
  color: var(--badge-blue-text); background: var(--badge-blue-bg); border-color: var(--badge-blue-bg);
}
```

- [ ] **Step 7: Build + manually verify**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one && npm run build:odyssey-one`
Expected: build succeeds.

Then `npm run dev:odyssey-one`, open `/design-system`: the "Latest only" button sits right of the Domain dropdown; toggling it ON shows only the 7 `0.3.0` components (Atoms tab shows Badge, Button, DropdownButton, MenuRow, PaginationButton; Molecules shows Dropdown, DropdownMenu; Organisms empties + disables); counts update; toggling OFF restores. No version badge or library-version chip appears (React intentionally has neither).

- [ ] **Step 8: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/routes/design-system/DesignSystem.jsx apps/odyssey-one/src/routes/design-system/DesignSystem.css
git commit -m "feat(dsm): add Latest-only filter toggle to the React explorer"
```

---

## Phase B — Angular DSM (type + version data + badge + header + toggle)

All paths in this phase are relative to the **odyssey-one-library-ui** repo root.

### Task B1: Add `version?` to the `DemoMeta` interface

**Files:**
- Modify: `src/app/dsm/demo.types.ts`

- [ ] **Step 1: Add the field** — in `demo.types.ts`, replace the `DemoMeta` interface (lines 5–16):

Find:
```typescript
export interface DemoMeta {
  name: string;
  /** Angular selector (e.g. 'odyssey-radio') — shown as the primary DSM label, with
   *  `name` (= the React/Figma name) appended in a muted tone for cross-reference. */
  angularName?: string;
  tier: Tier;
  figmaNode?: string;
  codeConnect?: string;
  normalizing?: boolean;
  /** Slated for removal — surfaces a DEPRECATED pill in the DSM. */
  deprecated?: boolean;
}
```

Replace with:
```typescript
export interface DemoMeta {
  name: string;
  /** Angular selector (e.g. 'odyssey-radio') — shown as the primary DSM label, with
   *  `name` (= the React/Figma name) appended in a muted tone for cross-reference. */
  angularName?: string;
  tier: Tier;
  figmaNode?: string;
  codeConnect?: string;
  normalizing?: boolean;
  /** Slated for removal — surfaces a DEPRECATED pill in the DSM. */
  deprecated?: boolean;
  /** The @oneodyssey/ui release this component was created or last changed in
   *  (e.g. '0.2.0'). Stamped by /port-to-angular at release; drives the version
   *  badge, the header version chip, and the "Latest only" filter. */
  version?: string;
}
```

- [ ] **Step 2: Typecheck via the app build** (no default project — name `dsm-explorer`)

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui && npx ng build dsm-explorer --configuration development`
Expected: build succeeds (the field is optional; nothing breaks).

- [ ] **Step 3: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui
git add src/app/dsm/demo.types.ts
git commit -m "feat(dsm): add optional version field to DemoMeta (Angular)"
```

---

### Task B2: `latestVersion` + `filterTiersByLatest` helpers (Angular)

**Files:**
- Modify: `src/app/dsm/collect-demos.ts`
- Test: `src/app/dsm/collect-demos.spec.ts`

- [ ] **Step 1: Add failing tests** — append to `collect-demos.spec.ts`:

```typescript
import { latestVersion, filterTiersByLatest } from './collect-demos';
import { TierGroup } from './demo.types';

describe('latestVersion', () => {
  it('returns the highest semver among demo metas', () => {
    expect(latestVersion([
      { meta: { name: 'A', tier: 'atom', version: '0.2.0' } } as any,
      { meta: { name: 'B', tier: 'atom', version: '0.3.0' } } as any,
      { meta: { name: 'C', tier: 'atom', version: '0.1.0' } } as any,
    ])).toBe('0.3.0');
  });

  it('ignores demos without a version', () => {
    expect(latestVersion([
      { meta: { name: 'A', tier: 'atom', version: '0.2.0' } } as any,
      { meta: { name: 'B', tier: 'atom' } } as any,
    ])).toBe('0.2.0');
  });

  it('returns null when no demo has a version', () => {
    expect(latestVersion([{ meta: { name: 'A', tier: 'atom' } } as any])).toBeNull();
  });

  it('compares numerically, not lexically (0.10.0 > 0.9.0)', () => {
    expect(latestVersion([
      { meta: { name: 'A', tier: 'atom', version: '0.9.0' } } as any,
      { meta: { name: 'B', tier: 'atom', version: '0.10.0' } } as any,
    ])).toBe('0.10.0');
  });
});

describe('filterTiersByLatest', () => {
  const tiered: TierGroup[] = [
    { key: 'atom', label: 'Atoms', demos: [
      { meta: { name: 'New', tier: 'atom', version: '0.3.0' }, props: [], tokens: [], component: null as any },
      { meta: { name: 'Old', tier: 'atom', version: '0.2.0' }, props: [], tokens: [], component: null as any },
    ] },
  ];
  it('keeps only demos whose version equals latest', () => {
    const out = filterTiersByLatest(tiered, '0.3.0');
    expect(out[0].demos.map((d) => d.meta.name)).toEqual(['New']);
  });
  it('returns tiers unchanged when latest is null', () => {
    expect(filterTiersByLatest(tiered, null)).toBe(tiered);
  });
});
```

- [ ] **Step 2: Run the spec, verify it fails**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui && npx ng test dsm-explorer --watch=false --include='**/collect-demos.spec.ts'`
Expected: FAIL — `latestVersion`/`filterTiersByLatest` are not exported.

- [ ] **Step 3: Implement the helpers** — append to `collect-demos.ts`:

```typescript
// ── Versioning ──────────────────────────────────────────────────────────────
// Each demo meta may carry version: "x.y.z" — the @oneodyssey/ui release it was
// created or last changed in. "Latest" = the semver-max across all demos.

function parseVersion(v: string): number[] {
  return String(v).split('.').map((n) => parseInt(n, 10) || 0);
}

function cmpVersion(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

/** Highest version across a flat demo list, or null if none carry one. */
export function latestVersion(demos: { meta: { version?: string } }[]): string | null {
  let max: string | null = null;
  for (const d of demos) {
    const v = d.meta && d.meta.version;
    if (!v) continue;
    if (max === null || cmpVersion(v, max) > 0) max = v;
  }
  return max;
}

/** Keep only demos whose version === latest. No-op when latest is falsy. */
export function filterTiersByLatest(tiers: TierGroup[], latest: string | null): TierGroup[] {
  if (!latest) return tiers;
  return tiers.map((t) => ({ ...t, demos: t.demos.filter((d) => d.meta.version === latest) }));
}
```

- [ ] **Step 4: Run the spec, verify it passes**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui && npx ng test dsm-explorer --watch=false --include='**/collect-demos.spec.ts'`
Expected: PASS — existing + 6 new tests green.

- [ ] **Step 5: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui
git add src/app/dsm/collect-demos.ts src/app/dsm/collect-demos.spec.ts
git commit -m "feat(dsm): add latestVersion + filterTiersByLatest helpers (Angular)"
```

---

### Task B3: Backfill `version` into Angular demo metas

**Files:**
- Modify: `src/app/demos/*.demo.meta.ts` (all 50)
- Create (temporary, NOT committed): `/tmp/backfill-angular-version.mjs`

- [ ] **Step 1: Write the codemod**

Create `/tmp/backfill-angular-version.mjs`:

```javascript
import fs from 'node:fs'
import path from 'node:path'

const dir = 'src/app/demos'
const V030 = new Set(['Badge', 'Button', 'PaginationButton', 'MenuRow', 'DropdownMenu', 'DropdownButton', 'Dropdown'])

let changed = 0
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.demo.meta.ts')) continue
  const p = path.join(dir, file)
  let src = fs.readFileSync(p, 'utf8')
  const m = src.match(/name:\s*'([^']+)'/)
  if (!m) { console.error(`NO-NAME: ${file}`); continue }
  const name = m[1]
  if (/\n\s*version:\s*'/.test(src)) continue // already stamped
  const version = V030.has(name) ? '0.3.0' : '0.2.0'
  // Insert a `version` line right after the first meta object's `tier:` line.
  const next = src.replace(
    /(\n)(\s*)(tier:\s*'[^']+',\n)/,
    (mm, nl, indent, tierLine) => `${nl}${indent}${tierLine}${indent}version: '${version}',\n`
  )
  if (next === src) { console.error(`NO-MATCH: ${file}`); continue }
  fs.writeFileSync(p, next)
  changed++
}
console.log(`stamped ${changed} Angular demos`)
```

- [ ] **Step 2: Run it**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui && node /tmp/backfill-angular-version.mjs`
Expected: `stamped 50 Angular demos`, no `NO-MATCH`/`NO-NAME`.

- [ ] **Step 3: Verify the counts**

Run:
```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui
echo "total stamped: $(grep -l "version: '0\." src/app/demos/*.demo.meta.ts | wc -l)"
echo "0.3.0: $(grep -l "version: '0.3.0'" src/app/demos/*.demo.meta.ts | wc -l)"
```
Expected: `total stamped: 50`, `0.3.0: 7`.

- [ ] **Step 4: Typecheck via the app build**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui && npx ng build dsm-explorer --configuration development`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui
git add src/app/demos
git commit -m "feat(dsm): backfill version field on Angular demo metas (7 → 0.3.0, 43 → 0.2.0)"
```

---

### Task B4: Version badge on the component section header

**Files:**
- Modify: `src/app/dsm/ds-comp/ds-comp.component.ts`
- Modify: `src/app/dsm/ds-comp/ds-comp.component.html`
- Modify: `src/app/design-system.css`

- [ ] **Step 1: Add the inputs** — in `ds-comp.component.ts`, after line 14 (`@Input() deprecated = false;`), add:

```typescript
  @Input() version?: string;
  @Input() isLatest = false;
```

- [ ] **Step 2: Render the badge** — in `ds-comp.component.html`, after line 14 (the DEPRECATED pill), add:

```html
      <span *ngIf="version" class="ds-comp__version" [class.ds-comp__version--latest]="isLatest">{{ version }}</span>
```

So the heading block reads:
```html
    <div class="ds-comp__heading">
      <span class="ds-comp__chevron" aria-hidden="true">{{ collapsed ? '▸' : '▾' }}</span>
      <h2 class="ds-comp__name">{{ meta.angularName || meta.name }}<span *ngIf="meta.angularName" class="ds-comp__name-react"> → {{ meta.name }}</span></h2>
      <span *ngIf="normalizing" class="ds-comp__pill">NORMALIZING</span>
      <span *ngIf="deprecated" class="ds-comp__pill ds-comp__pill--deprecated">DEPRECATED</span>
      <span *ngIf="version" class="ds-comp__version" [class.ds-comp__version--latest]="isLatest">{{ version }}</span>
    </div>
```

- [ ] **Step 3: Add the badge CSS** — in `design-system.css`, after the `.ds-comp__pill--deprecated` block (~line 219), add:

```css
/* Library-version badge on a component section header. */
.ds-comp__version {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--spacing-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
}
/* Newest-version components get an accent so they pop. */
.ds-comp__version--latest {
  color: var(--badge-blue-text);
  background: var(--badge-blue-bg);
}
```

- [ ] **Step 4: Build the DSM app to confirm template compiles**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui && npx ng build dsm-explorer --configuration development`
Expected: build succeeds (the badge won't show until B5 wires `[version]`/`[isLatest]`, but the component compiles with the new inputs).

- [ ] **Step 5: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui
git add src/app/dsm/ds-comp/ds-comp.component.ts src/app/dsm/ds-comp/ds-comp.component.html src/app/design-system.css
git commit -m "feat(dsm): version badge input + styling on ds-comp (Angular)"
```

---

### Task B5: Header version chip + "Latest only" toggle + filter wiring

**Files:**
- Modify: `src/app/app.component.ts`
- Modify: `src/app/app.component.html`
- Modify: `src/app/design-system.css`

- [ ] **Step 1: Import the helpers + compute latest** — in `app.component.ts`, replace the import on line 2:

Find:
```typescript
import { TIERS, groupDemosByTier, collectNormalizing, DOMAINS, inDomain, collectAll } from './dsm/collect-demos';
```
Replace with:
```typescript
import { TIERS, groupDemosByTier, collectNormalizing, DOMAINS, inDomain, collectAll, latestVersion, filterTiersByLatest } from './dsm/collect-demos';
```

- [ ] **Step 2: Add state + computed latest** — after line 21 (`activeDomain = 'all';`), add:

```typescript
  latestOnly = false;
  readonly latestVersion: string | null = latestVersion(collectAll(DEMOS));
```

- [ ] **Step 3: Layer the latest filter into `filteredTiers`** — replace the getter (lines 31–34):

Find:
```typescript
  get filteredTiers(): TierGroup[] {
    if (this.activeDomain === 'all') return this.tiers;
    return this.tiers.map((t) => ({ ...t, demos: t.demos.filter((d) => this.show(d.meta.name)) }));
  }
```
Replace with:
```typescript
  get filteredTiers(): TierGroup[] {
    let tiers = this.tiers;
    if (this.activeDomain !== 'all') {
      tiers = tiers.map((t) => ({ ...t, demos: t.demos.filter((d) => this.show(d.meta.name)) }));
    }
    if (this.latestOnly) {
      tiers = filterTiersByLatest(tiers, this.latestVersion);
    }
    return tiers;
  }
```

- [ ] **Step 4: Factor the empty-tab guard + add `toggleLatest`** — replace `setDomain` (lines 76–87):

Find:
```typescript
  setDomain(key: string): void {
    this.activeDomain = key;
    // When the domain filter changes, never strand the user on an empty tab —
    // jump to the first tab that still has components (tiers first, then Normalizing).
    const activeEmpty = this.onNormalize
      ? this.filteredNormalizing.length === 0
      : (this.active?.demos.length ?? 0) === 0;
    if (!activeEmpty) return;
    const firstTier = this.filteredTiers.find((t) => t.demos.length > 0);
    if (firstTier) this.activeTier = firstTier.key;
    else if (this.filteredNormalizing.length > 0) this.activeTier = this.NORMALIZE_KEY;
  }
```
Replace with:
```typescript
  setDomain(key: string): void {
    this.activeDomain = key;
    this.avoidEmptyTab();
  }

  toggleLatest(): void {
    this.latestOnly = !this.latestOnly;
    this.avoidEmptyTab();
  }

  // Never strand the user on an empty tab after a filter change —
  // jump to the first tab that still has components (tiers first, then Normalizing).
  private avoidEmptyTab(): void {
    const activeEmpty = this.onNormalize
      ? this.filteredNormalizing.length === 0
      : (this.active?.demos.length ?? 0) === 0;
    if (!activeEmpty) return;
    const firstTier = this.filteredTiers.find((t) => t.demos.length > 0);
    if (firstTier) this.activeTier = firstTier.key;
    else if (this.filteredNormalizing.length > 0) this.activeTier = this.NORMALIZE_KEY;
  }
```

- [ ] **Step 5: Render header chip + toggle + pass badge inputs** — in `app.component.html`, replace the header row (lines 4–16):

Find:
```html
      <div class="ds-header__row">
        <h1>Odyssey Design System</h1>
        <label class="ds-domain">
          <span class="ds-domain__label">Domain</span>
          <select class="ds-domain__select" (change)="setDomain($any($event.target).value)">
            <ng-container *ngFor="let d of DOMAINS">
              <!-- Divider before the cross-cutting domains (Global Search, Shared). -->
              <option *ngIf="d.key === 'global-search'" disabled>──────────</option>
              <option [value]="d.key">{{ d.label }}</option>
            </ng-container>
          </select>
        </label>
      </div>
```
Replace with:
```html
      <div class="ds-header__row">
        <div class="ds-header__title">
          <h1>Odyssey Design System</h1>
          <span *ngIf="latestVersion" class="ds-lib-version">&#64;oneodyssey/ui v{{ latestVersion }}</span>
        </div>
        <div class="ds-header__controls">
          <label class="ds-domain">
            <span class="ds-domain__label">Domain</span>
            <select class="ds-domain__select" (change)="setDomain($any($event.target).value)">
              <ng-container *ngFor="let d of DOMAINS">
                <!-- Divider before the cross-cutting domains (Global Search, Shared). -->
                <option *ngIf="d.key === 'global-search'" disabled>──────────</option>
                <option [value]="d.key">{{ d.label }}</option>
              </ng-container>
            </select>
          </label>
          <button
            type="button"
            class="ds-latest-toggle" [class.is-on]="latestOnly"
            [attr.aria-pressed]="latestOnly"
            (click)="toggleLatest()"
          >Latest only</button>
        </div>
      </div>
```

(Note: `&#64;` is the HTML entity for `@` — Angular templates treat a bare `@` as control-flow syntax, so the entity is required.)

- [ ] **Step 6: Pass `[version]`/`[isLatest]` to both `ds-comp` instances** — in `app.component.html`, add two bindings to **each** `<ds-comp>` (the normalizing list ~line 60 and the tier list ~line 74). After the existing `[deprecated]="..."` line in each, add:

```html
          [version]="demo.meta.version"
          [isLatest]="demo.meta.version === latestVersion"
```

So each `<ds-comp>` reads (tier-list instance shown; mirror on the normalizing-list instance):
```html
        <ds-comp
          *ngFor="let demo of active?.demos"
          [meta]="demo.meta" [props]="demo.props" [tokens]="demo.tokens" [component]="demo.component"
          [normalizing]="demo.meta.normalizing === true"
          [deprecated]="demo.meta.deprecated === true"
          [version]="demo.meta.version"
          [isLatest]="demo.meta.version === latestVersion"
          [collapsed]="isCollapsed(demo.meta.name)"
          (openDetails)="openDetailsFor(demo.meta.name)"
          (toggleCollapse)="toggleCollapse(demo.meta.name)"
        ></ds-comp>
```

- [ ] **Step 7: Add CSS for the header title group + version chip + toggle** — in `design-system.css`, after the `.ds-domain__select` block (~line 440), add:

```css
/* Header title group: title + current library-version chip. */
.ds-header__title { display: inline-flex; align-items: center; gap: var(--spacing-3); }
.ds-lib-version {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--font-size-xs); color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: var(--spacing-1) var(--spacing-2); border-radius: var(--radius-md);
}

/* Right-side controls: domain dropdown + Latest-only toggle. */
.ds-header__controls { display: inline-flex; align-items: center; gap: var(--spacing-3); }
.ds-latest-toggle {
  font: inherit; font-size: var(--font-size-sm); color: var(--text-secondary);
  padding: var(--spacing-1) var(--spacing-3); border: 1px solid var(--border-default);
  border-radius: var(--radius-full); background: var(--white); cursor: pointer;
}
.ds-latest-toggle.is-on {
  color: var(--badge-blue-text); background: var(--badge-blue-bg); border-color: var(--badge-blue-bg);
}
```

(`.ds-header__row` already exists with `justify-content: space-between`, so the title group sits left and the controls trail right.)

- [ ] **Step 8: Build to confirm everything compiles**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui && npx ng build dsm-explorer --configuration development`
Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui
git add src/app/app.component.ts src/app/app.component.html src/app/design-system.css
git commit -m "feat(dsm): header library-version chip + Latest-only toggle + badge wiring (Angular)"
```

---

### Task B6: AppComponent spec — version chip + latest toggle

**Files:**
- Modify: `src/app/app.component.spec.ts`

- [ ] **Step 1: Add tests** — inside the `describe('AppComponent (explorer shell)', …)` block, after the existing "filters the Atoms tab by the active domain" test (line 190), add:

```typescript
  it('exposes the latest library version (0.3.0) and renders the header chip', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    expect(app.latestVersion).toBe('0.3.0');
    const chip = (fixture.nativeElement as HTMLElement).querySelector('.ds-lib-version');
    expect(chip?.textContent).toContain('v0.3.0');
  });

  it('Latest-only toggle narrows the Atoms tab to latest-version atoms', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    app.setTier('atom');
    fixture.detectChanges();
    const allAtoms = app.filteredTiers.find((t) => t.key === 'atom')!.demos.length;
    app.toggleLatest();
    fixture.detectChanges();
    const latestAtoms = app.filteredTiers.find((t) => t.key === 'atom')!.demos;
    expect(latestAtoms.length).toBeLessThan(allAtoms);
    expect(latestAtoms.every((d) => d.meta.version === '0.3.0')).toBe(true);
  });
```

- [ ] **Step 2: Run the full DSM spec suite**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui && npx ng test dsm-explorer --watch=false`
Expected: PASS — prior dsm-explorer specs (17) + the 2 new AppComponent tests + the 6 collect-demos tests, all green.

- [ ] **Step 3: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui
git add src/app/app.component.spec.ts
git commit -m "test(dsm): cover header version chip + Latest-only toggle (Angular)"
```

---

### Task B7: Full Angular verification gate

**Files:** none (verification only)

- [ ] **Step 1: Library build**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui && npx ng build odyssey-ui`
Expected: succeeds (library unaffected — this is DSM-app + meta changes only).

- [ ] **Step 2: Parity-lint**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui && node tools/angular-parity-lint.mjs`
Expected: passes (no React/Angular structural drift introduced).

- [ ] **Step 3: Two-window manual check**

Run the React `/design-system` (`npm run dev:odyssey-one` from odyssey-one) and the Angular DSM (`npx ng serve` from odyssey-one-library-ui). Confirm:
- Angular: every section shows a version pill; the 7 `0.3.0` components show the accent (latest) pill; the header shows `@oneodyssey/ui v0.3.0`; "Latest only" filters to those 7 with counts updating and empty tiers disabling.
- React: "Latest only" filters identically; **no** badge or header version chip.

---

## Phase C — Routine (process) updates

All paths relative to **odyssey-one** repo root.

### Task C1: `/port-to-angular` — stamp the version at release

**Files:**
- Modify: `playground/angular-port-routine.md`

- [ ] **Step 1: Add the stamp step** — in `angular-port-routine.md`, after the "Clear both `normalizing` flags" section (ends line 225, before "### Finalize library export" at line 227), insert:

```markdown
### Stamp the release version on both demos

When this port bumps `projects/odyssey-ui/package.json` to `x.y.z` (see "Publish a new `@oneodyssey/ui` version" below), stamp that same version onto **both** demo metas:

1. **React demo:** `apps/odyssey-one/src/routes/design-system/demos/<C>.demo.jsx` — set `version: 'x.y.z'` in the exported `meta`.
2. **Angular demo:** `odyssey-one-library-ui/src/app/demos/<c>.demo.meta.ts` — set `version: 'x.y.z'` in the exported `<c>Meta`.

For a re-normalized/changed component this **advances** an existing `version` (last-touched semantics). The DSM derives the version badge, the header chip, and the "Latest only" filter from this field — skipping it leaves the component invisible to the "latest" view. (Demo-only ports that don't bump the library carry no new version.)
```

- [ ] **Step 2: Reference the version in the tracker step** — in the "### Update `playground/normalization-tracker.md`" section (line 231), append a bullet under the existing list:

Find:
```markdown
Add or update the component's row with the Angular column filled in:
- Angular column: `done` (with the port date ISO)
- `figma-link.md` path (relative from repo root)
- Any deviations from the React spec noted in `<C>.figma-link.md`
```
Replace with:
```markdown
Add or update the component's row with the Angular column filled in:
- Angular column: `done` (with the port date ISO)
- `figma-link.md` path (relative from repo root)
- Any deviations from the React spec noted in `<C>.figma-link.md`
- The `@oneodyssey/ui` version stamped on the demos this release (e.g. `v0.3.0`)
```

- [ ] **Step 3: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add playground/angular-port-routine.md
git commit -m "docs(routine): stamp @oneodyssey/ui version on both demos at port release"
```

---

### Task C2: `/normalize` — note that version is stamped at port time

**Files:**
- Modify: `playground/figma-component-routine.md`

- [ ] **Step 1: Add the note** — in `figma-component-routine.md` Step 7, after the "Do NOT clear `meta.normalizing` here." bullet (line 252), insert a new bullet:

```markdown
- [ ] **Do NOT set `meta.version` here.** The component's library version isn't known until release — `/port-to-angular` stamps `meta.version` on both demos when it bumps `@oneodyssey/ui` (Phase 5). The React demo carries no `version` while it sits in the Normalizing tab.
```

- [ ] **Step 2: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add playground/figma-component-routine.md
git commit -m "docs(routine): note meta.version is stamped by /port-to-angular at release"
```

---

## Final verification checklist

- [ ] React: `npx vitest run apps/odyssey-one/src/routes/design-system/collectDemos.test.js` — green (incl. 6 new).
- [ ] React: `npm run build:odyssey-one` — green; `/design-system` toggle works; no badge/header-version in React.
- [ ] Angular: `npx ng test dsm-explorer --watch=false` — green (dsm-explorer 17 + 6 collect-demos + 2 AppComponent).
- [ ] Angular: `npx ng build odyssey-ui` + `node tools/angular-parity-lint.mjs` — green.
- [ ] Angular `/design-system`: per-section version pills, `@oneodyssey/ui v0.3.0` header chip, "Latest only" → exactly the 7 components.
- [ ] Both backfills: 50 stamped per repo, 7 at `0.3.0`; `Cell`/`EntityChip` unstamped (React).
- [ ] Routine docs updated (`angular-port-routine.md`, `figma-component-routine.md`).

## Notes for the implementer

- **Do not bump `@oneodyssey/ui` or publish** as part of this work — the badge/header/toggle are DSM-app + demo-meta changes, not library-component changes. The 0.3.0 release is a separate, already-planned step (S65 priority #2). We pre-stamp the 7 components `0.3.0` so the feature is demonstrable now; when 0.3.0 is actually cut, `package.json` will match.
- **Commits are local only** — do not push. This batch joins the held S63/S64 batch under the standing ask-before-pushing rule.
- The Angular demo-meta path in `angular-port-routine.md` historically reads `demos/<c>/<c>.demo.meta.ts`; the actual files are flat (`demos/<c>.demo.meta.ts`). Task C1's text uses the correct flat path.
