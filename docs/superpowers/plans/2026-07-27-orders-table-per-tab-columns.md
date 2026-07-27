# Orders Table — Per-Tab Columns, Actions, Sorting, Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Orders grid so each tab (All / Draft / Validation Errors) renders its own Jira/Figma-specced column set with status-aware row actions, header sorting, standardized pagination, and Export-to-Excel.

**Architecture:** The three tabs keep ONE `OrdersTable` component that swaps column defs by a `tab` prop. New display fields ride the existing `OrderListRow → mapOrderListRow → OrderRowVM` pipeline (mapper stays the single reconciliation point). Mock mode gets new data purely from the regenerated `orders.json`; live mode needs a migration + reseed (gated — reseed and deploy ship together, only with the user's explicit go). Row selection/checkboxes are removed entirely.

**Tech Stack:** React 19, TanStack Table (manual pagination/sorting), `@odyssey/ui` DataTable/Paginator/Badge/ActionMenu/ModalMedium, Vitest, node:test (api), Neon Postgres, SheetJS (`xlsx`, dynamic import).

**Sources of truth (read before implementing):**
- `vault/10-domains/orders/research/jira-orders-table-columns-2026-07-26.md` — per-tab column spec, verbatim strings
- Figma verification (this session, S94): All = 15 flat columns, 3-line location cells, badge variants (Hazmat=amber, New=blue, Ready for Planning=green, Rating/Routing Failed=red); VE = Resolve secondary/sm button enabled only when Draft Order Status = Ready; Draft = kebab ⋮
- LINX-8091/9128 pagination: page sizes 10–40 step 5, default 25, "Showing X to Y of Z results"
- LINX-10233: All-tab ⋮ options are per-row — Manual: View/Edit/Copy/Cancel · Integrated: View/Copy · Cancelled: View/Copy/Restore
- LINX-9896 BR V: Export current tab → Excel, 25,000-row cap, exact error string
- User decisions (S94): NO row checkboxes · Filters button stays but `disabled` (decision pending — may be solved by global search) · Export button sits next to Filters · row-click → Order Summary stays · header sorting ON, toolbar sort-icon button removed · pagination setup becomes the standard for ALL domains using DataTable

**Out of scope:** Filter bank, Manage Columns, Custom Views, live Submit/Resolve backends (mock-first; live endpoints deferred), Long Order work, timezone display (our wire data carries no tz — format dates without tz suffix; flagged as open item).

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `apps/odyssey-one/src/api/types/orderList.ts` | Modify | +`hazardous`, `createdAt`, `createdBy`, `lastEditAt`, `draftOrderStatus`, `errorCount`; consignor/consignee +`name`, `address` |
| `apps/odyssey-one/src/api/types/orderRowVm.ts` | Modify | New VM fields for all three tabs |
| `apps/odyssey-one/src/api/mappers/mapOrderListRow.ts` | Modify | New formatters (long date, 3-line location parts, `--` empties) |
| `apps/odyssey-one/src/api/mappers/mapOrderListRow.test.ts` | Modify/Create | Formatter + mapping tests |
| `apps/odyssey-one/src/components/orders/ordersColumns.jsx` | Create | The three per-tab column-def arrays + badge maps + action builders |
| `apps/odyssey-one/src/components/orders/OrdersTable.jsx` | Modify | `tab` prop → column swap; checkboxes gone; sorting wired; Paginator conformance |
| `apps/odyssey-one/src/components/orders/OrdersToolbar.jsx` | Modify | Sort icon removed; Export button + disabled Filters |
| `apps/odyssey-one/src/components/orders/OrdersExportModal.jsx` | Create | ModalMedium export flow (25k cap) |
| `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx` | Modify | Sorting state, selection removal, action handlers (Submit/Cancel/Resolve), export handler |
| `apps/odyssey-one/src/api/services/orderService.ts` | Modify | Mock sort getters; `submitDraft` + `cancelOrder` mock mutations |
| `apps/odyssey-one/tools/generate.mjs` | Modify | Emit new order fields deterministically |
| `packages/db/migrations/002_orders_grid_fields.sql` | Create | New columns |
| `apps/odyssey-one/tools/seed.mjs` | Modify | Insert new columns |
| `apps/odyssey-one/api/_lib/orders.mjs` | Modify | ROW_COLUMNS + SORT_MAP widened |
| `packages/ui/src/Paginator.jsx` | Modify | Default page sizes → 10–40 step 5, default 25 |

**DSM rule:** Task 10 modifies `@odyssey/ui` Paginator → run `node tools/dsm-flags.mjs Paginator --demote --both` (component back to NORMALIZING in both DSMs, per `feedback_modified_component_back_to_normalizing`). Angular twin catches up at the next port batch.

---

### Task 1: Extend the wire + VM types

**Files:**
- Modify: `apps/odyssey-one/src/api/types/orderList.ts`
- Modify: `apps/odyssey-one/src/api/types/orderRowVm.ts`

- [ ] **Step 1: Extend `OrderListRow`** — in `orderList.ts`, add to the interface (after `orderStatus`):

```ts
  hazardous?: boolean               // ≥1 hazardous line item (LINX-12102)
  createdAt?: string                // ISO — first draft/creation timestamp (Draft tab "Created")
  createdBy?: string                // "Amy Cook" — full name (Draft tab "Created By")
  lastEditAt?: string               // ISO — most recent edit (Draft tab "Last Edit")
  draftOrderStatus?: string         // 'Ready' | 'Complete' | 'Purge' — VE-tab rows only (LINX-11659)
  errorCount?: number               // validation error count — VE-tab rows only
```

And inside BOTH `consignor` and `consignee` objects add:

```ts
    name?: string                   // facility name — "J & K INGREDIENTS" (location cell line 2)
    address?: string                // street line — "900 Hall St SW" (location cell line 3)
```

- [ ] **Step 2: Replace `orderRowVm.ts`** with the extended VM:

```ts
// Flat display view-model the Orders grid renders. Produced by mapOrderListRow.
// '--' = the grid's empty-optional-value rendering (LINX-13590 / 9896 note).
export interface LocationCellVM {
  id: string          // "RGC-STL-001" — line 1
  name: string        // facility name — line 2 ('' if unknown)
  address: string     // "900 Hall St SW Grand Rapids, MI, US" — line 3
}

export interface OrderRowVM {
  id: string          // orderNumber — row key; "pending-<orderId>" for number-less rows
  idLabel: string     // displayed Order Number; '-' while async creation processes
  pending: boolean
  customer: string
  // ── All tab ──
  hazardous: boolean
  orderSource: string // 'Manual' | 'Integrated' (display case)
  status: string      // display label — drives the Order Status badge
  shipDirection: string
  freightTerms: string
  equipment: string
  shipperLocation: LocationCellVM
  destinationLocation: LocationCellVM
  latestPickup: string   // "Jun 8, 2026 at 8:45 AM" — '' when absent (blank, not '--')
  latestDelivery: string
  weight: string      // "24,530 LB" — '--' when absent
  volume: string      // "64.000 cuft" — '--' when absent
  // ── Draft tab ──
  created: string     // long date format — '--' when absent
  createdBy: string
  lastEdit: string
  // ── Validation Errors tab ──
  draftOrderStatus: string // 'Ready' | 'Complete' | 'Purge' | ''
  errorCount: number | null
}
```

- [ ] **Step 3: Typecheck** — Run: `cd apps/odyssey-one && npx tsc --noEmit`. Expected: errors ONLY in `mapOrderListRow.ts` (missing VM fields) — that's Task 2's job. No other files may break.

- [ ] **Step 4: Commit** — `git add` the two type files, `git commit -m "feat(orders): extend OrderListRow + OrderRowVM for per-tab grid fields"`

---

### Task 2: Mapper + formatters (TDD)

**Files:**
- Modify: `apps/odyssey-one/src/api/mappers/mapOrderListRow.ts`
- Test: `apps/odyssey-one/src/api/mappers/mapOrderListRow.test.ts` (extend if it exists, else create)

- [ ] **Step 1: Write failing tests** (append to the existing test file, matching its style):

```ts
import { describe, it, expect } from 'vitest'
import { mapOrderListRow } from './mapOrderListRow'

const baseRow = {
  orderNumber: 'SUT355123', orderSource: 'INTEGRATED', customer: 'SABIC_CLT',
  shipDirection: 'Inbound', freightTerms: 'Pre-Paid', equipment: 'TL',
  consignor: { locationId: 'RGC-STL-001', name: 'J & K INGREDIENTS', address: '900 Hall St SW',
    city: 'St Louis', state: 'MO', country: 'US',
    earliestPickupDateTime: '2026-06-08T06:00:00', latestPickupDateTime: '2026-06-08T08:45:00' },
  consignee: { locationId: 'RGC-BER-002', name: 'Batory Foods', address: '2905 Ridgeland Ave',
    city: 'Berwyn', state: 'IL', country: 'US',
    earliestDeliveryDateTime: '', latestDeliveryDateTime: '' },
  grossWeight: { value: 24530, uom: 'LB' }, volume: { value: 64, uom: 'cuft' },
  commodity: 'Plastic', orderStatus: 'Ready For Plan',
  hazardous: true, createdAt: '2026-06-08T08:45:00', createdBy: 'Amy Cook',
  lastEditAt: '2026-06-09T10:00:00', draftOrderStatus: 'Ready', errorCount: 7,
} as never

describe('mapOrderListRow — per-tab grid fields', () => {
  const vm = mapOrderListRow(baseRow)
  it('formats long date-times ("MMM D, YYYY at h:mm AM/PM", no timezone)', () => {
    expect(vm.latestPickup).toBe('Jun 8, 2026 at 8:45 AM')
    expect(vm.created).toBe('Jun 8, 2026 at 8:45 AM')
  })
  it('renders BLANK (not --) for missing date-times (LINX-13590)', () => {
    expect(vm.latestDelivery).toBe('')
  })
  it('builds 3-line location cells', () => {
    expect(vm.shipperLocation).toEqual({
      id: 'RGC-STL-001', name: 'J & K INGREDIENTS',
      address: '900 Hall St SW St Louis, MO, US',
    })
  })
  it('formats measures with thousands separators, -- when absent', () => {
    expect(vm.weight).toBe('24,530 LB')
    expect(mapOrderListRow({ ...baseRow, volume: undefined } as never).volume).toBe('--')
  })
  it('title-cases orderSource for display', () => {
    expect(vm.orderSource).toBe('Integrated')
  })
  it('passes draft + VE fields through with -- empties', () => {
    expect(vm.createdBy).toBe('Amy Cook')
    expect(vm.draftOrderStatus).toBe('Ready')
    expect(vm.errorCount).toBe(7)
    const bare = mapOrderListRow({ ...baseRow, createdBy: undefined, errorCount: undefined } as never)
    expect(bare.createdBy).toBe('--')
    expect(bare.errorCount).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure** — `cd apps/odyssey-one && npx vitest run src/api/mappers/mapOrderListRow.test.ts`. Expected: FAIL (fields undefined).

- [ ] **Step 3: Implement in `mapOrderListRow.ts`** — keep the existing helpers, add:

```ts
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// "2026-06-08T08:45:00" → "Jun 8, 2026 at 8:45 AM". String-parsed local wall
// time — no Date/timezone shifting (matches Figma format minus tz; our wire
// values carry no tz — open item until a TZ policy exists).
function formatLongDateTime(iso: string | undefined): string {
  if (!iso) return ''
  const [date, time] = iso.split('T')
  if (!date || !time) return iso
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  const ampm = hh < 12 ? 'AM' : 'PM'
  return `${MONTHS[m - 1]} ${d}, ${y} at ${h12}:${String(mm).padStart(2, '0')} ${ampm}`
}

// { 24530, "LB" } → "24,530 LB"; '--' when absent (LINX-9896 note: optional
// empties render '--').
function formatMeasureDashed(m: { value: number; uom: string } | undefined): string {
  if (!m || m.value == null) return '--'
  return [m.value.toLocaleString('en-US'), m.uom].filter(Boolean).join(' ')
}

const dash = (v: string | undefined) => (v && v.trim() ? v : '--')

function locationCell(loc: OrderListRow['consignor'] | OrderListRow['consignee'] | undefined) {
  if (!loc) return { id: '--', name: '', address: '' }
  const cityLine = [loc.city, loc.state].filter(Boolean).join(', ')
  const address = [loc.address, cityLine].filter(Boolean).join(' ')
  return {
    id: loc.locationId || '--',
    name: loc.name ?? '',
    address: [address, loc.country].filter(Boolean).join(', '),
  }
}

const titleCase = (v: string | undefined) =>
  v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : ''
```

Then extend the returned object in `mapOrderListRow` (keep every existing field — `origin`/`destination`/`earlyPickup` stay until Task 5 removes their columns; delete them here only if nothing else imports them, check with grep):

```ts
    hazardous: row.hazardous === true,
    orderSource: titleCase(row.orderSource),
    shipDirection: s(row.shipDirection),
    freightTerms: s(row.freightTerms),
    shipperLocation: locationCell(row.consignor),
    destinationLocation: locationCell(row.consignee),
    latestPickup: formatLongDateTime(row.consignor?.latestPickupDateTime),
    latestDelivery: formatLongDateTime(row.consignee?.latestDeliveryDateTime),
    weight: formatMeasureDashed(row.grossWeight),
    volume: formatMeasureDashed(row.volume),
    created: row.createdAt ? formatLongDateTime(row.createdAt) : '--',
    createdBy: dash(row.createdBy),
    lastEdit: row.lastEditAt ? formatLongDateTime(row.lastEditAt) : '--',
    draftOrderStatus: s(row.draftOrderStatus),
    errorCount: row.errorCount ?? null,
```

Note `weight`/`volume` REPLACE the old `formatMeasure` outputs (formats change: thousands separator + `--`).

- [ ] **Step 4: Run tests** — same command. Expected: PASS. Then `npx tsc --noEmit` — clean.
- [ ] **Step 5: Full suite guard** — `npx vitest run`. Fix any snapshot/format fallout from the weight/volume change (existing OrdersTable tests may assert "4300 lbs" style — update them to the new format).
- [ ] **Step 6: Commit** — `git commit -m "feat(orders): map per-tab grid fields (long dates, 3-line locations, -- empties)"`

---

### Task 3: Generator emits the new fields (mock data)

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs` (the two order-row builder sites: shipped orders ~line 1086, unshipped `row = {...}` ~line 1291)
- Test: `apps/odyssey-one/tools/generate.test.mjs` (extend)

The generator is deterministic (seed 42) — all new values must come from `faker`/`pick` calls in a FIXED order appended after existing calls, so existing outputs stay byte-stable where possible (byte-identity of old fields is NOT required — the dataset regenerates wholesale — but determinism run-to-run IS).

- [ ] **Step 1: Add a people pool + helpers near the other module-level pools:**

```js
// Draft-tab "Created By" pool — plain full names (LINX-11663).
const ORDER_USERS = ['Amy Cook', 'Luis Herrera', 'Priya Nair', 'Tom Becker',
  'Sofia Almeida', 'Dan Whitfield', 'Grace Liu', 'Marcus Bell'];
const VALIDATION_ERROR_STATUSES = ['Planning Failed', 'Shipment Failed'];
const DRAFT_ORDER_STATUS_POOL = ['Ready', 'Ready', 'Ready', 'Complete', 'Complete', 'Purge'];
```

- [ ] **Step 2: Enrich BOTH order-row builders.** In each `consignor: {...}` / `consignee: {...}` literal add `name` + `address` from the location object already in scope (`from`/`to` for unshipped; the origin/dest locations for shipped — they carry `facility`; check the loc shape: `facility`, `city`, `state`, `zip` — grep `facility:` in the file):

```js
        name: from.facility,
        address: `${faker.number.int({ min: 100, max: 9900 })} ${faker.location.street()}`,
```

(street from faker keeps determinism; same pattern for `to`.) Then after `orderStatus` in each builder add:

```js
    hazardous: faker.number.float({ min: 0, max: 1 }) < 0.12,
    createdAt: toIsoLocal(new Date(w.earliestPickup.getTime() - faker.number.int({ min: 24, max: 240 }) * 3600e3)),
    createdBy: pick(ORDER_USERS),
```

(in the unshipped builder use `earliestPickup` instead of `w.earliestPickup` — match local variable names). Then AFTER the row literal in the unshipped builder, add status-dependent fields:

```js
  if (row.orderStatus === 'Draft') {
    row.lastEditAt = toIsoLocal(new Date(new Date(row.createdAt).getTime() + faker.number.int({ min: 1, max: 72 }) * 3600e3));
  }
  if (VALIDATION_ERROR_STATUSES.includes(row.orderStatus)) {
    row.draftOrderStatus = pick(DRAFT_ORDER_STATUS_POOL);
    row.errorCount = faker.number.int({ min: 1, max: 12 });
  }
```

Shipped orders (statuses Shipment Planned / Load Planned / Shipment Failed): `Shipment Failed` counts as a validation-error status — apply the same `draftOrderStatus`/`errorCount` block there.

- [ ] **Step 3: Extend `generate.test.mjs`** with invariants (match the existing test style — it imports `buildDataset()`):

```js
test('I10: draft orders carry created/createdBy/lastEdit; VE orders carry draftOrderStatus+errorCount', () => {
  const { orders } = buildDataset();
  const drafts = orders.filter(o => o.orderStatus === 'Draft');
  assert.ok(drafts.length > 0);
  for (const d of drafts) {
    assert.ok(d.createdAt && d.createdBy && d.lastEditAt);
  }
  const ve = orders.filter(o => ['Planning Failed', 'Shipment Failed'].includes(o.orderStatus));
  assert.ok(ve.length > 0);
  for (const o of ve) {
    assert.ok(['Ready', 'Complete', 'Purge'].includes(o.draftOrderStatus));
    assert.ok(Number.isInteger(o.errorCount) && o.errorCount >= 1 && o.errorCount <= 12);
  }
  for (const o of orders) {
    assert.equal(typeof o.hazardous, 'boolean');
    assert.ok(o.consignor.name !== undefined && o.consignor.address !== undefined);
  }
});
test('I11: generator is deterministic for the new fields', () => {
  const a = buildDataset().orders.slice(0, 50);
  const b = buildDataset().orders.slice(0, 50);
  assert.deepEqual(a, b);
});
```

- [ ] **Step 4: Run** — `node --test apps/odyssey-one/tools/generate.test.mjs`. Expected: PASS (all pre-existing invariants I1–I9 must stay green).
- [ ] **Step 5: Regenerate mock data** — `cd apps/odyssey-one && node tools/generate.mjs`. Verify: `node -e "const o=require('./src/data/orders.json'); const d=o.find(r=>r.orderStatus==='Draft'); console.log(d.createdBy, d.lastEditAt, o.filter(r=>r.errorCount).length)"` prints a name, an ISO, and a nonzero count.
- [ ] **Step 6: Commit** — `git add tools/generate.mjs tools/generate.test.mjs src/data/orders.json src/data/order-details.json` (whatever regenerated) — `git commit -m "feat(orders): generator emits hazardous/draft-meta/VE fields + location name+address"`

---

### Task 4: DB migration + seed + API projection (live mode)

**Files:**
- Create: `packages/db/migrations/002_orders_grid_fields.sql`
- Modify: `apps/odyssey-one/tools/seed.mjs` (orders INSERT)
- Modify: `apps/odyssey-one/api/_lib/orders.mjs` (ROW_COLUMNS, SORT_MAP)
- Test: `apps/odyssey-one/api/_lib/orders.test.mjs`

- [ ] **Step 1: Migration file:**

```sql
-- 002: Orders grid per-tab fields (S94). consignor/consignee JSONB now also
-- carry name+address (no schema change needed for those); these are the typed
-- columns for filtering/sorting + the tab-specific display fields.
ALTER TABLE orders
  ADD COLUMN hazardous boolean NOT NULL DEFAULT false,
  ADD COLUMN created_at timestamptz,
  ADD COLUMN created_by text,
  ADD COLUMN last_edit_at timestamptz,
  ADD COLUMN draft_order_status text,   -- 'Ready' | 'Complete' | 'Purge' (VE rows)
  ADD COLUMN error_count integer;
```

Check `packages/db/` migration-runner conventions (how 001 is named/registered) and follow them exactly.

- [ ] **Step 2: Seed** — in `seed.mjs`, find the orders INSERT column list and add the six columns, valued from the generated row (`o.hazardous`, `o.createdAt ?? null`, `o.createdBy ?? null`, `o.lastEditAt ?? null`, `o.draftOrderStatus ?? null`, `o.errorCount ?? null`). Follow the file's existing batching pattern exactly.
- [ ] **Step 3: API projection** — in `api/_lib/orders.mjs` extend `ROW_COLUMNS`:

```
  hazardous, created_at AS "createdAt", created_by AS "createdBy",
  last_edit_at AS "lastEditAt", draft_order_status AS "draftOrderStatus", error_count AS "errorCount"
```

And widen `SORT_MAP`:

```js
const SORT_MAP = {
  orderNumber: 'order_number', customer: 'customer', orderStatus: 'order_status',
  commodity: 'commodity', equipment: 'equipment',
  orderSource: 'order_source', shipDirection: 'ship_direction', freightTerms: 'freight_terms',
  hazardous: 'hazardous', latestPickup: 'latest_pickup_ts', latestDelivery: 'latest_delivery_ts',
  weight: `(gross_weight->>'value')::numeric`, volume: `(volume->>'value')::numeric`,
  created: 'created_at', createdBy: 'created_by', lastEdit: 'last_edit_at',
  draftOrderStatus: 'draft_order_status', errorCount: 'error_count',
  shipperLocation: 'origin_city', destinationLocation: 'dest_city',
}
```

- [ ] **Step 4: API tests** — extend `orders.test.mjs` (node:test style, builders are pure):

```js
test('order list sorts by new whitelisted fields', () => {
  const { text } = buildOrderListQuery({ sort: { field: 'lastEdit', direction: 'desc' } });
  assert.match(text, /ORDER BY last_edit_at DESC/);
});
test('unknown sort field falls back to order_number', () => {
  const { text } = buildOrderListQuery({ sort: { field: 'evil; DROP TABLE', direction: 'asc' } });
  assert.match(text, /ORDER BY order_number ASC/);
});
test('row projection includes per-tab fields', () => {
  const { text } = buildOrderListQuery({});
  assert.match(text, /"draftOrderStatus"/);
  assert.match(text, /"errorCount"/);
});
```

Run: `node --test apps/odyssey-one/api/_lib/orders.test.mjs` → PASS (existing tests stay green).
- [ ] **Step 5: Commit** — `git commit -m "feat(orders): DB migration + seed + API projection/sort for per-tab grid fields"`
- [ ] **Step 6: ⚠️ RESEED GATE — do NOT run.** The Neon DB is shared with prod; migration + reseed + prod deploy must ship in ONE motion with the user's explicit go (memory `feedback_no_prod_deploy_without_permission`, S93 incident). Record in the task report: "migration ready, reseed pending user approval". Until then, live mode simply returns NULL/false for the new fields (columns absent → the deployed API errors — so the DEPLOY must also wait for the same motion; local dev keeps working in mock mode).

---

### Task 5: Per-tab column defs (`ordersColumns.jsx`)

**Files:**
- Create: `apps/odyssey-one/src/components/orders/ordersColumns.jsx`
- Test: `apps/odyssey-one/src/components/orders/ordersColumns.test.jsx`

- [ ] **Step 1: Write the module.** Complete content:

```jsx
import { createColumnHelper } from '@tanstack/react-table'
import { TriangleAlert } from 'lucide-react'
import { Badge } from '@odyssey/ui'

/**
 * ordersColumns — the three per-tab column-def sets for the Orders grid
 * (Jira LINX-11658/11663/11659 + Efrain's Figma tables, S94 research notes).
 * OrdersTable appends the Action column (needs row-context callbacks).
 */
const col = createColumnHelper()

// Order Status display label → Badge variant. Figma pins New=blue,
// Ready for Planning=green, Rating/Routing Failed=red; our current label
// vocabulary maps onto the same tones.
export const ORDER_STATUS_VARIANT = {
  'Draft': 'gray',
  'Ready For Plan': 'green',
  'Shipment Planned': 'green',
  'Load Planned': 'blue',
  'Planning Failed': 'red',
  'Shipment Failed': 'red',
  'Cancelled': 'gray',
}

export const DRAFT_ORDER_STATUS_VARIANT = { Ready: 'green', Complete: 'blue', Purge: 'red' }

const statusBadge = (label, map) =>
  label ? <Badge variant={map[label] ?? 'gray'}>{label}</Badge> : '--'

const locationCell = (loc) => (
  <div className="orders-location-cell">
    <span className="text-label-sm-medium">{loc.id}</span>
    {loc.name && <span>{loc.name}</span>}
    {loc.address && <span style={{ color: 'var(--text-tertiary)' }}>{loc.address}</span>}
  </div>
)

// ── All tab (Figma: 14 data columns, flat header) ──
export const ALL_COLUMNS = [
  col.accessor('idLabel', { header: 'Order Number' }),
  col.accessor('hazardous', {
    header: 'Hazardous',
    cell: ({ getValue }) => getValue()
      ? <Badge variant="amber" leftIcon={<TriangleAlert size={12} />}>Hazmat</Badge>
      : '-',
  }),
  col.accessor('orderSource', { header: 'Order Source' }),
  col.accessor('status', {
    header: 'Order Status',
    cell: ({ getValue }) => statusBadge(getValue(), ORDER_STATUS_VARIANT),
  }),
  col.accessor('customer', {
    header: 'Customer',
    meta: { cellClass: 'odyssey-table__cell--title text-label-sm-medium' },
  }),
  col.accessor('shipDirection', { header: 'Ship Direction' }),
  col.accessor('freightTerms', { header: 'Freight Terms' }),
  col.accessor('equipment', { header: 'Equipment' }),
  col.accessor('shipperLocation', {
    header: 'Shipper Location',
    cell: ({ getValue }) => locationCell(getValue()),
    sortingFn: (a, b) => a.original.shipperLocation.id.localeCompare(b.original.shipperLocation.id),
  }),
  col.accessor('destinationLocation', {
    header: 'Destination Location',
    cell: ({ getValue }) => locationCell(getValue()),
    sortingFn: (a, b) => a.original.destinationLocation.id.localeCompare(b.original.destinationLocation.id),
  }),
  col.accessor('latestPickup', { header: 'Latest Pickup Date and Time' }),
  col.accessor('latestDelivery', { header: 'Latest Delivery Date and Time' }),
  col.accessor('weight', { header: 'Gross Weight' }),
  col.accessor('volume', { header: 'Volume' }),
]

// ── Draft tab (LINX-11663; Figma labels "Create/Create By" read as typos —
// Jira's "Created/Created By" adopted, flagged for Efrain) ──
export const DRAFT_COLUMNS = [
  col.accessor('idLabel', { header: 'Order Number' }),
  col.accessor('customer', {
    header: 'Customer',
    meta: { cellClass: 'odyssey-table__cell--title text-label-sm-medium' },
  }),
  col.accessor('created', { header: 'Created' }),
  col.accessor('createdBy', { header: 'Created By' }),
  col.accessor('lastEdit', { header: 'Last Edit' }),
]

// ── Validation Errors tab (LINX-11659 + Figma) ──
export const VALIDATION_COLUMNS = [
  col.accessor('idLabel', { header: 'Order Number' }),
  col.accessor('customer', {
    header: 'Customer',
    meta: { cellClass: 'odyssey-table__cell--title text-label-sm-medium' },
  }),
  col.accessor('draftOrderStatus', {
    header: 'Draft Order Status',
    cell: ({ getValue }) => statusBadge(getValue(), DRAFT_ORDER_STATUS_VARIANT),
  }),
  col.accessor('errorCount', {
    header: 'Errors Count',
    cell: ({ getValue }) => getValue() ?? '--',
  }),
]

export const TAB_COLUMNS = {
  all: ALL_COLUMNS,
  draft: DRAFT_COLUMNS,
  'validation-errors': VALIDATION_COLUMNS,
}

// All-tab ⋮ options are per-row (LINX-10233): Edit/Cancel are Manual-only;
// Restore only on Cancelled orders.
export function allTabActionLabels(row) {
  if (row.status === 'Cancelled') return ['View', 'Copy', 'Restore']
  if (row.orderSource === 'Manual') return ['View', 'Edit', 'Copy', 'Cancel']
  return ['View', 'Copy']
}

export const DRAFT_ACTION_LABELS = ['Edit', 'Submit', 'Cancel']
```

Check `Badge`'s actual variant prop vocabulary (`packages/ui/src/Badge.jsx`) — if variants are named differently (e.g. `success`/`error` or color names), translate the maps to the real API; same for `leftIcon`.

- [ ] **Step 2: Add the location-cell CSS** — in `apps/odyssey-one/src/styles/components.css` (or the orders css file if one exists — follow where `.orders-toolbar` lives):

```css
.orders-location-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.35;
}
```

- [ ] **Step 3: Unit tests** (`ordersColumns.test.jsx`, vitest):

```jsx
import { describe, it, expect } from 'vitest'
import { TAB_COLUMNS, allTabActionLabels } from './ordersColumns'

describe('ordersColumns', () => {
  it('exposes the three per-tab column sets with spec headers', () => {
    expect(TAB_COLUMNS.all.map(c => c.header).filter(h => typeof h === 'string')).toContain('Shipper Location')
    expect(TAB_COLUMNS.draft.map(c => c.header)).toEqual(['Order Number', 'Customer', 'Created', 'Created By', 'Last Edit'])
    expect(TAB_COLUMNS['validation-errors'].map(c => c.header)).toEqual(['Order Number', 'Customer', 'Draft Order Status', 'Errors Count'])
  })
  it('adapts All-tab actions per row (LINX-10233)', () => {
    expect(allTabActionLabels({ orderSource: 'Manual', status: 'Ready For Plan' })).toEqual(['View', 'Edit', 'Copy', 'Cancel'])
    expect(allTabActionLabels({ orderSource: 'Integrated', status: 'Ready For Plan' })).toEqual(['View', 'Copy'])
    expect(allTabActionLabels({ orderSource: 'Manual', status: 'Cancelled' })).toEqual(['View', 'Copy', 'Restore'])
  })
})
```

- [ ] **Step 4: Run** — `npx vitest run src/components/orders/ordersColumns.test.jsx` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(orders): per-tab column defs + status badges + per-row action rules"`

---

### Task 6: OrdersTable — tab-driven columns, no checkboxes, sorting, VE Resolve

**Files:**
- Modify: `apps/odyssey-one/src/components/orders/OrdersTable.jsx`
- Test: existing OrdersTable/OrdersRoute tests (update)

- [ ] **Step 1: Rewrite `OrdersTable.jsx`:**

```jsx
import { useLayoutEffect, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { EllipsisVertical } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { DataTable, Paginator, ActionMenu, Button } from '@odyssey/ui'
import { TAB_COLUMNS, allTabActionLabels, DRAFT_ACTION_LABELS } from './ordersColumns'

/**
 * OrdersTable — tab-driven configuration of the normalized DataTable shell.
 * Column sets swap per MAIN_TAB (ordersColumns.jsx); the Action column is
 * built here (row-context callbacks). No row selection (S94 decision — PO
 * feedback + user call). Header sorting is server-driven (manualSorting;
 * sorting state lifts to the route).
 */
const columnHelper = createColumnHelper()

const buildActions = (labels, row, onRowAction) =>
  labels.map((label) => ({ label, onSelect: () => onRowAction?.(label, row) }))

export default function OrdersTable({
  tab = 'all',
  rows,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  totalCount,
  onRowClick,
  onRowAction,
}) {
  const [stickyTop, setStickyTop] = useState(0)

  const columns = useMemo(() => {
    const dataCols = TAB_COLUMNS[tab] ?? TAB_COLUMNS.all
    if (tab === 'validation-errors') {
      // Direct Resolve button (Figma) — enabled only while status is Ready.
      return [...dataCols, columnHelper.display({
        id: 'action',
        enableResizing: false,
        header: 'Action',
        cell: ({ row }) => (
          <Button
            variant="secondary"
            size="sm"
            disabled={row.original.draftOrderStatus !== 'Ready'}
            onClick={() => onRowAction?.('Resolve', row.original)}
          >
            Resolve
          </Button>
        ),
        meta: { sticky: 'right', fixedWidth: true },
      })]
    }
    return [...dataCols, columnHelper.display({
      id: 'action',
      enableResizing: false,
      header: 'Action',
      cell: ({ row }) => (
        <ActionMenu
          icon={<EllipsisVertical {...ICON_MD} />}
          options={buildActions(
            tab === 'draft' ? DRAFT_ACTION_LABELS : allTabActionLabels(row.original),
            row.original,
            onRowAction,
          )}
          align="right"
          ariaLabel={`Actions for order ${row.original.idLabel}`}
        />
      ),
      meta: { sticky: 'right', fixedWidth: true, forwardClick: true },
    })]
  }, [tab, onRowAction])

  useLayoutEffect(() => {
    const toolbar = document.querySelector('.orders-toolbar')
    if (!toolbar) return
    const measure = () =>
      setStickyTop(toolbar.offsetHeight + parseFloat(getComputedStyle(toolbar).top))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const table = useReactTable({
    data: rows,
    columns,
    state: { pagination, sorting },
    onPaginationChange,
    onSortingChange,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: totalCount,
  })

  return (
    <DataTable
      table={table}
      stickyTop={stickyTop}
      ariaLabel="Orders"
      sortable
      onCellClick={onRowClick ? (_cell, row) => onRowClick(row.original) : undefined}
      footer={<Paginator table={table} />}
    />
  )
}
```

Verify against `packages/ui/src/DataTable.jsx` + `DataTable.usage.md` how `sortable` + manualSorting interplay works (the shell auto-seeds the first sortable column when unseeded — the route seeds `[{ id: 'idLabel', desc: true }]` so behavior is explicit). If `ActionMenu`/`Button` need different imports, conform.

- [ ] **Step 2: Run the orders tests** — `npx vitest run src/components/orders src/routes` (scope as the repo's tests are organized). Expected: OrdersRoute tests FAIL on the removed props (`rowSelection`) — fixed in Task 7. OrdersTable-only tests should pass after prop updates.
- [ ] **Step 3: Commit** — `git commit -m "feat(orders): tab-driven table — per-tab columns, Resolve button, sorting, checkboxes removed"`

---

### Task 7: OrdersRoute — sorting state, action handlers, selection removal

**Files:**
- Modify: `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx`
- Modify: `apps/odyssey-one/src/api/services/orderService.ts` (mock mutations)
- Test: route tests + `orderService` tests

- [ ] **Step 1: Mock service mutations.** In `orderService.ts` add (mock overlay pattern — study the existing overlay rows Map ~line 31–42/150–159 and follow it):

```ts
/** Draft-tab Submit (LINX-11663): Draft → 'Ready For Plan'; row moves to All. */
export async function submitDraftOrder(orderNumber: string): Promise<void> {
  if (getApiMode() === 'live') throw new Error('submitDraftOrder: live mapping pending — mock-mode only')
  overlayUpdateStatus(orderNumber, 'Ready For Plan')
}

/** Cancel (LINX-10258 soft delete): status → 'Cancelled'. */
export async function cancelOrder(orderNumber: string): Promise<void> {
  if (getApiMode() === 'live') throw new Error('cancelOrder: live mapping pending — mock-mode only')
  overlayUpdateStatus(orderNumber, 'Cancelled')
}
```

`overlayUpdateStatus(orderNumber, status)` is a small helper to write: find the row (overlay first, then base `orders.json` row → copy into the overlay) and set `orderStatus`. Follow the module's existing overlay conventions exactly (the overlay shadows same-numbered base rows in `getOrderList`). Add vitest coverage in the service's existing test file: submit a known Draft mock row → `getOrderList` for the draft tab no longer returns it; the All tab does with 'Ready For Plan'.

- [ ] **Step 2: Route changes** in `OrdersRoute.jsx`:
  - Delete `rowSelection` state + the prop pass-through.
  - Replace `sortDirection` state with TanStack-shaped `sorting`: `const [sorting, setSorting] = useState([{ id: 'idLabel', desc: true }])`.
  - Map column id → request sort field before building the request:

```js
// column id → OrderListRequest sort field (ids that differ from wire names)
const SORT_FIELD_BY_COLUMN = {
  idLabel: 'orderNumber', status: 'orderStatus', weight: 'weight', volume: 'volume',
  shipperLocation: 'shipperLocation', destinationLocation: 'destinationLocation',
}
const sortField = SORT_FIELD_BY_COLUMN[sorting[0]?.id] ?? sorting[0]?.id ?? 'orderNumber'
const request = useMemo(() => ({
  pagination,
  sort: { field: sortField, direction: sorting[0]?.desc ? 'desc' : 'asc' },
  ...(tabStatuses ? { filters: { orderStatuses: tabStatuses } } : {}),
}), [pagination, sortField, sorting, tabStatuses])
```

  - Reset sorting to the default on tab switch inside `handleTabSelect` (Draft's default sort: `[{ id: 'lastEdit', desc: true }]`; VE: `[{ id: 'errorCount', desc: true }]`; All: `[{ id: 'idLabel', desc: true }]`).
  - Extend the existing `onRowAction` handler: `Submit` → confirm via the existing ModalMedium pattern (popup copy from LINX-11663: title "Submit order", body `Are you sure you want to submit?`, footer Cancel/Submit) → `submitDraftOrder(row.id)` → invalidate the order-list + tab-counts queries (use the route's existing queryClient invalidation pattern; check how CustomersModal/other mutations do it). `Cancel` (row action, not the modal button) → confirm ("Are you sure you want to cancel the order?") → `cancelOrder(row.id)` → invalidate. `Resolve` → `navigate('/orders', ...)` placeholder is pointless — instead show the existing toast/no-op pattern with a `// OIF UI pending (LINX-11137)` comment; keep View/Edit wired as today; Copy/Restore stay no-ops.
  - Pass `tab={activeTab}`, `sorting`, `onSortingChange={setSorting}` to `OrdersTable`.
- [ ] **Step 3: Mock sort getters.** In `orderService.ts` the mock sort reads top-level string fields only — new sortable ids need getters. Replace the comparator's value access:

```ts
const SORT_GETTERS: Record<string, (r: OrderListRow) => string | number> = {
  weight: r => r.grossWeight?.value ?? 0,
  volume: r => r.volume?.value ?? 0,
  latestPickup: r => r.consignor?.latestPickupDateTime ?? '',
  latestDelivery: r => r.consignee?.latestDeliveryDateTime ?? '',
  shipperLocation: r => r.consignor?.locationId ?? '',
  destinationLocation: r => r.consignee?.locationId ?? '',
  created: r => r.createdAt ?? '',
  lastEdit: r => r.lastEditAt ?? '',
  errorCount: r => r.errorCount ?? 0,
  hazardous: r => (r.hazardous ? 1 : 0),
  orderSource: r => r.orderSource ?? '',
  draftOrderStatus: r => r.draftOrderStatus ?? '',
}
// in the comparator:
const get = SORT_GETTERS[sort.field] ?? ((r: OrderListRow) => String((r as never)[sort.field] ?? ''))
const av = get(a), bv = get(b)
const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
// keep the pending-rows special case for orderNumber, then: return cmp * dir
```

- [ ] **Step 4: Run all order tests + tsc** — `npx vitest run && npx tsc --noEmit`. Fix fallout (route tests referencing checkboxes/sortDirection).
- [ ] **Step 5: Commit** — `git commit -m "feat(orders): route sorting state, Submit/Cancel mock mutations + confirms, selection removed"`

---

### Task 8: Toolbar — Export button, Filters disabled, sort icon removed

**Files:**
- Modify: `apps/odyssey-one/src/components/orders/OrdersToolbar.jsx`

- [ ] **Step 1: Rewrite the toolbar:**

```jsx
import { SlidersHorizontal, Upload } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Button } from '@odyssey/ui'

/**
 * OrdersToolbar — count · Filters (disabled: decision pending, may be
 * superseded by global search) · Export (LINX-9896 BR V — current tab → Excel).
 * The old direction-only sort toggle is gone — header sorting owns it (S94).
 */
export default function OrdersToolbar({ totalCount, onExportClick }) {
  return (
    <div className="orders-toolbar">
      <span className="orders-toolbar__count text-label-sm-regular">
        {totalCount == null ? '—' : `${totalCount.toLocaleString('en-US')} items`}
      </span>
      <div className="orders-toolbar__right">
        <Button variant="secondary" size="sm" icon={<SlidersHorizontal {...ICON_MD} />} disabled>
          Filters
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Upload size={20} />}
          onClick={onExportClick}
          disabled={totalCount === 0 || totalCount == null}
        >
          Export
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update OrdersRoute** to pass `onExportClick={() => setExportOpen(true)}` (state added in Task 9) and drop the removed sort props.
- [ ] **Step 3: Run tests, commit** — `git commit -m "feat(orders): toolbar — Export button, Filters disabled pending decision, sort toggle removed"`

---

### Task 9: Export to Excel (ModalMedium flow)

**Files:**
- Create: `apps/odyssey-one/src/components/orders/OrdersExportModal.jsx`
- Modify: `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx`
- Modify: `apps/odyssey-one/package.json` (add `xlsx`)

- [ ] **Step 1: Add SheetJS** — `cd apps/odyssey-one && npm i xlsx`. It is imported ONLY dynamically (keeps it out of the main chunk — the bundle is already 9.3MB-flagged).
- [ ] **Step 2: Modal component** (mirrors the Shipments `TableControls` ModalMedium export — portal to body):

```jsx
import { createPortal } from 'react-dom'
import { ModalMedium, Button } from '@odyssey/ui'

export const EXPORT_ROW_CAP = 25000
// Exact string from LINX-9896 BR V / LINX-13298.
export const EXPORT_CAP_MESSAGE =
  'Exporting is limited to 25000 rows. Please apply additional filters to fetch upto 25000 rows for download'

const TAB_LABELS = { all: 'All', draft: 'Draft', 'validation-errors': 'Validation Errors' }

/**
 * OrdersExportModal — LINX-9896 BR V: export the CURRENT tab's rows to Excel,
 * hard 25,000-row cap (blocked with the spec's exact message).
 */
export default function OrdersExportModal({ tab, rowCount, onExport, onClose }) {
  const overCap = rowCount > EXPORT_ROW_CAP
  return createPortal(
    <ModalMedium
      title="Export to Excel"
      onClose={onClose}
      ariaLabel="Export to Excel"
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="lg" disabled={overCap} onClick={() => { onExport(); onClose() }}>
            Export
          </Button>
        </>
      }
    >
      <p className="text-label-sm-regular" style={{ margin: 0 }}>
        Current tab: <strong>{TAB_LABELS[tab] ?? tab}</strong> — {rowCount.toLocaleString('en-US')} orders.
      </p>
      {overCap && (
        <p className="text-label-sm-regular" style={{ color: 'var(--text-error, #b3261e)', margin: 0 }}>
          {EXPORT_CAP_MESSAGE}
        </p>
      )}
    </ModalMedium>,
    document.body,
  )
}
```

(Verify a `--text-error`-like token exists — grep `tokens.css`; use the project's real error token.)

- [ ] **Step 3: Export handler in OrdersRoute** (Shipments `onExport` pattern — fetch all matching rows through the service, then write the file):

```jsx
const [exportOpen, setExportOpen] = useState(false)

const handleExport = async () => {
  const res = await getOrderService().getOrderList(
    { ...request, pagination: { pageNumber: 1, pageSize: EXPORT_ROW_CAP } },
    selectedDataIds,
  )
  const vms = res.orders.map(mapOrderListRow)
  const EXPORT_SHAPES = {
    all: r => ({ 'Order Number': r.idLabel, Hazardous: r.hazardous ? 'Hazmat' : '-', 'Order Source': r.orderSource,
      'Order Status': r.status, Customer: r.customer, 'Ship Direction': r.shipDirection,
      'Freight Terms': r.freightTerms, Equipment: r.equipment,
      'Shipper Location': `${r.shipperLocation.id} ${r.shipperLocation.name} ${r.shipperLocation.address}`.trim(),
      'Destination Location': `${r.destinationLocation.id} ${r.destinationLocation.name} ${r.destinationLocation.address}`.trim(),
      'Latest Pickup Date and Time': r.latestPickup, 'Latest Delivery Date and Time': r.latestDelivery,
      'Gross Weight': r.weight, Volume: r.volume }),
    draft: r => ({ 'Order Number': r.idLabel, Customer: r.customer, Created: r.created,
      'Created By': r.createdBy, 'Last Edit': r.lastEdit }),
    'validation-errors': r => ({ 'Order Number': r.idLabel, Customer: r.customer,
      'Draft Order Status': r.draftOrderStatus, 'Errors Count': r.errorCount ?? '' }),
  }
  const shaped = vms.map(EXPORT_SHAPES[activeTab] ?? EXPORT_SHAPES.all)
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(shaped)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Orders')
  XLSX.writeFile(wb, `orders-${activeTab}-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
```

Render `{exportOpen && <OrdersExportModal tab={activeTab} rowCount={totalCount ?? 0} onExport={handleExport} onClose={() => setExportOpen(false)} />}`. Import `mapOrderListRow` + the service getter the route's data layer already uses (check how `useOrderList` reaches the service — reuse, don't duplicate).

- [ ] **Step 4: Verify in browser** (mock mode): `npm run dev:odyssey-one` → /orders → Export → modal shows count → Export downloads an `.xlsx` that opens with the right columns; switch to Draft tab → export carries Draft columns. Automated: add a vitest for `EXPORT_SHAPES` if extracted to a module-level export; modal cap-state test:

```jsx
// OrdersExportModal.test.jsx
import { render, screen } from '@testing-library/react'
import OrdersExportModal, { EXPORT_CAP_MESSAGE } from './OrdersExportModal'
it('blocks export over the 25k cap with the spec message', () => {
  render(<OrdersExportModal tab="all" rowCount={25001} onExport={() => {}} onClose={() => {}} />)
  expect(screen.getByText(EXPORT_CAP_MESSAGE)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
})
```

- [ ] **Step 5: Commit** — `git commit -m "feat(orders): Export to Excel — ModalMedium flow, 25k cap, per-tab shapes"`

---

### Task 10: Paginator standardization (ALL domains)

**Files:**
- Modify: `packages/ui/src/Paginator.jsx`
- Modify: consumers passing `pageSizeOptions` (grep `pageSizeOptions` across `apps/`)

- [ ] **Step 1:** In `Paginator.jsx` change `DEFAULT_PAGE_SIZE_OPTIONS` to `[10, 15, 20, 25, 30, 35, 40]` (LINX-8091/9128: start 10, end 40, step 5; default page size 25). Confirm the "Showing X to Y of Z results" text matches the spec (it already does — line ~88).
- [ ] **Step 2:** Grep consumers: remove explicit `pageSizeOptions={[20, 50, 100]}`-style overrides (OrdersTable already dropped its in Task 6; ShipmentTable + any DSM demo get the default). Set default page size 25 where the consumer seeds pagination state (OrdersRoute `pageSize`, ShipmentsRoute `pageSize` — find their `useState` seeds and change to 25).
- [ ] **Step 3: DSM rule** — run `node tools/dsm-flags.mjs Paginator --demote --both` (modified library component → NORMALIZING in both DSMs). Update `Paginator` demo/usage docs if they list the old default options.
- [ ] **Step 4:** Run the full suite (`npx vitest run` at app + `packages/ui` if it has tests) — fix page-size assertions. Verify Shipments still paginates in the browser.
- [ ] **Step 5: Commit** — `git commit -m "feat(ui): Paginator page sizes standardized to 10-40 step 5, default 25 (LINX-8091) — all domains"`

---

### Task 11: Integration verification + cleanup

- [ ] **Step 1: Full gates** — `npx vitest run` (app, expect ≥510 green incl. new), `node --test apps/odyssey-one/api/_lib/*.test.mjs tools/*.test.mjs`, `npx tsc --noEmit`, `npx vite build`.
- [ ] **Step 2: Browser pass (mock mode)** — all 3 tabs: correct columns, badges, 3-line cells, `--`/blank empties; header sort round-trips (click a header, order flips); Draft ⋮ Submit flow moves a row to All + counts update; VE Resolve disabled unless Ready; Export from each tab; pagination 25-default with 10–40 options; row-click still opens Order Summary; no checkboxes anywhere.
- [ ] **Step 3: Grep for dead code** — `origin`, `destination`, `earlyPickup`, `commodity` VM fields + `formatPlace`/`formatDateTime`/`formatMeasure` in the mapper: delete if no remaining consumer (check OrderSummary/other readers first — they may use the same VM).
- [ ] **Step 4: Update docs** — `vault/10-domains/orders/decisions/decision-log.md`: new entry (per-tab columns implemented, sources: LINX tickets + Figma nodes + S94 user decisions — checkboxes dropped, Filters halted, pagination standard). `DataTable.usage.md` untouched (no shell change).
- [ ] **Step 5: Commit** — `git commit -m "chore(orders): dead code sweep + decision log for per-tab grid"`

---

### Task 12 (GATED — separate user approval): Live cutover

**Do NOT execute without the user's explicit go in that moment.**
- [ ] Run migration 002 against Neon (`packages/db` runner convention).
- [ ] Reseed: `node tools/seed.mjs` + `node tools/verify-seed.mjs` (9/9 + any new invariant).
- [ ] Deploy: `npx vercel --prod` from repo root — SAME MOTION as the reseed (S93 rule: DB is shared with prod; reseed and deploy ship together).
- [ ] Live browser verification on odyssey-one-stage.vercel.app: 3 tabs + sort + export against Neon data.

---

## Self-review notes

- Spec coverage: per-tab columns ✓ (T5/T6) · badges ✓ (T5) · per-row actions ✓ (T5/T6/T7) · Resolve gating ✓ (T6) · Submit/Cancel confirms with Jira copy ✓ (T7) · sorting on + toolbar icon off ✓ (T6/T7/T8) · pagination standard ✓ (T10) · Export/ModalMedium/25k ✓ (T9) · checkboxes removed ✓ (T6/T7) · Filters disabled ✓ (T8) · `--`/blank rules ✓ (T2) · DB/generator/API ✓ (T3/T4) · reseed gate ✓ (T4/T12).
- Known open items carried (not blockers): timezone display (no tz on wire), "Create/Create By" label question to Efrain, Errors Count colored-circle vs plain text (implemented plain per Figma), Draft-tab default sort choice (lastEdit desc — inference, cheap to change).
- Type consistency: `OrderRowVM` fields referenced by `ordersColumns.jsx` (T5) all defined in T1; sort field ids in T7's map exist in T4's SORT_MAP + T7's SORT_GETTERS.
