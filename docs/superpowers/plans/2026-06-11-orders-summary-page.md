# Orders Summary Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Orders route's Order Summary Page — PageHeader + toolbar + paginated TanStack grid — on a mock-mode data layer whose request/response types are verbatim from the Order Service Phase-2 LLD, so flipping to the live API is an env-var change.

**Architecture:** Mirrors the Shipments `src/api/` seam exactly: typed DTOs → pure mapper → service with mock/live branches → react-query hook → app-local UI components. The grid is headless TanStack Table v8 (`manualPagination`/`manualSorting`) so the upcoming table normalization re-skins markup only. All UI is app-local in `apps/odyssey-one/src/components/orders/` per the spec's deliberate no-normalize-yet choice.

**Tech Stack:** React 19, TypeScript (strict, data layer only — UI components stay `.jsx` per app convention), @tanstack/react-table v8 (new dep), @tanstack/react-query v5 (`placeholderData: keepPreviousData`), vitest, @faker-js/faker v9 (generator, seed 42).

**Spec:** `docs/superpowers/specs/2026-06-10-orders-summary-page-design.md` (approved; LLD-reconciled).

**Effort calibration (Manuela, 2026-06-11):** Screen 0 was scoped as the *lowest* priority among the Orders screens and its design may change over time — build it lean, don't gold-plate. Concretely: implement the tasks as written (the data layer is the durable part — it survives any redesign), but don't polish the visual skin beyond "looks right at a glance"; skip pixel-tuning in Task 13's smoke test, and resist adding any nice-to-haves not in a task. The Phase-2 table normalization will replace the skin anyway.

---

## Plan-level decisions (resolved during planning — read first)

1. **`MenuDropdown` from `@odyssey/ui` is NOT usable for the row-action menu.** It's a sidebar collapsible group (header + chevron + rows), not a popover. The three-dot menu is a new app-local `OrderRowActionMenu` using the ShipmentTable portal idiom (`createPortal` + fixed positioning from trigger rect). It is the future SHP-66 normalization candidate.
2. **Pagination is 1-based** (`pageNumber: 1` = first page), per the LLD list example (Q29 tracks the 0-vs-1 discrepancy). Mock slice: `(pageNumber - 1) * pageSize`.
3. **Page-size options are [20, 50, 100], default 20.** Spec §3 said "25/50/100" but was written before the LLD reconciliation set the default to 20 (A2); 25 is dropped to keep the default in the option list.
4. **Origin/Destination cells show the full `locationId`** — `"RGC-STL-001: St Louis, MO"`. The spec's VM example abbreviated to `"RGC:"` but the LLD calls `locationId` the "Origin cell prefix code"; full ID until Efrain's design says otherwise (one-line mapper change).
5. **`orders.json` is committed** (same as the tracked `src/data/shipments.json`); `public/details/` stays gitignored (no order detail files in this build anyway).
6. **Shared pools are extracted** from `tools/generate.mjs` into `tools/data-pools.mjs` (A7: master data is shared cross-domain). Verified safe by regenerating shipments and diffing — seed 42 makes this deterministic.
7. **Status display labels in the generator are provisional fakes** except `"Ready For Plan"` (verbatim LLD example). Status isn't in the lean column set; labels only matter for future filter work.
8. **Mock status filtering matches display labels, not codes.** Code→label mapping is deferred until filters actually bind (the page sends no filters in this build).
9. **`idLabel` collapses to `orderNumber`.** The LLD row has no `orderId`, so the LINX-11013 fallback (`orderNumber ?? orderId`) has nothing to fall back to. The mapper keeps the `idLabel` field so the fallback lands in one place if the live contract adds `orderId`.
10. **Date formatting is string-sliced from the ISO value** (`"2026-06-15T08:00:00.000Z"` → `"06/15/2026 08:00"`) — no `Date` object, no timezone shifting, deterministic tests. A TZ policy is a future decision.

---

### Task 1: Install @tanstack/react-table

**Files:**
- Modify: `apps/odyssey-one/package.json` (dependency added by npm)

- [ ] **Step 1: Install the dependency**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npm install @tanstack/react-table
```

Expected: `package.json` gains `"@tanstack/react-table": "^8.x"` in `dependencies`; workspace `package-lock.json` at repo root updates.

- [ ] **Step 2: Verify it resolves**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
node -e "import('@tanstack/react-table').then(m => console.log(typeof m.useReactTable))"
```

Expected: `function`

- [ ] **Step 3: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/package.json package-lock.json
git commit -m "orders: add @tanstack/react-table (headless grid foundation)"
```

---

### Task 2: Extract shared master-data pools from the shipments generator

The Orders generator must reuse the Shipments pools (spec A7: master data is shared cross-domain). The pools currently live as top-level `const`s inside `apps/odyssey-one/tools/generate.mjs`, which runs as a side-effecting script and can't be imported. Extract them to a shared module and prove the shipments output is byte-identical.

**Files:**
- Create: `apps/odyssey-one/tools/data-pools.mjs`
- Modify: `apps/odyssey-one/tools/generate.mjs`

- [ ] **Step 1: Create `tools/data-pools.mjs` by MOVING the pool consts out of `generate.mjs`**

Open `apps/odyssey-one/tools/generate.mjs`. Locate these four top-level `const` declarations (they exist verbatim near the top of the file): `CUSTOMERS` (13 entries, `{ id, name }`), `LOCATIONS` (26 entries, `{ city, state, zip, facility }`), `EQUIPMENT_CODES` (`['FLT', 'LTH', 'VAN', 'REEFER']`), `CHEMICAL_PRODUCTS` (20 entries, `{ item, desc, hazmat, hClass, unNumber }`).

Cut all four blocks **verbatim — do not edit a single value** — and paste them into a new file with `export` added:

```js
// tools/data-pools.mjs — master-data pools shared by the fake-data generators.
//
// In the real system master data is shared cross-domain (order-service proxies
// /master-data/v1/*; spec A7), so the fake generators share these pools too:
// generate.mjs (shipments) and generate-orders.mjs (orders) must draw customers,
// locations, equipment, and commodities from the same lists.
// MOVED VERBATIM from generate.mjs — do not edit values here without
// regenerating BOTH datasets and checking the shipments diff is empty.

export const CUSTOMERS = [
  // ← the 13 entries, moved verbatim from generate.mjs
]

export const LOCATIONS = [
  // ← the 26 entries, moved verbatim from generate.mjs
]

export const EQUIPMENT_CODES = ['FLT', 'LTH', 'VAN', 'REEFER']

export const CHEMICAL_PRODUCTS = [
  // ← the 20 entries, moved verbatim from generate.mjs
]
```

(The `// ←` comments above describe the move for this plan — the real file contains the actual arrays, no placeholders.)

- [ ] **Step 2: Import them back into `generate.mjs`**

At the top of `apps/odyssey-one/tools/generate.mjs`, where the consts used to be, add:

```js
import { CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, CHEMICAL_PRODUCTS } from './data-pools.mjs'
```

If any of the four names is **not** referenced by the remaining generate.mjs code (unused-import), keep it out of this import list — only import what generate.mjs actually uses.

- [ ] **Step 3: Prove the shipments output is unchanged**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
node tools/generate.mjs
git diff --exit-code src/data/shipments.json && echo "SHIPMENTS UNCHANGED ✓"
```

Expected: `SHIPMENTS UNCHANGED ✓` (exit 0, no diff). If there IS a diff, the move altered values or ordering — fix before proceeding; do not commit a changed `shipments.json`.

- [ ] **Step 4: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/tools/data-pools.mjs apps/odyssey-one/tools/generate.mjs
git commit -m "orders: extract shared master-data pools from shipments generator (A7)"
```

---

### Task 3: Orders fake-data generator (seed 42, 4,509 rows)

**Files:**
- Create: `apps/odyssey-one/tools/generate-orders.mjs`
- Create: `apps/odyssey-one/src/data/orders.js`
- Create (generated): `apps/odyssey-one/src/data/orders.json`
- Modify: `apps/odyssey-one/package.json` (scripts)

- [ ] **Step 1: Write `tools/generate-orders.mjs`**

```js
// tools/generate-orders.mjs — seeded fake Orders dataset in the Order Service
// Phase-2 LLD row shape (Confluence 3401056276; see the 2026-06-10 spec §5).
// Run: node tools/generate-orders.mjs   (also wired into prebuild)
import { faker } from '@faker-js/faker'
import { writeFileSync } from 'fs'
import { CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, CHEMICAL_PRODUCTS } from './data-pools.mjs'

faker.seed(42)

const TOTAL_ORDERS = 4509

// /order-status/lookup enum + DRAFT (LLD). HOLD is a boolean flag, not a status.
// Display labels are PROVISIONAL fakes except "Ready For Plan" (the LLD row example).
const STATUS_LABELS = {
  DRAFT: 'Draft',
  RD_4_PLNNG: 'Ready For Plan',
  PLN_LD: 'Load Planned',
  PLNED_SHIP: 'Shipment Planned',
  PLNNG_FAIL: 'Planning Failed',
  SHIP_FAIL: 'Shipment Failed',
  CAN: 'Cancelled',
}

// Weighted distribution: mostly plannable/planned work, a realistic failure tail.
const STATUS_POOL = [
  ...Array(30).fill('RD_4_PLNNG'),
  ...Array(25).fill('PLNED_SHIP'),
  ...Array(15).fill('PLN_LD'),
  ...Array(10).fill('DRAFT'),
  ...Array(8).fill('CAN'),
  ...Array(7).fill('PLNNG_FAIL'),
  ...Array(5).fill('SHIP_FAIL'),
]

// Deterministic location ids in the LLD "RGC-STL-001" shape:
// facility initials (≤3) – state – sequence.
const LOCATION_IDS = LOCATIONS.map((loc, i) => {
  const initials = loc.facility.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase()
  return `${initials}-${loc.state}-${String(i + 1).padStart(3, '0')}`
})

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function generateOrder(i) {
  const customer = faker.helpers.arrayElement(CUSTOMERS)
  const originIdx = faker.number.int({ min: 0, max: LOCATIONS.length - 1 })
  let destIdx = faker.number.int({ min: 0, max: LOCATIONS.length - 1 })
  if (destIdx === originIdx) destIdx = (destIdx + 1) % LOCATIONS.length
  const origin = LOCATIONS[originIdx]
  const dest = LOCATIONS[destIdx]
  const product = faker.helpers.arrayElement(CHEMICAL_PRODUCTS)
  const statusCode = faker.helpers.arrayElement(STATUS_POOL)

  // Sequential digits → "orderNumber desc" works as the newest-first proxy (Q31);
  // customer-derived 3-letter prefix keeps the LLD's "SUT355123" look. NOTE the
  // proxy is lexicographic, so it groups by prefix first — acceptable until Q31
  // lands a real date sort field.
  const prefix = customer.id.replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X')
  const orderNumber = `${prefix}${100000 + i}`

  const earliestPickup = faker.date.between({ from: '2026-03-01T00:00:00.000Z', to: '2026-09-30T00:00:00.000Z' })
  const latestPickup = new Date(earliestPickup.getTime() + faker.number.int({ min: 4, max: 48 }) * HOUR)
  const earliestDelivery = new Date(latestPickup.getTime() + faker.number.int({ min: 1, max: 5 }) * DAY)
  const latestDelivery = new Date(earliestDelivery.getTime() + faker.number.int({ min: 4, max: 48 }) * HOUR)

  return {
    orderNumber,
    orderSource: faker.helpers.arrayElement(['INTEGRATED', 'INTEGRATED', 'INTEGRATED', 'MANUAL']),
    customer: customer.id,
    shipDirection: faker.helpers.arrayElement(['Inbound', 'Outbound']),
    freightTerms: faker.helpers.arrayElement(['Pre-Paid', 'Collect', 'Third Party']),
    equipment: faker.helpers.arrayElement(EQUIPMENT_CODES),
    consignor: {
      locationId: LOCATION_IDS[originIdx],
      city: origin.city,
      state: origin.state,
      country: 'US',
      earliestPickupDateTime: earliestPickup.toISOString(),
      latestPickupDateTime: latestPickup.toISOString(),
    },
    consignee: {
      locationId: LOCATION_IDS[destIdx],
      city: dest.city,
      state: dest.state,
      country: 'US',
      earliestDeliveryDateTime: earliestDelivery.toISOString(),
      latestDeliveryDateTime: latestDelivery.toISOString(),
    },
    grossWeight: { value: faker.number.int({ min: 500, max: 45000 }), uom: 'lbs' },
    volume: { value: faker.number.int({ min: 50, max: 3000 }), uom: 'cbf' },
    commodity: product.desc,
    orderStatus: STATUS_LABELS[statusCode],
  }
}

const orders = []
for (let i = 0; i < TOTAL_ORDERS; i++) orders.push(generateOrder(i))

const outDir = new URL('../src/data/', import.meta.url)
writeFileSync(new URL('orders.json', outDir), JSON.stringify(orders, null, 2))
console.log(`Wrote ${orders.length} orders → src/data/orders.json`)
```

- [ ] **Step 2: Run it and smoke-check count + reproducibility**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
node tools/generate-orders.mjs
node -e "const o = require('./src/data/orders.json'); console.log('count:', o.length); console.log('first:', o[0].orderNumber, o[0].orderStatus); console.log('statuses:', [...new Set(o.map(r => r.orderStatus))].sort().join(', '))"
shasum src/data/orders.json
node tools/generate-orders.mjs
shasum src/data/orders.json
```

Expected: `count: 4509`; statuses list shows all 7 labels; the two `shasum` outputs are **identical** (seed-42 reproducibility).

- [ ] **Step 3: Write `src/data/orders.js`**

```js
import orders from './orders.json'

// ─── Orders list (statically imported; regenerate via `npm run generate-orders`) ───

export function getAllOrders() {
  return orders
}
```

- [ ] **Step 4: Wire scripts in `apps/odyssey-one/package.json`**

Change the `prebuild` script and add `generate-orders`:

```json
"prebuild": "node tools/generate.mjs && node tools/generate-orders.mjs",
"generate-orders": "node tools/generate-orders.mjs",
```

(Keep the existing `generate-data` script for shipments untouched.)

- [ ] **Step 5: Commit (orders.json IS committed — matches tracked shipments.json)**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/tools/generate-orders.mjs apps/odyssey-one/src/data/orders.js apps/odyssey-one/src/data/orders.json apps/odyssey-one/package.json
git commit -m "orders: seeded generator (4,509 rows, LLD row shape, shared pools)"
```

---

### Task 4: Contract types (verbatim from spec §5 / the Phase-2 LLD)

**Files:**
- Create: `apps/odyssey-one/src/api/types/orderList.ts`
- Create: `apps/odyssey-one/src/api/types/orderRowVm.ts`

- [ ] **Step 1: Write `src/api/types/orderList.ts`**

```ts
// Order list contract — field names VERBATIM from the "Order Service Phase-2" LLD
// (Confluence 3401056276, fetched 2026-06-11; raw dump at
// vault-sources/10-domains/orders/lld/order-service-phase-2.md).
// Endpoint: POST /order-service/v3/order/list. Final confirmation against live
// Swagger remains; mapOrderListRow is the single reconciliation point.

export interface OrderListRow {
  orderNumber: string               // "SUT355123" — the ID column value
  orderSource: string               // "INTEGRATED"
  customer: string                  // "SABIC_CLT" — display key; no separate customerId on the row
  shipDirection: string             // "Inbound"
  freightTerms: string              // "Pre-Paid"
  equipment: string                 // "TL"
  consignor: {
    locationId: string              // "RGC-STL-001" — Origin cell prefix code
    city: string
    state: string
    country: string
    earliestPickupDateTime: string  // ISO
    latestPickupDateTime: string
  }
  consignee: {
    locationId: string
    city: string
    state: string
    country: string
    earliestDeliveryDateTime: string
    latestDeliveryDateTime: string
  }
  grossWeight: { value: number; uom: string }   // { 4300, "lbs" }
  volume: { value: number; uom: string }        // { 730, "cbf" }
  commodity: string                 // "Plastic"
  orderStatus: string               // DISPLAY LABEL on the row ("Ready For Plan"), not a code
}

// /order-status/lookup enum (LLD) + DRAFT (create-order remark).
// NOTE: HOLD is NOT a status — it's a boolean orderHoldStatus flag on the order
// (LLD; resolves the old Hold-status question).
export type OrderStatusCode =
  | 'DRAFT' | 'RD_4_PLNNG' | 'PLN_LD' | 'PLNED_SHIP'
  | 'PLNNG_FAIL' | 'SHIP_FAIL' | 'CAN'

export interface OrderListRequest {
  pagination: {
    pageNumber: number              // LLD list example is 1-BASED ("pageNumber": 1) but the sibling
                                    // lookup example is 0-based — discrepancy tracked in Q29
    pageSize: number                // LLD examples use 20; max not stated (Q29)
  }
  filters?: {                       // all-array filter object; the page sends none in THIS build.
    customers?: string[]            // EntityChip scope binds here later
    orderStatuses?: string[]        // future tab strip binds here (Q25)
    orderNumbers?: string[]
    originCities?: string[]
    originStates?: string[]
    originCountries?: string[]
    destinationCities?: string[]
    destinationStates?: string[]
    destinationCountries?: string[]
    earliestPickupDateFrom?: string
    earliestPickupDateTo?: string
    latestPickupDateFrom?: string
    latestPickupDateTo?: string
    earliestDeliveryDateFrom?: string
    earliestDeliveryDateTo?: string
    latestDeliveryDateFrom?: string
    latestDeliveryDateTo?: string
  }
  sort?: { field: string; direction: 'asc' | 'desc' }  // LLD example default: orderNumber asc;
                                                        // valid field list not stated (Q31)
}

export interface OrderListResponse {
  success: boolean
  orders: OrderListRow[]
  pagination: { pageNumber: number; pageSize: number; totalCount: number }
  error: string | null
}
```

- [ ] **Step 2: Write `src/api/types/orderRowVm.ts`**

```ts
// Flat display view-model the Orders grid renders. Produced by mapOrderListRow.
export interface OrderRowVM {
  id: string          // orderNumber — row key (and future detail-link key)
  idLabel: string     // displayed ID; = orderNumber (LLD row has no orderId — see LINX-11013)
  customer: string
  origin: string      // "RGC-STL-001: St Louis, MO"
  destination: string
  weight: string      // "4300 lbs"
  volume: string      // "730 cbf"
  commodity: string
  equipment: string
  earlyPickup: string // "06/15/2026 08:00" (from consignor.earliestPickupDateTime)
  status: string      // display label, not shown in the lean column set
}
```

- [ ] **Step 3: Type-check compiles (no emit)**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx tsc --noEmit
```

Expected: exit 0 (same as before adding the files — these add no errors).

- [ ] **Step 4: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/api/types/orderList.ts apps/odyssey-one/src/api/types/orderRowVm.ts
git commit -m "orders: contract types verbatim from Order Service Phase-2 LLD"
```

---

### Task 5: Fixture

**Files:**
- Create: `apps/odyssey-one/src/api/fixtures/orderListRow.sample.ts`

- [ ] **Step 1: Write the fixture (values track the LLD's own example row)**

```ts
import type { OrderListRow } from '../types/orderList'

// Sample row for mapper/service tests — values track the LLD /order/list example
// ("SUT355123", "SABIC_CLT", "RGC-STL-001", 4300 lbs, 730 cbf, "Ready For Plan").
export const orderListRowSample: OrderListRow = {
  orderNumber: 'SUT355123',
  orderSource: 'INTEGRATED',
  customer: 'SABIC_CLT',
  shipDirection: 'Inbound',
  freightTerms: 'Pre-Paid',
  equipment: 'TL',
  consignor: {
    locationId: 'RGC-STL-001',
    city: 'St Louis',
    state: 'MO',
    country: 'US',
    earliestPickupDateTime: '2026-06-15T08:00:00.000Z',
    latestPickupDateTime: '2026-06-15T16:00:00.000Z',
  },
  consignee: {
    locationId: 'SAB-CLT-001',
    city: 'Charlotte',
    state: 'NC',
    country: 'US',
    earliestDeliveryDateTime: '2026-06-18T08:00:00.000Z',
    latestDeliveryDateTime: '2026-06-18T16:00:00.000Z',
  },
  grossWeight: { value: 4300, uom: 'lbs' },
  volume: { value: 730, uom: 'cbf' },
  commodity: 'Plastic',
  orderStatus: 'Ready For Plan',
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/api/fixtures/orderListRow.sample.ts
git commit -m "orders: LLD-example fixture for mapper/service tests"
```

---

### Task 6: Mapper (TDD)

**Files:**
- Create: `apps/odyssey-one/src/api/mappers/mapOrderListRow.ts`
- Test: `apps/odyssey-one/src/api/mappers/mapOrderListRow.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { mapOrderListRow } from './mapOrderListRow'
import { orderListRowSample } from '../fixtures/orderListRow.sample'
import type { OrderListRow } from '../types/orderList'

describe('mapOrderListRow', () => {
  it('maps the LLD sample row to flat display strings', () => {
    const vm = mapOrderListRow(orderListRowSample)
    expect(vm).toEqual({
      id: 'SUT355123',
      idLabel: 'SUT355123',
      customer: 'SABIC_CLT',
      origin: 'RGC-STL-001: St Louis, MO',
      destination: 'SAB-CLT-001: Charlotte, NC',
      weight: '4300 lbs',
      volume: '730 cbf',
      commodity: 'Plastic',
      equipment: 'TL',
      earlyPickup: '06/15/2026 08:00',
      status: 'Ready For Plan',
    })
  })

  it('is null-safe on a fully sparse row', () => {
    const vm = mapOrderListRow({} as OrderListRow)
    expect(vm.id).toBe('')
    expect(vm.idLabel).toBe('')
    expect(vm.customer).toBe('')
    expect(vm.origin).toBe('')
    expect(vm.destination).toBe('')
    expect(vm.weight).toBe('')
    expect(vm.volume).toBe('')
    expect(vm.earlyPickup).toBe('')
    expect(vm.status).toBe('')
  })

  it('degrades the place format gracefully when parts are missing', () => {
    const partial = {
      ...orderListRowSample,
      consignor: { ...orderListRowSample.consignor, locationId: undefined as unknown as string },
      consignee: { ...orderListRowSample.consignee, city: undefined as unknown as string, state: undefined as unknown as string },
    }
    const vm = mapOrderListRow(partial)
    expect(vm.origin).toBe('St Louis, MO')          // no locationId → city/state only
    expect(vm.destination).toBe('SAB-CLT-001')      // no city/state → id only
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/api/mappers/mapOrderListRow.test.ts
```

Expected: FAIL — `Cannot find module './mapOrderListRow'` (or equivalent resolve error).

- [ ] **Step 3: Write the mapper**

```ts
import type { OrderListRow } from '../types/orderList'
import type { OrderRowVM } from '../types/orderRowVm'

// LLD row DTO → flat grid view-model. This is the single place to reconcile
// real field names / formats when the live Swagger lands.

const s = (v: string | undefined) => v ?? ''

// "2026-06-15T08:00:00.000Z" → "06/15/2026 08:00". String-sliced from the ISO
// value — no Date object, no timezone shifting; display matches the wire value
// until a TZ policy exists.
function formatDateTime(iso: string | undefined): string {
  if (!iso) return ''
  const [date, time] = iso.split('T')
  if (!date || !time) return iso
  const [y, m, d] = date.split('-')
  return `${m}/${d}/${y} ${time.slice(0, 5)}`
}

// "RGC-STL-001: St Louis, MO" — full locationId as the prefix code (plan
// decision 4); degrades to whichever parts exist.
function formatPlace(loc: OrderListRow['consignor'] | OrderListRow['consignee'] | undefined): string {
  if (!loc) return ''
  const cityState = [loc.city, loc.state].filter(Boolean).join(', ')
  if (!loc.locationId) return cityState
  return cityState ? `${loc.locationId}: ${cityState}` : loc.locationId
}

// { 4300, "lbs" } → "4300 lbs" (spec §5 example — no thousands separator).
function formatMeasure(m: { value: number; uom: string } | undefined): string {
  if (!m || m.value == null) return ''
  return [String(m.value), m.uom].filter(Boolean).join(' ')
}

export function mapOrderListRow(row: OrderListRow): OrderRowVM {
  return {
    id: s(row.orderNumber),
    idLabel: s(row.orderNumber), // LLD row has no orderId — LINX-11013 fallback collapses to orderNumber
    customer: s(row.customer),
    origin: formatPlace(row.consignor),
    destination: formatPlace(row.consignee),
    weight: formatMeasure(row.grossWeight),
    volume: formatMeasure(row.volume),
    commodity: s(row.commodity),
    equipment: s(row.equipment),
    earlyPickup: formatDateTime(row.consignor?.earliestPickupDateTime),
    status: s(row.orderStatus),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/api/mappers/mapOrderListRow.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/api/mappers/mapOrderListRow.ts apps/odyssey-one/src/api/mappers/mapOrderListRow.test.ts
git commit -m "orders: mapOrderListRow — LLD row → grid VM, null-safe (TDD)"
```

---

### Task 7: Order service — mock + live branches (TDD)

**Files:**
- Create: `apps/odyssey-one/src/api/services/orderService.ts`
- Test: `apps/odyssey-one/src/api/services/orderService.test.ts`

- [ ] **Step 1: Write the failing test (import-after-mock pattern, verbatim from gridService.test.ts idiom)**

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))

function mk(orderNumber: string, extra: Record<string, unknown> = {}) {
  return {
    orderNumber,
    orderSource: 'INTEGRATED',
    customer: 'ERCO_SYS_01',
    shipDirection: 'Outbound',
    freightTerms: 'Pre-Paid',
    equipment: 'VAN',
    consignor: {
      locationId: 'EW-TX-001', city: 'Houston', state: 'TX', country: 'US',
      earliestPickupDateTime: '2026-06-10T08:00:00.000Z',
      latestPickupDateTime: '2026-06-10T16:00:00.000Z',
    },
    consignee: {
      locationId: 'GT-LA-002', city: 'Bastrop', state: 'LA', country: 'US',
      earliestDeliveryDateTime: '2026-06-12T08:00:00.000Z',
      latestDeliveryDateTime: '2026-06-12T16:00:00.000Z',
    },
    grossWeight: { value: 4300, uom: 'lbs' },
    volume: { value: 730, uom: 'cbf' },
    commodity: 'Plastic',
    orderStatus: 'Ready For Plan',
    ...extra,
  }
}

const STORE = [
  mk('CCC100005'),
  mk('AAA100001'),
  mk('AAA100002', { customer: 'BASF_CHM_01', orderStatus: 'Cancelled' }),
  mk('BBB100004', { customer: 'BASF_CHM_01' }),
  mk('BBB100003', {
    consignor: {
      locationId: 'EW-TX-001', city: 'Freeport', state: 'TX', country: 'US',
      earliestPickupDateTime: '2026-07-01T08:00:00.000Z',
      latestPickupDateTime: '2026-07-01T16:00:00.000Z',
    },
  }),
]

vi.mock('../../data/orders', () => ({ getAllOrders: () => STORE }))

import { getOrderList } from './orderService'

const page = (pageNumber = 1, pageSize = 20) => ({ pagination: { pageNumber, pageSize } })

describe('orderService.getOrderList (mock)', () => {
  it('returns the LLD envelope with default orderNumber asc sort', async () => {
    const res = await getOrderList(page())
    expect(res.success).toBe(true)
    expect(res.error).toBeNull()
    expect(res.pagination).toEqual({ pageNumber: 1, pageSize: 20, totalCount: 5 })
    expect(res.orders.map(o => o.orderNumber)).toEqual(
      ['AAA100001', 'AAA100002', 'BBB100003', 'BBB100004', 'CCC100005'])
  })

  it('sorts descending when asked (the newest-first proxy)', async () => {
    const res = await getOrderList({ ...page(), sort: { field: 'orderNumber', direction: 'desc' } })
    expect(res.orders[0].orderNumber).toBe('CCC100005')
    expect(res.orders[4].orderNumber).toBe('AAA100001')
  })

  it('paginates 1-based and reports unsliced totalCount', async () => {
    const p1 = await getOrderList(page(1, 2))
    const p2 = await getOrderList(page(2, 2))
    const p3 = await getOrderList(page(3, 2))
    expect(p1.orders.map(o => o.orderNumber)).toEqual(['AAA100001', 'AAA100002'])
    expect(p2.orders.map(o => o.orderNumber)).toEqual(['BBB100003', 'BBB100004'])
    expect(p3.orders.map(o => o.orderNumber)).toEqual(['CCC100005'])
    expect(p1.pagination.totalCount).toBe(5)
    expect(p3.pagination.totalCount).toBe(5)
  })

  it('ANDs across filter fields, ORs within an array', async () => {
    // OR within: two customers
    const or = await getOrderList({ ...page(), filters: { customers: ['ERCO_SYS_01', 'BASF_CHM_01'] } })
    expect(or.pagination.totalCount).toBe(5)
    // AND across: BASF + Cancelled narrows to one
    const and = await getOrderList({ ...page(), filters: { customers: ['BASF_CHM_01'], orderStatuses: ['Cancelled'] } })
    expect(and.orders.map(o => o.orderNumber)).toEqual(['AAA100002'])
  })

  it('filters origin city and earliest-pickup date range', async () => {
    const city = await getOrderList({ ...page(), filters: { originCities: ['Freeport'] } })
    expect(city.orders.map(o => o.orderNumber)).toEqual(['BBB100003'])
    const range = await getOrderList({
      ...page(),
      filters: { earliestPickupDateFrom: '2026-06-30', earliestPickupDateTo: '2026-07-02' },
    })
    expect(range.orders.map(o => o.orderNumber)).toEqual(['BBB100003'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/api/services/orderService.test.ts
```

Expected: FAIL — cannot resolve `./orderService`.

- [ ] **Step 3: Write the service**

```ts
import { getApiMode } from '../config'
import { apiPost } from '../client'
import { getAllOrders } from '../../data/orders'
import type { OrderListRequest, OrderListResponse, OrderListRow } from '../types/orderList'

// Order list service. live → POST /order-service/v3/order/list with the request
// verbatim (the params type IS the LLD request shape). mock → simulate the
// paginated server over orders.json: filter (AND across fields, OR within an
// array) → sort → 1-based paginate (Q29 tracks 1- vs 0-based).

// Date-range bounds are yyyy-mm-dd; compare against the row's ISO datetime by
// date part so the To-bound is inclusive.
function dateInRange(iso: string | undefined, from?: string, to?: string): boolean {
  const d = iso?.slice(0, 10)
  if (!d) return false
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

const oneOf = (values: string[] | undefined, v: string | undefined) =>
  !values?.length || values.includes(v ?? '')

export async function getOrderList(request: OrderListRequest): Promise<OrderListResponse> {
  if (getApiMode() === 'live') {
    return apiPost<OrderListResponse>('/order-service/v3/order/list', request)
  }

  let rows = getAllOrders() as OrderListRow[]

  const f = request.filters
  if (f) {
    rows = rows.filter(r =>
      oneOf(f.customers, r.customer) &&
      oneOf(f.orderNumbers, r.orderNumber) &&
      // mock matches display labels; code→label mapping deferred until filters bind (plan decision 8)
      oneOf(f.orderStatuses, r.orderStatus) &&
      oneOf(f.originCities, r.consignor?.city) &&
      oneOf(f.originStates, r.consignor?.state) &&
      oneOf(f.originCountries, r.consignor?.country) &&
      oneOf(f.destinationCities, r.consignee?.city) &&
      oneOf(f.destinationStates, r.consignee?.state) &&
      oneOf(f.destinationCountries, r.consignee?.country))
    if (f.earliestPickupDateFrom || f.earliestPickupDateTo)
      rows = rows.filter(r => dateInRange(r.consignor?.earliestPickupDateTime, f.earliestPickupDateFrom, f.earliestPickupDateTo))
    if (f.latestPickupDateFrom || f.latestPickupDateTo)
      rows = rows.filter(r => dateInRange(r.consignor?.latestPickupDateTime, f.latestPickupDateFrom, f.latestPickupDateTo))
    if (f.earliestDeliveryDateFrom || f.earliestDeliveryDateTo)
      rows = rows.filter(r => dateInRange(r.consignee?.earliestDeliveryDateTime, f.earliestDeliveryDateFrom, f.earliestDeliveryDateTo))
    if (f.latestDeliveryDateFrom || f.latestDeliveryDateTo)
      rows = rows.filter(r => dateInRange(r.consignee?.latestDeliveryDateTime, f.latestDeliveryDateFrom, f.latestDeliveryDateTo))
  }

  // LLD example default: orderNumber asc. Top-level string fields only — the
  // toolbar only sorts orderNumber in this build (A4/Q31).
  const sort = request.sort ?? { field: 'orderNumber', direction: 'asc' }
  const dir = sort.direction === 'desc' ? -1 : 1
  rows = [...rows].sort((a, b) => {
    const av = String((a as unknown as Record<string, unknown>)[sort.field] ?? '')
    const bv = String((b as unknown as Record<string, unknown>)[sort.field] ?? '')
    return av.localeCompare(bv) * dir
  })

  const { pageNumber, pageSize } = request.pagination
  const totalCount = rows.length
  const start = (pageNumber - 1) * pageSize // 1-based per the LLD list example (Q29)
  return {
    success: true,
    orders: rows.slice(start, start + pageSize),
    pagination: { pageNumber, pageSize, totalCount },
    error: null,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/api/services/orderService.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Run the whole api test suite (no regressions)**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/api
```

Expected: all existing + new tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/api/services/orderService.ts apps/odyssey-one/src/api/services/orderService.test.ts
git commit -m "orders: orderService mock+live branches over the LLD contract (TDD)"
```

---

### Task 8: react-query hook

**Files:**
- Create: `apps/odyssey-one/src/api/queries/useOrderList.ts`

- [ ] **Step 1: Write the hook (v5 idiom, mapping in the hook — Shipments precedent)**

```ts
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getOrderList } from '../services/orderService'
import { mapOrderListRow } from '../mappers/mapOrderListRow'
import type { OrderListRequest } from '../types/orderList'

export function useOrderList(request: OrderListRequest) {
  return useQuery({
    queryKey: ['order-list', request],
    queryFn: async () => {
      const res = await getOrderList(request)
      return {
        rows: res.orders.map(mapOrderListRow),
        totalCount: res.pagination.totalCount,
        pageNumber: res.pagination.pageNumber,
        pageSize: res.pagination.pageSize,
      }
    },
    placeholderData: keepPreviousData, // smooth paging — previous page stays visible while fetching
  })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/api/queries/useOrderList.ts
git commit -m "orders: useOrderList hook (keepPreviousData, VM mapping in hook)"
```

---

### Task 9: Orders page CSS + row-action menu

The action menu comes before the table because the table's Action column renders it.

**Files:**
- Create: `apps/odyssey-one/src/components/orders/orders.css`
- Create: `apps/odyssey-one/src/components/orders/OrderRowActionMenu.jsx`

- [ ] **Step 1: Write `orders.css` (all values are existing tokens — verified against packages/tokens/tokens.css)**

```css
/* Orders Summary Page — app-local styles.
   Deliberately NOT in @odyssey/ui: the grid skin gets replaced by the table
   normalization (Phase 2); these classes are the seam it re-skins. */

.orders-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-bottom: var(--spacing-8);
}

/* ── Toolbar ─────────────────────────────────────────────── */

.orders-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: var(--spacing-6) 0 var(--spacing-3);
}

.orders-toolbar__count {
  color: var(--text-tertiary);
}

.orders-toolbar__right {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

/* ── Table ───────────────────────────────────────────────── */

.orders-table-wrap {
  overflow-x: auto;
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
}

.orders-table th {
  text-align: left;
  padding: var(--spacing-3) var(--spacing-4);
  color: var(--text-secondary);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-default);
  white-space: nowrap;
}

.orders-table td {
  padding: var(--spacing-3) var(--spacing-4);
  color: var(--text-primary);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-subtle);
  white-space: nowrap;
}

.orders-table tbody tr:last-child td {
  border-bottom: none;
}

.orders-table tbody tr:hover td,
.orders-table tbody tr[data-selected] td {
  background: var(--bg-secondary);
}

/* Action column pinned right (survives horizontal scroll) */
.orders-table .orders-table__cell--action {
  position: sticky;
  right: 0;
}

/* ── Row action menu (three-dot) ─────────────────────────── */

.order-row-actions__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
}

.order-row-actions__trigger:hover {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.order-row-actions__menu {
  position: fixed;
  z-index: 1000;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-1) 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.order-row-actions__item {
  border: none;
  background: transparent;
  text-align: left;
  padding: var(--spacing-2) var(--spacing-4);
  color: var(--text-secondary);
  cursor: pointer;
}

.order-row-actions__item:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* ── Pagination footer ───────────────────────────────────── */

.orders-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-6);
  margin-top: var(--spacing-4);
}

.orders-pagination__size {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  color: var(--text-tertiary);
}

.orders-pagination__select {
  padding: var(--spacing-1) var(--spacing-2);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
}

.orders-pagination__page {
  color: var(--text-tertiary);
}

.orders-pagination__nav {
  display: inline-flex;
  gap: var(--spacing-2);
}

/* ── Page status (loading / error) ───────────────────────── */

.orders-page__status {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-8);
  color: var(--text-tertiary);
}
```

(Note: `--spacing-1` — verify it exists in `packages/tokens/tokens.css` with `grep -n "spacing-1:" packages/tokens/tokens.css`; if the scale starts at `--spacing-2`, use `--spacing-2` for the menu's vertical padding instead.)

- [ ] **Step 2: Write `OrderRowActionMenu.jsx` (portal + fixed positioning — the ShipmentTable tooltip idiom, because the sticky cell sits inside an `overflow-x: auto` wrap that would clip an absolute menu)**

```jsx
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EllipsisVertical } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

// Canonical row actions (spec §2): all inert this build — each wires up with
// its own feature build (detail page, edit, copy, cancel/restore, delete).
const ACTIONS = ['View', 'Edit', 'Copy', 'Cancel', 'Restore', 'Delete']

/**
 * OrderRowActionMenu — app-local three-dot menu for an orders grid row.
 * NOT @odyssey/ui's MenuDropdown (that's a sidebar accordion group). This is
 * the SHP-66 generic-dropdown candidate; normalize it there when that lands.
 * Portal + fixed positioning so the menu escapes the table wrap's overflow.
 */
export default function OrderRowActionMenu() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const toggle = () => {
    if (open) { setOpen(false); return }
    const rect = triggerRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.right })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onScrollOrResize = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  return (
    <div className="order-row-actions">
      <button
        ref={triggerRef}
        type="button"
        className="order-row-actions__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Order actions"
        onClick={toggle}
      >
        <EllipsisVertical {...ICON_MD} />
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="order-row-actions__menu"
          role="menu"
          style={{ top: pos.top, left: pos.left, transform: 'translateX(-100%)' }}
        >
          {ACTIONS.map(action => (
            <button
              key={action}
              type="button"
              role="menuitem"
              className="order-row-actions__item text-label-sm-regular"
              onClick={() => setOpen(false)}
            >
              {action}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/orders.css apps/odyssey-one/src/components/orders/OrderRowActionMenu.jsx
git commit -m "orders: page styles + app-local three-dot row action menu (inert)"
```

---

### Task 10: OrdersTable (TanStack v8, headless)

**Files:**
- Create: `apps/odyssey-one/src/components/orders/OrdersTable.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { Button, Checkbox } from '@odyssey/ui'
import OrderRowActionMenu from './OrderRowActionMenu'

/**
 * OrdersTable — headless TanStack grid over OrderRowVM rows.
 * Logic only lives here (columns, selection); ALL markup/skin is ours via
 * orders.css, so the table normalization (Phase 2) re-skins without touching
 * this logic. manualPagination/manualSorting: the table only ever holds one
 * server-shaped page; the service does the real work.
 */

const columnHelper = createColumnHelper()

const COLUMNS = [
  columnHelper.display({
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        indeterminate={table.getIsSomeRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
        showLabel={false}
        aria-label="Select all orders on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        showLabel={false}
        aria-label={`Select order ${row.original.idLabel}`}
      />
    ),
  }),
  columnHelper.accessor('idLabel', {
    header: 'ID',
    // Link-styled, navigates nowhere yet — order detail build wires it (spec §2)
    cell: info => <Button variant="link">{info.getValue()}</Button>,
  }),
  columnHelper.accessor('customer', { header: 'Customer' }),
  columnHelper.accessor('origin', { header: 'Origin' }),
  columnHelper.accessor('destination', { header: 'Destination' }),
  columnHelper.accessor('weight', { header: 'Weight' }),
  columnHelper.accessor('volume', { header: 'Volume' }),
  columnHelper.accessor('commodity', { header: 'Commodity' }),
  columnHelper.accessor('equipment', { header: 'Equipment' }),
  columnHelper.accessor('earlyPickup', { header: 'Early Pickup' }),
  columnHelper.display({
    id: 'action',
    header: 'Action',
    cell: () => <OrderRowActionMenu />,
  }),
]

export default function OrdersTable({ rows, rowSelection, onRowSelectionChange }) {
  const data = useMemo(() => rows, [rows])

  const table = useReactTable({
    data,
    columns: COLUMNS,
    state: { rowSelection },
    onRowSelectionChange,
    enableRowSelection: true,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  })

  return (
    <div className="orders-table-wrap">
      <table className="orders-table">
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(header => (
                <th
                  key={header.id}
                  className={[
                    'text-label-sm-medium',
                    header.column.id === 'action' && 'orders-table__cell--action',
                  ].filter(Boolean).join(' ')}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} data-selected={row.getIsSelected() || undefined}>
              {row.getVisibleCells().map(cell => (
                <td
                  key={cell.id}
                  className={[
                    'text-label-sm-regular',
                    cell.column.id === 'action' && 'orders-table__cell--action',
                  ].filter(Boolean).join(' ')}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/OrdersTable.jsx
git commit -m "orders: OrdersTable — headless TanStack grid, lean 11-column set"
```

---

### Task 11: OrdersToolbar + OrdersTablePagination

**Files:**
- Create: `apps/odyssey-one/src/components/orders/OrdersToolbar.jsx`
- Create: `apps/odyssey-one/src/components/orders/OrdersTablePagination.jsx`

- [ ] **Step 1: Write `OrdersToolbar.jsx`**

```jsx
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { FilterButton, IconButton } from '@odyssey/ui'

/**
 * OrdersToolbar — count · sort-direction toggle · Filters (inert).
 * Direction-only sort on orderNumber is the A4 interim (header-click sorting is
 * Efrain's call, Q33). Filters button renders inert until the filter-panel
 * build (needs Efrain's open-panel export first).
 */
export default function OrdersToolbar({ totalCount, sortDirection, onToggleSort, disabled }) {
  const SortIcon = sortDirection === 'desc' ? ArrowDownWideNarrow : ArrowUpNarrowWide
  return (
    <div className="orders-toolbar">
      <span className="orders-toolbar__count text-label-sm-regular">
        {totalCount == null ? '—' : `${totalCount.toLocaleString('en-US')} items`}
      </span>
      <div className="orders-toolbar__right">
        <IconButton
          icon={<SortIcon {...ICON_MD} />}
          onClick={onToggleSort}
          ariaLabel={`Sorted ${sortDirection === 'desc' ? 'descending' : 'ascending'} — toggle direction`}
          disabled={disabled}
        />
        <FilterButton label="Filters" onClick={() => {}} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `OrdersTablePagination.jsx`**

```jsx
import { Button } from '@odyssey/ui'

// 20 = the LLD example pageSize (A2); options pending Q29's max-page-size answer.
const PAGE_SIZE_OPTIONS = [20, 50, 100]

/**
 * OrdersTablePagination — Prev/Next + page-size select. App-local on purpose;
 * graduates with the table normalization (Phase 2). pageNumber is 1-BASED
 * (LLD list example; Q29).
 */
export default function OrdersTablePagination({
  pageNumber,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  disabled,
}) {
  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / pageSize))
  return (
    <div className="orders-pagination">
      <label className="orders-pagination__size text-label-sm-regular">
        Rows per page
        <select
          className="orders-pagination__select text-label-sm-regular"
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          disabled={disabled}
        >
          {PAGE_SIZE_OPTIONS.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
      <span className="orders-pagination__page text-label-sm-regular">
        Page {pageNumber.toLocaleString('en-US')} of {totalPages.toLocaleString('en-US')}
      </span>
      <div className="orders-pagination__nav">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || pageNumber <= 1}
          onClick={() => onPageChange(pageNumber - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || pageNumber >= totalPages}
          onClick={() => onPageChange(pageNumber + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/OrdersToolbar.jsx apps/odyssey-one/src/components/orders/OrdersTablePagination.jsx
git commit -m "orders: toolbar (count/sort/inert Filters) + 1-based pagination footer"
```

---

### Task 12: OrdersRoute + router wiring

**Files:**
- Create: `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx`
- Modify: `apps/odyssey-one/src/App.jsx` (Orders import + element)
- Delete: `apps/odyssey-one/src/routes/Orders.jsx` (the stub)

- [ ] **Step 1: Write `routes/orders/OrdersRoute.jsx`**

```jsx
import { useMemo, useState } from 'react'
import { Inbox, Plus } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Button, EmptyState, PageHeader } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import OrdersToolbar from '../../components/orders/OrdersToolbar'
import OrdersTable from '../../components/orders/OrdersTable'
import OrdersTablePagination from '../../components/orders/OrdersTablePagination'
import { useOrderList } from '../../api/queries/useOrderList'
import '../../components/orders/orders.css'

/**
 * OrdersRoute — the Order Summary Page (screen 0 of Efrain's Orders design).
 * PageHeader (+ inert Create Order in the S50b actions cluster) · toolbar ·
 * TanStack grid · 1-based pagination. Mock-mode data layer shaped like
 * POST /order-service/v3/order/list (Phase-2 LLD) — live flip is an env var.
 */
export default function OrdersRoute() {
  const [pageNumber, setPageNumber] = useState(1) // 1-based (LLD list example; Q29)
  const [pageSize, setPageSize] = useState(20)
  const [sortDirection, setSortDirection] = useState('desc') // newest-first proxy (A3/Q31)
  const [rowSelection, setRowSelection] = useState({})

  const request = useMemo(() => ({
    pagination: { pageNumber, pageSize },
    sort: { field: 'orderNumber', direction: sortDirection },
  }), [pageNumber, pageSize, sortDirection])

  const { data, isPending, isError, isFetching, refetch } = useOrderList(request)

  // Reset to page 1 whenever the query identity changes (Shipments-proven pattern).
  const handleToggleSort = () => {
    setSortDirection(d => (d === 'desc' ? 'asc' : 'desc'))
    setPageNumber(1)
  }
  const handlePageSizeChange = (n) => {
    setPageSize(n)
    setPageNumber(1)
  }

  return (
    <AppShell>
      <div className="orders-page">
        <PageHeader title="Orders">
          {/* Inert until the create-form build (spec §2) */}
          <Button variant="primary" icon={<Plus {...ICON_MD} />}>Create Order</Button>
        </PageHeader>

        <OrdersToolbar
          totalCount={data?.totalCount}
          sortDirection={sortDirection}
          onToggleSort={handleToggleSort}
          disabled={isFetching}
        />

        {isPending ? (
          <div className="orders-page__status text-label-sm-regular">Loading orders…</div>
        ) : isError ? (
          <div className="orders-page__status">
            <span className="text-label-sm-regular">Something went wrong loading orders.</span>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : data.rows.length === 0 ? (
          <EmptyState icon={<Inbox size={32} />} message="No orders found" />
        ) : (
          <>
            <OrdersTable
              rows={data.rows}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
            />
            <OrdersTablePagination
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalCount={data.totalCount}
              onPageChange={setPageNumber}
              onPageSizeChange={handlePageSizeChange}
              disabled={isFetching}
            />
          </>
        )}
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 2: Rewire `App.jsx`**

In `apps/odyssey-one/src/App.jsx`, change the import:

```jsx
// before
import Orders from './routes/Orders.jsx'
// after
import OrdersRoute from './routes/orders/OrdersRoute.jsx'
```

and the route element:

```jsx
// before
<Route path="/orders" element={<Orders />} />
// after
<Route path="/orders" element={<OrdersRoute />} />
```

- [ ] **Step 3: Delete the stub**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git rm apps/odyssey-one/src/routes/Orders.jsx
```

(`route-stub.css` stays — Carriers/Tracking/Users/Partners still import it.)

- [ ] **Step 4: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/routes/orders/OrdersRoute.jsx apps/odyssey-one/src/App.jsx
git commit -m "orders: OrdersRoute — Summary Page wired into the router (replaces stub)"
```

---

### Task 13: Verify — tests, type-check, build, manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Full test suite + type-check**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run
npx tsc --noEmit
```

Expected: all tests PASS; tsc exit 0.

- [ ] **Step 2: Production build (also exercises the prebuild generator chain)**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
npm run build:odyssey-one
```

Expected: build succeeds; prebuild logs both generators (`1200` shipments + `Wrote 4509 orders`). Then re-check the committed JSONs are unchanged: `git diff --exit-code apps/odyssey-one/src/data/`.

- [ ] **Step 3: Manual smoke in the dev server**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
npm run dev:odyssey-one
```

Navigate to `/orders` and verify against spec §3/§7:
1. PageHeader "Orders" + Create Order button (primary, plus icon, inert) right-aligned in the actions cluster.
2. Toolbar shows "4,509 items", sort IconButton, Filters button (inert).
3. Grid renders 20 rows, 11 columns in spec order; ID column link-styled; Origin/Destination as `LOCID: City, ST`; Weight/Volume as `N lbs` / `N cbf`; Early Pickup as `MM/DD/YYYY HH:mm`.
4. Sort toggle flips row order (desc ↔ asc by orderNumber) and resets to page 1.
5. Pagination: Next/Previous walk pages (Previous disabled on page 1; Next disabled on the last page); page-size select 20/50/100 resets to page 1; previous page stays visible during page changes (no flash to empty).
6. Header checkbox: select-all on page; indeterminate when some rows checked.
7. Three-dot menu opens below-left of the trigger with the 6 inert items; closes on outside click and scroll; not clipped by the table edge on the last visible row.
8. Shipments route still works (regression: pools extraction + App.jsx edit touched shared ground).
9. Console: no errors/warnings.

- [ ] **Step 4: Fix anything found, then final commit if fixes were made**

Any visual/behavioral fixes discovered in Step 3 get committed as:

```bash
git add -A apps/odyssey-one/src
git commit -m "orders: summary page smoke-test fixes"
```

---

## Out of scope (per spec §2 — do NOT build)

Filter panel behavior, tab strip, Create Order form, row-action behaviors, ID navigation, column management, bulk-action bar, CSV export, EntityChip↔scope wiring, `@tanstack/react-virtual`, component tests for UI pieces.

## Deferred bookkeeping (post-build, not in this plan's tasks)

- `progress.md` session entry + decision-log updates happen at `/wrap`, per routine.
- Phase 2 normalization hooks (grid skin, toolbar, menu→SHP-66, pagination) are recorded in spec §11.
- Q-list status: this build resolves nothing new; Q29/Q31/Q33/Q34 remain with the team.
