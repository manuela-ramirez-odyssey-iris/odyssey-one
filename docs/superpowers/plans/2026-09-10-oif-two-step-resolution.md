# OIF Two-Step Error Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Level 1 (message / structural) error resolution as Step 1 of the existing `?resolve=` page, a 3-dot timeline that progresses Step 1 → Step 2 (existing) → Step 3 (preview), and switch the OIF status vocabulary to Error / Complete / Purge.

**Architecture:** A new `ResolveShell` owns the step machine, timeline, and per-step body; the existing `CreateOrderForm` resolve mode becomes the Step 2 body unchanged apart from a `hideHeader` prop and a pool exclusion for Step 1 picks. Step 1 is its own panel (`Step1Panel`) built from three small app-local pieces (`ConflictPicker`, `StructuralGrid`, `MessageControlBlock`) fed by a deterministic derive+seed module (`interfaceErrors.js`) that mirrors the LINX-16281 payload shape. Seed data gains `interfaceErrorCount` / `interfaceErrorClass` so every entry case is reachable in mock mode.

**Tech Stack:** React 19, react-hook-form + zod (existing form), `@odyssey/ui` (StepIndicator, PillTab, FormField, Radio, DataTable, Accordion, Alert, EmptyState, ModalMedium, Button), vitest + @testing-library/react (app), node:test (generator + API), faker-seeded generator.

**Spec:** `docs/superpowers/specs/2026-09-09-oif-two-step-resolution-design.md`

**Ground rules for every task**
- Run app tests from `apps/odyssey-one`: `npx vitest run <path>` (the config also picks up `packages/ui/src/**/*.test.jsx`). Generator/API tests: `node --test <file>`.
- Commit subjects start with `S145: `. Never commit `orders.json` in the same commit as generator logic unless the task says so (it does in Task 1).
- Mock mode only (`VITE_API_MODE=mock`) — `.env.local` is `live`; when you run the dev server to look, export `VITE_API_MODE=mock`. No Neon writes, no deploy.
- Tokens only for colour/radius/type/shadow (`var(--…)`); tiny internal paddings may be raw px. No new tokens.
- Existing suites must stay green at the end of each task (`npx vitest run` from `apps/odyssey-one`, ~2500 tests).

---

## File map

| File | Responsibility |
|---|---|
| `apps/odyssey-one/tools/generate.mjs` | seeds `draftOrderStatus: 'Error'`, `interfaceErrorCount`, `interfaceErrorClass` on VE rows |
| `apps/odyssey-one/src/data/orders.json` | regenerated fixture |
| `apps/odyssey-one/src/search/orders/registry.js` | `DRAFT_ORDER_STATUS_VALUES` / `_VARIANT` vocabulary |
| `apps/odyssey-one/src/api/types/orderList.ts`, `orderRowVm.ts`, `src/api/mappers/mapOrderListRow.ts` | new row fields |
| `apps/odyssey-one/src/components/orders/ordersColumns.jsx`, `OrdersTable.jsx` | Resolve gate on `Error`; Interface Errors column |
| `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx` | passes the two new fields in history state |
| `packages/ui/src/ResolveTimeline.jsx` (+ `index.js`, `components.css`, DSM demo) | horizontal 3-dot stepper |
| `apps/odyssey-one/src/components/orders/resolve/interfaceErrors.js` | 13-rule table + derive/seed |
| `…/resolve/ConflictPicker.jsx` | per-field value chips |
| `…/resolve/StructuralGrid.jsx` | offending-lines grid |
| `…/resolve/MessageControlBlock.jsx` | deleteFlag Yes/No + read-only rows |
| `…/resolve/Step1Panel.jsx` | composes the three + Received order data + Alert + footer |
| `…/resolve/ResolveShell.jsx` | step machine, timeline, bodies |
| `…/resolve/validationErrors.js` | gains `excludePaths` |
| `apps/odyssey-one/src/api/services/orderService.ts` | `saveInterfaceFixes`, `resolveOrder` → Complete, `purgeOrder` |
| `apps/odyssey-one/src/components/orders/create/CreateOrderForm.jsx` | `hideHeader`, `pickedPaths`, Purge → `purgeOrder` |
| `apps/odyssey-one/src/routes/orders/CreateOrderRoute.jsx` | mounts `ResolveShell` when `?resolve=` |

---

### Task 1: Status vocabulary + seed fields (Ready → Error; interfaceErrorCount/Class)

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs:2863` (`DRAFT_ORDER_STATUS_POOL`), `:3208-3213` (VE post-pass)
- Modify: `apps/odyssey-one/tools/generate.test.mjs:21-40`
- Modify: `apps/odyssey-one/src/search/orders/registry.js:63,82`
- Modify: `apps/odyssey-one/src/api/types/orderList.ts:50-51`, `apps/odyssey-one/src/api/types/orderRowVm.ts:33-34`, `apps/odyssey-one/src/api/mappers/mapOrderListRow.ts:82-83`
- Modify: `apps/odyssey-one/src/components/orders/ordersColumns.jsx:83-97,142`, `apps/odyssey-one/src/components/orders/OrdersTable.jsx:48`
- Modify: `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx:213-216`
- Modify tests that pin `'Ready'`: `src/search/orders/{progression,toRequest,adapter}.test.js`, `src/components/orders/{ordersColumns,OrdersFiltersView}.test.jsx`, `src/api/mappers/mapOrderListRow.test.ts`, `src/api/services/orderService{,.filters}.test.ts`, `api/_lib/orders.test.mjs`
- Regenerate: `apps/odyssey-one/src/data/orders.json`

- [ ] **Step 1: Write the failing generator test**

Replace the assertion block at `generate.test.mjs:31-38` with:

```js
  const ve = orders.filter(o => o.draftOrderStatus != null)
  assert.ok(ve.length > 0)
  for (const o of ve) {
    assert.equal(o.orderStatus, null)
    // LINX-16391: OIF status axis is Error/Complete/Purge; seeds are all Error
    // (Complete/Purge are only ever written by the UI).
    assert.equal(o.draftOrderStatus, 'Error')
    assert.ok(Number.isInteger(o.errorCount) && o.errorCount >= 1 && o.errorCount <= 12)
    assert.ok(Number.isInteger(o.interfaceErrorCount) && o.interfaceErrorCount >= 0 && o.interfaceErrorCount <= 5)
    if (o.interfaceErrorCount === 0) assert.equal(o.interfaceErrorClass, null)
    else assert.ok(['conflict', 'structural', 'mixed', 'delete-flag', 'unresolvable'].includes(o.interfaceErrorClass))
  }
  // Every Step 1 entry case is reachable from the tab (discriminator-must-be-seeded rule).
  const withL1 = ve.filter(o => o.interfaceErrorCount > 0)
  const share = withL1.length / ve.length
  assert.ok(share >= 0.3 && share <= 0.5, `L1 share ${(share * 100).toFixed(1)}% out of band`)
  for (const cls of ['conflict', 'structural', 'mixed', 'delete-flag', 'unresolvable'])
    assert.ok(withL1.some(o => o.interfaceErrorClass === cls), `no VE row with interfaceErrorClass ${cls}`)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/odyssey-one && node --test tools/generate.test.mjs`
Expected: FAIL — `draftOrderStatus` is `'Ready'`/`'Complete'`/`'Purge'`, `interfaceErrorCount` undefined.

- [ ] **Step 3: Update the generator**

At `generate.mjs:2863` replace the pool:

```js
// LINX-16391: OIF statuses are Error / Complete / Purge. Seeds only ever carry
// Error — Complete and Purge are written by the resolution UI. The old 'Ready'
// vocabulary is gone (LINX-11137 §D, 2026-09-03 rewrite).
const DRAFT_ORDER_STATUS_POOL = ['Error'];
// Step 1 (LINX-16049) seeding: ~40% of VE rows carry Level 1 errors; the rest
// open straight at Step 2. Class weights keep the message-control cases rare
// (delete-flag editable; 'unresolvable' = sourceSystem/modifyTimestamp/
// relySourceId, which the UI can only display — open question for Venkat).
const INTERFACE_ERROR_CLASS_WEIGHTS = [
  { value: 'conflict', weight: 45 }, { value: 'structural', weight: 20 },
  { value: 'mixed', weight: 22 }, { value: 'delete-flag', weight: 10 },
  { value: 'unresolvable', weight: 3 },
];
const INTERFACE_ERROR_COUNT_WEIGHTS = [
  { value: 1, weight: 35 }, { value: 2, weight: 30 }, { value: 3, weight: 20 },
  { value: 4, weight: 10 }, { value: 5, weight: 5 },
];
```

At `:3210-3212` replace the three assignments inside the `for (const row of rndSample(...))` loop:

```js
    row.draftOrderStatus = 'Error';
    row.errorCount = rndWeighted(veHoldRnd, ERROR_COUNT_WEIGHTS);
    if (veHoldRnd() < 0.4) {
      row.interfaceErrorCount = rndWeighted(veHoldRnd, INTERFACE_ERROR_COUNT_WEIGHTS);
      row.interfaceErrorClass = rndWeighted(veHoldRnd, INTERFACE_ERROR_CLASS_WEIGHTS);
    } else {
      row.interfaceErrorCount = 0;
      row.interfaceErrorClass = null;
    }
    row.orderStatus = null; // never entered the lifecycle (D1)
```

Also add `delete row.interfaceErrorCount; delete row.interfaceErrorClass;` next to the two existing `delete` lines at `:3193-3194`.

- [ ] **Step 4: Run generator tests, then regenerate the fixture**

Run: `node --test tools/generate.test.mjs` → PASS.
Run: `node tools/generate.mjs` → regenerates `src/data/orders.json` (and the other JSONs byte-identically — the VE pass uses its own RNG stream; verify with `git status --short src/data` that only `orders.json` changed. If `shipments.json` or `order-details.json` changed, STOP: the shared faker stream was touched — re-read the ORD-24 comment at `:3179` and move your draws onto `veHoldRnd`).

- [ ] **Step 5: Vocabulary in the search registry**

`registry.js:63` → `export const DRAFT_ORDER_STATUS_VALUES = ['Error', 'Complete', 'Purge']` and update the comment above it: LINX-11659 said "Complete, Ready & Purge"; LINX-16391 (2026-09-09) replaced Ready with Error.
`registry.js:82` → `export const DRAFT_ORDER_STATUS_VARIANT = { Error: 'red', Complete: 'green', Purge: 'gray' }` (red = failed, per the tone vocabulary comment above it; Error is the action-required state now).

- [ ] **Step 6: Types + mapper**

`orderList.ts:50-51`:
```ts
  draftOrderStatus?: string         // 'Error' | 'Complete' | 'Purge' — OIF status, VE-tab rows only (LINX-16391)
  errorCount?: number               // Level 2 (master-data) error count — VE-tab rows only
  interfaceErrorCount?: number      // Level 1 (message/structural) error count (LINX-16028 flag + count); 0 = opens at Step 2
  interfaceErrorClass?: 'conflict' | 'structural' | 'mixed' | 'delete-flag' | 'unresolvable' | null
```
`orderRowVm.ts:33-34`:
```ts
  draftOrderStatus: string // 'Error' | 'Complete' | 'Purge' | ''
  errorCount: number | null
  interfaceErrorCount: number | null
  interfaceErrorClass: string | null
```
`mapOrderListRow.ts:82-83` add after `errorCount`:
```ts
    interfaceErrorCount: row.interfaceErrorCount ?? null,
    interfaceErrorClass: row.interfaceErrorClass ?? null,
```

- [ ] **Step 7: Grid gate + column + route state**

**AMENDED 2026-09-10 (Task 1 execution, confirmed by spec review): the "Interface Errors" COLUMN is NOT added here.** Two parity tests bind the Orders grid to the search layer — `progression.test.js` ("every grid column on every tab has a progression attribute" + a hard `ORDERS_ATTRIBUTES` length assertion) and `chipParity.test.js` (exact set equality between the progression keys and `CHIP_COLS` in `api/_lib/orders.mjs`). A new column therefore needs a new filterable attribute, which needs a `CHIP_COLS` entry, which needs an `interface_error_count` column in Neon that does not exist. `COLUMN_TO_ATTR` only renames labels; aliasing the new column onto `Errors Count` would pass both tests but make the search bar silently match Level-2 counts for a Level-1 query — the whitelist-mapper bug class this repo has shipped five times. The column ships with the Neon column, as a separate item (see Task 11 Step 2). The VM/mapper fields are already in place for it.

`ordersColumns.jsx:142` → `if (erroring && row?.draftOrderStatus === 'Error') return 'Resolve'` and fix the doc comment at `:113-114` ("Resolve — validation-error status AND `Error`… `Complete`/`Purge` are not resolvable").
`OrdersTable.jsx:48` → `disabled={row.original.draftOrderStatus !== 'Error'}` and the comment at `:41` ("enabled only while status is Error").
`OrdersRoute.jsx:215` → `state: { errorCount: row.errorCount, interfaceErrorCount: row.interfaceErrorCount, interfaceErrorClass: row.interfaceErrorClass, customer: row.customer, orderSource: row.orderSource },`

- [ ] **Step 8: Fix every test that pins `'Ready'`**

Run: `grep -rn "'Ready'" src api --include='*.test.*'` and change each draft-status usage to `'Error'` (do NOT touch `'Ready for Planning'`). Known sites: `progression.test.js:64`, `adapter.test.js:10`, `ordersColumns.test.jsx:19` (expects `Resolve` on `Error` now; the `Complete → 'Edit'` and `Purge → 'View'` cases stay), `OrdersFiltersView.test.jsx`, `mapOrderListRow.test.ts`, `orderService.test.ts`, `orderService.filters.test.ts`, `api/_lib/orders.test.mjs`. `resolve.test.jsx:29` criterion `r.draftOrderStatus !== 'Ready'` → `!== 'Error'` **and add** `|| (r.interfaceErrorCount ?? 0) !== 0` so the existing Step 2 tests still land on an order that opens at Step 2.

- [ ] **Step 9: Run the whole app suite + API tests**

Run: `npx vitest run` → all green. Run: `node --test api/_lib/*.test.mjs` → green.

- [ ] **Step 10: Commit**

```bash
git add tools/generate.mjs tools/generate.test.mjs src/data/orders.json src/search/orders src/api src/components/orders src/routes/orders api/_lib/orders.test.mjs
git commit -m "S145: OIF status vocabulary Error/Complete/Purge (LINX-16391) + seeded interfaceErrorCount/Class; Resolve gates on Error"
```

---

### Task 2: `ResolveTimeline` (packages/ui) + CSS + DSM demo

**Files:**
- Create: `packages/ui/src/ResolveTimeline.jsx`, `packages/ui/src/ResolveTimeline.test.jsx`
- Modify: `packages/ui/src/index.js` (export), `apps/odyssey-one/src/styles/components.css` (append after the `.step-indicator--error` rule, ~line 5349)
- Create: `apps/odyssey-one/src/routes/design-system/demos/ResolveTimeline.demo.jsx`

- [ ] **Step 1: Failing test**

```jsx
// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ResolveTimeline from './ResolveTimeline.jsx'

afterEach(cleanup)

const steps = (over = {}) => [
  { key: 's1', label: 'Message errors', detail: '3 errors · in progress', status: 'error', ...over.s1 },
  { key: 's2', label: 'Data errors', detail: 'locked', status: 'off', ...over.s2 },
  { key: 's3', label: 'Order ready', detail: '—', status: 'off', ...over.s3 },
]

describe('ResolveTimeline', () => {
  test('renders one dot per step with label + detail and the current step marked', () => {
    render(<ResolveTimeline steps={steps()} current="s1" />)
    const list = screen.getByRole('list', { name: 'Resolution progress' })
    expect(list.querySelectorAll('.resolve-timeline__step').length).toBe(3)
    expect(screen.getByText('Message errors')).toBeTruthy()
    expect(screen.getByText('locked')).toBeTruthy()
    expect(list.querySelector('.resolve-timeline__step--current')?.textContent).toContain('Message errors')
    expect(list.querySelector('.step-indicator--error')).toBeTruthy()
  })

  test('a step without onClick is not a button and carries aria-disabled', () => {
    render(<ResolveTimeline steps={steps()} current="s1" />)
    const s2 = screen.getByText('Data errors').closest('.resolve-timeline__step')
    expect(s2.querySelector('button')).toBeNull()
    expect(s2.getAttribute('aria-disabled')).toBe('true')
  })

  test('a step with onClick renders a button that fires it', () => {
    const onClick = vi.fn()
    render(<ResolveTimeline steps={steps({ s1: { status: 'on', detail: 'passed', onClick } })} current="s2" />)
    fireEvent.click(screen.getByRole('button', { name: /Message errors/ }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('track segments take the status of the step they lead to', () => {
    const { container } = render(<ResolveTimeline steps={steps({ s1: { status: 'on' }, s2: { status: 'error' } })} current="s2" />)
    const segs = container.querySelectorAll('.resolve-timeline__segment')
    expect(segs.length).toBe(2)
    expect(segs[0].className).toContain('resolve-timeline__segment--error') // s1 → s2 (s2 erroring)
    expect(segs[1].className).toContain('resolve-timeline__segment--off')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run ../../packages/ui/src/ResolveTimeline.test.jsx` → FAIL (module not found).

- [ ] **Step 3: Implement**

`packages/ui/src/ResolveTimeline.jsx`:
```jsx
import StepIndicator from './StepIndicator.jsx'

/**
 * ResolveTimeline — molecule (STAGING / NORMALIZING, S145). Horizontal
 * 3-dot progress stepper for the OIF resolution page: one StepIndicator per
 * step on a track, label + detail under each. Steps, not tabs — the user
 * progresses left → right; a dot is clickable only when its `onClick` is set
 * (the consumer decides: passed steps re-open read-only, locked ones don't).
 *
 * Track segment i sits between step i and i+1 and takes step i+1's status
 * (`on` = green fill, `error` = red fill, `off` = neutral), so the line
 * "arrives" in the colour of the step it reaches.
 *
 * steps: [{ key, label, detail, status: 'off'|'on'|'error', onClick? }]
 * current: key of the step whose body is rendered (bold label).
 * Figma master + Code Connect owed at batch close (user: "later we can refine").
 */
export default function ResolveTimeline({ steps = [], current, className = '', ...rest }) {
  return (
    <ol
      className={`resolve-timeline${className ? ` ${className}` : ''}`}
      aria-label="Resolution progress"
      {...rest}
    >
      {steps.map((step, i) => {
        const isCurrent = step.key === current
        const next = steps[i + 1]
        const cls = [
          'resolve-timeline__step',
          isCurrent && 'resolve-timeline__step--current',
        ].filter(Boolean).join(' ')
        const content = (
          <>
            <StepIndicator position="start" status={step.status} className="resolve-timeline__dot" />
            <span className="resolve-timeline__label text-label-sm-medium">{step.label}</span>
            <span className="resolve-timeline__detail text-label-xs-regular">{step.detail}</span>
          </>
        )
        return (
          <li
            key={step.key}
            className={cls}
            aria-current={isCurrent ? 'step' : undefined}
            aria-disabled={step.onClick ? undefined : 'true'}
          >
            {step.onClick
              ? <button type="button" className="resolve-timeline__button" onClick={step.onClick}>{content}</button>
              : <span className="resolve-timeline__static">{content}</span>}
            {next && (
              <span className={`resolve-timeline__segment resolve-timeline__segment--${next.status}`} aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
```

`packages/ui/src/index.js` — add `export { default as ResolveTimeline } from './ResolveTimeline.jsx';` next to the `Timeline` export (line ~66).

`components.css` — append after `.step-indicator--error .step-indicator__circle { … }`:
```css
/* === ResolveTimeline (molecule, STAGING S145) — horizontal 3-dot stepper.
   Composes StepIndicator (the vertical connector lines are hidden: the track
   is horizontal here). Segment colour = the status of the step it leads to. */
.resolve-timeline {
  display: flex;
  align-items: flex-start;
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
}
.resolve-timeline__step {
  position: relative;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 0;
}
.resolve-timeline__step:last-child { flex: 0 0 auto; }
.resolve-timeline__button,
.resolve-timeline__static {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  background: none;
  border: none;
  padding: 0;
  color: var(--text-secondary);
  font: inherit;
}
.resolve-timeline__button { cursor: pointer; }
.resolve-timeline__button:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; border-radius: var(--radius-md); }
.resolve-timeline__step--current .resolve-timeline__label { color: var(--text-primary); }
.resolve-timeline__step[aria-disabled='true'] { color: var(--text-tertiary); }
.resolve-timeline__dot .step-indicator__line { display: none; }
.resolve-timeline__dot { width: 40px; }
/* Track: from the centre of this dot to the centre of the next. Sits at the
   dot's vertical centre (40px dot → 20px). */
.resolve-timeline__segment {
  position: absolute;
  top: 20px;
  left: calc(50% + 20px);
  right: calc(-50% + 20px);
  height: 2px;
  background: var(--deep-sea-neutral-200);
  transition: background var(--transition-base);
}
.resolve-timeline__segment--on { background: var(--caribbean-green-600); }
.resolve-timeline__segment--error { background: var(--bittersweet-600); }
```
(`right: calc(-50% + 20px)` reaches the next step's centre because each step is `flex: 1` — the last step is `auto`-width so its dot sits flush right. Check visually in the DSM.)

- [ ] **Step 4: Run test → PASS**

Run: `npx vitest run ../../packages/ui/src/ResolveTimeline.test.jsx`.

- [ ] **Step 5: DSM demo** (`ResolveTimeline.demo.jsx`, same shape as `StepIndicator.demo.jsx`):

```jsx
import { useState } from 'react'
import { ResolveTimeline } from '@odyssey/ui'

export const meta = {
  name: 'ResolveTimeline',
  tier: 'molecule',
  normalizing: true,
  figmaNode: null,
  codeConnect: null,
}

export const props = [
  { name: 'steps', type: '[{ key, label, detail, status, onClick? }]', desc: 'One entry per dot. status off|on|error maps onto StepIndicator. A step is clickable only when onClick is set.' },
  { name: 'current', type: 'string', desc: 'Key of the step whose body is shown — its label renders in text-primary.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-200', resolves: 'Deep Sea Neutral/200', usage: 'pending track segment' },
  { token: '--caribbean-green-600', resolves: 'Caribbean Green/600', usage: 'passed segment' },
  { token: '--bittersweet-600', resolves: 'Bittersweet/600', usage: 'erroring segment' },
  { token: '--text-primary / --text-secondary / --text-tertiary', resolves: 'DSN/900 / 700 / 500', usage: 'current / other / locked labels' },
]

const PRESETS = {
  'Step 1 open': { s1: ['error', '3 errors · in progress'], s2: ['off', 'locked'], s3: ['off', '—'], current: 's1' },
  'Step 2 open': { s1: ['on', 'passed · 3 fixed'], s2: ['error', '4 errors · in progress'], s3: ['off', '—'], current: 's2' },
  'No message errors': { s1: ['on', 'no errors'], s2: ['error', '2 errors · in progress'], s3: ['off', '—'], current: 's2' },
  'Complete': { s1: ['on', 'passed · 3 fixed'], s2: ['on', 'passed'], s3: ['on', 'ready for planning'], current: 's3' },
}

export default function ResolveTimelineDemo() {
  const [preset, setPreset] = useState('Step 1 open')
  const p = PRESETS[preset]
  const clickable = (key) => (p[key][0] === 'on' && p.current !== key ? () => setPreset(preset) : undefined)
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Steps, not tabs: the OIF resolution progression. Passed dots are clickable (read-only look-back); locked ones are inert.
      </p>
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground</h4>
        <select value={preset} onChange={(e) => setPreset(e.target.value)} style={{ marginBottom: 'var(--spacing-4)' }}>
          {Object.keys(PRESETS).map((k) => <option key={k}>{k}</option>)}
        </select>
        <div style={{ maxWidth: 720 }}>
          <ResolveTimeline
            current={p.current}
            steps={[
              { key: 's1', label: 'Message errors', detail: p.s1[1], status: p.s1[0], onClick: clickable('s1') },
              { key: 's2', label: 'Data errors', detail: p.s2[1], status: p.s2[0], onClick: clickable('s2') },
              { key: 's3', label: 'Order ready', detail: p.s3[1], status: p.s3[0] },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
```

Run: `npx vitest run src/routes/design-system/demos.smoke.test.jsx` → PASS.

- [ ] **Step 6: Commit**

```bash
git add ../../packages/ui/src/ResolveTimeline.jsx ../../packages/ui/src/ResolveTimeline.test.jsx ../../packages/ui/src/index.js src/styles/components.css src/routes/design-system/demos/ResolveTimeline.demo.jsx
git commit -m "S145: ResolveTimeline — horizontal 3-dot stepper on StepIndicator (staging), DSM demo"
```

---

### Task 3: `interfaceErrors.js` — the 13 rules as data + derive/seed

**Files:**
- Create: `apps/odyssey-one/src/components/orders/resolve/interfaceErrors.js`, `…/interfaceErrors.test.js`

Form-value paths used (from `create/schema.ts`): `general.freightTerm`, `pickupDelivery.planningDateType` (`'SHIP'|'DELIVERY'`), `pickupDelivery.consignor.{address1,city,state,postal}`, `pickupDelivery.consignee.{…}`, `pickupDelivery.{earlyPickup,latePickup,earlyDelivery,lateDelivery}.{date,timezone}`, `products[i].{grossWeight.value,volume.value,handlingCount}`.

- [ ] **Step 1: Failing test**

```js
import { describe, test, expect } from 'vitest'
import { deriveInterfaceErrors, INTERFACE_RULES } from './interfaceErrors'

const values = () => ({
  general: { freightTerm: 'P' },
  pickupDelivery: {
    planningDateType: 'SHIP',
    consignor: { address1: '9507 Lynch Junction', city: 'Odessa', state: 'TX', postal: '79761' },
    consignee: { address1: '4304 Predovic Ramp', city: 'Lake Charles', state: 'LA', postal: '70601' },
    earlyPickup: { date: '2026-05-17', time: '09:00', timezone: 'CDT' },
    latePickup: { date: '2026-05-17', time: '11:00', timezone: 'CDT' },
    earlyDelivery: { date: '2026-05-24', time: '08:30', timezone: 'CDT' },
    lateDelivery: { date: '2026-05-24', time: '11:00', timezone: 'CDT' },
  },
  products: [
    { id: 'prod-1', productId: 'A', grossWeight: { value: '100', uom: 'lbs' }, volume: { value: '10', uom: 'cbf' }, handlingCount: '2' },
    { id: 'prod-2', productId: 'B', grossWeight: { value: '200', uom: 'lbs' }, volume: { value: '20', uom: 'cbf' }, handlingCount: '3' },
    { id: 'prod-3', productId: 'C', grossWeight: { value: '300', uom: 'lbs' }, volume: { value: '30', uom: 'cbf' }, handlingCount: '4' },
  ],
})

describe('INTERFACE_RULES', () => {
  test('encodes all 13 pre-validation rules with class, fieldTree and message', () => {
    expect(INTERFACE_RULES.length).toBe(13)
    for (const r of INTERFACE_RULES) {
      expect(['conflict', 'structural', 'message-control']).toContain(r.class)
      expect(r.fieldTree).toMatch(/^orderInterface\./)
      expect(r.message.length).toBeGreaterThan(10)
    }
    expect(INTERFACE_RULES.filter(r => r.class === 'message-control').map(r => r.rule)).toEqual([8, 9, 10, 11])
  })
})

describe('deriveInterfaceErrors', () => {
  test('is deterministic per order number', () => {
    const a = deriveInterfaceErrors('0000000091002', 3, 'conflict', values())
    const b = deriveInterfaceErrors('0000000091002', 3, 'conflict', values())
    expect(a.errors.map(e => e.fieldTree)).toEqual(b.errors.map(e => e.fieldTree))
  })

  test('count 0 → empty result', () => {
    const r = deriveInterfaceErrors('X', 0, null, values())
    expect(r.errors).toEqual([])
    expect(r.conflicts.size).toBe(0)
    expect(r.structural).toEqual([])
    expect(r.messageControl).toEqual([])
  })

  test("class 'conflict' → only conflict rows, each with ≥2 distinct values whose lines cover every product line", () => {
    const r = deriveInterfaceErrors('0000000091002', 2, 'conflict', values())
    expect(r.errors.length).toBe(2)
    expect(r.errors.every(e => e.class === 'conflict')).toBe(true)
    for (const [, options] of r.conflicts) {
      expect(options.length).toBeGreaterThanOrEqual(2)
      const lines = options.flatMap(o => o.lines).sort()
      expect(lines).toEqual([1, 2, 3])
      expect(new Set(options.map(o => o.value)).size).toBe(options.length)
    }
  })

  test('applyErrors blanks the conflicting header field and diverges the per-line values', () => {
    const r = deriveInterfaceErrors('0000000091002', 1, 'conflict', values())
    const draft = r.applyErrors(values())
    const [path, options] = [...r.conflicts][0]
    expect(getPath(draft, path)).toBe('')
    expect(draft.lineValues[path].length).toBe(3)
    expect(new Set(draft.lineValues[path]).size).toBe(options.length)
  })

  test("class 'structural' → rule 1/2/4 faults on real lines", () => {
    const r = deriveInterfaceErrors('0000000091003', 2, 'structural', values())
    expect(r.structural.length).toBe(2)
    for (const s of r.structural) {
      expect([1, 2, 4]).toContain(s.rule)
      expect(s.line).toBeGreaterThanOrEqual(1)
      expect(s.line).toBeLessThanOrEqual(3)
    }
  })

  test("class 'delete-flag' → one editable message-control error; 'unresolvable' → one non-editable", () => {
    const d = deriveInterfaceErrors('A', 1, 'delete-flag', values())
    expect(d.messageControl).toEqual([expect.objectContaining({ rule: 10, editable: true })])
    const u = deriveInterfaceErrors('B', 1, 'unresolvable', values())
    expect(u.messageControl.length).toBe(1)
    expect(u.messageControl[0].editable).toBe(false)
    expect([8, 9, 11]).toContain(u.messageControl[0].rule)
  })

  test("class 'mixed' spreads the count over conflict + structural", () => {
    const r = deriveInterfaceErrors('0000000091004', 3, 'mixed', values())
    expect(r.errors.length).toBe(3)
    expect(r.conflicts.size).toBeGreaterThan(0)
    expect(r.structural.length).toBeGreaterThan(0)
  })

  test('isResolved: conflict resolves on a pick; structural on its fix; message-control only when editable and set', () => {
    const r = deriveInterfaceErrors('0000000091004', 3, 'mixed', values())
    const conflict = r.errors.find(e => e.class === 'conflict')
    expect(r.isResolved(conflict, { picks: {}, structuralFixed: new Set(), deleteFlag: null })).toBe(false)
    expect(r.isResolved(conflict, { picks: { [conflict.path]: 'X' }, structuralFixed: new Set(), deleteFlag: null })).toBe(true)
    const st = r.errors.find(e => e.class === 'structural')
    expect(r.isResolved(st, { picks: {}, structuralFixed: new Set([st.id]), deleteFlag: null })).toBe(true)
  })
})

function getPath(obj, path) { return path.split('.').reduce((o, k) => o?.[k], obj) }
```

- [ ] **Step 2: Run → FAIL** (`npx vitest run src/components/orders/resolve/interfaceErrors.test.js`).

- [ ] **Step 3: Implement**

```js
/**
 * Level 1 (Order Interface / pre-validation) errors — LINX-16049.
 * The 13 checks the backend runs before an integrated message can become
 * OrderIn (OrderValidationComponent; Appendix A of the Level-1 design review),
 * as data, plus a deterministic derive+seed that stands in for the real
 * error feed. Output mirrors LINX-16281: { fieldTree, field, message }.
 *
 * Sibling of validationErrors.js (Level 2). Same seeded PRNG recipe.
 *
 * Classes:
 *   conflict        — lines disagree; the planner PICKS a value per field
 *   structural      — a fault inside one line; the planner FIXES it in a grid
 *   message-control — provenance fields; only deleteFlag is editable (Yes/No)
 */

// Rule table. `path` = the create-form (RHF) path the pick lands in;
// `lineKey` = how the per-line value is labelled on the ConflictPicker chips.
export const INTERFACE_RULES = [
  { rule: 1, class: 'structural', kind: 'extra-schedule', fieldTree: 'orderInterface.orderLines[].schedules[]', field: 'Schedules per line', message: 'An order line can have only 1 schedule. Please check the order.' },
  { rule: 2, class: 'structural', kind: 'quantity-mismatch', fieldTree: 'orderInterface.orderLines[].schedules[].packageCount', field: 'Line vs schedule quantity', message: 'Line and Schedule mismatch: Package count, weights, and volume (including UOM codes) must be identical at both levels.' },
  { rule: 3, class: 'conflict', path: 'pickupDelivery.latePickup.date', fieldTree: 'orderInterface.orderLines[].schedules[].requestedShipDate', field: 'Requested Ship Date', message: 'Corresponding Ship Dates & Delivery Dates must be the same in all Order lines. Please check the planning dates in the order.' },
  { rule: 4, class: 'structural', kind: 'timezone-missing', fieldTree: 'orderInterface.orderLines[].schedules[].requestedShipTimeZoneCode', field: 'Requested Ship Time Zone', message: 'Requested Ship Time-Zone missing. Please re-submit the order with the correct Requested Ship Time-Zone.' },
  { rule: 5, class: 'conflict', path: 'pickupDelivery.consignor.city', fieldTree: 'orderInterface.orderLines[].sites[SHIPPER].city', field: 'Shipper City', message: 'Address fields must be the same in all Order lines. Please check the order address fields.', siblings: [
    { path: 'pickupDelivery.consignor.postal', fieldTree: 'orderInterface.orderLines[].sites[SHIPPER].postal', field: 'Shipper Postal Code' },
  ] },
  { rule: 6, class: 'conflict', path: 'general.freightTerm', fieldTree: 'orderInterface.orderLines[].freightTermCode', field: 'Freight Term', message: 'Freight Term Codes must be the same across all order lines.' },
  { rule: 7, class: 'conflict', path: 'pickupDelivery.planningDateType', fieldTree: 'orderInterface.orderLines[].planningDateType', field: 'Planning Date Type', message: 'Planning Date Type must be the same across all order lines.' },
  { rule: 8, class: 'message-control', editable: false, fieldTree: 'orderInterface.messageProperties[].relySourceId', field: 'relySourceId', message: 'Mandatory message properties are missing. Please check the message properties.' },
  { rule: 9, class: 'message-control', editable: false, fieldTree: 'orderInterface.sourceSystem', field: 'sourceSystem', message: 'Incorrect Source System.' },
  { rule: 10, class: 'message-control', editable: true, fieldTree: 'orderInterface.deleteFlag', field: 'deleteFlag', message: 'Incorrect Delete Flag Value.' },
  { rule: 11, class: 'message-control', editable: false, fieldTree: 'orderInterface.modifyTimestamp', field: 'modifyTimestamp', message: 'Invalid Modify Timestamp format.' },
  { rule: 12, class: 'conflict', path: 'pickupDelivery.earlyDelivery.date', fieldTree: 'orderInterface.orderLines[].schedules[].earliestDeliveryDate', field: 'Earliest Delivery Date', message: 'Earliest Delivery Date must be same across all order lines.' },
  { rule: 13, class: 'conflict', path: 'pickupDelivery.lateDelivery.date', fieldTree: 'orderInterface.orderLines[].schedules[].latestDeliveryDate', field: 'Latest Delivery Date', message: 'Latest Delivery Date must be same across all order lines.' },
]

// Same xmur3 → mulberry32 recipe as validationErrors.js (kept local on purpose).
function seededRandom(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = (h ^= h >>> 16) >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
function setPath(obj, path, value) {
  const keys = path.split('.'); const last = keys.pop()
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj)
  target[last] = value
}
const shiftDate = (iso, days) => {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// A plausible "other" value per conflict path, derived from the current one.
const ALT = {
  'general.freightTerm': (v) => (v === 'P' ? 'C' : 'P'),
  'pickupDelivery.planningDateType': (v) => (v === 'SHIP' ? 'DELIVERY' : 'SHIP'),
  'pickupDelivery.consignor.city': (v) => (v === 'Odessa' ? 'Midland' : 'Odessa'),
  'pickupDelivery.consignor.postal': (v) => String(Number(v || 70000) + 11),
  'pickupDelivery.latePickup.date': (v) => shiftDate(v, 2),
  'pickupDelivery.earlyDelivery.date': (v) => shiftDate(v, 3),
  'pickupDelivery.lateDelivery.date': (v) => shiftDate(v, 2),
}

// Which rules a class draws from.
const CLASS_RULES = {
  conflict: [3, 5, 6, 7, 12, 13],
  structural: [1, 2, 4],
  mixed: [3, 5, 6, 7, 12, 13, 1, 2, 4],
  'delete-flag': [10],
  unresolvable: [8, 9, 11],
}

export function deriveInterfaceErrors(orderNumber, interfaceErrorCount, interfaceErrorClass, values) {
  const empty = { errors: [], conflicts: new Map(), structural: [], messageControl: [], applyErrors: (v) => structuredClone(v), applyFixes: (v) => structuredClone(v), isResolved: () => true }
  const count = Math.max(0, Number(interfaceErrorCount) || 0)
  if (!count || !CLASS_RULES[interfaceErrorClass]) return empty

  const rand = seededRandom(`L1:${orderNumber}`)
  const lineCount = Math.max(1, values?.products?.length ?? 1)
  const pool = CLASS_RULES[interfaceErrorClass].map((n) => INTERFACE_RULES.find((r) => r.rule === n))
  // 'mixed' guarantees at least one of each class when count ≥ 2.
  const idx = pool.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]] }
  let chosen = idx.slice(0, Math.min(count, pool.length)).map((i) => pool[i])
  if (interfaceErrorClass === 'mixed' && count >= 2) {
    const hasC = chosen.some((r) => r.class === 'conflict'), hasS = chosen.some((r) => r.class === 'structural')
    if (!hasC) chosen[0] = pool.find((r) => r.class === 'conflict')
    if (!hasS) chosen[chosen.length - 1] = pool.find((r) => r.class === 'structural')
  }
  chosen.sort((a, b) => a.rule - b.rule)

  const errors = []
  const conflicts = new Map()
  const structural = []
  const messageControl = []
  let seq = 0

  for (const r of chosen) {
    if (r.class === 'conflict') {
      const fields = [r, ...(r.siblings ?? [])]
      for (const f of fields) {
        const current = getPath(values, f.path) ?? ''
        const alt = (ALT[f.path] ?? ((v) => `${v}-alt`))(current)
        // Split lines: the majority keeps `current`, the odd line(s) carry `alt`.
        const oddLine = 1 + Math.floor(rand() * lineCount)
        const lines = Array.from({ length: lineCount }, (_, i) => i + 1)
        const options = lineCount === 1
          ? [{ value: current, lines: [1] }, { value: alt, lines: [] }]
          : [
              { value: current, lines: lines.filter((l) => l !== oddLine) },
              { value: alt, lines: [oddLine] },
            ]
        conflicts.set(f.path, options)
        errors.push({ id: `c${++seq}`, rule: r.rule, class: 'conflict', path: f.path, fieldTree: f.fieldTree, field: f.field, message: r.message })
      }
    } else if (r.class === 'structural') {
      const line = 1 + Math.floor(rand() * lineCount)
      const id = `s${++seq}`
      structural.push({ id, rule: r.rule, kind: r.kind, line, fieldTree: r.fieldTree, field: r.field, message: r.message })
      errors.push({ id, rule: r.rule, class: 'structural', line, kind: r.kind, fieldTree: r.fieldTree, field: `${r.field} · line ${line}`, message: r.message })
    } else {
      const id = `m${++seq}`
      messageControl.push({ id, rule: r.rule, editable: r.editable, fieldTree: r.fieldTree, field: r.field, message: r.message })
      errors.push({ id, rule: r.rule, class: 'message-control', editable: r.editable, fieldTree: r.fieldTree, field: r.field, message: r.message })
    }
  }

  /** Hydrated draft that agrees with the errors: conflicting header fields
   *  blanked, per-line values recorded under `lineValues[path]`, structural
   *  faults stamped on the lines. */
  const applyErrors = (src) => {
    const draft = structuredClone(src)
    draft.lineValues = {}
    for (const [path, options] of conflicts) {
      setPath(draft, path, '')
      const per = Array.from({ length: lineCount }, (_, i) => options.find((o) => o.lines.includes(i + 1))?.value ?? options[0].value)
      draft.lineValues[path] = per
    }
    draft.products ??= []
    for (const s of structural) {
      const p = draft.products[s.line - 1]
      if (!p) continue
      if (s.kind === 'extra-schedule') p.schedules = [{ id: `${p.id}-sch-1` }, { id: `${p.id}-sch-2` }]
      if (s.kind === 'quantity-mismatch') p.scheduleQuantity = { grossWeight: String(Number(p.grossWeight?.value || 0) + 50), volume: p.volume?.value ?? '' }
      if (s.kind === 'timezone-missing') p.scheduleTimezone = ''
    }
    return draft
  }

  /** Step 2 draft: picks written into the header, structural faults cleared. */
  const applyFixes = (src, picks = {}, structuralFixes = {}) => {
    const draft = structuredClone(src)
    for (const [path, value] of Object.entries(picks)) setPath(draft, path, value)
    delete draft.lineValues
    for (const p of draft.products ?? []) {
      if (p.schedules) p.schedules = p.schedules.slice(0, 1)
      if (p.scheduleQuantity) { p.grossWeight = { ...p.grossWeight, value: structuralFixes[p.id]?.grossWeight ?? p.grossWeight?.value }; delete p.scheduleQuantity }
      if (p.scheduleTimezone === '' && structuralFixes[p.id]?.timezone) p.scheduleTimezone = structuralFixes[p.id].timezone
    }
    return draft
  }

  /** state = { picks: {path→value}, structuralFixed: Set<id>, deleteFlag: 'Y'|'N'|null } */
  const isResolved = (error, state) => {
    if (error.class === 'conflict') return state.picks[error.path] != null && state.picks[error.path] !== ''
    if (error.class === 'structural') return state.structuralFixed.has(error.id)
    return error.editable ? state.deleteFlag === 'Y' || state.deleteFlag === 'N' : false
  }

  return { errors, conflicts, structural, messageControl, applyErrors, applyFixes, isResolved }
}
```

- [ ] **Step 4: Run → PASS.** If the `mixed` test flakes on a particular order number, the "guarantee one of each" branch is what to check — do not weaken the test.

- [ ] **Step 5: Commit**

```bash
git add src/components/orders/resolve/interfaceErrors.js src/components/orders/resolve/interfaceErrors.test.js
git commit -m "S145: interfaceErrors — the 13 Level 1 rules as data + deterministic derive/seed (LINX-16049/16281 seam)"
```

---

### Task 4: `ConflictPicker`

**Files:**
- Create: `apps/odyssey-one/src/components/orders/resolve/ConflictPicker.jsx`, `…/ConflictPicker.test.jsx`
- Modify: `apps/odyssey-one/src/components/orders/create/create-order.css` (append)

- [ ] **Step 1: Failing test**

```jsx
// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ConflictPicker from './ConflictPicker.jsx'

afterEach(cleanup)
const options = [{ value: 'P', label: 'Pre-Paid', lines: [1, 2] }, { value: 'C', label: 'Collect', lines: [3] }]

describe('ConflictPicker', () => {
  test('one chip per distinct value, labelled with its lines, plus Enter another value', () => {
    render(<ConflictPicker label="Freight Term" message="Freight Term Codes must be the same across all order lines." options={options} value={null} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Pre-Paid · lines 1, 2' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Collect · line 3' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enter another value' })).toBeTruthy()
    expect(screen.getByText('Freight Term Codes must be the same across all order lines.')).toBeTruthy()
  })

  test('clicking a chip fires onPick with its value and marks it pressed', () => {
    const onPick = vi.fn()
    const { rerender } = render(<ConflictPicker label="Freight Term" options={options} value={null} onPick={onPick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Collect · line 3' }))
    expect(onPick).toHaveBeenCalledWith('C')
    rerender(<ConflictPicker label="Freight Term" options={options} value="C" onPick={onPick} />)
    expect(screen.getByRole('button', { name: 'Collect · line 3' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Validated')).toBeTruthy()
  })

  test('Enter another value reveals an input; committing it picks the typed value', () => {
    const onPick = vi.fn()
    render(<ConflictPicker label="Freight Term" options={options} value={null} onPick={onPick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enter another value' }))
    const input = screen.getByLabelText('Freight Term')
    fireEvent.change(input, { target: { value: 'T' } })
    fireEvent.blur(input)
    expect(onPick).toHaveBeenCalledWith('T')
  })

  test('disabled renders inert chips', () => {
    render(<ConflictPicker label="Freight Term" options={options} value="P" onPick={() => {}} disabled />)
    expect(screen.getByRole('button', { name: 'Pre-Paid · lines 1, 2' }).hasAttribute('disabled')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Enter another value' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```jsx
import { useState } from 'react'
import { FormField, PillTab } from '@odyssey/ui'

const linesLabel = (lines) => (lines.length === 1 ? `line ${lines[0]}` : `lines ${lines.join(', ')}`)

/**
 * ConflictPicker — Step 1 (LINX-16049) cross-line conflict, one FIELD at a
 * time (Ramesh 2026-09-10: field by field, never whole blocks). The lines
 * disagree; the planner picks the value that applies to the whole order:
 * one PillTab chip per distinct value ("Pre-Paid · lines 1, 2"), plus
 * "Enter another value" which reveals a plain FormField. Controlled:
 * `value` + `onPick(value)`. `disabled` = read-only look-back from Step 2.
 */
export default function ConflictPicker({ id, label, message, options = [], value, onPick, disabled = false }) {
  const [otherOpen, setOtherOpen] = useState(false)
  const [otherValue, setOtherValue] = useState('')
  const picked = value != null && value !== ''
  const inputId = id ?? `conflict-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div className={`conflict-picker${picked ? ' conflict-picker--picked' : ''}`} role="group" aria-labelledby={`${inputId}-label`} id={inputId}>
      <span id={`${inputId}-label`} className="conflict-picker__label text-label-sm-medium">{label}</span>
      {!picked && message && <p className="conflict-picker__message text-label-xs-regular">{message}</p>}
      <div className="conflict-picker__chips">
        {options.filter((o) => o.lines.length > 0).map((o) => (
          <PillTab
            key={o.value}
            label={`${o.label ?? o.value} · ${linesLabel(o.lines)}`}
            showCount={false}
            selected={value === o.value}
            disabled={disabled}
            onClick={() => { setOtherOpen(false); onPick(o.value) }}
          />
        ))}
        {!disabled && (
          <PillTab label="Enter another value" showCount={false} selected={otherOpen} onClick={() => setOtherOpen((v) => !v)} />
        )}
      </div>
      {otherOpen && !disabled && (
        <FormField
          id={inputId + '-input'}
          label={label}
          value={otherValue}
          onChange={(e) => setOtherValue(e.target.value)}
          onBlur={() => { if (otherValue.trim()) onPick(otherValue.trim()) }}
          placeholder="Type the value for the whole order"
        />
      )}
      {picked && <p className="conflict-picker__validated text-label-xs-regular">Validated</p>}
    </div>
  )
}
```

(If `FormField` does not forward `onBlur` to its input, add `onBlur` to its `...rest` passthrough — check `packages/ui/src/FormField.jsx` `<input …{...rest}>`; if it already spreads rest onto the input, nothing to do. If `label` renders `<label htmlFor={id}>`, `getByLabelText` resolves; verify in the test.)

`create-order.css` — append:
```css
/* ── Step 1 (LINX-16049) — ConflictPicker ── */
.conflict-picker {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  border: 1px solid var(--border-error);
  border-radius: var(--radius-lg);
  background: var(--bg-primary);
}
.conflict-picker--picked { border-color: var(--border-success); }
.conflict-picker__label { color: var(--text-primary); }
.conflict-picker__message { color: var(--text-error); margin: 0; }
.conflict-picker__validated { color: var(--text-success); margin: 0; }
.conflict-picker__chips { display: flex; flex-wrap: wrap; gap: var(--spacing-2); }
```
(If `--border-error` / `--border-success` / `--text-success` don't exist in `packages/tokens/tokens.css`, use the ones FormField's error/validated states use — grep `.form-field--error` and `.form-field--validated` in `components.css` and reuse exactly those tokens. Never invent a token.)

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/components/orders/resolve/ConflictPicker.jsx src/components/orders/resolve/ConflictPicker.test.jsx src/components/orders/create/create-order.css
git commit -m "S145: ConflictPicker — per-field value chips for Step 1 cross-line conflicts"
```

---

### Task 5: `StructuralGrid`

**Files:**
- Create: `…/resolve/StructuralGrid.jsx`, `…/resolve/StructuralGrid.test.jsx`
- Modify: `create-order.css` (append)

- [ ] **Step 1: Failing test**

```jsx
// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import StructuralGrid from './StructuralGrid.jsx'

afterEach(cleanup)

const products = [
  { id: 'prod-1', productId: 'A', grossWeight: { value: '100', uom: 'lbs' }, volume: { value: '10', uom: 'cbf' }, schedules: [{ id: 'prod-1-sch-1' }, { id: 'prod-1-sch-2' }] },
  { id: 'prod-2', productId: 'B', grossWeight: { value: '200', uom: 'lbs' }, volume: { value: '20', uom: 'cbf' }, scheduleQuantity: { grossWeight: '250', volume: '20' } },
  { id: 'prod-3', productId: 'C', grossWeight: { value: '300', uom: 'lbs' }, volume: { value: '30', uom: 'cbf' }, scheduleTimezone: '' },
  { id: 'prod-4', productId: 'D', grossWeight: { value: '400', uom: 'lbs' }, volume: { value: '40', uom: 'cbf' } },
]
const structural = [
  { id: 's1', rule: 1, kind: 'extra-schedule', line: 1, field: 'Schedules per line', message: 'An order line can have only 1 schedule.' },
  { id: 's2', rule: 2, kind: 'quantity-mismatch', line: 2, field: 'Line vs schedule quantity', message: 'Line and Schedule mismatch.' },
  { id: 's3', rule: 4, kind: 'timezone-missing', line: 3, field: 'Requested Ship Time Zone', message: 'Requested Ship Time-Zone missing.' },
]

describe('StructuralGrid', () => {
  test('lists only the offending lines', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={() => {}} />)
    const rows = screen.getAllByRole('row').slice(1) // minus header
    expect(rows.length).toBe(3)
    expect(screen.queryByText('D')).toBeNull()
  })

  test('extra schedule: trash on the second schedule fires onFix(s1)', () => {
    const onFix = vi.fn()
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={onFix} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove schedule 2 on line 1' }))
    expect(onFix).toHaveBeenCalledWith('s1', { removeSchedule: 'prod-1-sch-2' })
  })

  test('quantity mismatch: editing the line weight to the schedule value fires onFix(s2)', () => {
    const onFix = vi.fn()
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={onFix} />)
    const input = screen.getByLabelText('Gross weight, line 2')
    fireEvent.change(input, { target: { value: '250' } })
    expect(onFix).toHaveBeenCalledWith('s2', { grossWeight: '250' })
  })

  test('timezone missing: picking a zone fires onFix(s3)', () => {
    const onFix = vi.fn()
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={onFix} />)
    fireEvent.change(screen.getByLabelText('Time zone, line 3'), { target: { value: 'CST' } })
    expect(onFix).toHaveBeenCalledWith('s3', { timezone: 'CST' })
  })

  test('a fixed row renders its Validated state and disables its control', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{ s2: { grossWeight: '250' }, s3: { timezone: 'CST' } }} onFix={() => {}} />)
    const row2 = screen.getByText('B').closest('tr')
    expect(within(row2).getByText('Validated')).toBeTruthy()
  })

  test('disabled renders every control inert', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={() => {}} disabled />)
    expect(screen.queryByRole('button', { name: /Remove schedule/ })).toBeNull()
    expect(screen.getByLabelText('Gross weight, line 2').hasAttribute('disabled')).toBe(true)
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — a plain `.odyssey-table` (the normalized cell contract, no TanStack: this grid is 1–5 rows and needs no sorting/resizing; `DataTable` requires a TanStack instance and would be ceremony here — ponytail).

```jsx
import { Trash2 } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Dropdown, FormField } from '@odyssey/ui'

const TIMEZONES = ['EST', 'CST', 'MST', 'PST'].map((z) => ({ value: z, label: z }))

/**
 * StructuralGrid — Step 1 (LINX-16049) faults INSIDE a line (rules 1, 2, 4).
 * Only the offending lines render (Level-1 review §2.1 "grouped by defect
 * class"); the faulty cell is the only editable thing on its row. The planner
 * fixes in place (Ramesh 2026-09-10 #6). Controlled via `fixes` {id → fix}
 * + `onFix(id, fix)`; `disabled` = read-only look-back.
 *   extra-schedule    → plain trash icon on every schedule beyond the first
 *   quantity-mismatch → line gross weight editable next to the schedule's value
 *   timezone-missing  → Dropdown of zones
 */
export default function StructuralGrid({ products = [], structural = [], fixes = {}, onFix, disabled = false }) {
  return (
    <div className="structural-grid">
      <table className="odyssey-table structural-grid__table">
        <thead>
          <tr>
            <th className="text-label-sm-semibold">Line</th>
            <th className="text-label-sm-semibold">Product</th>
            <th className="text-label-sm-semibold">Fault</th>
            <th className="text-label-sm-semibold">Fix</th>
          </tr>
        </thead>
        <tbody>
          {structural.map((s) => {
            const p = products[s.line - 1]
            if (!p) return null
            const fixed = fixes[s.id] != null
            return (
              <tr key={s.id} className={fixed ? 'structural-grid__row--fixed' : 'structural-grid__row--error'}>
                <td>{s.line}</td>
                <td className="odyssey-table__cell--title text-label-sm-medium">{p.productId}</td>
                <td>
                  <div className="text-label-sm-medium">{s.field}</div>
                  <div className="structural-grid__message text-label-xs-regular">{s.message}</div>
                </td>
                <td>
                  {s.kind === 'extra-schedule' && (
                    <ul className="structural-grid__schedules">
                      {(p.schedules ?? []).map((sch, i) => (
                        <li key={sch.id}>
                          Schedule {i + 1}
                          {i > 0 && !disabled && !fixed && (
                            <button
                              type="button"
                              className="structural-grid__trash"
                              aria-label={`Remove schedule ${i + 1} on line ${s.line}`}
                              onClick={() => onFix(s.id, { removeSchedule: sch.id })}
                            >
                              <Trash2 {...ICON_MD} />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.kind === 'quantity-mismatch' && (
                    <div className="structural-grid__pair">
                      <FormField
                        label={`Gross weight, line ${s.line}`}
                        showLabel={false}
                        aria-label={`Gross weight, line ${s.line}`}
                        value={fixes[s.id]?.grossWeight ?? p.grossWeight?.value ?? ''}
                        onChange={(e) => onFix(s.id, { grossWeight: e.target.value })}
                        disabled={disabled}
                        validated={fixed}
                      />
                      <span className="text-label-xs-regular structural-grid__hint">schedule says {p.scheduleQuantity?.grossWeight} {p.grossWeight?.uom}</span>
                    </div>
                  )}
                  {s.kind === 'timezone-missing' && (
                    <select
                      aria-label={`Time zone, line ${s.line}`}
                      className="structural-grid__select"
                      value={fixes[s.id]?.timezone ?? ''}
                      onChange={(e) => onFix(s.id, { timezone: e.target.value })}
                      disabled={disabled}
                    >
                      <option value="">Pick a time zone</option>
                      {TIMEZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                    </select>
                  )}
                  {fixed && <p className="structural-grid__validated text-label-xs-regular">Validated</p>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```
(`quantity-mismatch` is "fixed" when the entered weight equals the schedule's — enforce that in `Step1Panel`'s `onFix` handler (Task 7), not here; the grid just reports edits. The native `<select>` for the time zone is a deliberate ponytail shortcut — `Dropdown` needs an anchored portal and jsdom can't drive it; swap when the VD lands. Remove the unused `Dropdown` import.)

`create-order.css` — append:
```css
/* ── Step 1 — StructuralGrid ── */
.structural-grid__table { width: 100%; }
.structural-grid__row--error td:first-child { box-shadow: inset 3px 0 0 var(--bittersweet-600); }
.structural-grid__row--fixed td:first-child { box-shadow: inset 3px 0 0 var(--caribbean-green-600); }
.structural-grid__message { color: var(--text-error); }
.structural-grid__validated { color: var(--caribbean-green-600); margin: var(--spacing-1) 0 0; }
.structural-grid__schedules { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--spacing-1); }
.structural-grid__schedules li { display: flex; align-items: center; gap: var(--spacing-2); }
.structural-grid__trash { background: none; border: none; padding: 0; color: var(--text-tertiary); cursor: pointer; display: inline-flex; }
.structural-grid__trash:hover { color: var(--text-error); }
.structural-grid__pair { display: flex; flex-direction: column; gap: var(--spacing-1); max-width: 220px; }
.structural-grid__hint { color: var(--text-tertiary); }
.structural-grid__select { font: inherit; padding: var(--spacing-2) var(--spacing-3); border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-primary); }
```

- [ ] **Step 4: Run → PASS.** (If `FormField` doesn't accept `aria-label` passthrough, wrap it: `<span aria-label>` won't work for `getByLabelText` on an input — instead pass `id` and add a visually-hidden `<label htmlFor>`; simplest is to keep `showLabel` true and `label={`Gross weight, line N`}` and drop the `aria-label` prop.)

- [ ] **Step 5: Commit**

```bash
git add src/components/orders/resolve/StructuralGrid.jsx src/components/orders/resolve/StructuralGrid.test.jsx src/components/orders/create/create-order.css
git commit -m "S145: StructuralGrid — offending-lines grid for Step 1 rules 1/2/4"
```

---

### Task 6: `MessageControlBlock`

**Files:**
- Create: `…/resolve/MessageControlBlock.jsx`, `…/resolve/MessageControlBlock.test.jsx`
- Modify: `create-order.css` (append)

- [ ] **Step 1: Failing test**

```jsx
// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import MessageControlBlock from './MessageControlBlock.jsx'

afterEach(cleanup)
const rows = [
  { id: 'm1', rule: 10, editable: true, fieldTree: 'orderInterface.deleteFlag', field: 'deleteFlag', message: 'Incorrect Delete Flag Value.' },
  { id: 'm2', rule: 9, editable: false, fieldTree: 'orderInterface.sourceSystem', field: 'sourceSystem', message: 'Incorrect Source System.' },
]

describe('MessageControlBlock', () => {
  test('deleteFlag renders a Yes/No radio pair; picking fires onDeleteFlag', () => {
    const onDeleteFlag = vi.fn()
    render(<MessageControlBlock rows={[rows[0]]} deleteFlag={null} onDeleteFlag={onDeleteFlag} />)
    fireEvent.click(screen.getByLabelText('No — create'))
    expect(onDeleteFlag).toHaveBeenCalledWith('N')
  })

  test('non-editable rows show fieldTree, message and the support line; no controls', () => {
    render(<MessageControlBlock rows={[rows[1]]} deleteFlag={null} onDeleteFlag={() => {}} />)
    expect(screen.getByText('orderInterface.sourceSystem')).toBeTruthy()
    expect(screen.getByText('Incorrect Source System.')).toBeTruthy()
    expect(screen.getByText('Message rejected by the integration — contact support.')).toBeTruthy()
    expect(screen.queryByRole('radio')).toBeNull()
  })

  test('disabled renders the picked flag read-only', () => {
    render(<MessageControlBlock rows={[rows[0]]} deleteFlag="Y" onDeleteFlag={() => {}} disabled />)
    const yes = screen.getByLabelText('Yes — cancel')
    expect(yes.checked).toBe(true)
    expect(yes.hasAttribute('disabled')).toBe(true)
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```jsx
import { Radio } from '@odyssey/ui'

/**
 * MessageControlBlock — Step 1 (LINX-16049) rules 8–11: provenance fields of
 * the incoming message. Only deleteFlag is user-settable (Ramesh 2026-09-10
 * #1: "the user can only write boolean, yes or no") — a wrong delete flag
 * can turn a customer cancellation into a new order, so it is a deliberate
 * Yes/No choice, never free text. sourceSystem / modifyTimestamp /
 * relySourceId are displayed with the backend message and NO action: the
 * exit for those is a backend decision (open question, Venkat).
 */
export default function MessageControlBlock({ rows = [], deleteFlag, onDeleteFlag, disabled = false }) {
  return (
    <div className="message-control">
      {rows.map((r) => (
        <div key={r.id} className={`message-control__row${r.editable ? '' : ' message-control__row--locked'}`}>
          <code className="message-control__tree text-label-xs-regular">{r.fieldTree}</code>
          <span className="message-control__message text-label-sm-regular">{r.message}</span>
          {r.editable ? (
            <div className="message-control__choice" role="radiogroup" aria-label="Delete flag">
              <Radio name={`delete-flag-${r.id}`} value="N" label="No — create" checked={deleteFlag === 'N'} disabled={disabled} onChange={() => onDeleteFlag('N')} />
              <Radio name={`delete-flag-${r.id}`} value="Y" label="Yes — cancel" checked={deleteFlag === 'Y'} disabled={disabled} onChange={() => onDeleteFlag('Y')} />
            </div>
          ) : (
            <span className="message-control__support text-label-xs-regular">Message rejected by the integration — contact support.</span>
          )}
        </div>
      ))}
    </div>
  )
}
```

`create-order.css` — append:
```css
/* ── Step 1 — MessageControlBlock ── */
.message-control { display: flex; flex-direction: column; gap: var(--spacing-2); }
.message-control__row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto; gap: var(--spacing-4); align-items: center; padding: var(--spacing-3) var(--spacing-4); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background: var(--bg-primary); }
.message-control__row--locked { background: var(--bg-secondary); }
.message-control__tree { color: var(--text-tertiary); }
.message-control__message { color: var(--text-error); }
.message-control__choice { display: flex; gap: var(--spacing-4); }
.message-control__support { color: var(--text-tertiary); }
```

- [ ] **Step 4: Run → PASS.** (Check `Radio` renders `label` inside `<label>` so `getByLabelText` works — it does: `Radio.jsx` wraps the input in `<label className="control …">`.)

- [ ] **Step 5: Commit**

```bash
git add src/components/orders/resolve/MessageControlBlock.jsx src/components/orders/resolve/MessageControlBlock.test.jsx src/components/orders/create/create-order.css
git commit -m "S145: MessageControlBlock — deleteFlag Yes/No, other provenance fields read-only"
```

---

### Task 7: `Step1Panel`

**Files:**
- Create: `…/resolve/Step1Panel.jsx`, `…/resolve/Step1Panel.test.jsx`
- Modify: `create-order.css` (append)

- [ ] **Step 1: Failing test**

```jsx
// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import Step1Panel from './Step1Panel.jsx'
import { deriveInterfaceErrors } from './interfaceErrors'

afterEach(cleanup)

const base = () => ({
  general: { freightTerm: 'P', equipment: 'RR' },
  pickupDelivery: {
    planningDateType: 'SHIP',
    consignor: { address1: '9507 Lynch Junction', city: 'Odessa', state: 'TX', postal: '79761' },
    consignee: { address1: '4304 Predovic Ramp', city: 'Lake Charles', state: 'LA', postal: '70601' },
    earlyPickup: { date: '2026-05-17', time: '09:00', timezone: 'CDT' }, latePickup: { date: '2026-05-17', time: '11:00', timezone: 'CDT' },
    earlyDelivery: { date: '2026-05-24', time: '08:30', timezone: 'CDT' }, lateDelivery: { date: '2026-05-24', time: '11:00', timezone: 'CDT' },
  },
  products: [
    { id: 'prod-1', productId: 'A', grossWeight: { value: '100', uom: 'lbs' }, volume: { value: '10', uom: 'cbf' } },
    { id: 'prod-2', productId: 'B', grossWeight: { value: '200', uom: 'lbs' }, volume: { value: '20', uom: 'cbf' } },
  ],
})

function setup(klass, count, extra = {}) {
  const derived = deriveInterfaceErrors('ORDER-1', count, klass, base())
  const draft = derived.applyErrors(base())
  const onValidate = vi.fn()
  const onCancel = vi.fn()
  const utils = render(<Step1Panel orderNumber="ORDER-1" contextText="ORDER-1 · Integrated from ACME" derived={derived} draft={draft} onValidate={onValidate} onCancel={onCancel} {...extra} />)
  return { ...utils, derived, draft, onValidate, onCancel }
}

describe('Step1Panel', () => {
  test('conflicts: alert counts them, picking every field enables Validate and continue', () => {
    const { derived, onValidate } = setup('conflict', 2)
    const n = derived.errors.length
    expect(screen.getByText(`${n} Errors: Validation Required - ORDER-1 · Integrated from ACME`)).toBeTruthy()
    const validate = screen.getByRole('button', { name: 'Validate and continue' })
    expect(validate.hasAttribute('disabled')).toBe(true)
    for (const [, options] of derived.conflicts) {
      const o = options.find((x) => x.lines.length > 0)
      const label = `${o.label ?? o.value} · ${o.lines.length === 1 ? `line ${o.lines[0]}` : `lines ${o.lines.join(', ')}`}`
      fireEvent.click(screen.getByRole('button', { name: label }))
    }
    expect(screen.getByRole('button', { name: 'Validate and continue' }).hasAttribute('disabled')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Validate and continue' }))
    expect(onValidate).toHaveBeenCalledTimes(1)
    const [{ picks, structuralFixes }] = onValidate.mock.calls[0]
    expect(Object.keys(picks).length).toBe(derived.conflicts.size)
    expect(structuralFixes).toEqual({})
  })

  test('unresolvable message-control error keeps Validate disabled and shows the support line', () => {
    setup('unresolvable', 1)
    expect(screen.getByText('Message rejected by the integration — contact support.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Validate and continue' }).hasAttribute('disabled')).toBe(true)
  })

  test('delete-flag: choosing No resolves it', () => {
    setup('delete-flag', 1)
    fireEvent.click(screen.getByLabelText('No — create'))
    expect(screen.getByRole('button', { name: 'Validate and continue' }).hasAttribute('disabled')).toBe(false)
  })

  test('Received order data accordion lists the header fields read-only', () => {
    setup('conflict', 1)
    const acc = screen.getByText('Received order data').closest('.accordion')
    fireEvent.click(within(acc).getByRole('button', { name: /Received order data/ }))
    expect(within(acc).getByText('Equipment')).toBeTruthy()
    expect(within(acc).getByText('RR')).toBeTruthy()
  })

  test('no Purge button on Step 1; Cancel fires onCancel', () => {
    const { onCancel } = setup('conflict', 1)
    expect(screen.queryByRole('button', { name: 'Purge' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  test('readOnly: pickers inert, no footer, picks shown', () => {
    const derived = deriveInterfaceErrors('ORDER-1', 1, 'conflict', base())
    const [path] = [...derived.conflicts.keys()]
    render(<Step1Panel orderNumber="ORDER-1" derived={derived} draft={derived.applyErrors(base())} readOnly picks={{ [path]: derived.conflicts.get(path)[0].value }} />)
    expect(screen.queryByRole('button', { name: 'Validate and continue' })).toBeNull()
    expect(screen.getByText('Validated')).toBeTruthy()
  })

  test('empty: no errors → empty state, no footer', () => {
    const derived = deriveInterfaceErrors('ORDER-1', 0, null, base())
    render(<Step1Panel orderNumber="ORDER-1" derived={derived} draft={base()} readOnly />)
    expect(screen.getByText('No message errors were found for this order.')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```jsx
import { useMemo, useState } from 'react'
import { Accordion, Alert, EmptyState } from '@odyssey/ui'
import { CircleCheck } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import ConflictPicker from './ConflictPicker.jsx'
import StructuralGrid from './StructuralGrid.jsx'
import MessageControlBlock from './MessageControlBlock.jsx'
import StickyFooter from '../create/StickyFooter.jsx'
import { FREIGHT_TERMS, freightTermLabel } from '../../../data/master-data'

const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
const optionLabel = (path, value) => (path === 'general.freightTerm' ? (freightTermLabel?.(value) ?? value) : value)

// Header fields shown in the read-only "Received order data" accordion.
const RECEIVED_FIELDS = [
  ['Equipment', 'general.equipment'], ['Freight Term', 'general.freightTerm'], ['Ship Direction', 'general.shipDirection'],
  ['Planning Date Type', 'pickupDelivery.planningDateType'],
  ['Shipper', 'pickupDelivery.consignor.idOrgName'], ['Shipper City', 'pickupDelivery.consignor.city'], ['Shipper Postal Code', 'pickupDelivery.consignor.postal'],
  ['Consignee', 'pickupDelivery.consignee.idOrgName'], ['Consignee City', 'pickupDelivery.consignee.city'], ['Consignee Postal Code', 'pickupDelivery.consignee.postal'],
  ['Requested Ship Date', 'pickupDelivery.latePickup.date'], ['Latest Delivery Date', 'pickupDelivery.lateDelivery.date'],
]

/**
 * Step1Panel — Order Interface Errors (LINX-16049). Its OWN layout, not the
 * create form (Dave via Ramesh 2026-09-10: structural errors "cannot be put
 * into any one of these sections"). Three class accordions + a read-only
 * "Received order data" accordion so every field the customer sent stays
 * visible (16049 AC "show all fields"). The Alert at the top lists every
 * Step 1 error; a row click scrolls to that error's control.
 *
 * Controlled by the shell: `derived` (deriveInterfaceErrors result), `draft`
 * (applyErrors output), `onValidate({ picks, structuralFixes, deleteFlag })`,
 * `onCancel`. `readOnly` + `picks` = the look-back from Step 2/3.
 */
export default function Step1Panel({ orderNumber, contextText, derived, draft, readOnly = false, picks: pickedProp = {}, onValidate, onCancel }) {
  const [picks, setPicks] = useState(pickedProp)
  const [structuralFixes, setStructuralFixes] = useState({})
  const [deleteFlag, setDeleteFlag] = useState(null)
  const [errorIndex, setErrorIndex] = useState(0)
  const [expanded, setExpanded] = useState({ conflicts: true, structural: true, control: true, received: false })

  const conflictPaths = useMemo(() => [...derived.conflicts.keys()], [derived])
  // quantity-mismatch counts as fixed only when the entered weight equals the schedule's.
  const structuralFixed = useMemo(() => {
    const set = new Set()
    for (const s of derived.structural) {
      const fix = structuralFixes[s.id]
      if (!fix) continue
      if (s.kind === 'quantity-mismatch') {
        const p = draft.products?.[s.line - 1]
        if (fix.grossWeight === p?.scheduleQuantity?.grossWeight) set.add(s.id)
      } else set.add(s.id)
    }
    return set
  }, [derived, structuralFixes, draft])
  const state = { picks, structuralFixed, deleteFlag }
  const resolvedIds = new Set(derived.errors.filter((e) => derived.isResolved(e, state)).map((e) => e.id))
  const hasUnresolvable = derived.messageControl.some((m) => !m.editable)
  const allResolved = derived.errors.every((e) => resolvedIds.has(e.id)) && !hasUnresolvable

  const alertErrors = derived.errors.map((e) => ({ field: e.field, reason: e.message, resolved: resolvedIds.has(e.id) }))
  const openCount = (cls) => derived.errors.filter((e) => e.class === cls && !resolvedIds.has(e.id)).length
  const totalCount = (cls) => derived.errors.filter((e) => e.class === cls).length
  const status = (cls) => (totalCount(cls) === 0 ? 'off' : openCount(cls) > 0 ? 'error' : 'on')

  const handleErrorNav = (i) => {
    const err = derived.errors[i]
    if (!err) return
    setErrorIndex(i)
    const key = err.class === 'conflict' ? 'conflicts' : err.class === 'structural' ? 'structural' : 'control'
    setExpanded((prev) => ({ ...prev, [key]: true }))
    requestAnimationFrame(() => document.getElementById(`l1-${err.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  if (derived.errors.length === 0) {
    return (
      <div className="step1-panel">
        <EmptyState icon={<CircleCheck {...ICON_LG} />} message="No message errors were found for this order." />
        <ReceivedData draft={draft} expanded={expanded.received} onToggle={(v) => setExpanded((p) => ({ ...p, received: v }))} />
      </div>
    )
  }

  return (
    <div className="step1-panel">
      {!readOnly && (
        <Alert errors={alertErrors} contextText={contextText} defaultExpanded errorIndex={errorIndex} onErrorNav={handleErrorNav} />
      )}
      {derived.messageControl.length > 0 && (
        <Accordion position="start" status={status('message-control')} errorCount={openCount('message-control')} title="Message control" description="Provenance of the message. Only the create/cancel flag can be set here." expanded={expanded.control} onToggle={(v) => setExpanded((p) => ({ ...p, control: v }))}>
          <div id={`l1-${derived.messageControl[0].id}`}>
            <MessageControlBlock rows={derived.messageControl} deleteFlag={deleteFlag} onDeleteFlag={setDeleteFlag} disabled={readOnly} />
          </div>
        </Accordion>
      )}
      {conflictPaths.length > 0 && (
        <Accordion position="mid" status={status('conflict')} errorCount={openCount('conflict')} title="Cross-line conflicts" description="Lines disagree. Pick the value that applies to the whole order." expanded={expanded.conflicts} onToggle={(v) => setExpanded((p) => ({ ...p, conflicts: v }))}>
          <div className="step1-panel__list">
            {derived.errors.filter((e) => e.class === 'conflict').map((e) => (
              <ConflictPicker
                key={e.id}
                id={`l1-${e.id}`}
                label={e.field}
                message={e.message}
                options={derived.conflicts.get(e.path).map((o) => ({ ...o, label: optionLabel(e.path, o.value) }))}
                value={picks[e.path] ?? null}
                onPick={(v) => setPicks((p) => ({ ...p, [e.path]: v }))}
                disabled={readOnly}
              />
            ))}
          </div>
        </Accordion>
      )}
      {derived.structural.length > 0 && (
        <Accordion position="mid" status={status('structural')} errorCount={openCount('structural')} title="Structural" description="A fault inside a line. Fix it in place." expanded={expanded.structural} onToggle={(v) => setExpanded((p) => ({ ...p, structural: v }))}>
          <div id={`l1-${derived.structural[0].id}`}>
            <StructuralGrid products={draft.products ?? []} structural={derived.structural} fixes={structuralFixes} onFix={(id, fix) => setStructuralFixes((f) => ({ ...f, [id]: { ...f[id], ...fix } }))} disabled={readOnly} />
          </div>
        </Accordion>
      )}
      <ReceivedData draft={draft} expanded={expanded.received} onToggle={(v) => setExpanded((p) => ({ ...p, received: v }))} />
      {!readOnly && (
        <StickyFooter
          onCancel={onCancel}
          onCreate={() => onValidate({ picks, structuralFixes, deleteFlag })}
          primaryLabel="Validate and continue"
          createDisabled={!allResolved}
        />
      )}
    </div>
  )
}

function ReceivedData({ draft, expanded, onToggle }) {
  return (
    <Accordion position="end" status="off" title="Received order data" description="Everything the customer system sent, as received." expanded={expanded} onToggle={onToggle}>
      <dl className="step1-panel__received">
        {RECEIVED_FIELDS.map(([label, path]) => {
          const v = getPath(draft, path)
          const perLine = draft.lineValues?.[path]
          return (
            <div key={path} className="step1-panel__received-row">
              <dt className="text-label-xs-regular">{label}</dt>
              <dd className="text-label-sm-regular">{perLine ? perLine.map((x, i) => `line ${i + 1}: ${x}`).join(' · ') : (v || '—')}</dd>
            </div>
          )
        })}
      </dl>
    </Accordion>
  )
}
```

Notes for the implementer: check `StickyFooter` — it always renders the middle "save" button via `showSave`; add a `showSave` passthrough (default `true`) so Step 1 can pass `showSave={false}` and get exactly `Cancel · Validate and continue`. Check `StepperButtonsFooter` already supports `showSave` (it's passed as a literal `showSave` at `StickyFooter.jsx:18`). Verify `freightTermLabel` exists in `src/data/master-data.js` (it's re-exported from `tools/data-pools.mjs`, line 9); if the signature differs, adapt `optionLabel`.

`create-order.css` — append:
```css
/* ── Step 1 panel ── */
.step1-panel { display: flex; flex-direction: column; gap: var(--spacing-4); }
.step1-panel__list { display: flex; flex-direction: column; gap: var(--spacing-3); }
.step1-panel__received { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--spacing-3) var(--spacing-6); margin: 0; }
.step1-panel__received-row dt { color: var(--text-tertiary); }
.step1-panel__received-row dd { margin: 0; color: var(--text-primary); }
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/components/orders/resolve/Step1Panel.jsx src/components/orders/resolve/Step1Panel.test.jsx src/components/orders/create/create-order.css src/components/orders/create/StickyFooter.jsx
git commit -m "S145: Step1Panel — conflicts / structural / message-control accordions + received data, Validate and continue"
```

---

### Task 8: Service writes — `saveInterfaceFixes`, `resolveOrder` → Complete, `purgeOrder`

**Files:**
- Modify: `apps/odyssey-one/src/api/services/orderService.ts:466-483`
- Modify: `apps/odyssey-one/src/api/services/orderService.test.ts` (add a describe)

- [ ] **Step 1: Failing test** — append to `orderService.test.ts` (reuse its existing imports/reset helpers; it already imports `getOrderList`, `__resetOrderWriteState`):

```ts
describe('OIF writes (LINX-16391 vocabulary)', () => {
  beforeEach(() => __resetOrderWriteState())

  async function firstVeRow(pred: (r: any) => boolean) {
    const res = await getOrderList({ pagination: { pageNumber: 1, pageSize: 500 }, tab: 'validation-errors', filters: {} } as any)
    const row = res.orders.find(pred)
    if (!row) throw new Error('no fixture row matches')
    return row
  }

  test('saveInterfaceFixes zeroes interfaceErrorCount, keeps Error, and persists the values for the reopen', async () => {
    const row = await firstVeRow((r) => (r.interfaceErrorCount ?? 0) > 0)
    const values = await getOrderView(row.orderNumber)
    values!.general.freightTerm = 'C'
    await saveInterfaceFixes(row.orderNumber, values!)
    const after = await firstVeRow((r) => r.orderNumber === row.orderNumber)
    expect(after.interfaceErrorCount).toBe(0)
    expect(after.draftOrderStatus).toBe('Error')
    expect((await getOrderView(row.orderNumber))!.general.freightTerm).toBe('C')
  })

  test('resolveOrder → Complete + Ready for Planning, row leaves the VE tab', async () => {
    const row = await firstVeRow(() => true)
    await resolveOrder(row.orderNumber)
    const ve = await getOrderList({ pagination: { pageNumber: 1, pageSize: 500 }, tab: 'validation-errors', filters: {} } as any)
    expect(ve.orders.find((r) => r.orderNumber === row.orderNumber)).toBeUndefined()
    const created = await getOrderList({ pagination: { pageNumber: 1, pageSize: 500 }, tab: 'created', filters: { orderNumbers: [row.orderNumber] } } as any)
    expect(created.orders[0]?.orderStatus).toBe('Ready for Planning')
  })

  test('purgeOrder → row leaves the VE tab and is not in Created', async () => {
    const row = await firstVeRow(() => true)
    await purgeOrder(row.orderNumber)
    const ve = await getOrderList({ pagination: { pageNumber: 1, pageSize: 500 }, tab: 'validation-errors', filters: {} } as any)
    expect(ve.orders.find((r) => r.orderNumber === row.orderNumber)).toBeUndefined()
    const created = await getOrderList({ pagination: { pageNumber: 1, pageSize: 500 }, tab: 'created', filters: { orderNumbers: [row.orderNumber] } } as any)
    expect(created.orders.length).toBe(0)
  })
})
```
Add `getOrderView, saveInterfaceFixes, resolveOrder, purgeOrder` to the test file's import from `./orderService`. Check the file's existing `getOrderList` call shape (`tab` key, `filters`) and mirror it exactly.

- [ ] **Step 2: Run → FAIL** (`npx vitest run src/api/services/orderService.test.ts`).

- [ ] **Step 3: Implement** — replace `resolveOrder` (`:466-477`) with:

```ts
/**
 * OIF Step 1 save (LINX-16049 + Ramesh 2026-09-10 #2 "right away"): the
 * planner's picks/structural fixes are written when they press Validate and
 * continue — NOT at the final Save — so Back to overview keeps them and a
 * re-entry opens at Step 2. Mock: same value store updateOrder uses (so
 * getOrderView returns the fixed values at full fidelity) + interfaceErrorCount
 * → 0; the OIF status stays 'Error' until Step 2 is clean. Live: the existing
 * PUT (there is no dedicated Step 1 endpoint yet — open question, Venkat);
 * interface_error_count is not a Neon column, so live re-entry still opens at
 * Step 2 only because the live row never carried a count.
 */
export async function saveInterfaceFixes(orderNumber: string, values: OrderFormValues): Promise<void> {
  await updateOrder(orderNumber, values)
  if (getApiMode() !== 'live') {
    const row = overlayRows.find(r => r.orderNumber === orderNumber)
    if (row) { row.interfaceErrorCount = 0; row.interfaceErrorClass = null; row.draftOrderStatus = 'Error' }
  }
}

/**
 * OIF Step 2 Save with every error resolved (LINX-11137 §D): OIF status →
 * 'Complete' AND lifecycle → 'Ready for Planning' (the order now exists in
 * the Order Table). The row leaves the Validation Errors population (Ramesh
 * 2026-09-10 #3): draftOrderStatus IS that population's predicate, so it is
 * cleared here — 'Complete' is recorded on the overlay row for the audit
 * column but the VE predicate no longer matches. Live: the shared status
 * PATCH (no OIF column write yet — known gap).
 */
export async function resolveOrder(orderNumber: string): Promise<void> {
  if (getApiMode() === 'live') return patchOrderStatus(orderNumber, 'Ready for Planning')
  overlayUpdateStatus(orderNumber, 'Ready for Planning', { draftOrderStatus: undefined, errorCount: undefined, interfaceErrorCount: undefined, interfaceErrorClass: null, oifStatus: 'Complete' } as Partial<OrderListRow>)
}

/**
 * OIF Purge (LINX-11137 §D, Step 2 only — Ramesh #6): the order leaves the
 * validation queue and does NOT enter the lifecycle. Mock: VE marker cleared
 * and orderStatus set to 'Purged' — a label no tab predicate matches, so the
 * row is on neither tab. Live: no write path exists for a purge yet (the
 * status PATCH whitelist is Ready for Planning / Cancelled) — mirrors the
 * mock's outcome by cancelling, tracked as a gap.
 */
export async function purgeOrder(orderNumber: string): Promise<void> {
  if (getApiMode() === 'live') return patchOrderStatus(orderNumber, 'Cancelled')
  overlayUpdateStatus(orderNumber, 'Purged', { draftOrderStatus: undefined, errorCount: undefined, interfaceErrorCount: undefined, interfaceErrorClass: null, oifStatus: 'Purge' } as Partial<OrderListRow>)
}
```
Add `oifStatus?: 'Complete' | 'Purge'` to `OrderListRow` in `orderList.ts` (comment: "written by the UI after resolution; not a tab predicate"). Check the mock Created-tab predicate: it must NOT admit `orderStatus === 'Purged'` — read `getOrderList`'s population predicates (~`orderService.ts:308+`) and the test above will tell you.

- [ ] **Step 4: Run → PASS**, then `npx vitest run src/api` → green.

- [ ] **Step 5: Commit**

```bash
git add src/api/services/orderService.ts src/api/services/orderService.test.ts src/api/types/orderList.ts
git commit -m "S145: saveInterfaceFixes (Step 1 saves on Validate), resolveOrder → Complete, purgeOrder"
```

---

### Task 9: `CreateOrderForm` — `hideHeader`, Step 1 pick exclusion, Purge → `purgeOrder`

**Files:**
- Modify: `…/resolve/validationErrors.js:62-70` (`excludePaths`), `…/resolve/validationErrors.test.js`
- Modify: `…/create/CreateOrderForm.jsx:45` (props), `:143-146` (derive call), `:428-438` (exit paths), `:530-546` (header), `:664-672` (footer)

- [ ] **Step 1: Failing test** — append to `validationErrors.test.js`:

```js
test('excludePaths removes those pool entries (Step 1 picks must not be re-broken by Level 2 seeding)', () => {
  const excluded = ['general.freightTerm', 'pickupDelivery.consignor.city']
  const { errors } = deriveValidationErrors('0000000091002', 15, {}, { excludePaths: excluded })
  expect(errors.length).toBe(13)
  expect(errors.some((e) => excluded.includes(e.path))).toBe(false)
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

`validationErrors.js:62`: `export function deriveValidationErrors(orderNumber, errorCount, values, { excludePaths = [] } = {})` and right after `const rand = …`:
```js
  const pool = RESOLVE_POOL.filter((p) => !excludePaths.includes(p.path))
```
then use `pool` instead of `RESOLVE_POOL` in the clamp (`pool.length`), the index map, and `pool[i]`.

`CreateOrderForm.jsx`:
- `:45` → `export default function CreateOrderForm({ draftKey, resolveKey, resolveMeta, onSubmitted, hideHeader = false, pickedPaths = [], onResolved, onPurged })`
- `:145` → `const { errors, applyErrors, isResolved } = deriveValidationErrors(resolveKey, errorCount, values, { excludePaths: pickedPaths })`
- Replace `finishResolve` (`:431-438`) with:
```js
  // Resolution exits (LINX-11137 §D). Save (all resolved) → Complete; Purge →
  // Purge. Both drop the row out of the Validation Errors tab. The shell
  // decides where to go next (Step 3 preview / back to the list).
  const finishResolve = useCallback(async (kind) => {
    try { await (kind === 'purge' ? purgeOrder(resolveKey) : resolveOrder(resolveKey)) } catch (e) { console.error(e); return }
    queryClient.invalidateQueries({ queryKey: ['order-list'] })
    queryClient.invalidateQueries({ queryKey: ['order-tab-counts'] })
    if (kind === 'purge') { onPurged ? onPurged() : navigate('/orders'); return }
    onResolved ? onResolved(getValues()) : navigate('/orders')
  }, [resolveKey, queryClient, navigate, onResolved, onPurged, getValues])
```
  Import `purgeOrder` from the service (`:13`).
- Footer `:664-672`: `onSave={() => setPurgeOpen(true)}` stays; `onCreate={() => finishResolve('save')}`; the Purge modal's Yes → `finishResolve('purge')`.
- Header `:532-546`: wrap the resolve-mode `<PageHeader …>` + sub-heading in `{!hideHeader && (…)}`. Keep the breadcrumb.
- Picked fields render validated: in `ResolveModeContext.jsx` `resolveFieldProps`, add before `const err = …`:
```js
  if (ctx.pickedPaths?.has(path)) return { validated: !fieldError, error: fieldError, disabled: true }
```
  and in `CreateOrderForm.jsx:194-196` build the ctx as `{ errorByPath, resolvedSet, pickedPaths: new Set(pickedPaths) }`.

- [ ] **Step 4: Run** `npx vitest run src/components/orders/resolve src/components/orders/create` → green (existing resolve tests unchanged: no `hideHeader`, no picks).

- [ ] **Step 5: Commit**

```bash
git add src/components/orders/resolve/validationErrors.js src/components/orders/resolve/validationErrors.test.js src/components/orders/resolve/ResolveModeContext.jsx src/components/orders/create/CreateOrderForm.jsx
git commit -m "S145: CreateOrderForm resolve mode — hideHeader, pickedPaths validated, Level 2 pool excludes Step 1 picks, Purge → purgeOrder"
```

---

### Task 10: `ResolveShell` + route wiring + Step 3

**Files:**
- Create: `…/resolve/ResolveShell.jsx`
- Modify: `apps/odyssey-one/src/routes/orders/CreateOrderRoute.jsx`
- Modify: `…/resolve/resolve.test.jsx` (new describe blocks)
- Modify: `create-order.css` (append)

- [ ] **Step 1: Failing tests** — append to `resolve.test.jsx` (reuse `renderResolve`; the fixture picks below mirror the existing `ORDER` derivation):

```jsx
import { deriveInterfaceErrors } from './interfaceErrors'

const findOrder = (pred) => {
  const rows = Array.isArray(ordersFixture) ? ordersFixture : (ordersFixture.orders ?? [])
  const hit = rows.find(pred)
  if (!hit) throw new Error('No seeded order matches — regenerate the fixtures.')
  return hit
}
const L1_CONFLICT = findOrder((r) => r.draftOrderStatus === 'Error' && r.interfaceErrorClass === 'conflict' && r.interfaceErrorCount === 1 && r.errorCount <= 3)
const L1_UNRESOLVABLE = findOrder((r) => r.draftOrderStatus === 'Error' && r.interfaceErrorClass === 'unresolvable')
const NO_L1 = findOrder((r) => r.draftOrderStatus === 'Error' && r.interfaceErrorCount === 0)
const stateFor = (r) => ({ errorCount: r.errorCount, interfaceErrorCount: r.interfaceErrorCount, interfaceErrorClass: r.interfaceErrorClass, customer: 'ACME', orderSource: 'Integrated' })

describe('two-step resolution (LINX-16049 + 11137)', () => {
  test('order with Level 1 errors opens at Step 1; dot 2 is locked', async () => {
    renderResolve(L1_CONFLICT.orderNumber, stateFor(L1_CONFLICT))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Validate and continue' })).toBeTruthy())
    const list = screen.getByRole('list', { name: 'Resolution progress' })
    const dot2 = within(list).getByText('Data errors').closest('.resolve-timeline__step')
    expect(dot2.className).toContain('resolve-timeline__step--locked')
    expect(within(list).getByText('locked')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Purge' })).toBeNull()
  })

  test('no Level 1 errors → opens at Step 2 with dot 1 passed; clicking dot 1 shows the empty Step 1 read-only', async () => {
    renderResolve(NO_L1.orderNumber, stateFor(NO_L1))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy())
    const list = screen.getByRole('list', { name: 'Resolution progress' })
    expect(within(list).getByText('no errors')).toBeTruthy()
    fireEvent.click(within(list).getByRole('button', { name: /Message errors/ }))
    expect(screen.getByText('No message errors were found for this order.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Validate and continue' })).toBeNull()
  })

  test('unresolvable message-control error keeps Validate disabled', async () => {
    renderResolve(L1_UNRESOLVABLE.orderNumber, stateFor(L1_UNRESOLVABLE))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Validate and continue' })).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Validate and continue' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('Message rejected by the integration — contact support.')).toBeTruthy()
  })

  test('pick → Validate and continue → Step 2 with the picked field validated; re-entry opens at Step 2', async () => {
    renderResolve(L1_CONFLICT.orderNumber, stateFor(L1_CONFLICT))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Validate and continue' })).toBeTruthy())
    const derived = deriveInterfaceErrors(L1_CONFLICT.orderNumber, 1, 'conflict', await getOrderView(L1_CONFLICT.orderNumber))
    for (const [, options] of derived.conflicts) {
      const o = options.find((x) => x.lines.length > 0)
      const chip = screen.getAllByRole('button').find((b) => b.textContent.startsWith(`${o.label ?? o.value} ·`) || b.textContent.includes(`${o.value} ·`))
      fireEvent.click(chip)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Validate and continue' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy())
    const list = screen.getByRole('list', { name: 'Resolution progress' })
    expect(within(list).getByText(/passed/)).toBeTruthy()
    // the row now reports no interface errors
    const res = await getOrderList({ pagination: { pageNumber: 1, pageSize: 1 }, filters: { orderNumbers: [L1_CONFLICT.orderNumber] } })
    expect(res.orders[0].interfaceErrorCount).toBe(0)
    // look-back
    fireEvent.click(within(list).getByRole('button', { name: /Message errors/ }))
    expect(screen.getByText('Validated')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Validate and continue' })).toBeNull()
  })

  test('Step 2 Save with everything resolved → Step 3 preview, all dots passed', async () => {
    renderResolve(NO_L1.orderNumber, stateFor(NO_L1))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy())
    // Resolve every Level 2 error by filling the pool fields (same recipe as the
    // existing "Save enabled when all resolved" test in this file — reuse its helper if present).
    const { errors } = deriveValidationErrors(NO_L1.orderNumber, NO_L1.errorCount, await getOrderView(NO_L1.orderNumber))
    for (const e of errors) {
      const el = document.getElementById(`co-${e.path.replace(/\./g, '-')}`)
      fireEvent.change(el, { target: { value: e.reason === 'Invalid Data Type' ? '5551234567' : e.path.endsWith('postal') ? '12345' : 'X1' } })
    }
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.getByText(/ready for planning/i)).toBeTruthy())
    const list = screen.getByRole('list', { name: 'Resolution progress' })
    expect(list.querySelectorAll('.step-indicator--on').length).toBe(3)
    expect(screen.getByRole('button', { name: 'Back to overview' })).toBeTruthy()
  })
})
```
Add `getOrderList, getOrderView` to the service import at the top of the test file. If the existing file already has a "fill every error" helper for the Save test, reuse it instead of the inline loop.

- [ ] **Step 2: Run → FAIL** (`npx vitest run src/components/orders/resolve/resolve.test.jsx`).

- [ ] **Step 3: Implement `ResolveShell.jsx`**

```jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, PageHeader, ResolveTimeline } from '@odyssey/ui'
import CreateOrderForm from '../create/CreateOrderForm.jsx'
import ConfirmationView from '../create/ConfirmationView.jsx'
import Step1Panel from './Step1Panel.jsx'
import { deriveInterfaceErrors } from './interfaceErrors.js'
import { getOrderList, getOrderView, saveInterfaceFixes } from '../../../api/services/orderService'

/**
 * ResolveShell — the OIF resolution page (LINX-16049 Step 1 + LINX-11137
 * Step 2 + a preview Step 3) as ONE page with a 3-dot timeline. Steps, not
 * tabs (user ruling 2026-09-09). Navigable both ways, editable only forward:
 * a passed step re-opens read-only; a locked step's dot is inert.
 *
 * Entry (LINX-16049 §II): Level 1 errors → Step 1; none → Step 2 with dot 1
 * already passed. Validate and continue SAVES the Step 1 fixes immediately
 * (Ramesh 2026-09-10 #2) and re-mounts the Step 2 form on the saved values,
 * so Level 2 errors derive from the fixed order in the same interaction
 * (LINX-11137 §E real-time). Save at Step 2 → Step 3 (ConfirmationView).
 */
export default function ResolveShell({ orderNumber }) {
  const navigate = useNavigate()
  const location = useLocation()
  const meta = location.state ?? {}
  const [loaded, setLoaded] = useState(null) // { derived, draft, values }
  const [step, setStep] = useState(1)        // 1 | 2 | 3 — progress
  const [viewing, setViewing] = useState(1)  // which body is on screen
  const [picks, setPicks] = useState({})
  const [step2Key, setStep2Key] = useState(0)
  const [finalValues, setFinalValues] = useState(null)

  useEffect(() => {
    let cancelled = false
    const metaPromise = meta.interfaceErrorCount != null
      ? Promise.resolve({ count: meta.interfaceErrorCount, klass: meta.interfaceErrorClass })
      : getOrderList({ pagination: { pageNumber: 1, pageSize: 1 }, filters: { orderNumbers: [orderNumber] } })
          .then((res) => ({ count: res.orders[0]?.interfaceErrorCount ?? 0, klass: res.orders[0]?.interfaceErrorClass ?? null }))
          .catch(() => ({ count: 0, klass: null }))
    Promise.all([getOrderView(orderNumber), metaPromise]).then(([values, m]) => {
      if (cancelled || !values) return
      const derived = deriveInterfaceErrors(orderNumber, m.count, m.klass, values)
      const draft = derived.applyErrors(values)
      setLoaded({ derived, draft, values })
      const start = derived.errors.length ? 1 : 2
      setStep(start); setViewing(start); setPicks({})
    })
    return () => { cancelled = true }
  }, [orderNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  const contextText = `${orderNumber}${meta.customer ? ` · Integrated from ${meta.customer}` : ''}`

  const handleValidate = async ({ picks: p, structuralFixes }) => {
    const fixed = loaded.derived.applyFixes(loaded.values, p, structuralFixes)
    try { await saveInterfaceFixes(orderNumber, fixed) } catch (e) { console.error(e); return }
    setPicks(p)
    setLoaded((l) => ({ ...l, values: fixed }))
    setStep2Key((k) => k + 1)
    setStep(2); setViewing(2)
  }

  const l1Count = loaded?.derived.errors.length ?? 0
  const timeline = useMemo(() => {
    const s1Status = !loaded ? 'off' : step === 1 ? 'error' : 'on'
    const s1Detail = !loaded ? '' : step === 1 ? `${l1Count} error${l1Count === 1 ? '' : 's'} · in progress` : l1Count ? `passed · ${l1Count} fixed` : 'no errors'
    const s2Status = step < 2 ? 'off' : step === 2 ? 'error' : 'on'
    const s2Detail = step < 2 ? 'locked' : step === 2 ? 'in progress' : 'passed'
    return [
      { key: 's1', label: 'Message errors', detail: s1Detail, status: s1Status, onClick: step > 1 ? () => setViewing(1) : undefined },
      { key: 's2', label: 'Data errors', detail: s2Detail, status: s2Status, onClick: step >= 2 && viewing !== 2 ? () => setViewing(2) : undefined },
      { key: 's3', label: 'Order ready', detail: step === 3 ? 'ready for planning' : '—', status: step === 3 ? 'on' : 'off', onClick: step === 3 && viewing !== 3 ? () => setViewing(3) : undefined },
    ]
  }, [loaded, step, viewing, l1Count])

  return (
    <div className="resolve-shell">
      <PageHeader title="Order Validation Error Resolution">
        <Button variant="link" className="btn--link-black" icon={<ArrowLeft size={16} />} onClick={() => navigate('/orders')}>
          Back to overview page
        </Button>
      </PageHeader>
      <p className="text-label-sm-regular co-resolve-subheading">Order Number {orderNumber}</p>
      <ResolveTimeline className="resolve-shell__timeline" steps={timeline} current={`s${viewing}`} />

      {loaded && viewing === 1 && (
        <Step1Panel
          orderNumber={orderNumber}
          contextText={contextText}
          derived={loaded.derived}
          draft={loaded.draft}
          readOnly={step > 1}
          picks={picks}
          onValidate={handleValidate}
          onCancel={() => navigate('/orders')}
        />
      )}
      {loaded && viewing === 2 && (
        <CreateOrderForm
          key={step2Key}
          resolveKey={orderNumber}
          resolveMeta={meta}
          hideHeader
          pickedPaths={Object.keys(picks)}
          onResolved={(values) => { setFinalValues(values); setStep(3); setViewing(3) }}
          onPurged={() => navigate('/orders')}
        />
      )}
      {viewing === 3 && (
        <div className="order-summary-page resolve-shell__preview">
          <ConfirmationView data={{ orderNumber }} values={finalValues ?? loaded?.values} variant="sync" />
          <div className="resolve-shell__preview-footer">
            <Button variant="primary" size="lg" onClick={() => navigate('/orders')}>Back to overview</Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

`CreateOrderRoute.jsx` — replace the body so `?resolve=` mounts the shell:
```jsx
  return (
    <AppShell>
      <div className={submitted ? 'order-summary-page' : 'create-order-page'}>
        {resolveKey ? (
          <ResolveShell orderNumber={resolveKey} />
        ) : submitted ? (
          <ConfirmationView data={submitted.response.data} values={submitted.values} variant={forceAsync ? 'async' : 'sync'} />
        ) : (
          <CreateOrderForm draftKey={draftKey} onSubmitted={setSubmitted} />
        )}
      </div>
    </AppShell>
  )
```
(import `ResolveShell`; drop the now-unused `useLocation` / `resolveMeta` plumbing from the route — the shell reads history state itself.)

`create-order.css` — append:
```css
/* ── Resolve shell (two-step OIF page) ── */
.resolve-shell { display: flex; flex-direction: column; gap: var(--spacing-4); }
.resolve-shell__timeline { margin: var(--spacing-2) 0 var(--spacing-4); }
.resolve-shell__preview-footer { display: flex; justify-content: flex-end; padding: var(--spacing-4) 0; }
```

**Watch-outs for the implementer**
- `CreateOrderForm`'s resolve alert docks against `scrollerRef`/`alertSentinelRef` — unchanged; the shell adds content above it, which is what the sentinel already tolerates.
- `ConfirmationView` reads `values.general.orderNumber` to decide sync/async (`:47`); pass `variant="sync"` and ensure `data.orderNumber` is set (it is) so it renders the success alert immediately.
- The existing resolve tests assert the header/footer inside `CreateOrderForm`; with `hideHeader` the shell renders the same header text, so `getByRole('heading', { name: 'Order Validation Error Resolution' })` still resolves — but only once. If `PageHeader` in the shell AND the breadcrumb both render the title, prefer `getByRole('heading')` in tests.
- Step 2 Save previously navigated to `/orders`; the old test "Save/Purge transition" that expects `orders list` after Save must now expect Step 3 (update that assertion: Purge still lands on `orders list`).

- [ ] **Step 4: Run** `npx vitest run src/components/orders/resolve` → PASS; then `npx vitest run` (full) → green; `npx eslint src/components/orders/resolve src/routes/orders ../../packages/ui/src/ResolveTimeline.jsx` → clean.

- [ ] **Step 5: Look at it** — `VITE_API_MODE=mock npm run dev:odyssey-one` from the repo root, open `/orders` → Validation Errors tab → a row with Interface Errors > 0 → Resolve. Walk Step 1 → 2 → 3, click dot 1 from Step 2, Back to overview and re-enter. Fix anything that jsdom couldn't see (dot/track alignment, sticky alert, chip wrapping) before committing.

- [ ] **Step 6: Commit**

```bash
git add src/components/orders/resolve/ResolveShell.jsx src/routes/orders/CreateOrderRoute.jsx src/components/orders/resolve/resolve.test.jsx src/components/orders/create/create-order.css
git commit -m "S145: ResolveShell — one page, three steps on a timeline; Step 1 saves on Validate, Step 3 preview"
```

---

### Task 11: Canon + build gate

**Files:**
- Modify: `vault/10-domains/orders/decisions/decision-log.md` (append ORD-25), `vault/10-domains/orders/open-questions.md` (append Q-OIF 1–3 from the spec), `vault/10-domains/orders/domain-analysis.md` §7 (OIF paragraph: two levels, statuses Error/Complete/Purge, the 13 rules)
- Modify: `playground/normalization-tracker.md` (ResolveTimeline row, NORMALIZING, Figma master owed)

- [ ] **Step 1: Decision-log entry** `### ORD-25 — OIF resolution becomes two steps on one page (LINX-16049 + 11137 split); statuses Error/Complete/Purge` with **Previous state** (ORD-10 single screen, `Ready` gate, Save → Ready for Planning), **Decision** (spec summary + the six Ramesh rulings verbatim), **Source** (stories, docs, transcript 1:06–1:07, user rulings 2026-09-09/10), **Affects** (file list from this plan), and the story-conformance deviations (no tabs; retry out of scope).

- [ ] **Step 2: Open questions** — append the three from the spec's *Open questions* section, owner Venkat / regroom, PLUS a fourth carried out of Task 1:

> **Q-OIF-4 — the "Interface Errors" grid column needs a DB column.** The Validation Errors grid should show the Level 1 error count beside the Level 2 one, but the Orders grid↔search parity tests require every column to be filterable, and a filterable column requires `interface_error_count` in Neon (`CHIP_COLS`, `api/_lib/orders.mjs`). Ships with a Neon migration + reseed on the user's explicit go; until then the count reaches the resolve screen through the Resolve navigation state, and the grid does not display it. Owner: user (reseed authority) + Venkat (whether the real OIF feed exposes the count on the list row at all).

- [ ] **Step 3: Gate** — from `apps/odyssey-one`: `npx vitest run` green; `node --test tools/generate.test.mjs api/_lib/*.test.mjs` green; `npm run build` green; `npm run lint` clean.

- [ ] **Step 4: Commit**

```bash
git add vault/10-domains/orders playground/normalization-tracker.md
git commit -m "S145: ORD-25 — OIF two-step resolution canon, open questions for Venkat, ResolveTimeline tracked"
```

---

## Amendments during execution

**2026-09-10 — Task 1.** The "Interface Errors" grid column is deferred to a Neon migration (see Task 1 Step 7 and Q-OIF-4 in `vault/10-domains/orders/open-questions.md`). Also: `DRAFT_ORDER_STATUS_POOL` must be `Array(6).fill('Error')`, NOT the plan's literal `['Error']` — `faker.helpers.arrayElement` skips its RNG draw on a 1-element array, which re-numbers every seeded id. The array's length is load-bearing and is now pinned by a determinism test.

**2026-09-10 — Task 2 review.** Three corrections to the plan's `ResolveTimeline` CSS and markup, all applied in a follow-up commit:
1. `.resolve-timeline__step:last-child { flex: 0 0 auto; }` is DROPPED — the segment's `left/right` percentages resolve against the step's own width, so an auto-width last step makes the incoming segment overshoot. Every step stays `flex: 1 1 0`. Consequence: first/last dots are centred in their columns, not flush with the container edges as in the user's reference image; revisit at the Task 10 browser check if the flush look matters.
2. The locked-step colour must be scoped to the inner element (`.resolve-timeline__step--locked .resolve-timeline__static`), not the `li` — `color` set on `.resolve-timeline__static` otherwise overrides an ancestor value.
3. **`aria-disabled` on the `li` is replaced by a `resolve-timeline__step--locked` modifier class.** `aria-disabled` is not permitted on `listitem` in ARIA 1.2 (axe `aria-allowed-attr`), and AT ignores it; the visible detail text ("locked") already carries the semantics. Task 2's and Task 10's tests assert the class instead. A step is "locked" only when it has no `onClick` AND is not the current step — otherwise the current step, which never has an `onClick`, paints grey.

**2026-09-10 — Task 3 review.** `count` means error ROWS, not rules (an address conflict emits City + Postal = 2). The generator now CLAMPS the drawn count/class after drawing (never with new RNG draws — that stream is shared with the Hold selection): a single-line order can't carry `conflict`/`mixed` and is remapped to `structural`, and the count is clamped to the class capacity imported from `interfaceErrors.js`. Effect: 58 rows changed class, 21 changed count; conflict/mixed are now the minority (32 of 131 L1 rows), so pick a specific order number when demoing the conflict picker. `interfaceErrors.js` also exports `STRUCTURAL_DRAFT_KEYS` — the contract Task 5's grid must read for the line-level draft keys.

**2026-09-10 — Task 4.** `--border-error` does not exist; use `--bittersweet-200`. `PillTab` needs no `disabled` prop — it spreads `...rest` onto its `<button>`, so `disabled` lands natively (no normalized-component change, no Figma debt). `FormField` forwards `onBlur` via `...rest`. Beware duplicate accessible names: a group `aria-labelledby` pointing at a span with the same text as the inner FormField label makes `getByLabelText` ambiguous — give the group a distinct `aria-label` and the input `showLabel={false}` + `aria-label`.

**2026-09-10 — Task 5.** `StructuralGrid` **exports `isStructuralFixed(product, error, fix)`** — the ONE definition of whether a structural fault is really fixed (a typed-but-wrong gross weight must NOT count as resolved). **Task 7's `Step1Panel` must import and call it**, not re-derive the rule from "a fix exists", or the badge, the grid and `applyFixes` will disagree. Other findings: use `ICON_LG` (20px) for the trash and the existing `.co-rep__trash` class, matching every other trash in order creation; `FormField` renders its OWN "Validated" line when `validated` is true, so a sibling "Validated" element makes `getByText` ambiguous; `showLabel={false}` drops the `<label>` entirely, so pass `aria-label` alone; the timezone list is `TIMEZONES` from `src/data/master-data.js`, not an inline array. A fixed row stays EDITABLE (nothing commits until the panel calls `applyFixes`), except that the trash disappears once a schedule is nominated.

**2026-09-10 — Task 7 review. TWO THINGS TASK 10 MUST HONOUR.**
1. **The read-only look-back needs ALL THREE pieces of Step 1 state, not just `picks`.** `Step1Panel` holds `structuralFixes` and `deleteFlag` as LOCAL state seeded only at mount, and `ResolveShell` unmounts the panel on a step change. So a look-back from Step 2/3 that passes only `picks` renders structural rows as unfixed and the delete-flag radio as unanswered — the Structural accordion goes RED with an "N Errors" badge on a step the timeline says "passed". Either extend `Step1Panel`'s props to take `structuralFixes` and `deleteFlag` back in (mirroring the `picks` pattern) and have the shell hold all three, or hand the read-only panel a pre-applied draft. The shell already needs `structuralFixes` for `applyFixes`, so holding all three in the shell is the smaller change.
2. **`hasUnresolvable` in `Step1Panel` is deliberately redundant** with `isResolved` and is documented as defence-in-depth on a safety gate. Do not "simplify" it away.

**Backlog (not blocking):** `StructuralGrid` renders one `<tr key={s.id}>` per error but gives it no `id`, so the Alert's error-nav anchors to the top of the grid rather than the offending row. Adding `id={`l1-${s.id}`}` to that row would let `Step1Panel.anchorId` collapse to `l1-${err.id}` for two of three classes.
