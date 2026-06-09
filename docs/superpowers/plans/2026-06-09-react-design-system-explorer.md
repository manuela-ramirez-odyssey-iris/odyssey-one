# React Design-System Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/design-system` React route in `apps/odyssey-one` that renders the **real `@odyssey/ui` components** — live and interactive — organized into Atoms / Molecules / Organisms tabs, seeded with Button, Checkbox, Radio, FieldSelect, FormField; then update the `/normalize` routine to add a co-located `<Component>.demo.jsx` instead of writing static reproduction HTML.

**Architecture:** A page shell (`DesignSystem.jsx`) collects per-component demo modules via `import.meta.glob('./demos/*.demo.jsx', { eager: true })`, groups them by tier with a **pure, unit-tested** helper (`collectDemos.js`), and renders each demo's live component plus an expandable details panel (props + token contract + Figma/Code-Connect refs). Each demo file imports the real component from `@odyssey/ui` and exports `meta` / `props` / `tokens` / a default React component. Demos live in the app route dir (not `packages/ui`) to keep the library shippable-clean.

**Tech Stack:** React 19, Vite 8, React Router (existing `<Routes>` in `App.jsx`), `@odyssey/ui` workspace imports, `lucide-react` icons, global `tokens.css`, Vitest (node env — used only for the pure grouping helper).

---

## Context the engineer needs

- **The app is a single Vite build** under `apps/odyssey-one/`. Routes are registered in `apps/odyssey-one/src/App.jsx` inside a `<Routes>` block. Precedent: `<Route path="/button-demo" element={<ButtonDemo />} />` (line 71). The demo route is a **bare full-viewport sheet**, NOT wrapped in `AppShell`.
- **Test reality:** Vitest runs in **`environment: 'node'`** (`apps/odyssey-one/vite.config.js:47-52`) — there is **no jsdom and no @testing-library/react**. Do NOT add them. TDD applies only to pure logic (the `collectDemos.js` grouping helper). The shell + demos are verified by `npm run build:odyssey-one` (build green), `npm run test:odyssey-one` (existing 67 tests stay green), and a manual visual checklist at the dev server.
- **Token conventions** (from `tokens.css`, seen in `ButtonDemo.css`): surfaces `--bg-primary` / `--bg-secondary` / `--bg-tertiary` / `--bg-inverse`; text `--text-primary` / `--text-secondary` / `--text-tertiary` / `--text-link`; borders `--border-subtle` / `--border-default` / `--border-strong` / `--border-inverse`; radius `--radius-sm|md|lg`; spacing `--spacing-3..12`; type `--font-size-*` / `--line-height-*` / `--font-weight-*` / `--font-primary`. **Use tokens, never raw values** (project token-discipline rule).
- **Figma file:** the Design System file is `vodiHJU38YWZYmTz81uOk7` / `Design-System---MCP` (seen in `ButtonDemo.jsx:32`). Deep-link format: `https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=<NODE>` where `<NODE>` uses a hyphen (e.g. `1307-333`), so convert the stored `1307:333` by replacing `:` → `-`.
- **Seed component APIs** (verified this session):
  - **Button** (atom, Figma `1307:333`, `packages/ui/src/Button.figma.tsx`): `variant` ∈ `primary|secondary|outline|ghost|error|link` (default `primary`), `size` ∈ `sm|md|lg` (default `md`), `disabled`, `icon` (leading ReactNode), `iconRight` (trailing ReactNode), `children`, `type`, `...rest`. `outline`/`ghost` are dark-surface variants. Stateless; hover/active/focus in CSS.
  - **Checkbox** (atom, Figma `2821:330`, `packages/ui/src/Checkbox.figma.tsx`): `checked`, `defaultChecked`, `indeterminate` (default false, synced to DOM via ref), `disabled`, `label`, `showLabel` (default true), `onChange`, `name`, `value`, `id`, `className`, `...rest`. Native `<input type="checkbox">`.
  - **Radio** (atom, Figma `2824:330`, `packages/ui/src/Radio.figma.tsx`): `checked`, `defaultChecked`, `disabled`, `label`, `showLabel` (default true), `onChange`, `name`, `value`, `id`, `className`, `...rest`. Native `<input type="radio">`; group via shared `name`.
  - **FieldSelect** (atom, Figma `2627:153`, `packages/ui/src/FieldSelect.figma.tsx`): `variant` ∈ `leading|trailing` (default `trailing`), `state` ∈ `default|focus|disabled|error-default|error` (default `default`), `label` (default `'Select'`), `onClick`, `className`, `...rest`. Renders `<button>` + `<ChevronDown size={16}>`. Standalone it sets `--field-select-divider` from its own `field-select--{state}` class (components.css:489-492), so the state ladder is visible without a parent.
  - **FormField** (molecule, Figma `2602:1424`, `packages/ui/src/FormField.figma.tsx`): `label`, `showLabel` (default true), `showInfo` (default false), `placeholder`, `value`, `onChange`, `type` (default `'text'`), `error` (string|false), `disabled` (default false), `leadingIcon`, `trailingIcon`, `leadingSelect` `{label,onClick}`, `trailingSelect` `{label,onClick}`, `onClear`, `id`, `name`, `autoComplete`, `required`, `className`, `...rest`. Derives `filled` (`value!=null && value!==''`) and `focused` (`:focus-within`) internally. Clear-X (CircleX) shows only when `onClear` set AND not disabled AND value non-empty. Composes `FieldSelect` via `leadingSelect`/`trailingSelect`.

---

## File structure

| File | Responsibility |
|------|----------------|
| `apps/odyssey-one/src/routes/design-system/collectDemos.js` | **Pure** glob-result → tier-grouped, name-sorted structure. The only unit-tested unit. Exports `TIERS` + `groupDemosByTier(modules)`. |
| `apps/odyssey-one/src/routes/design-system/collectDemos.test.js` | Vitest (node env) tests for the grouping helper. |
| `apps/odyssey-one/src/routes/design-system/DesignSystem.jsx` | Page shell: tier tabs, glob collection, per-component live render + expandable `DetailsPanel`. |
| `apps/odyssey-one/src/routes/design-system/DesignSystem.css` | Token-based styling for the shell. |
| `apps/odyssey-one/src/routes/design-system/demos/Button.demo.jsx` | Button demo (variant×size grid, state row, slots). |
| `apps/odyssey-one/src/routes/design-system/demos/Checkbox.demo.jsx` | Checkbox demo (state grid + interactive controlled). |
| `apps/odyssey-one/src/routes/design-system/demos/Radio.demo.jsx` | Radio demo (state grid + interactive group). |
| `apps/odyssey-one/src/routes/design-system/demos/FieldSelect.demo.jsx` | FieldSelect demo (variant×state ladder). |
| `apps/odyssey-one/src/routes/design-system/demos/FormField.demo.jsx` | FormField demo (states grid + interactive playground with working clear-X / error / disabled toggles / composed selects). |
| `apps/odyssey-one/src/App.jsx` (modify) | Register `<Route path="/design-system" element={<DesignSystem />} />`. |
| `playground/figma-component-routine.md` (modify) | Phase 3: add a `<Component>.demo.jsx` instead of `getXComponentHTML`. |
| `.claude/skills/normalize/SKILL.md` (modify) | Mirror the Phase-3 routine change + relax the DSM-always-subagent rule for demo files. |

---

### Task 1: Pure demo-collection helper (TDD)

**Files:**
- Create: `apps/odyssey-one/src/routes/design-system/collectDemos.js`
- Test: `apps/odyssey-one/src/routes/design-system/collectDemos.test.js`

- [ ] **Step 1: Write the failing test**

Create `apps/odyssey-one/src/routes/design-system/collectDemos.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { TIERS, groupDemosByTier } from './collectDemos.js'

// Minimal fake of the import.meta.glob({ eager: true }) result:
// { '<path>': { meta, props?, tokens?, default } }
function fakeModule(name, tier, extra = {}) {
  return { meta: { name, tier }, default: () => null, ...extra }
}

describe('groupDemosByTier', () => {
  it('returns all three tiers in canonical order, even when empty', () => {
    const result = groupDemosByTier({})
    expect(result.map((t) => t.key)).toEqual(['atom', 'molecule', 'organism'])
    expect(result.every((t) => t.demos.length === 0)).toBe(true)
  })

  it('buckets demos into their tier', () => {
    const result = groupDemosByTier({
      './demos/Button.demo.jsx': fakeModule('Button', 'atom'),
      './demos/FormField.demo.jsx': fakeModule('FormField', 'molecule'),
      './demos/Navbar.demo.jsx': fakeModule('Navbar', 'organism'),
    })
    expect(result.find((t) => t.key === 'atom').demos.map((d) => d.meta.name)).toEqual(['Button'])
    expect(result.find((t) => t.key === 'molecule').demos.map((d) => d.meta.name)).toEqual(['FormField'])
    expect(result.find((t) => t.key === 'organism').demos.map((d) => d.meta.name)).toEqual(['Navbar'])
  })

  it('sorts demos alphabetically by name within a tier', () => {
    const result = groupDemosByTier({
      './demos/Radio.demo.jsx': fakeModule('Radio', 'atom'),
      './demos/Button.demo.jsx': fakeModule('Button', 'atom'),
      './demos/Checkbox.demo.jsx': fakeModule('Checkbox', 'atom'),
    })
    expect(result.find((t) => t.key === 'atom').demos.map((d) => d.meta.name)).toEqual([
      'Button', 'Checkbox', 'Radio',
    ])
  })

  it('defaults missing props/tokens to empty arrays and carries the Component', () => {
    const cmp = () => null
    const result = groupDemosByTier({
      './demos/Button.demo.jsx': { meta: { name: 'Button', tier: 'atom' }, default: cmp },
    })
    const demo = result.find((t) => t.key === 'atom').demos[0]
    expect(demo.props).toEqual([])
    expect(demo.tokens).toEqual([])
    expect(demo.Component).toBe(cmp)
  })

  it('throws on an invalid tier', () => {
    expect(() =>
      groupDemosByTier({ './demos/X.demo.jsx': fakeModule('X', 'gizmo') })
    ).toThrow(/invalid meta\.tier/)
  })

  it('throws when meta.name is missing', () => {
    expect(() =>
      groupDemosByTier({ './demos/X.demo.jsx': { meta: { tier: 'atom' }, default: () => null } })
    ).toThrow(/missing a meta\.name/)
  })

  it('exposes the tier labels', () => {
    expect(TIERS).toEqual([
      { key: 'atom', label: 'Atoms' },
      { key: 'molecule', label: 'Molecules' },
      { key: 'organism', label: 'Organisms' },
    ])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:odyssey-one -- collectDemos`
Expected: FAIL — `collectDemos.js` does not exist / `groupDemosByTier is not a function`.

- [ ] **Step 3: Write the minimal implementation**

Create `apps/odyssey-one/src/routes/design-system/collectDemos.js`:

```js
// Pure helper for the design-system explorer. Takes the object returned by
// import.meta.glob('./demos/*.demo.jsx', { eager: true }) — a map of
// file path → module ({ meta, props?, tokens?, default }) — and returns the
// three tiers in canonical order, each with its demos sorted by name.
//
// Kept pure (no import.meta, no React) so it unit-tests in the node Vitest env.

export const TIERS = [
  { key: 'atom', label: 'Atoms' },
  { key: 'molecule', label: 'Molecules' },
  { key: 'organism', label: 'Organisms' },
]

const TIER_KEYS = new Set(TIERS.map((t) => t.key))

export function groupDemosByTier(modules) {
  const buckets = new Map(TIERS.map((t) => [t.key, []]))

  for (const [path, mod] of Object.entries(modules)) {
    const meta = mod && mod.meta
    if (!meta || !meta.name) {
      throw new Error(`Demo ${path} is missing a meta.name export`)
    }
    if (!TIER_KEYS.has(meta.tier)) {
      throw new Error(
        `Demo ${path} has invalid meta.tier "${meta.tier}" (expected atom|molecule|organism)`
      )
    }
    buckets.get(meta.tier).push({
      meta,
      props: mod.props || [],
      tokens: mod.tokens || [],
      Component: mod.default,
    })
  }

  for (const list of buckets.values()) {
    list.sort((a, b) => a.meta.name.localeCompare(b.meta.name))
  }

  return TIERS.map((t) => ({ ...t, demos: buckets.get(t.key) }))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:odyssey-one -- collectDemos`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/routes/design-system/collectDemos.js apps/odyssey-one/src/routes/design-system/collectDemos.test.js
git commit -m "feat(design-system): pure tier-grouping helper for the explorer"
```

---

### Task 2: Page shell + styling + route registration

**Files:**
- Create: `apps/odyssey-one/src/routes/design-system/DesignSystem.jsx`
- Create: `apps/odyssey-one/src/routes/design-system/DesignSystem.css`
- Modify: `apps/odyssey-one/src/App.jsx`

> Note: `import.meta.glob('./demos/*.demo.jsx')` resolves to `{}` until Task 3 adds the first demo — the shell renders empty-state copy until then. That is expected and verified at the end of this task.

- [ ] **Step 1: Write the shell**

Create `apps/odyssey-one/src/routes/design-system/DesignSystem.jsx`:

```jsx
import { useState } from 'react'
import { TIERS, groupDemosByTier } from './collectDemos.js'
import './DesignSystem.css'

// Eagerly collect every co-located demo. Adding a new component to the
// explorer = adding one ./demos/<Component>.demo.jsx — no edit here.
const modules = import.meta.glob('./demos/*.demo.jsx', { eager: true })
const tiers = groupDemosByTier(modules)

const FIGMA_FILE =
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP'

function figmaUrl(node) {
  if (!node) return null
  return `${FIGMA_FILE}?node-id=${node.replace(':', '-')}`
}

function DetailsPanel({ meta, props, tokens }) {
  const url = figmaUrl(meta.figmaNode)
  return (
    <div className="ds-details">
      <div className="ds-details__refs">
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer">
            Figma {meta.figmaNode}
          </a>
        )}
        {meta.codeConnect && <code>{meta.codeConnect}</code>}
      </div>

      {props.length > 0 && (
        <div className="ds-details__block">
          <h3 className="ds-details__title">Props</h3>
          <table className="ds-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              {props.map((p) => (
                <tr key={p.name}>
                  <td><code>{p.name}</code></td>
                  <td><code>{p.type}</code></td>
                  <td>{p.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tokens.length > 0 && (
        <div className="ds-details__block">
          <h3 className="ds-details__title">Token contract</h3>
          <table className="ds-table">
            <thead>
              <tr><th>Token</th><th>Resolves</th><th>Usage</th></tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.token}>
                  <td><code>{t.token}</code></td>
                  <td>{t.resolves}</td>
                  <td>{t.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function DesignSystem() {
  const [activeTier, setActiveTier] = useState(TIERS[0].key)
  const [openDetails, setOpenDetails] = useState(null) // meta.name | null
  const active = tiers.find((t) => t.key === activeTier)

  return (
    <div className="ds-root">
      <main className="ds-page">
        <header className="ds-header">
          <h1>Odyssey Design System</h1>
          <p>
            Live <code>@odyssey/ui</code> components — hover, focus, type. The real
            thing, not a static reproduction.
          </p>
        </header>

        <nav className="ds-tabs" role="tablist" aria-label="Component tiers">
          {tiers.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === activeTier}
              className={`ds-tab${t.key === activeTier ? ' ds-tab--active' : ''}`}
              onClick={() => setActiveTier(t.key)}
            >
              {t.label}
              <span className="ds-tab__count">{t.demos.length}</span>
            </button>
          ))}
        </nav>

        <div className="ds-list">
          {active.demos.length === 0 && (
            <p className="ds-empty">No {active.label.toLowerCase()} demos yet.</p>
          )}
          {active.demos.map(({ meta, props, tokens, Component }) => {
            const open = openDetails === meta.name
            return (
              <section key={meta.name} className="ds-comp">
                <div className="ds-comp__head">
                  <h2 className="ds-comp__name">{meta.name}</h2>
                  <button
                    type="button"
                    className="ds-comp__toggle"
                    aria-expanded={open}
                    onClick={() => setOpenDetails(open ? null : meta.name)}
                  >
                    {open ? 'Hide details' : 'Details'}
                  </button>
                </div>

                <div className="ds-comp__demo">
                  <Component />
                </div>

                {open && <DetailsPanel meta={meta} props={props} tokens={tokens} />}
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Write the styling**

Create `apps/odyssey-one/src/routes/design-system/DesignSystem.css`:

```css
/* Design-System explorer — full-viewport sheet, no AppShell (like ButtonDemo).
   The global <body> bg is dark (Login→Home transition); the root overrides it
   with a white surface so the centered page has no dark gutters. */

.ds-root {
  position: fixed;
  inset: 0;
  background: var(--bg-primary);
  overflow: auto;
  z-index: 0;
}

.ds-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--spacing-8) var(--spacing-6) var(--spacing-12);
  font-family: var(--font-primary);
  color: var(--text-primary);
  min-height: 100vh;
  box-sizing: border-box;
}

.ds-header {
  margin-bottom: var(--spacing-6);
  padding-bottom: var(--spacing-5);
  border-bottom: 1px solid var(--border-subtle);
}

.ds-header h1 {
  margin: 0 0 var(--spacing-3);
  font-size: var(--font-size-2xl);
  line-height: var(--line-height-2xl);
  font-weight: var(--font-weight-semibold);
}

.ds-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-sm);
}

.ds-header code,
.ds-comp code,
.ds-table code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

/* Tabs */
.ds-tabs {
  display: flex;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-8);
  border-bottom: 1px solid var(--border-subtle);
}

.ds-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  font-family: var(--font-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.ds-tab:hover {
  color: var(--text-primary);
}

.ds-tab--active {
  color: var(--text-primary);
  border-bottom-color: var(--text-primary);
}

.ds-tab__count {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  padding: 0 6px;
  min-width: 18px;
  text-align: center;
}

/* Component blocks */
.ds-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
}

.ds-empty {
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.ds-comp {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.ds-comp__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4) var(--spacing-5);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.ds-comp__name {
  margin: 0;
  font-size: var(--font-size-lg);
  line-height: var(--line-height-lg);
  font-weight: var(--font-weight-semibold);
}

.ds-comp__toggle {
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--spacing-1) var(--spacing-3);
  font-family: var(--font-primary);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.ds-comp__toggle:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.ds-comp__demo {
  padding: var(--spacing-6) var(--spacing-5);
  background: var(--bg-primary);
}

/* Details panel */
.ds-details {
  padding: var(--spacing-5);
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
}

.ds-details__refs {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  flex-wrap: wrap;
  font-size: var(--font-size-sm);
}

.ds-details__refs a {
  color: var(--text-link);
  text-decoration: none;
}

.ds-details__refs a:hover {
  text-decoration: underline;
}

.ds-details__title {
  margin: 0 0 var(--spacing-3);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.ds-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.ds-table th,
.ds-table td {
  text-align: left;
  padding: var(--spacing-2) var(--spacing-3);
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: top;
}

.ds-table th {
  color: var(--text-tertiary);
  font-weight: var(--font-weight-semibold);
}

.ds-table td {
  color: var(--text-secondary);
}

/* Shared demo helpers — used by the demo files. */
.ds-demo-grid {
  display: grid;
  gap: var(--spacing-4);
  align-items: center;
}

.ds-demo-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-4);
}

.ds-demo-col {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.ds-demo-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.ds-demo-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  min-height: 64px;
}

.ds-demo-cell--dark {
  background: var(--bg-inverse);
  border-color: var(--border-inverse);
}

.ds-demo-section {
  margin-bottom: var(--spacing-6);
}

.ds-demo-section:last-child {
  margin-bottom: 0;
}

.ds-demo-section__title {
  margin: 0 0 var(--spacing-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}
```

- [ ] **Step 3: Register the route**

In `apps/odyssey-one/src/App.jsx`, add the import beside the other route imports (after line 13, the `ButtonDemo` import):

```jsx
import DesignSystem from './routes/design-system/DesignSystem.jsx'
```

And add the route inside `<Routes>` immediately after the `/button-demo` route (line 71):

```jsx
        <Route path="/design-system" element={<DesignSystem />} />
```

- [ ] **Step 4: Verify build is green**

Run: `npm run build:odyssey-one`
Expected: build succeeds (pre-existing chunk-size warning is fine). The glob currently matches no files; the shell compiles and renders empty-state tabs.

- [ ] **Step 5: Verify existing tests stay green**

Run: `npm run test:odyssey-one`
Expected: all tests pass (the 67 existing + the 7 from Task 1).

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/routes/design-system/DesignSystem.jsx apps/odyssey-one/src/routes/design-system/DesignSystem.css apps/odyssey-one/src/App.jsx
git commit -m "feat(design-system): explorer shell + /design-system route"
```

---

### Task 3: Button demo

**Files:**
- Create: `apps/odyssey-one/src/routes/design-system/demos/Button.demo.jsx`

- [ ] **Step 1: Write the demo**

Create `apps/odyssey-one/src/routes/design-system/demos/Button.demo.jsx`:

```jsx
import { Fragment } from 'react'
import { Button } from '@odyssey/ui'
import { Search, ArrowRight } from 'lucide-react'

export const meta = {
  name: 'Button',
  tier: 'atom',
  figmaNode: '1307:333',
  codeConnect: 'packages/ui/src/Button.figma.tsx',
}

export const props = [
  { name: 'variant', type: 'primary|secondary|outline|ghost|error|link', desc: 'Visual style. outline/ghost are dark-surface variants.' },
  { name: 'size', type: 'sm|md|lg', desc: 'Padding + label size. Default md.' },
  { name: 'disabled', type: 'boolean', desc: 'Native disabled; hover/active suppressed.' },
  { name: 'icon', type: 'ReactNode', desc: 'Leading icon slot (inherits currentColor).' },
  { name: 'iconRight', type: 'ReactNode', desc: 'Trailing icon slot.' },
  { name: 'children', type: 'ReactNode', desc: 'Button label.' },
  { name: 'type', type: 'string', desc: 'Native button type. Default "button".' },
]

const VARIANTS = ['primary', 'secondary', 'outline', 'ghost', 'error', 'link']
const SIZES = ['sm', 'md', 'lg']
const DARK = new Set(['outline', 'ghost'])

export default function ButtonDemo() {
  return (
    <div>
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Variants × sizes</h4>
        <div
          className="ds-demo-grid"
          style={{ gridTemplateColumns: `64px repeat(${VARIANTS.length}, minmax(0, 1fr))` }}
        >
          <div />
          {VARIANTS.map((v) => (
            <div key={`h-${v}`} className="ds-demo-label" style={{ textAlign: 'center' }}>{v}</div>
          ))}
          {SIZES.map((s) => (
            <Fragment key={s}>
              <div className="ds-demo-label" style={{ textAlign: 'right' }}>{s}</div>
              {VARIANTS.map((v) => (
                <div key={`${v}-${s}`} className={`ds-demo-cell${DARK.has(v) ? ' ds-demo-cell--dark' : ''}`}>
                  <Button variant={v} size={s}>Label</Button>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">States (hover · press · focus · disabled)</h4>
        <div
          className="ds-demo-grid"
          style={{ gridTemplateColumns: '80px repeat(4, minmax(0, 1fr))' }}
        >
          <div />
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Hover</div>
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Active</div>
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Focus</div>
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Disabled</div>
          {VARIANTS.map((v) => (
            <Fragment key={`row-${v}`}>
              <div className="ds-demo-label" style={{ textAlign: 'right' }}>{v}</div>
              {['Hover me', 'Click + hold', 'Tab here', 'Disabled'].map((label, i) => (
                <div key={i} className={`ds-demo-cell${DARK.has(v) ? ' ds-demo-cell--dark' : ''}`}>
                  <Button variant={v} disabled={i === 3}>{label}</Button>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Icon slots</h4>
        <div className="ds-demo-row">
          <Button icon={<Search size={20} />}>Search</Button>
          <Button iconRight={<ArrowRight size={20} />}>Continue</Button>
          <Button icon={<Search size={20} />} iconRight={<ArrowRight size={20} />}>Both slots</Button>
          <Button variant="link" iconRight={<ArrowRight size={16} />}>Go to Tracking</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build is green**

Run: `npm run build:odyssey-one`
Expected: build succeeds; the Atoms tab now has Button (count 1).

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/src/routes/design-system/demos/Button.demo.jsx
git commit -m "feat(design-system): Button demo"
```

---

### Task 4: Checkbox + Radio demos

**Files:**
- Create: `apps/odyssey-one/src/routes/design-system/demos/Checkbox.demo.jsx`
- Create: `apps/odyssey-one/src/routes/design-system/demos/Radio.demo.jsx`

- [ ] **Step 1: Write the Checkbox demo**

Create `apps/odyssey-one/src/routes/design-system/demos/Checkbox.demo.jsx`:

```jsx
import { useState } from 'react'
import { Checkbox } from '@odyssey/ui'

export const meta = {
  name: 'Checkbox',
  tier: 'atom',
  figmaNode: '2821:330',
  codeConnect: 'packages/ui/src/Checkbox.figma.tsx',
}

export const props = [
  { name: 'checked', type: 'boolean', desc: 'Controlled checked state.' },
  { name: 'defaultChecked', type: 'boolean', desc: 'Uncontrolled initial checked.' },
  { name: 'indeterminate', type: 'boolean', desc: 'Dash state; synced to the DOM property via ref.' },
  { name: 'disabled', type: 'boolean', desc: 'Disables the native input.' },
  { name: 'label', type: 'ReactNode', desc: 'Label text.' },
  { name: 'showLabel', type: 'boolean', desc: 'Toggle label visibility. Default true.' },
  { name: 'onChange', type: '(e) => void', desc: 'Native change handler.' },
]

export const tokens = [
  { token: '--control-bg', resolves: 'White', usage: 'unchecked box fill' },
  { token: '--control-border', resolves: 'Border/default', usage: 'unchecked box border' },
  { token: '--control-border-hover', resolves: 'DSN/400', usage: 'hover border' },
  { token: '--control-checked-bg', resolves: 'DSN/900', usage: 'checked/indeterminate fill' },
  { token: '--control-focus', resolves: 'Border/strong', usage: 'focus ring' },
]

export default function CheckboxDemo() {
  const [checked, setChecked] = useState(true)
  return (
    <div>
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">States × enabled / disabled</h4>
        <div className="ds-demo-grid" style={{ gridTemplateColumns: '120px 1fr 1fr', gap: 'var(--spacing-3)' }}>
          <div />
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Enabled</div>
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Disabled</div>

          <div className="ds-demo-label" style={{ textAlign: 'right' }}>Unchecked</div>
          <div className="ds-demo-cell"><Checkbox label="Unchecked" defaultChecked={false} /></div>
          <div className="ds-demo-cell"><Checkbox label="Unchecked" disabled /></div>

          <div className="ds-demo-label" style={{ textAlign: 'right' }}>Checked</div>
          <div className="ds-demo-cell"><Checkbox label="Checked" defaultChecked /></div>
          <div className="ds-demo-cell"><Checkbox label="Checked" defaultChecked disabled /></div>

          <div className="ds-demo-label" style={{ textAlign: 'right' }}>Indeterminate</div>
          <div className="ds-demo-cell"><Checkbox label="Indeterminate" indeterminate /></div>
          <div className="ds-demo-cell"><Checkbox label="Indeterminate" indeterminate disabled /></div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive (controlled)</h4>
        <div className="ds-demo-row">
          <Checkbox
            label={checked ? 'On — click to toggle' : 'Off — click to toggle'}
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write the Radio demo**

Create `apps/odyssey-one/src/routes/design-system/demos/Radio.demo.jsx`:

```jsx
import { useState } from 'react'
import { Radio } from '@odyssey/ui'

export const meta = {
  name: 'Radio',
  tier: 'atom',
  figmaNode: '2824:330',
  codeConnect: 'packages/ui/src/Radio.figma.tsx',
}

export const props = [
  { name: 'checked', type: 'boolean', desc: 'Controlled checked state.' },
  { name: 'defaultChecked', type: 'boolean', desc: 'Uncontrolled initial checked.' },
  { name: 'disabled', type: 'boolean', desc: 'Disables the native input.' },
  { name: 'label', type: 'ReactNode', desc: 'Label text.' },
  { name: 'showLabel', type: 'boolean', desc: 'Toggle label visibility. Default true.' },
  { name: 'name', type: 'string', desc: 'Group radios by sharing a name.' },
  { name: 'onChange', type: '(e) => void', desc: 'Native change handler.' },
]

export const tokens = [
  { token: '--control-bg', resolves: 'White', usage: 'unchecked dot fill' },
  { token: '--control-border', resolves: 'Border/default', usage: 'unchecked border' },
  { token: '--control-checked-bg', resolves: 'DSN/900', usage: 'checked fill' },
  { token: '--control-focus', resolves: 'Border/strong', usage: 'focus ring' },
]

export default function RadioDemo() {
  const [value, setValue] = useState('ltl')
  return (
    <div>
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">States × enabled / disabled</h4>
        <div className="ds-demo-grid" style={{ gridTemplateColumns: '120px 1fr 1fr', gap: 'var(--spacing-3)' }}>
          <div />
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Enabled</div>
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Disabled</div>

          <div className="ds-demo-label" style={{ textAlign: 'right' }}>Unchecked</div>
          <div className="ds-demo-cell"><Radio name="d1" label="Unchecked" defaultChecked={false} /></div>
          <div className="ds-demo-cell"><Radio name="d2" label="Unchecked" disabled /></div>

          <div className="ds-demo-label" style={{ textAlign: 'right' }}>Checked</div>
          <div className="ds-demo-cell"><Radio name="d3" label="Checked" defaultChecked /></div>
          <div className="ds-demo-cell"><Radio name="d4" label="Checked" defaultChecked disabled /></div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive group</h4>
        <div className="ds-demo-row">
          {[['ltl', 'LTL'], ['tl', 'TL'], ['parcel', 'Parcel']].map(([val, lbl]) => (
            <Radio
              key={val}
              name="mode"
              value={val}
              label={lbl}
              checked={value === val}
              onChange={() => setValue(val)}
            />
          ))}
          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
            selected: {value}
          </span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build is green**

Run: `npm run build:odyssey-one`
Expected: build succeeds; Atoms tab count is now 3 (Button, Checkbox, Radio).

- [ ] **Step 4: Commit**

```bash
git add apps/odyssey-one/src/routes/design-system/demos/Checkbox.demo.jsx apps/odyssey-one/src/routes/design-system/demos/Radio.demo.jsx
git commit -m "feat(design-system): Checkbox + Radio demos"
```

---

### Task 5: FieldSelect demo

**Files:**
- Create: `apps/odyssey-one/src/routes/design-system/demos/FieldSelect.demo.jsx`

- [ ] **Step 1: Write the demo**

Create `apps/odyssey-one/src/routes/design-system/demos/FieldSelect.demo.jsx`:

```jsx
import { FieldSelect } from '@odyssey/ui'

export const meta = {
  name: 'FieldSelect',
  tier: 'atom',
  figmaNode: '2627:153',
  codeConnect: 'packages/ui/src/FieldSelect.figma.tsx',
}

export const props = [
  { name: 'variant', type: 'leading|trailing', desc: 'Edge side. leading = left border (divider on right); trailing = right border (divider on left). Default trailing.' },
  { name: 'state', type: 'default|focus|disabled|error-default|error', desc: 'Drives the divider color ladder. Default default.' },
  { name: 'label', type: 'string', desc: 'Trigger text (e.g. "+1", "kg"). Default "Select".' },
  { name: 'onClick', type: '() => void', desc: 'Open the parent-supplied menu.' },
]

export const tokens = [
  { token: '--field-select-divider', resolves: 'state ladder', usage: 'one-sided divider color; overridable by a parent FormField' },
  { token: '--border-default', resolves: 'Border/default', usage: 'divider — default' },
  { token: '--border-strong', resolves: 'Border/strong', usage: 'divider — focus' },
  { token: '--bittersweet-200', resolves: 'Bittersweet/200', usage: 'divider — error-default' },
  { token: '--bittersweet-600', resolves: 'Bittersweet/600', usage: 'divider — error' },
]

const STATES = ['default', 'focus', 'disabled', 'error-default', 'error']

export default function FieldSelectDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Edge-attached select trigger. Standalone it colors its own one-sided divider
        from the <code>state</code> ladder; inside a <code>FormField</code> the parent
        drives <code>--field-select-divider</code>. See the FormField demo for composition.
      </p>

      {['leading', 'trailing'].map((variant) => (
        <div className="ds-demo-section" key={variant}>
          <h4 className="ds-demo-section__title">variant = {variant}</h4>
          <div className="ds-demo-row">
            {STATES.map((state) => (
              <div className="ds-demo-col" key={state} style={{ alignItems: 'center' }}>
                <FieldSelect variant={variant} state={state} label="Select" />
                <span className="ds-demo-label">{state}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build is green**

Run: `npm run build:odyssey-one`
Expected: build succeeds; Atoms tab count is now 4.

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/src/routes/design-system/demos/FieldSelect.demo.jsx
git commit -m "feat(design-system): FieldSelect demo"
```

---

### Task 6: FormField demo (interactive playground)

**Files:**
- Create: `apps/odyssey-one/src/routes/design-system/demos/FormField.demo.jsx`

- [ ] **Step 1: Write the demo**

Create `apps/odyssey-one/src/routes/design-system/demos/FormField.demo.jsx`:

```jsx
import { useState } from 'react'
import { FormField } from '@odyssey/ui'
import { Search } from 'lucide-react'

export const meta = {
  name: 'FormField',
  tier: 'molecule',
  figmaNode: '2602:1424',
  codeConnect: 'packages/ui/src/FormField.figma.tsx',
}

export const props = [
  { name: 'label', type: 'string', desc: 'Field title.' },
  { name: 'showLabel', type: 'boolean', desc: 'Show the label row. Default true.' },
  { name: 'showInfo', type: 'boolean', desc: 'Show the info icon beside the label. Default false.' },
  { name: 'placeholder', type: 'string', desc: 'Input placeholder.' },
  { name: 'value', type: 'string|number', desc: 'Controlled value; drives the derived filled state.' },
  { name: 'onChange', type: '(e) => void', desc: 'Input change handler.' },
  { name: 'error', type: 'string|false', desc: 'Error message; truthy reddens border + shows the message.' },
  { name: 'disabled', type: 'boolean', desc: 'Disables the input and all buttons.' },
  { name: 'leadingIcon', type: 'ReactNode', desc: 'Icon left of the input.' },
  { name: 'trailingIcon', type: 'ReactNode', desc: 'Icon right of the input.' },
  { name: 'leadingSelect', type: '{ label, onClick }', desc: 'Renders a leading FieldSelect.' },
  { name: 'trailingSelect', type: '{ label, onClick }', desc: 'Renders a trailing FieldSelect.' },
  { name: 'onClear', type: '() => void', desc: 'Clear-X handler; the button shows only when set, enabled, and value non-empty.' },
]

export const tokens = [
  { token: '--bittersweet-200', resolves: 'Bittersweet/200', usage: 'error border — idle' },
  { token: '--bittersweet-600', resolves: 'Bittersweet/600', usage: 'error border — focused' },
  { token: '--border-strong', resolves: 'Border/strong', usage: 'focus border' },
]

export default function FormFieldDemo() {
  const [value, setValue] = useState('Acme Logistics')
  const [error, setError] = useState(false)
  const [disabled, setDisabled] = useState(false)

  return (
    <div>
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive playground</h4>
        <div className="ds-demo-row" style={{ marginBottom: 'var(--spacing-4)' }}>
          <label style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', fontSize: 'var(--font-size-sm)' }}>
            <input type="checkbox" checked={error} onChange={(e) => setError(e.target.checked)} /> error
          </label>
          <label style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', fontSize: 'var(--font-size-sm)' }}>
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} /> disabled
          </label>
        </div>
        <div style={{ maxWidth: 360 }}>
          <FormField
            label="Customer"
            showInfo
            placeholder="Search customers"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onClear={() => setValue('')}
            leadingIcon={<Search size={16} />}
            error={error ? 'This customer is not recognized.' : false}
            disabled={disabled}
          />
        </div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          Type to fill · focus to see the border + label react · clear-X appears when non-empty.
        </p>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">States</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ width: 240 }}>
            <FormField label="Empty" placeholder="Placeholder" value="" onChange={() => {}} />
          </div>
          <div style={{ width: 240 }}>
            <FormField label="Filled" value="Hello" onChange={() => {}} onClear={() => {}} />
          </div>
          <div style={{ width: 240 }}>
            <FormField label="Error" value="bad@" onChange={() => {}} error="Invalid email." />
          </div>
          <div style={{ width: 240 }}>
            <FormField label="Disabled" value="Locked" onChange={() => {}} disabled />
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Composed FieldSelect (leading / trailing)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ width: 280 }}>
            <FormField
              label="Phone"
              placeholder="555 0100"
              value=""
              onChange={() => {}}
              leadingSelect={{ label: '+1', onClick: () => {} }}
            />
          </div>
          <div style={{ width: 280 }}>
            <FormField
              label="Weight"
              placeholder="0"
              value=""
              onChange={() => {}}
              trailingSelect={{ label: 'kg', onClick: () => {} }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build is green**

Run: `npm run build:odyssey-one`
Expected: build succeeds; Molecules tab count is now 1 (FormField).

- [ ] **Step 3: Verify all tests stay green**

Run: `npm run test:odyssey-one`
Expected: all pass (74 total: 67 existing + 7 from Task 1).

- [ ] **Step 4: Commit**

```bash
git add apps/odyssey-one/src/routes/design-system/demos/FormField.demo.jsx
git commit -m "feat(design-system): FormField demo (interactive playground)"
```

---

### Task 7: Manual verification at the dev server

No code in this task — this is the interactive-truth check the static HTML could never give (spec success criterion #2). If anything fails, fix the relevant demo/shell and re-commit before proceeding.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev:odyssey-one`
Then open `http://localhost:5173/design-system` (note the port the CLI prints; it may differ if 5173 is taken).

- [ ] **Step 2: Walk the checklist**

- [ ] Three tabs render — Atoms (4), Molecules (1), Organisms (0, empty-state copy). Tab switching works; active tab underlined.
- [ ] **Button:** variant×size grid shows all 6 variants incl. `error`; `outline`/`ghost` cells sit on dark surfaces; hovering a button changes it; tabbing shows focus ring; disabled column is inert; icon slots render.
- [ ] **Checkbox:** unchecked/checked/indeterminate × enabled/disabled all render correctly (indeterminate shows the dash); the interactive one toggles its label on click.
- [ ] **Radio:** states grid renders; the interactive group is single-select and "selected: X" updates.
- [ ] **FieldSelect:** for both leading & trailing, the divider color visibly changes across default→focus→disabled→error-default→error.
- [ ] **FormField:** typing fills the input; the clear-X appears only when non-empty and clears on click; focusing changes the border + label color; the `error` toggle reddens the border and shows the message; the `disabled` toggle greys it out; the composed `+1` / `kg` selects render on the correct edges with a divider.
- [ ] **Details:** clicking "Details" on any component expands the props table, token contract (where present), the Figma link (opens the right node), and the Code Connect path. Clicking again collapses it.

- [ ] **Step 3: Stop the dev server** (Ctrl-C) once the checklist passes.

---

### Task 8: Update the `/normalize` routine for the demo-file model

The explorer changes how `/normalize` Phase 3 records a component: a co-located `<Component>.demo.jsx` (real React) replaces the `getXComponentHTML` static-HTML step in `DesignSystemMap.html`.

**Files:**
- Modify: `playground/figma-component-routine.md`
- Modify: `.claude/skills/normalize/SKILL.md`

- [ ] **Step 1: Read the current Phase-3 / DSM language**

Run: `grep -n "getX\|DesignSystemMap\|DSM\|Phase 3\|subagent" playground/figma-component-routine.md .claude/skills/normalize/SKILL.md`
Read the surrounding sections so the edits land in the right place and match the doc's voice.

- [ ] **Step 2: Edit `playground/figma-component-routine.md`**

In the Phase-3 section, replace the "subagent writes a `getXComponentHTML` scoped-HTML showcase in `DesignSystemMap.html`" instruction with the demo-file model. Add (matching the doc's existing wording/format):

```markdown
**Phase 3 — explorer demo (replaces the static DSM showcase).**
Add or update `apps/odyssey-one/src/routes/design-system/demos/<Component>.demo.jsx`.
The demo imports the REAL component from `@odyssey/ui` and exports:
- `meta` — `{ name, tier: 'atom'|'molecule'|'organism', figmaNode, codeConnect }`
- `props` — `[{ name, type, desc }]` (the public API table)
- `tokens` — `[{ token, resolves, usage }]` (the token contract; optional)
- a default React component rendering a states/variants grid + (for interactive
  components) a `useState` playground.
It auto-registers via the page's `import.meta.glob` — no central-file edit.
Because the demo renders the live component, hover/focus/typing/click are real
(no reproduction drift). The DSM-always-subagent rule is **relaxed**: a demo file
is a small real-React module — delegate to a subagent only if you want to, it is
not mandatory. The static `DesignSystemMap.html` keeps only the Badges + Typography
inventory tabs; do not add new `getXComponentHTML` showcases there.
```

- [ ] **Step 3: Edit `.claude/skills/normalize/SKILL.md`**

Mirror the same Phase-3 change in the SKILL.md (wherever it currently tells the routine to write `getXComponentHTML` / always-subagent the DSM section). Keep it consistent with the routine doc above — point to the demo-file model and relax the always-subagent rule for demo files.

- [ ] **Step 4: Sanity-check no stale instruction remains**

Run: `grep -n "getXComponentHTML" playground/figma-component-routine.md .claude/skills/normalize/SKILL.md`
Expected: no results that still *instruct* writing one (a historical mention is fine if clearly past-tense; an active instruction is not).

- [ ] **Step 5: Commit**

```bash
git add playground/figma-component-routine.md .claude/skills/normalize/SKILL.md
git commit -m "docs(normalize): Phase 3 uses <Component>.demo.jsx in the React explorer"
```

---

## Final verification (run after all tasks)

- [ ] `npm run test:odyssey-one` — all green (74 tests).
- [ ] `npm run build:odyssey-one` — build succeeds.
- [ ] `/design-system` route manually verified (Task 7 checklist all checked).
- [ ] No new component required a central-file edit beyond the glob (success criterion #4): confirm Tasks 3–6 each touched only their own `<Component>.demo.jsx`.

## Out of scope (do NOT do in v1)

- Migrating the Badges / Typography token-inventory tabs to React (they stay in `DesignSystemMap.html`).
- Retiring the static Components/Normalize tabs (happens after the full backfill, post-v1).
- Backfilling the remaining ~35 component demos.
- Search/filter across components, dark-mode toggle, Storybook, jsdom/testing-library.
```
