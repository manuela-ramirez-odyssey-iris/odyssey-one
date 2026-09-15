# Order Audit Trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A read-only, per-order Audit Trail page at `/orders/:orderId/audit-trail`, opened from the Orders grid's ⋮ menu, rendering the LINX-8091/9128 record (nine categories, `--` blanks, gray/purple value badges, sort on timestamp, 10–40/25 paging) over a deterministic mock trail derived from the order itself, with a live adapter behind the same service seam.

**Architecture:** A pure module `auditTrail.js` derives an order's trail from its `orders.json` row + `order-details.json` enrichment (seeded PRNG keyed on the order number — no generator change, no fixture churn, no faker-stream shift). `orderService.getAuditTrail` sorts + pages that in mock mode and calls `POST /order-service/v3/audit-report` in live mode, both returning the same `{ rows, totalCount, order }`. A `useAuditTrail` query hook feeds `AuditTrailTable` (TanStack + `DataTable` + `Paginator`, manual paging/sorting like `OrdersTable`), hosted by `OrderAuditTrailRoute` in the Edit-Shipment-Stops shell pattern (`AppShell titleMode` + breadcrumb + `PageHeader`). The ⋮ menu gains one label and `OrdersRoute.handleRowAction` one branch.

**Tech Stack:** React 19, react-router 6, TanStack Table v8 + Query, `@odyssey/ui` (DataTable, Paginator, Badge, Breadcrumb, PageHeader, ActionMenu, EmptyState, Button), vitest + @testing-library/react (jsdom), TypeScript for `api/`.

**Spec:** `docs/superpowers/specs/2026-09-14-order-audit-trail-design.md` · canon `vault/10-domains/orders/audit-trail.md` · ORD-27 · Q-AT-1…4.

**Execution notes:** Task 1 landed as `34be743`→`1382de4` (VE rows derive to `[]`; real master-data enums for old values). Task 2 landed as `6f5b968`→`8a29780` (derive moved to `src/data/`; `pending-<id>` orders resolved like `getOrderView`). Task 3 `a640fd4`→`22f2322` (Badge is 20px, not 24; mapper normalises blank line ids). Task 4 `9c37cd3`→`b26dfb8` (stickyTop compensates the padded scroller; `truncationTooltip` dropped — the detector concatenates multi-line stacks). Task 5 `0f32d70` (approved as-is; Playwright not installed, so the sticky offset + badge markup await a browser check). Task 6 `9a6f331` (+ the dead `orders.css` import dropped from the route). Full suite after Task 6: **188 files / 2611 tests** (S146: 182 / 2584), tsc clean. Final review → fix `2328887`: session-created/edited overlay rows lost `createdAt`/`createdBy`/zone (pre-existing builder; the trail derived NaN timestamps) — `createOrder` stamps, `updateOrder` carries; derive guards a missing anchor; the spec'd *No changes recorded yet* state wired (+4 tests). Browser check in the user's default LIVE mode 404'd → **Task 7** added: live endpoint `ef99d77`→`ca9ab95` — Neon row → the same derive, smoke-tested against Neon (`WEY-99994` → 5 rows). API suite 202 → 208. **Task 8** (browser-check rulings): crumbs `Orders › <n> Audit Trail`, standard navbar, title mode + `✕` removed; navbar search over the trail **parked** (lean scope recorded in the spec).

**Amendment to the spec, taken here:** the spec's *Data* section says the trail is seeded in `tools/generate.mjs`. This plan derives it **at read time** from the order instead (`auditTrail.js`, Task 1). Same coherence guarantee (every value comes from the order), zero generator/fixture change, and no faker draw — a new draw re-numbers every seeded id (project rule). If the trail ever needs to be persisted (Neon), the derive module is the seed function.

**Ground rules for every task**
- App tests run from `apps/odyssey-one`: `npx vitest run <path>`; the full suite is `npx vitest run` (≈2584 tests / 182 files at S146 — must stay green at the end of every task). Component/route tests need `// @vitest-environment jsdom` as the first line.
- Commit subjects start with **`S147: `**. Commit after each task, only the task's files (`git add <paths>`), never `git add .`.
- Mock mode only (`VITE_API_MODE=mock`). No Neon writes, no deploy.
- Tokens only for colour/radius/type/shadow (`var(--…)`); tiny internal paddings may be raw px. No new tokens, no `@odyssey/ui` changes.
- Fable never writes code: each task is implemented by a Sonnet subagent, then spec-reviewed and quality-reviewed before the next starts.

---

## File map

| File | Responsibility |
|---|---|
| `apps/odyssey-one/src/api/types/auditTrail.ts` | `AuditTrailRow`, `AuditTrailChange`, `AuditTrailPage`, request type |
| `apps/odyssey-one/src/data/auditTrail.js` (+ `.test.js`) | pure derive: order row + enrichment → ordered trail (oldest → newest). *Moved from `components/orders/audit-trail/` at Task 2 review — the service layer must not import from `components/`.* |
| `apps/odyssey-one/src/api/services/orderService.ts` (+ `orderService.auditTrail.test.ts`) | `getAuditTrail` — mock sort/page over the derive, live `POST /v3/audit-report` |
| `apps/odyssey-one/src/api/mappers/mapAuditReportRow.ts` (+ `.test.ts`) | live wire row → `AuditTrailRow` (assumed shape, Q-AT-2) |
| `apps/odyssey-one/src/api/queries/useAuditTrail.ts` | TanStack Query hook |
| `apps/odyssey-one/src/components/orders/audit-trail/auditTrailColumns.jsx` (+ `.test.jsx`) | column defs, timestamp format, value stacks, `--` |
| `apps/odyssey-one/src/components/orders/audit-trail/AuditTrailTable.jsx` (+ `.test.jsx`) | TanStack instance + `DataTable` + `Paginator` |
| `apps/odyssey-one/src/components/orders/audit-trail/audit-trail.css` | page + stack styles |
| `apps/odyssey-one/src/routes/orders/OrderAuditTrailRoute.jsx` (+ `.test.jsx`) | shell, breadcrumb, header, states |
| `apps/odyssey-one/src/App.jsx` | the route |
| `apps/odyssey-one/src/components/orders/ordersColumns.jsx` (+ `.test.jsx`) | `Audit Trail` in the Created-tab ⋮ |
| `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx` | `handleRowAction('Audit Trail')` |

---

### Task 1: Types + the pure derive module

**Files:**
- Create: `apps/odyssey-one/src/api/types/auditTrail.ts`
- Create: `apps/odyssey-one/src/components/orders/audit-trail/auditTrail.js`
- Test: `apps/odyssey-one/src/components/orders/audit-trail/auditTrail.test.js`

- [ ] **Step 1: Write the types**

```ts
// apps/odyssey-one/src/api/types/auditTrail.ts
// LINX-8091 (order level) + LINX-9128 (line level) — one row shape serves both.
// `changes` is a LIST per the AC Notes §1 ("in one row … the list of all the
// fields that changed"); Ramesh said "one row per field" aloud — Q-AT-1. Either
// answer is a change to what fills `changes`, not to this shape.
export type AuditChangeType = 'Order Action' | 'Order Event'

export type AuditChangeCategory =
  | 'Order Creation'
  | 'Order Header Editing'
  | 'Order Line Item Editing'
  | 'Order Lifecycle Status Change'
  | 'Order Applied on Hold'
  | 'Order Released from Hold (Header Level Editing)'
  | 'Order Released from Hold (Line Item Editing)'
  | 'Order Partial Cancellation'
  | 'Order Full Cancellation'

export interface AuditTrailChange {
  field: string      // human label ("Gross Weight"), never the JSON path
  oldValue: string
  newValue: string
}

export interface AuditTrailRow {
  id: string                       // `${orderNumber}-${n}` — stable per derive
  timestamp: string                // local-naive ISO, same shape as orders.json createdAt
  timeZoneCode: string             // 'CDT' — the zone abbreviation shown after the time
  changedBy: 'User' | 'System'
  source: string                   // User → "email · Full Name"; System → 'ERP' | 'UI' | 'Legacy TMS' | 'LINX'
  changeType: AuditChangeType
  changeCategory: AuditChangeCategory
  lineItemId: string | null        // null on header-level rows (renders '--')
  changes: AuditTrailChange[]      // [] on Creation / Applied on Hold / Cancellation rows
}

export interface AuditTrailRequest {
  orderNumber: string
  pageNumber: number               // 1-based, like OrderListRequest.pagination
  pageSize: number
  sortDirection: 'asc' | 'desc'    // on timestamp — the only sortable column
}

export interface AuditTrailOrderMeta {
  orderNumber: string
  orderSource: 'Manual' | 'Integrated'
  createdAt: string
  createdTimeZoneCode: string
  createdBy: string                // the creation row's `source`
}

export interface AuditTrailPage {
  rows: AuditTrailRow[]
  totalCount: number
  order: AuditTrailOrderMeta | null // null → order not found
}
```

- [ ] **Step 2: Write the failing derive tests**

```js
// apps/odyssey-one/src/components/orders/audit-trail/auditTrail.test.js
import { describe, it, expect } from 'vitest'
import { deriveAuditTrail, actorFor } from './auditTrail.js'
import ordersFixture from '../../../data/orders.json'
import detailsFixture from '../../../data/order-details.json'

const rows = ordersFixture
const enrichmentFor = (n) => detailsFixture[n] ?? null
const HEADER_ONLY = new Set([
  'Order Creation', 'Order Header Editing', 'Order Lifecycle Status Change',
  'Order Applied on Hold', 'Order Released from Hold (Header Level Editing)', 'Order Full Cancellation',
])
const BLANK_CHANGES = new Set([
  'Order Creation', 'Order Applied on Hold', 'Order Partial Cancellation', 'Order Full Cancellation',
])
const byStatus = (s) => rows.find((r) => r.orderNumber && r.orderStatus === s)

describe('deriveAuditTrail', () => {
  it('is deterministic and starts with Order Creation at the order’s own createdAt', () => {
    const row = rows.find((r) => r.orderNumber)
    const a = deriveAuditTrail(row, enrichmentFor(row.orderNumber))
    const b = deriveAuditTrail(row, enrichmentFor(row.orderNumber))
    expect(a).toEqual(b)
    expect(a[0].changeCategory).toBe('Order Creation')
    expect(a[0].changeType).toBe('Order Action')
    expect(a[0].timestamp).toBe(row.createdAt)
    expect(a[0].timeZoneCode).toBe(row.createdTimeZoneCode)
    expect(a[0].changes).toEqual([])
    expect(a[0].lineItemId).toBeNull()
  })

  it('creation actor follows the order source: Manual = User email · name, Integrated = System · ERP', () => {
    const manual = rows.find((r) => r.orderNumber && r.orderSource === 'MANUAL')
    const integrated = rows.find((r) => r.orderNumber && r.orderSource === 'INTEGRATED')
    const m = deriveAuditTrail(manual, enrichmentFor(manual.orderNumber))[0]
    const i = deriveAuditTrail(integrated, enrichmentFor(integrated.orderNumber))[0]
    expect(m.changedBy).toBe('User')
    expect(m.source).toBe(actorFor(manual.createdBy))
    expect(actorFor('ben.planner')).toBe('ben.planner@odyssey.local · Ben Planner')
    expect(i.changedBy).toBe('System')
    expect(i.source).toBe('ERP')
  })

  it('timestamps are non-decreasing and every row shares the order’s zone', () => {
    for (const row of rows.filter((r) => r.orderNumber).slice(0, 200)) {
      const trail = deriveAuditTrail(row, enrichmentFor(row.orderNumber))
      for (let k = 1; k < trail.length; k++) expect(trail[k].timestamp >= trail[k - 1].timestamp).toBe(true)
      for (const t of trail) expect(t.timeZoneCode).toBe(row.createdTimeZoneCode)
    }
  })

  it('applies the 9128 blank rules: header-level rows have no line item, event-only rows have no changes', () => {
    for (const row of rows.filter((r) => r.orderNumber).slice(0, 300)) {
      for (const t of deriveAuditTrail(row, enrichmentFor(row.orderNumber))) {
        if (HEADER_ONLY.has(t.changeCategory)) expect(t.lineItemId).toBeNull()
        else expect(t.lineItemId).not.toBeNull()
        if (BLANK_CHANGES.has(t.changeCategory)) expect(t.changes).toEqual([])
        else expect(t.changes.length).toBeGreaterThan(0)
        expect(t.changeType).toBe(t.changeCategory.startsWith('Order Creation') || t.changeCategory.includes('Editing') && !t.changeCategory.includes('Hold') ? 'Order Action' : 'Order Event')
      }
    }
  })

  it('walks the order’s real lifecycle: the last status-change row lands on the current status', () => {
    for (const status of ['Planned Load', 'Planned Shipment', 'Planning Failed', 'Shipment Failed', 'Hold']) {
      const row = byStatus(status)
      if (!row) continue
      const changes = deriveAuditTrail(row, enrichmentFor(row.orderNumber))
        .filter((t) => t.changeCategory === 'Order Lifecycle Status Change')
      expect(changes.length).toBeGreaterThan(0)
      const last = changes[changes.length - 1].changes[0]
      expect(last.field).toBe('Status')
      expect(last.newValue).toBe(status === 'Hold' ? 'Hold' : status)
      expect(changes[0].changes[0].oldValue).toBe('Ready for Planning')
    }
  })

  it('Hold orders end on Applied on Hold; Cancelled orders end on Full Cancellation; nothing else does', () => {
    const hold = byStatus('Hold'); const cancelled = byStatus('Cancelled'); const rfp = byStatus('Ready for Planning')
    const last = (r) => { const t = deriveAuditTrail(r, enrichmentFor(r.orderNumber)); return t[t.length - 1] }
    expect(last(hold).changeCategory).toBe('Order Applied on Hold')
    expect(last(cancelled).changeCategory).toBe('Order Full Cancellation')
    expect(last(cancelled).changedBy).toBe('User')
    expect(last(rfp).changeCategory).not.toBe('Order Full Cancellation')
  })

  it('edit rows only ever change fields to values the order actually holds now', () => {
    let seen = 0
    for (const row of rows.filter((r) => r.orderNumber).slice(0, 400)) {
      const trail = deriveAuditTrail(row, enrichmentFor(row.orderNumber))
      for (const t of trail.filter((x) => x.changeCategory === 'Order Header Editing')) {
        for (const c of t.changes) {
          seen++
          if (c.field === 'Gross Weight') expect(c.newValue).toBe(`${row.grossWeight.value.toLocaleString('en-US')} ${row.grossWeight.uom}`)
          if (c.field === 'Equipment') expect(c.newValue).toBe(row.equipment)
          if (c.field === 'Freight Terms') expect(c.newValue).toBe(row.freightTerms)
          if (c.field === 'Latest Pickup') expect(c.newValue).toBe(row.consignor.latestPickupDateTime)
          expect(c.oldValue).not.toBe(c.newValue)
        }
      }
      for (const t of trail.filter((x) => x.changeCategory === 'Order Line Item Editing')) {
        const line = (enrichmentFor(row.orderNumber)?.orderLines ?? []).find((l) => String(l.lineIdentifier) === t.lineItemId)
        expect(line).toBeTruthy()
        expect(t.changes[0].newValue).toBe(`${line.grossWeightValue.toLocaleString('en-US')} ${line.grossWeightUomCode}`)
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('Draft rows yield the creation row only (a draft has no lifecycle yet)', () => {
    const draft = byStatus('Draft')
    expect(deriveAuditTrail(draft, enrichmentFor(draft.orderNumber))).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd apps/odyssey-one && npx vitest run src/components/orders/audit-trail/auditTrail.test.js`
Expected: FAIL — `Failed to resolve import "./auditTrail.js"`.

- [ ] **Step 4: Write the derive module**

```js
// apps/odyssey-one/src/components/orders/audit-trail/auditTrail.js
/**
 * Audit Trail derive (LINX-8091 / LINX-9128, ORD-27). Pure: an orders.json row
 * + its order-details.json enrichment → the order's trail, OLDEST FIRST.
 *
 * Derived at read time, not seeded in tools/generate.mjs (plan amendment): a
 * new faker draw there re-numbers every seeded id, and everything a trail
 * needs is already ON the order — creation actor/instant/zone, the current
 * status (so the lifecycle path is known), header values (the "new" side of
 * every edit), lines (the line-level rows). Variation (how many edits, whether
 * a past hold happened, a partial cancellation) comes from a tiny PRNG keyed on
 * the order number, so the trail is stable across renders and reloads.
 *
 * Row granularity follows the AC — one row per save holding a LIST of changes
 * (Q-AT-1). Ramesh's spoken "one row per field" is a change to how `changes`
 * is filled, not to this module's shape.
 */

// ── PRNG (mulberry32 over an FNV-1a hash of the key) ─────────────────────────
function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)]
const intIn = (r, min, max) => min + Math.floor(r() * (max - min + 1))

// ── Vocabulary ───────────────────────────────────────────────────────────────
export const ACTION = 'Order Action'
export const EVENT = 'Order Event'
export const CATEGORY_TYPE = {
  'Order Creation': ACTION,
  'Order Header Editing': ACTION,
  'Order Line Item Editing': ACTION,
  'Order Lifecycle Status Change': EVENT,
  'Order Applied on Hold': EVENT,
  'Order Released from Hold (Header Level Editing)': EVENT,
  'Order Released from Hold (Line Item Editing)': EVENT,
  'Order Partial Cancellation': EVENT,
  'Order Full Cancellation': EVENT,
}

// The status path an order walked to reach where it is (registry
// ORDER_STATUS_VALUES). Every path starts at Ready for Planning — that is what
// creation lands on (LINX-10777) — and Hold/Cancelled are terminal EVENTS here,
// not status-change rows, per the 9128 matrix.
const LIFECYCLE_PATH = {
  'Ready for Planning': [],
  'Planned Load': ['Planned Load'],
  'Planned Shipment': ['Planned Load', 'Planned Shipment'],
  'Planning Failed': ['Planning Failed'],
  'Shipment Failed': ['Planned Load', 'Shipment Failed'],
  Hold: [],
  Cancelled: [],
  Draft: null, // no lifecycle yet — creation row only
}

// Seeded usernames are `first.last` (tools/seed-users.mjs usernameFor); the
// e-mail domain is the seeded users' `@odyssey.local`. The AC's Source for a
// User is "E-mail ID & full name" — this is the inverse of usernameFor.
export function actorFor(username) {
  const name = String(username).split('.').map((p) => p ? p[0].toUpperCase() + p.slice(1) : p).join(' ')
  return `${username}@odyssey.local · ${name}`
}

const weight = (v, uom) => `${Number(v).toLocaleString('en-US')} ${uom}`
const addHours = (iso, h) => {
  const d = new Date(iso)
  d.setHours(d.getHours() + h)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
}

// Header fields an edit can touch — old value derived FROM the current one so
// the new side is always the order's real value (coherence rule).
const EQUIPMENT_ALT = ['LTR', 'FTL', 'DRY', 'REF', 'FLT']
const TERMS_ALT = ['A', 'P', 'C', 'T']
function headerChange(r, row) {
  const kind = pick(r, ['weight', 'equipment', 'terms', 'pickup'])
  if (kind === 'weight') {
    const delta = intIn(r, 100, Math.max(101, Math.floor(row.grossWeight.value * 0.4)))
    return { field: 'Gross Weight', oldValue: weight(row.grossWeight.value - delta, row.grossWeight.uom), newValue: weight(row.grossWeight.value, row.grossWeight.uom) }
  }
  if (kind === 'equipment') {
    return { field: 'Equipment', oldValue: pick(r, EQUIPMENT_ALT.filter((e) => e !== row.equipment)), newValue: row.equipment }
  }
  if (kind === 'terms') {
    return { field: 'Freight Terms', oldValue: pick(r, TERMS_ALT.filter((t) => t !== row.freightTerms)), newValue: row.freightTerms }
  }
  return { field: 'Latest Pickup', oldValue: addHours(row.consignor.latestPickupDateTime, -intIn(r, 24, 96)), newValue: row.consignor.latestPickupDateTime }
}
function lineChange(r, line) {
  const delta = intIn(r, 50, Math.max(51, Math.floor(line.grossWeightValue * 0.4)))
  return { field: 'Gross Weight', oldValue: weight(line.grossWeightValue - delta, line.grossWeightUomCode), newValue: weight(line.grossWeightValue, line.grossWeightUomCode) }
}

/**
 * @param {object} row        orders.json row (OrderListRow)
 * @param {object|null} enrichment order-details.json entry (ManualOrder-shaped) or null
 * @returns {import('../../../api/types/auditTrail').AuditTrailRow[]} oldest → newest
 */
export function deriveAuditTrail(row, enrichment) {
  const r = rng(hash(row.orderNumber || `pending-${row.orderId}`))
  const zone = row.createdTimeZoneCode || 'CDT'
  const manual = row.orderSource === 'MANUAL'
  const user = { changedBy: 'User', source: actorFor(row.createdBy) }
  const lines = enrichment?.orderLines ?? []
  let n = 0
  let at = row.createdAt
  const rows = []
  const push = (category, extra) => {
    rows.push({
      id: `${row.orderNumber || row.orderId}-${n++}`,
      timestamp: at,
      timeZoneCode: zone,
      changeType: CATEGORY_TYPE[category],
      changeCategory: category,
      lineItemId: null,
      changes: [],
      ...extra,
    })
  }
  const step = () => { at = addHours(at, intIn(r, 1, 30)) }

  // 1. Creation — integrated orders arrive from the customer ERP.
  push('Order Creation', manual ? user : { changedBy: 'System', source: 'ERP' })

  const path = LIFECYCLE_PATH[row.orderStatus]
  if (path === null) return rows // Draft

  // 2. Edits (manual and integrated alike — a customer re-sends, a planner
  //    corrects). 0–2 header saves of 1–3 fields; a line save when lines exist.
  const headerSaves = intIn(r, 0, 2)
  for (let k = 0; k < headerSaves; k++) {
    step()
    const count = intIn(r, 1, 3)
    const changes = []
    const seen = new Set()
    while (changes.length < count) {
      const c = headerChange(r, row)
      if (!seen.has(c.field)) { seen.add(c.field); changes.push(c) }
    }
    push('Order Header Editing', manual ? { ...user, changes } : { changedBy: 'System', source: 'ERP', changes })
  }
  if (lines.length && r() < 0.5) {
    step()
    const line = pick(r, lines)
    push('Order Line Item Editing', { ...user, lineItemId: String(line.lineIdentifier), changes: [lineChange(r, line)] })
  }

  // 3. A past hold, released with an edit (header or line), on ~15% of orders.
  if (row.orderStatus !== 'Hold' && r() < 0.15) {
    step(); push('Order Applied on Hold', user)
    step()
    if (lines.length && r() < 0.4) {
      const line = pick(r, lines)
      push('Order Released from Hold (Line Item Editing)', { ...user, lineItemId: String(line.lineIdentifier), changes: [lineChange(r, line)] })
    } else {
      push('Order Released from Hold (Header Level Editing)', { ...user, changes: [headerChange(r, row)] })
    }
  }

  // 4. A partial cancellation on ~10% of multi-line orders that are not cancelled.
  if (lines.length > 1 && row.orderStatus !== 'Cancelled' && r() < 0.1) {
    step()
    push('Order Partial Cancellation', { ...user, lineItemId: String(pick(r, lines).lineIdentifier) })
  }

  // 5. Lifecycle — the planning system moves the order; each hop is a System row.
  let prev = 'Ready for Planning'
  for (const status of path) {
    step()
    push('Order Lifecycle Status Change', { changedBy: 'System', source: 'LINX', changes: [{ field: 'Status', oldValue: prev, newValue: status }] })
    prev = status
  }

  // 6. Terminal events.
  if (row.orderStatus === 'Hold') { step(); push('Order Applied on Hold', user) }
  if (row.orderStatus === 'Cancelled') { step(); push('Order Full Cancellation', user) }

  return rows
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run src/components/orders/audit-trail/auditTrail.test.js`
Expected: PASS (8 tests). If the `changeType` assertion in the blank-rules test fails on a *Released from Hold* row, the test's inline expression is wrong, not the module — simplify it to `expect(t.changeType).toBe(CATEGORY_TYPE[t.changeCategory])` importing `CATEGORY_TYPE`.

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/api/types/auditTrail.ts apps/odyssey-one/src/components/orders/audit-trail/auditTrail.js apps/odyssey-one/src/components/orders/audit-trail/auditTrail.test.js
git commit -m "S147: audit trail derive — an order's trail from its own row + lines, PRNG keyed on the order number"
```

---

### Task 2: Service seam + live mapper + query hook

**Files:**
- Modify: `apps/odyssey-one/src/api/services/orderService.ts` (append after `getOrderView`, ~line 830)
- Create: `apps/odyssey-one/src/api/mappers/mapAuditReportRow.ts`
- Create: `apps/odyssey-one/src/api/queries/useAuditTrail.ts`
- Test: `apps/odyssey-one/src/api/services/orderService.auditTrail.test.ts`, `apps/odyssey-one/src/api/mappers/mapAuditReportRow.test.ts`

- [ ] **Step 1: Write the failing service + mapper tests**

```ts
// apps/odyssey-one/src/api/services/orderService.auditTrail.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ordersFixture from '../../data/orders.json'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock'), getApiBaseUrl: () => '' }))
vi.mock('../client', () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPatch: vi.fn(), apiPut: vi.fn() }))

import { getApiMode } from '../config'
import { apiPost } from '../client'
import { getAuditTrail } from './orderService'

const numbered = (ordersFixture as any[]).find((r) => r.orderNumber && r.orderStatus === 'Planned Shipment')

describe('getAuditTrail (mock)', () => {
  beforeEach(() => { (getApiMode as any).mockReturnValue('mock') })

  it('pages newest-first by default and reports the total + order meta', async () => {
    const page = await getAuditTrail({ orderNumber: numbered.orderNumber, pageNumber: 1, pageSize: 25, sortDirection: 'desc' })
    expect(page.order?.orderNumber).toBe(numbered.orderNumber)
    expect(page.order?.orderSource).toBe('Integrated')
    expect(page.totalCount).toBeGreaterThan(1)
    expect(page.rows.length).toBe(Math.min(25, page.totalCount))
    for (let k = 1; k < page.rows.length; k++) expect(page.rows[k].timestamp <= page.rows[k - 1].timestamp).toBe(true)
    // the creation row is the OLDEST — last in desc order
    const all = await getAuditTrail({ orderNumber: numbered.orderNumber, pageNumber: 1, pageSize: 40, sortDirection: 'desc' })
    expect(all.rows[all.rows.length - 1].changeCategory).toBe('Order Creation')
  })

  it('asc puts creation first; page 2 continues where page 1 stopped', async () => {
    const p1 = await getAuditTrail({ orderNumber: numbered.orderNumber, pageNumber: 1, pageSize: 2, sortDirection: 'asc' })
    const p2 = await getAuditTrail({ orderNumber: numbered.orderNumber, pageNumber: 2, pageSize: 2, sortDirection: 'asc' })
    expect(p1.rows[0].changeCategory).toBe('Order Creation')
    expect(p1.rows.map((r) => r.id)).not.toContain(p2.rows[0]?.id)
    expect(p1.totalCount).toBe(p2.totalCount)
  })

  it('unknown order → empty page with order: null', async () => {
    const page = await getAuditTrail({ orderNumber: 'NOPE', pageNumber: 1, pageSize: 25, sortDirection: 'desc' })
    expect(page).toEqual({ rows: [], totalCount: 0, order: null })
  })
})

describe('getAuditTrail (live)', () => {
  it('POSTs /order-service/v3/audit-report with the paging + sort and maps the rows', async () => {
    ;(getApiMode as any).mockReturnValue('live')
    ;(apiPost as any).mockResolvedValueOnce({
      order: { orderNumber: '0000000091000', orderSource: 'INTEGRATED', createdAt: '2026-05-29T04:45:00', createdTimeZoneCode: 'CDT', createdBy: 'ERP' },
      pagination: { pageNumber: 1, pageSize: 25, totalCount: 1 },
      data: [{
        auditId: 7, changeTimestamp: '2026-05-29T04:45:00', timeZoneCode: 'CDT', changeMadeBy: 'SYSTEM', source: 'ERP',
        changeType: 'ORDER_ACTION', changeCategory: 'ORDER_CREATION', lineItemId: null, changes: [],
      }],
    })
    const page = await getAuditTrail({ orderNumber: '0000000091000', pageNumber: 1, pageSize: 25, sortDirection: 'desc' })
    expect(apiPost).toHaveBeenCalledWith('/order-service/v3/audit-report', {
      orderNumber: '0000000091000',
      pagination: { pageNumber: 1, pageSize: 25 },
      sort: { field: 'changeTimestamp', direction: 'desc' },
    })
    expect(page.totalCount).toBe(1)
    expect(page.order?.orderSource).toBe('Integrated')
    expect(page.rows[0]).toMatchObject({ id: '7', changedBy: 'System', changeType: 'Order Action', changeCategory: 'Order Creation', lineItemId: null })
  })
})
```

```ts
// apps/odyssey-one/src/api/mappers/mapAuditReportRow.test.ts
import { describe, it, expect } from 'vitest'
import { mapAuditReportRow } from './mapAuditReportRow'

describe('mapAuditReportRow', () => {
  it('maps enum codes to the AC labels and a user actor to "email · name"', () => {
    const row = mapAuditReportRow({
      auditId: 12, changeTimestamp: '2026-09-10T14:30:00', timeZoneCode: 'CDT',
      changeMadeBy: 'USER', userEmail: 'jane@odyssey.local', userName: 'Jane Doe',
      changeType: 'ORDER_EVENT', changeCategory: 'HOLD_RELEASED_LINE', lineItemId: 3,
      changes: [{ fieldName: 'Gross Weight', oldValue: '100 lb', newValue: '150 lb' }],
    })
    expect(row).toEqual({
      id: '12', timestamp: '2026-09-10T14:30:00', timeZoneCode: 'CDT',
      changedBy: 'User', source: 'jane@odyssey.local · Jane Doe',
      changeType: 'Order Event', changeCategory: 'Order Released from Hold (Line Item Editing)',
      lineItemId: '3', changes: [{ field: 'Gross Weight', oldValue: '100 lb', newValue: '150 lb' }],
    })
  })
  it('passes an already-labelled category through and tolerates missing pieces', () => {
    const row = mapAuditReportRow({ auditId: 1, changeTimestamp: '2026-01-01T00:00:00', changeMadeBy: 'SYSTEM', source: 'LINX', changeType: 'Order Event', changeCategory: 'Order Full Cancellation' })
    expect(row.changeCategory).toBe('Order Full Cancellation')
    expect(row.source).toBe('LINX')
    expect(row.timeZoneCode).toBe('')
    expect(row.lineItemId).toBeNull()
    expect(row.changes).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/odyssey-one && npx vitest run src/api/services/orderService.auditTrail.test.ts src/api/mappers/mapAuditReportRow.test.ts`
Expected: FAIL — `getAuditTrail` is not exported / module `./mapAuditReportRow` not found.

- [ ] **Step 3: Write the mapper**

```ts
// apps/odyssey-one/src/api/mappers/mapAuditReportRow.ts
import type { AuditChangeCategory, AuditChangeType, AuditTrailRow } from '../types/auditTrail'

/**
 * Live wire row → AuditTrailRow. The /v3/audit-report field table is an IMAGE
 * in LINX-8457 that the Jira export did not carry (Q-AT-2), so this shape is
 * ASSUMED from LINX-9730's diff output + the AC's column list, and every field
 * is read tolerantly. Adjust the two code maps when Venkata's shape lands —
 * nothing else should need to move.
 */
export interface AuditReportWireRow {
  auditId: number | string
  changeTimestamp: string
  timeZoneCode?: string
  changeMadeBy: string            // 'USER' | 'SYSTEM' (or already 'User' / 'System')
  userEmail?: string
  userName?: string
  source?: string                 // system name when SYSTEM
  changeType: string              // 'ORDER_ACTION' | 'ORDER_EVENT' | label
  changeCategory: string          // code | label
  lineItemId?: number | string | null
  changes?: Array<{ fieldName?: string; field?: string; oldValue?: unknown; newValue?: unknown }>
}

const TYPE: Record<string, AuditChangeType> = {
  ORDER_ACTION: 'Order Action', ORDER_EVENT: 'Order Event',
  'Order Action': 'Order Action', 'Order Event': 'Order Event',
}
const CATEGORY: Record<string, AuditChangeCategory> = {
  ORDER_CREATION: 'Order Creation',
  ORDER_HEADER_EDITING: 'Order Header Editing',
  ORDER_LINE_ITEM_EDITING: 'Order Line Item Editing',
  STATUS_CHANGE: 'Order Lifecycle Status Change',
  HOLD_APPLIED: 'Order Applied on Hold',
  HOLD_RELEASED_HEADER: 'Order Released from Hold (Header Level Editing)',
  HOLD_RELEASED_LINE: 'Order Released from Hold (Line Item Editing)',
  ORDER_CANCELLATION_PARTIAL: 'Order Partial Cancellation',
  ORDER_CANCELLATION_FULL: 'Order Full Cancellation',
}
const str = (v: unknown) => (v == null ? '' : String(v))

export function mapAuditReportRow(w: AuditReportWireRow): AuditTrailRow {
  const isUser = String(w.changeMadeBy).toUpperCase() === 'USER'
  const source = isUser
    ? [w.userEmail, w.userName].filter(Boolean).join(' · ')
    : (w.source ?? '')
  return {
    id: String(w.auditId),
    timestamp: w.changeTimestamp,
    timeZoneCode: w.timeZoneCode ?? '',
    changedBy: isUser ? 'User' : 'System',
    source,
    changeType: TYPE[w.changeType] ?? (w.changeType as AuditChangeType),
    changeCategory: CATEGORY[w.changeCategory] ?? (w.changeCategory as AuditChangeCategory),
    lineItemId: w.lineItemId == null ? null : String(w.lineItemId),
    changes: (w.changes ?? []).map((c) => ({ field: str(c.fieldName ?? c.field), oldValue: str(c.oldValue), newValue: str(c.newValue) })),
  }
}
```

- [ ] **Step 4: Append `getAuditTrail` to the service**

Add these imports at the top of `orderService.ts` (next to the other type imports):

```ts
import type { AuditTrailPage, AuditTrailRequest, AuditTrailOrderMeta } from '../types/auditTrail'
import { mapAuditReportRow, type AuditReportWireRow } from '../mappers/mapAuditReportRow'
import { deriveAuditTrail } from '../../data/auditTrail.js'
```

Append after `getOrderView` (end of file):

```ts
/**
 * Order Audit Trail (LINX-8091 / LINX-9128, ORD-27). live → POST
 * /order-service/v3/audit-report (LINX-8457), paged + sorted server-side.
 * mock → derive the trail from the seeded row (auditTrail.js), then sort +
 * 1-based paginate exactly like getOrderList does over orders.json. Both
 * return the same page shape so the table never knows the mode.
 */
function auditOrderMeta(row: OrderListRow, createdBy: string): AuditTrailOrderMeta {
  return {
    orderNumber: row.orderNumber,
    orderSource: row.orderSource === 'MANUAL' ? 'Manual' : 'Integrated',
    createdAt: row.createdAt ?? '',
    createdTimeZoneCode: row.createdTimeZoneCode ?? '',
    createdBy,
  }
}

export async function getAuditTrail(req: AuditTrailRequest): Promise<AuditTrailPage> {
  if (getApiMode() === 'live') {
    const res = await apiPost<{
      order: { orderNumber: string; orderSource: string; createdAt: string; createdTimeZoneCode?: string; createdBy?: string } | null
      pagination: { pageNumber: number; pageSize: number; totalCount: number }
      data: AuditReportWireRow[]
    }>('/order-service/v3/audit-report', {
      orderNumber: req.orderNumber,
      pagination: { pageNumber: req.pageNumber, pageSize: req.pageSize },
      sort: { field: 'changeTimestamp', direction: req.sortDirection },
    })
    const o = res.order
    return {
      rows: (res.data ?? []).map(mapAuditReportRow),
      totalCount: res.pagination?.totalCount ?? 0,
      order: o
        ? { orderNumber: o.orderNumber, orderSource: o.orderSource === 'MANUAL' ? 'Manual' : 'Integrated', createdAt: o.createdAt, createdTimeZoneCode: o.createdTimeZoneCode ?? '', createdBy: o.createdBy ?? '' }
        : null,
    }
  }

  const row = overlayRows.find(r => r.orderNumber === req.orderNumber)
    ?? (getAllOrders() as OrderListRow[]).find(r => r.orderNumber === req.orderNumber)
  if (!row) return { rows: [], totalCount: 0, order: null }

  const trail = deriveAuditTrail(row, getOrderEnrichment(req.orderNumber))
  const sorted = req.sortDirection === 'asc' ? trail : [...trail].reverse() // derive is oldest → newest
  const start = (req.pageNumber - 1) * req.pageSize
  return {
    rows: sorted.slice(start, start + req.pageSize),
    totalCount: trail.length,
    order: auditOrderMeta(row, trail[0].source),
  }
}
```

- [ ] **Step 5: Write the query hook**

```ts
// apps/odyssey-one/src/api/queries/useAuditTrail.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getAuditTrail } from '../services/orderService'
import type { AuditTrailRequest } from '../types/auditTrail'

// Per-order audit trail page. keepPreviousData so a page/sort change keeps the
// rows on screen (DataTable `loadingRows`) instead of collapsing to a spinner.
export function useAuditTrail(req: AuditTrailRequest) {
  return useQuery({
    queryKey: ['audit-trail', req.orderNumber, req.pageNumber, req.pageSize, req.sortDirection],
    queryFn: () => getAuditTrail(req),
    enabled: !!req.orderNumber,
    placeholderData: keepPreviousData,
  })
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run src/api/services/orderService.auditTrail.test.ts src/api/mappers/mapAuditReportRow.test.ts src/api/services/`
Expected: PASS — the two new files plus every existing `orderService*.test.ts` still green (the new imports must not break the existing mocks of `../config` / `../client`).

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/src/api/services/orderService.ts apps/odyssey-one/src/api/services/orderService.auditTrail.test.ts apps/odyssey-one/src/api/mappers/mapAuditReportRow.ts apps/odyssey-one/src/api/mappers/mapAuditReportRow.test.ts apps/odyssey-one/src/api/queries/useAuditTrail.ts
git commit -m "S147: getAuditTrail seam — mock sort/page over the derive, live POST /v3/audit-report behind one page shape"
```

---

### Task 3: Column definitions — timestamp format, value stacks, `--`

**Files:**
- Create: `apps/odyssey-one/src/components/orders/audit-trail/auditTrailColumns.jsx`
- Create: `apps/odyssey-one/src/components/orders/audit-trail/audit-trail.css`
- Test: `apps/odyssey-one/src/components/orders/audit-trail/auditTrailColumns.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// @vitest-environment jsdom
// apps/odyssey-one/src/components/orders/audit-trail/auditTrailColumns.test.jsx
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { AUDIT_TRAIL_COLUMNS, formatAuditTimestamp, ChangeStack } from './auditTrailColumns.jsx'

afterEach(cleanup)

const headers = () => AUDIT_TRAIL_COLUMNS.map((c) => c.header)

describe('auditTrailColumns', () => {
  it('lists the AC columns in order, without Order ID (it lives in the page header)', () => {
    expect(headers()).toEqual([
      'Date & Timestamp', 'Change Made By', 'Source', 'Change Type', 'Change Category',
      'Line Item ID', 'Field Name', 'Old Value', 'New Value',
    ])
  })
  it('only Date & Timestamp is sortable (AC §I remarks)', () => {
    const sortable = AUDIT_TRAIL_COLUMNS.filter((c) => c.enableSorting !== false).map((c) => c.header)
    expect(sortable).toEqual(['Date & Timestamp'])
  })
  it('formats MM/DD/YYYY HH:MM 24-hour with the zone', () => {
    expect(formatAuditTimestamp('2026-05-23T14:30:00', 'CDT')).toBe('05/23/2026 14:30 CDT')
    expect(formatAuditTimestamp('2026-01-05T08:05:00', '')).toBe('01/05/2026 08:05')
    expect(formatAuditTimestamp('', 'CDT')).toBe('--')
  })
  it('ChangeStack renders one line per change, Old gray / New purple badges, and "--" when empty', () => {
    const changes = [
      { field: 'Gross Weight', oldValue: '200 LB', newValue: '350 LB' },
      { field: 'Equipment', oldValue: 'LTR', newValue: 'FTL' },
    ]
    const { container: fields } = render(<ChangeStack changes={changes} part="field" />)
    expect(within(fields).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Gross Weight', 'Equipment'])

    const { container: olds } = render(<ChangeStack changes={changes} part="oldValue" />)
    const oldBadges = olds.querySelectorAll('.badge')
    expect(oldBadges).toHaveLength(2)
    expect(oldBadges[0].textContent).toBe('200 LB')
    expect(getComputedStyle(oldBadges[0]).backgroundColor).toBe('var(--badge-gray-bg)')

    const { container: news } = render(<ChangeStack changes={changes} part="newValue" />)
    const newBadges = news.querySelectorAll('.badge')
    expect(newBadges[1].textContent).toBe('FTL')
    expect(getComputedStyle(newBadges[1]).backgroundColor).toBe('var(--badge-purple-bg)')
    expect(news.querySelector('svg')).toBeNull() // no alarm icon — a change is not a fault

    const { container: empty } = render(<ChangeStack changes={[]} part="field" />)
    expect(empty.textContent).toBe('--')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/odyssey-one && npx vitest run src/components/orders/audit-trail/auditTrailColumns.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the columns + CSS**

```jsx
// apps/odyssey-one/src/components/orders/audit-trail/auditTrailColumns.jsx
import { createColumnHelper } from '@tanstack/react-table'
import { Badge } from '@odyssey/ui'

/**
 * Audit Trail columns (LINX-8091 / LINX-9128 §I, ORD-27). Order ID is NOT a
 * column — the trail is per order, so it repeats on every row; it lives in the
 * page header. Only Date & Timestamp sorts (AC remarks name it and Order ID;
 * the other seven are not sortable). Blank cells render '--' under a header
 * that still shows (AC legend).
 */
const col = createColumnHelper()
const BLANK = '--'

// AC: "Date in MM/DD/YYYY & Time in HH:MM 24-hour format". The zone is ours
// (the AC has none) — same abbreviation the order's createdTimeZoneCode carries.
export function formatAuditTimestamp(iso, zone) {
  if (!iso) return BLANK
  const [d, t = ''] = iso.split('T')
  const [y, m, day] = d.split('-')
  const hm = t.slice(0, 5)
  return [`${m}/${day}/${y} ${hm}`, zone].filter(Boolean).join(' ')
}

/**
 * One cell of the three value columns. `changes` is the row's LIST (AC Notes §1
 * — one row per save, all fields listed; Q-AT-1). Rendered as a vertical stack
 * so the three columns align line-for-line; a one-field change is a one-line
 * stack. Old = gray, New = purple, NO icon — a change is not a fault (S144
 * StopBadge rule; user 2026-09-14).
 */
export function ChangeStack({ changes, part }) {
  if (!changes?.length) return BLANK
  return (
    <ul className="audit-stack">
      {changes.map((c, i) => (
        <li key={`${c.field}-${i}`}>
          {part === 'field'
            ? c.field
            : <Badge variant={part === 'oldValue' ? 'gray' : 'purple'}>{c[part] || BLANK}</Badge>}
        </li>
      ))}
    </ul>
  )
}

export const AUDIT_TRAIL_COLUMNS = [
  col.accessor('timestamp', {
    id: 'timestamp',
    header: 'Date & Timestamp',
    cell: ({ row }) => formatAuditTimestamp(row.original.timestamp, row.original.timeZoneCode),
    meta: { cellClass: 'odyssey-table__cell--title text-label-sm-medium' },
  }),
  col.accessor('changedBy', { header: 'Change Made By', enableSorting: false }),
  col.accessor('source', { header: 'Source', enableSorting: false }),
  col.accessor('changeType', {
    header: 'Change Type',
    enableSorting: false,
    cell: ({ getValue }) => <Badge variant={getValue() === 'Order Action' ? 'blue' : 'gray'}>{getValue()}</Badge>,
  }),
  col.accessor('changeCategory', { header: 'Change Category', enableSorting: false }),
  col.accessor('lineItemId', { header: 'Line Item ID', enableSorting: false, cell: ({ getValue }) => getValue() ?? BLANK }),
  col.display({ id: 'field', header: 'Field Name', enableSorting: false, cell: ({ row }) => <ChangeStack changes={row.original.changes} part="field" /> }),
  col.display({ id: 'oldValue', header: 'Old Value', enableSorting: false, cell: ({ row }) => <ChangeStack changes={row.original.changes} part="oldValue" /> }),
  col.display({ id: 'newValue', header: 'New Value', enableSorting: false, cell: ({ row }) => <ChangeStack changes={row.original.changes} part="newValue" /> }),
]
```

```css
/* apps/odyssey-one/src/components/orders/audit-trail/audit-trail.css
   Audit Trail page (ORD-27) — same shell shape as order-change.css: AppShell's
   <main> carries the page padding; this page is crumbs → PageHeader → table. */
.audit-trail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
  padding-bottom: var(--spacing-8);
}
.audit-trail__crumbs {
  display: flex;
  align-items: center;
}
.audit-trail__content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}
.audit-trail__status {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-8);
  color: var(--text-tertiary);
}
/* The three value columns stack one line per changed field, aligned across
   Field / Old / New because every stack has the same length and line height. */
.audit-stack {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}
.audit-stack li {
  min-height: 24px; /* the Badge's height, so text lines and badge lines stay level */
  display: flex;
  align-items: center;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run src/components/orders/audit-trail/auditTrailColumns.test.jsx`
Expected: PASS (4 tests). If the `backgroundColor` assertions come back as `''`, jsdom dropped the inline `var()` — assert on `oldBadges[0].getAttribute('style')` containing `--badge-gray-bg` / `--badge-purple-bg` instead.

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/components/orders/audit-trail/auditTrailColumns.jsx apps/odyssey-one/src/components/orders/audit-trail/auditTrailColumns.test.jsx apps/odyssey-one/src/components/orders/audit-trail/audit-trail.css
git commit -m "S147: audit trail columns — AC order, timestamp sort only, aligned change stacks, gray/purple values with no alarm"
```

---

### Task 4: `AuditTrailTable` — TanStack + DataTable + Paginator

**Files:**
- Create: `apps/odyssey-one/src/components/orders/audit-trail/AuditTrailTable.jsx`
- Test: `apps/odyssey-one/src/components/orders/audit-trail/AuditTrailTable.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// @vitest-environment jsdom
// apps/odyssey-one/src/components/orders/audit-trail/AuditTrailTable.test.jsx
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import AuditTrailTable from './AuditTrailTable.jsx'

afterEach(cleanup)

const rows = [
  { id: 'a-1', timestamp: '2026-05-25T10:00:00', timeZoneCode: 'CDT', changedBy: 'System', source: 'LINX', changeType: 'Order Event', changeCategory: 'Order Lifecycle Status Change', lineItemId: null, changes: [{ field: 'Status', oldValue: 'Ready for Planning', newValue: 'Planned Load' }] },
  { id: 'a-0', timestamp: '2026-05-23T14:30:00', timeZoneCode: 'CDT', changedBy: 'User', source: 'ben.planner@odyssey.local · Ben Planner', changeType: 'Order Action', changeCategory: 'Order Creation', lineItemId: null, changes: [] },
]

function renderTable(over = {}) {
  const props = {
    rows, totalCount: 57,
    pagination: { pageIndex: 0, pageSize: 25 }, onPaginationChange: vi.fn(),
    sorting: [{ id: 'timestamp', desc: true }], onSortingChange: vi.fn(),
    ...over,
  }
  return { ...render(<AuditTrailTable {...props} />), props }
}

describe('AuditTrailTable', () => {
  it('renders the nine headers, the rows, and "--" for blank cells', () => {
    renderTable()
    const table = screen.getByRole('table', { name: 'Audit trail' })
    expect(within(table).getAllByRole('columnheader')).toHaveLength(9)
    expect(screen.getByText('05/23/2026 14:30 CDT')).toBeTruthy()
    expect(screen.getByText('Order Creation')).toBeTruthy()
    // creation row: Line Item ID, Field, Old, New all blank
    const creation = screen.getByText('Order Creation').closest('tr')
    expect(within(creation).getAllByText('--')).toHaveLength(4)
  })
  it('pages with the AC options (10–40 by 5), default 25, and reports "Showing 1 to 25 of 57 results"', () => {
    renderTable()
    expect(screen.getByText(/Showing 1 to 25 of 57 results/)).toBeTruthy()
    // the Paginator's rows-per-page select carries exactly the AC's values
    const select = screen.getByLabelText(/Rows per page/i)
    expect(select.value).toBe('25')
  })
  it('lifts a header click on Date & Timestamp to onSortingChange and nothing on the other headers', () => {
    const { props } = renderTable()
    fireEvent.click(screen.getByRole('button', { name: /Date & Timestamp/ }))
    expect(props.onSortingChange).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /Change Category/ })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run src/components/orders/audit-trail/AuditTrailTable.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the table**

```jsx
// apps/odyssey-one/src/components/orders/audit-trail/AuditTrailTable.jsx
import { useReactTable, getCoreRowModel } from '@tanstack/react-table'
import { DataTable, Paginator } from '@odyssey/ui'
import { AUDIT_TRAIL_COLUMNS } from './auditTrailColumns.jsx'
import './audit-trail.css'

/**
 * AuditTrailTable — the normalized DataTable shell over the per-order trail
 * (ORD-27). Same server-driven configuration as OrdersTable: manual paging and
 * sorting, both lifted to the route, which owns the query. No row selection,
 * no row actions — the trail is read-only (Ramesh: "nothing, nothing").
 * Paginator's default options are already the AC's 10–40 step 5.
 */
export default function AuditTrailTable({
  rows,
  totalCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  loading = false,
  loadingRows = false,
}) {
  const table = useReactTable({
    data: rows,
    columns: AUDIT_TRAIL_COLUMNS,
    state: { pagination, sorting },
    onPaginationChange,
    onSortingChange,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: totalCount,
  })

  return (
    <DataTable
      table={table}
      // AppShell's <main> is the scroller and carries padding-top: --spacing-8;
      // with no toolbar to compensate, a top:0 header parks below the clip edge
      // (DataTable.jsx S79b note). ShipmentTable's idiom for a toolbar-less page.
      stickyTop="calc(-1 * var(--spacing-8))"
      loading={loading}
      loadingRows={loadingRows}
      ariaLabel="Audit trail"
      sortable
      footer={<Paginator table={table} />}
    />
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/odyssey-one && npx vitest run src/components/orders/audit-trail/AuditTrailTable.test.jsx`
Expected: PASS (3 tests). If the sort-button query fails, read how `DataTable.jsx` renders a sortable header (grep `aria-sort` / `button` near line 195) and match its accessible name; if `getByLabelText(/Rows per page/)` fails, the label is a sibling `<span>` — query the `combobox`/`select` inside `.paginator` and assert its value instead.

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/components/orders/audit-trail/AuditTrailTable.jsx apps/odyssey-one/src/components/orders/audit-trail/AuditTrailTable.test.jsx
git commit -m "S147: AuditTrailTable — DataTable + Paginator, manual paging/sorting lifted to the route"
```

---

### Task 5: The route — shell, breadcrumb, header, states

**Files:**
- Create: `apps/odyssey-one/src/routes/orders/OrderAuditTrailRoute.jsx`
- Modify: `apps/odyssey-one/src/App.jsx` (import next to line 9; route after line 80)
- Test: `apps/odyssey-one/src/routes/orders/OrderAuditTrailRoute.test.jsx`

- [ ] **Step 1: Write the failing route test**

```jsx
// @vitest-environment jsdom
// apps/odyssey-one/src/routes/orders/OrderAuditTrailRoute.test.jsx
import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrderAuditTrailRoute from './OrderAuditTrailRoute.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import ordersFixture from '../../data/orders.json'

const ORDER = ordersFixture.find((r) => r.orderNumber && r.orderStatus === 'Planned Shipment')
if (!ORDER) throw new Error('No Planned Shipment seeded order — regenerate the fixtures.')

function renderRoute(orderId) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <EditModeProvider>
        <CreateOrderModeProvider>
          <CustomersProvider>
            <MemoryRouter initialEntries={[`/orders/${orderId}/audit-trail`]}>
              <Routes>
                <Route path="/orders/:orderId/audit-trail" element={<OrderAuditTrailRoute />} />
                <Route path="/orders/:orderId" element={<div>view order page</div>} />
                <Route path="/orders" element={<div>orders list</div>} />
              </Routes>
            </MemoryRouter>
          </CustomersProvider>
        </CreateOrderModeProvider>
      </EditModeProvider>
    </QueryClientProvider>,
  )
}

afterEach(cleanup)

describe('OrderAuditTrailRoute', () => {
  test('breadcrumb Orders › View order <n> › Audit Trail, header carries the order, table renders newest-first', async () => {
    renderRoute(ORDER.orderNumber)
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Audit Trail' })).toBeTruthy())
    expect(screen.getByText('Orders')).toBeTruthy()
    expect(screen.getByText(`View order ${ORDER.orderNumber}`)).toBeTruthy()
    expect(screen.getAllByText('Audit Trail').some((el) => el.getAttribute('aria-current') === 'page')).toBe(true)
    expect(screen.getByText(new RegExp(`Order ${ORDER.orderNumber} · Integrated · Created`))).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('table', { name: 'Audit trail' })).toBeTruthy())
    const cells = screen.getAllByRole('row').slice(1).map((tr) => tr.querySelector('td')?.textContent)
    for (let k = 1; k < cells.length; k++) expect(cells[k] <= cells[k - 1]).toBe(true)
  })

  test('the middle crumb navigates back to View Order; the navbar close does too', async () => {
    renderRoute(ORDER.orderNumber)
    await waitFor(() => expect(screen.getByText(`View order ${ORDER.orderNumber}`)).toBeTruthy())
    fireEvent.click(screen.getByText(`View order ${ORDER.orderNumber}`))
    await waitFor(() => expect(screen.getByText('view order page')).toBeTruthy())
  })

  test('unknown order → "Order not found" empty state', async () => {
    renderRoute('NOPE')
    await waitFor(() => expect(screen.getByText('Order not found')).toBeTruthy())
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run src/routes/orders/OrderAuditTrailRoute.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the route**

```jsx
// apps/odyssey-one/src/routes/orders/OrderAuditTrailRoute.jsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { Breadcrumb, Button, EmptyState, PageHeader } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import AuditTrailTable from '../../components/orders/audit-trail/AuditTrailTable.jsx'
import { formatAuditTimestamp } from '../../components/orders/audit-trail/auditTrailColumns.jsx'
import { useAuditTrail } from '../../api/queries/useAuditTrail'
import '../../components/orders/orders.css'
import '../../components/orders/audit-trail/audit-trail.css'

/**
 * Order Audit Trail — /orders/:orderId/audit-trail (LINX-8091 / LINX-9128,
 * ORD-27). The Edit Shipment Stops shell pattern: AppShell in title mode
 * (compact navbar, centred title, ✕ back to View Order), breadcrumb
 * `Orders › View order <n> › Audit Trail`, then a PageHeader whose supporting
 * text carries what the AC lists as the Order ID column — constant on every
 * row of a per-order log, so it lives here instead. Entered from the Orders
 * grid ⋮ menu (user ruling 2026-09-14: no secondary button, no tab).
 *
 * Paging + sorting are route state so the query key tracks them; the table is
 * a pure shell. Default 25 rows, newest first (AC §I / §II).
 */
export default function OrderAuditTrailRoute() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
  const [sorting, setSorting] = useState([{ id: 'timestamp', desc: true }])
  const back = () => navigate(`/orders/${encodeURIComponent(orderId)}`)

  const { data, isPending, isError, isPlaceholderData, refetch } = useAuditTrail({
    orderNumber: orderId,
    pageNumber: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sortDirection: sorting[0]?.desc === false ? 'asc' : 'desc',
  })

  const order = data?.order
  const supporting = order
    ? `Order ${order.orderNumber} · ${order.orderSource} · Created ${formatAuditTimestamp(order.createdAt, order.createdTimeZoneCode)} by ${order.createdBy}`
    : null

  return (
    <AppShell titleMode={{ title: 'Audit Trail', onClose: back }}>
      <div className="audit-trail">
        <nav className="audit-trail__crumbs" aria-label="Breadcrumb">
          <Breadcrumb label="Orders" onClick={() => navigate('/orders')} />
          <Breadcrumb label={`View order ${orderId}`} onClick={back} />
          <Breadcrumb label="Audit Trail" current />
        </nav>

        {isPending ? (
          <div className="audit-trail__status text-label-sm-regular">Loading audit trail…</div>
        ) : isError ? (
          <div className="audit-trail__status">
            <span className="text-label-sm-regular">Something went wrong loading this audit trail.</span>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : !order ? (
          <EmptyState icon={<Inbox size={32} />} message="Order not found" />
        ) : (
          <div className="audit-trail__content">
            <PageHeader title="Audit Trail" supportingText={supporting} />
            <AuditTrailTable
              rows={data.rows}
              totalCount={data.totalCount}
              pagination={pagination}
              onPaginationChange={setPagination}
              sorting={sorting}
              onSortingChange={setSorting}
              loadingRows={isPlaceholderData}
            />
          </div>
        )}
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 4: Register the route**

In `apps/odyssey-one/src/App.jsx`, next to the `OrderSummaryRoute` import (line 9):

```jsx
import OrderAuditTrailRoute from './routes/orders/OrderAuditTrailRoute.jsx'
```

and directly after `<Route path="/orders/:orderId" element={<OrderSummaryRoute />} />` (line 80):

```jsx
        <Route path="/orders/:orderId/audit-trail" element={<OrderAuditTrailRoute />} />
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run src/routes/orders/`
Expected: PASS — the 3 new tests plus `OrderSummaryRoute.breadcrumb.test.jsx` and `OrdersRoute.test.jsx` untouched. If `AppShell` in the test needs a provider the summary test does not wrap (the `SidebarContext` is above the router in `main.jsx`), copy the exact provider stack `OrderChangeEditStopsRoute`'s tests use — `grep -rn "SidebarProvider" src --include='*.test.jsx' | head -1`.

- [ ] **Step 6: Look at it**

Run: `cd apps/odyssey-one && VITE_API_MODE=mock npm run dev` — open `http://localhost:5173/orders/<a Planned Shipment order number from orders.json>/audit-trail`. Check: compact navbar with "Audit Trail" and ✕; three crumbs; H1 + supporting line; header row shows nine columns with the sort arrow on Date & Timestamp only; creation row is the last row with four `--`; Old values gray, New values purple, no icons; footer reads `Showing 1 to N of N results`, rows-per-page 25. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/src/routes/orders/OrderAuditTrailRoute.jsx apps/odyssey-one/src/routes/orders/OrderAuditTrailRoute.test.jsx apps/odyssey-one/src/App.jsx
git commit -m "S147: /orders/:orderId/audit-trail — title-mode shell, crumbs, PageHeader carries the order, states"
```

---

### Task 6: The ⋮ menu entry

**Files:**
- Modify: `apps/odyssey-one/src/components/orders/ordersColumns.jsx:120-124` (`allTabActionLabels`)
- Modify: `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx:201-226` (`handleRowAction`)
- Test: `apps/odyssey-one/src/components/orders/ordersColumns.test.jsx`

- [ ] **Step 1: Update the failing test**

In `ordersColumns.test.jsx`, replace the three `allTabActionLabels` expectations:

```jsx
  it('adapts All-tab actions per row (LINX-10233); Audit Trail on every Created row (ORD-27)', () => {
    expect(allTabActionLabels({ orderSource: 'Manual', status: 'Ready for Planning' })).toEqual(['View', 'Audit Trail', 'Edit', 'Copy', 'Cancel'])
    expect(allTabActionLabels({ orderSource: 'Integrated', status: 'Ready for Planning' })).toEqual(['View', 'Audit Trail', 'Copy'])
    expect(allTabActionLabels({ orderSource: 'Manual', status: 'Cancelled' })).toEqual(['View', 'Audit Trail', 'Copy', 'Restore'])
  })
```

and add, inside the `primaryRowAction` `it`:

```jsx
    // Audit Trail is never a row's primary action — opening a row reads or fixes it.
    expect(primaryRowAction({ status: 'Cancelled', orderSource: 'Integrated' })).toBe('View')
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run src/components/orders/ordersColumns.test.jsx`
Expected: FAIL — arrays differ (no `'Audit Trail'`).

- [ ] **Step 3: Add the label + the branch**

`ordersColumns.jsx` — replace `allTabActionLabels`:

```jsx
// Created-tab ⋮ options are per-row (LINX-10233): Edit/Cancel are Manual-only;
// Restore only on Cancelled orders. Audit Trail on EVERY row (ORD-27) — a
// cancelled order still has a trail, it just stopped growing. Not on Draft
// (no trail yet) nor Validation Errors (not an order yet).
export function allTabActionLabels(row) {
  if (row.status === 'Cancelled') return ['View', 'Audit Trail', 'Copy', 'Restore']
  if (row.orderSource === 'Manual') return ['View', 'Audit Trail', 'Edit', 'Copy', 'Cancel']
  return ['View', 'Audit Trail', 'Copy']
}
```

`OrdersRoute.jsx` — in `handleRowAction`, after the `View` line:

```jsx
    else if (action === 'Audit Trail') navigate(`/orders/${encodeURIComponent(row.id)}/audit-trail`)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run src/components/orders/ src/routes/orders/`
Expected: PASS. `primaryRowAction` is unchanged — its precedence never returns `'Audit Trail'` because it only looks for Resolve/Edit and falls back to View.

- [ ] **Step 5: Full suite**

Run: `cd apps/odyssey-one && npx vitest run`
Expected: all green; count ≈ 2584 + 21 new (the number printed is the fact to record in the wrap).

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/components/orders/ordersColumns.jsx apps/odyssey-one/src/components/orders/ordersColumns.test.jsx apps/odyssey-one/src/routes/orders/OrdersRoute.jsx
git commit -m "S147: Audit Trail in the Created-tab ⋮ menu — every row, never the primary action"
```

---

### Task 7 (added after the browser check): live endpoint `POST /order-service/v3/audit-report`

**Why:** the user's default dev loop is live mode (`.env.local` `VITE_API_MODE=live`), so the page 404'd on first open. No reseed — the trail is computed from the order, and Neon already has the rows. The function reuses the SAME pure derive the mock path uses.

**Files:**
- Modify: `apps/odyssey-one/api/_lib/orders.mjs` (append `auditReport` handler + `buildAuditReportQuery`)
- Modify: `apps/odyssey-one/api/_lib/router.mjs` (one route line)
- Test: `apps/odyssey-one/api/_lib/orders.test.mjs`

**Wire contract (what the client already sends/reads — `orderService.ts getAuditTrail` live branch):**
request `{ orderNumber, pagination: { pageNumber, pageSize }, sort: { field: 'changeTimestamp', direction: 'asc'|'desc' } }` → response `{ order: { orderNumber, orderSource ('MANUAL'|'INTEGRATED'), createdAt, createdTimeZoneCode, createdBy } | null, pagination: { pageNumber, pageSize, totalCount }, data: AuditReportWireRow[] }` where each wire row is `{ auditId, changeTimestamp, timeZoneCode, changeMadeBy: 'USER'|'SYSTEM', userEmail?, userName?, source?, changeType, changeCategory, lineItemId, changes: [{ fieldName, oldValue, newValue }] }` (labels are accepted as-is by `mapAuditReportRow`'s passthrough).

**Handler:** resolve the row exactly like `orderView` (`buildOrderViewQuery(key)` — handles `pending-<id>`); 404 → `{ order: null, pagination: {…, totalCount: 0}, data: [] }` (not a thrown 404 — the page's "Order not found" state reads `order: null`); `createdAt` arrives as a pg `Date` (timestamptz) → `toISOString().slice(0, 19)` so the derive gets the local-naive shape (same UTC clock the live grid already shows); run `deriveAuditTrail(row, manualOrder)` imported from `../../src/data/auditTrail.js` (pure; its only import chain is `master-data.js` → `tools/data-pools.mjs`, no faker, no browser APIs); sort (`asc` keep / `desc` reverse a copy), 1-based page; map each `AuditTrailRow` → wire row (`auditId: row.id`, `changeTimestamp: row.timestamp`, `changeMadeBy: row.changedBy.toUpperCase()`, User → split `source` on ' · ' into `userEmail`/`userName`, System → `source`, `changes[].fieldName`); `order.createdBy` = the creation row's `source` (the oldest row).

**Tests (node:test, in `orders.test.mjs`, same fake-db style as `orderView`'s tests):** (1) route table has `POST /order-service/v3/audit-report` → `auditReport`; (2) a fake db returning one seeded-shaped row (with `created_at` as a `Date`, `manual_order` with two `orderLines`) yields `order.orderNumber`, `pagination.totalCount === data.length` when pageSize ≥ total, `data[data.length-1].changeCategory === 'Order Creation'` for desc, `data[0]` for asc, every `changeTimestamp` matching `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/`, USER rows carrying `userEmail`+`userName` and SYSTEM rows `source`; (3) empty rows → `{ order: null, pagination.totalCount 0, data: [] }`; (4) `pageNumber: 2, pageSize: 2` returns rows 3–4 of the asc order.

**Verify:** `node --test api/_lib/orders.test.mjs api/_lib/router.test.mjs`; then `npm run dev:api` in one terminal + `bun dev`/`npm run dev` in another (Vite prints `[api proxy] /api → http://localhost:3001`), open a Created-tab order → ⋮ → Audit Trail in LIVE mode. No deploy.

**Commit:** `S147: live audit-report endpoint — Neon row → the same derive; no reseed`

## Self-review (done at plan time)

- **Spec coverage:** entry point (T6), route + shell + crumbs + header with Order ID (T5), DataTable not GroupTable (T4), nine columns in AC order / sort on timestamp only / `--` / gray-purple no-icon badges / stacks for the list-per-row AC reading (T3), pagination 10–40/25 (Paginator default — asserted in T4), nine categories + Line Item ID blank rules + derived-from-the-order coherence (T1), mock/live seam + Q-AT-2 tolerant mapper (T2). Out of scope items (search, seconds, line-added category, Shipments trails, ui changes) have no task, as intended.
- **Spec amendment:** derive-at-read replaces generator seeding (stated at the top; the spec's *Data* section should be updated to match when the plan is accepted).
- **Type consistency:** `AuditTrailRow.changes[].{field,oldValue,newValue}` is what `ChangeStack` reads (`part` ∈ `field|oldValue|newValue`); `getAuditTrail(req: AuditTrailRequest)` is what `useAuditTrail` and the route call; `AuditTrailPage.order.createdBy` is the creation row's `source` string in both modes; `formatAuditTimestamp(iso, zone)` is shared by the columns and the header.
