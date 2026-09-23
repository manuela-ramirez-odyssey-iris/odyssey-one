# Order Creation → Direct Shipment ("close the loop") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creating a valid (non-draft) order also creates ONE direct shipment (`O…`) holding that order, lands it in `Monitoring › Consolidation` (or `Hold` when the order is not consolidatable), and moves the order to `Planned Shipment` — in BOTH runtimes (mock overlay and live Neon).

**Architecture:** One pure builder, `api/_lib/planShipment.mjs`, turns a `ManualOrder` into `{ row, detail }` (grid row + `SellShipmentOut` blob) and emits the SQL for live. The mock `createOrder` (`src/api/services/orderService.ts`) feeds the row/detail into a new in-memory shipments overlay in `src/data/index.js` (the exact pattern orders already use); the live `createOrder` (`api/_lib/orders.mjs`) runs the builder's SQL after the order INSERT. No timers, no auto-tender, no consolidation — a shipment is created and parked, period (Dave Schultz, 2026-09-17 call: every new shipment starts in Optimization pool / Hold / Review, never tendering).

**Tech Stack:** React 19 + Vite, TanStack Query, vitest (`src/**`), `node:test` (`api/_lib/**`), pg / Neon.

**Domain rulings this encodes (source: Dave Schultz, `Planning and Consolidation.vtt`, 2026-09-17 — highest authority, see memory `project_stakeholders`):**
- Order → load → shipment happens on creation, "asynchronous but effectively immediate"; the load is immediately in a **direct** shipment by itself (00:02:02). We skip the never-visible `Planned Load` blink and land the order on **`Planned Shipment`** directly.
- The new shipment is placed in the **optimization pool** (= our `consolidation` category) when eligible, **Hold** when not (00:21:30). Eligibility gate we have today = the order's `CONSOLIDATABLE` flag (Ramesh's "Allow Optimization = Yes"; `mapFormToOrderInterface.ts:66`). Review (no carrier list) is NOT modelled — we have no routing.
- Nothing tenders on creation; the system never auto-re-tenders (00:17:30). No Sent state is ever written here.
- Identifier: `O` prefix, unbounded length (Dave, 2026-09-15). Sequence band `60_000_000 + orderId` — above the seeded 50M band, so it can never collide with a seeded `O`/`C` or a TMS id.

**Deliberately out of scope (say so in the wrap):** Draft → Submit (`submitDraftOrder`) still lands on `Ready for Planning` with no shipment; `stops`/`tenders`/`events` tables are not written (no read path uses them — `grep "FROM stops" api/_lib` is empty); ConfirmationView does not yet link to the new shipment.

---

## File structure

| File | Responsibility |
|---|---|
| **Create** `apps/odyssey-one/api/_lib/planShipment.mjs` | Pure: `buildDirectShipment(...)` → `{ row, detail, pickupTs, deliveryTs }`; `buildInsertShipmentQuery`, `buildLinkOrderQuery`, `buildSearchIndexQuery`, `consolidatableOf` |
| **Create** `apps/odyssey-one/api/_lib/planShipment.test.mjs` | node:test for the above |
| **Modify** `apps/odyssey-one/src/search/searchIndex-core.js` | add `clear()` to the returned index (the comment at :52 already promises it) |
| **Modify** `apps/odyssey-one/src/search/shipments/searchIndex.js` | export `clearShipmentSearchIndex` |
| **Modify** `apps/odyssey-one/src/data/index.js` | shipments overlay: `addShipment`, `getOverlayShipmentDetail`, `__resetShipmentWriteState`; `getAllShipments()` returns overlay-first |
| **Create** `apps/odyssey-one/src/data/shipmentsOverlay.test.js` | vitest for the overlay |
| **Modify** `apps/odyssey-one/src/api/services/shipmentService.ts:9-24` | mock detail consults the overlay before `fetch('/details/…')` |
| **Modify** `apps/odyssey-one/src/api/services/orderService.ts:614-651` | mock `createOrder` builds + adds the shipment, stamps `Planned Shipment`, clears the search index |
| **Modify** `apps/odyssey-one/src/api/services/orderServiceWrite.test.ts` | status assertion `Ready for Planning` → `Planned Shipment`; new assertions |
| **Modify** `apps/odyssey-one/api/_lib/orders.mjs:725-760` | live `createOrder` runs builder SQL after the order INSERT |
| **Modify** `apps/odyssey-one/api/_lib/orders.test.mjs:320-338` | scripted fake db for the multi-query create |
| **Modify** `apps/odyssey-one/src/api/queries/useCreateOrder.ts` + `.test.tsx` | invalidate `shipment-error-list` and `shipment-category-counts` |
| **Modify** `vault/10-domains/shipments/decisions/decision-log.md` | decision entries (traceability) |

Run tests from `apps/odyssey-one/`:
- vitest: `npx vitest run <path>` (config `vite.config.js:103`, env node, `VITE_API_MODE=mock`)
- node:test: `node --test api/_lib/planShipment.test.mjs`

Commit subjects carry the session tag **`S150: `** (CLAUDE.md commit convention).

---

### Task 1: `clear()` on the shared search index

**Files:**
- Modify: `apps/odyssey-one/src/search/searchIndex-core.js:53-95`
- Modify: `apps/odyssey-one/src/search/shipments/searchIndex.js`
- Test: `apps/odyssey-one/src/search/searchIndex-core.test.js` (create if absent; if a test file for the core already exists, append the test there instead)

- [ ] **Step 1: Write the failing test**

```js
// apps/odyssey-one/src/search/searchIndex-core.test.js
import { describe, it, expect } from 'vitest'
import { createSearchIndex } from './searchIndex-core'

describe('createSearchIndex.clear', () => {
  it('forgets the cached distinct values so rows added at runtime become visible', () => {
    const rows = [{ scac: 'ABCD' }]
    const index = createSearchIndex(() => rows)
    expect(index.distinctMatches('scac', '')).toEqual(['ABCD'])
    rows.push({ scac: 'WXYZ' })
    expect(index.distinctMatches('scac', '')).toEqual(['ABCD']) // cached — the documented ceiling
    index.clear()
    expect(index.distinctMatches('scac', '')).toEqual(['ABCD', 'WXYZ'])
  })
})
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `cd apps/odyssey-one && npx vitest run src/search/searchIndex-core.test.js`
Expected: FAIL — `index.clear is not a function`

- [ ] **Step 3: Add `clear()` to the returned object**

In `searchIndex-core.js`, inside the `return {` object (after `valueMatchDetail`), add:

```js
    /** Drop the per-attribute cache. Call from whatever mutates the row source
        (the shipments overlay does, on create) — see the ponytail note above. */
    clear() {
      distinctCache.clear()
    },
```

And replace the comment at :50-52 ("Call `clear()` from whatever mutates the source if that ever becomes real") — it is real now:

```js
 * ponytail: the per-attribute distinct set is cached for the process lifetime.
 * Runtime-created rows (the shipments overlay, src/data/index.js) call `clear()`
 * after each mutation so the next probe re-reads the source.
```

- [ ] **Step 4: Export the shipments binding's clear**

In `apps/odyssey-one/src/search/shipments/searchIndex.js`, after the three existing exports add:

```js
/** Shipments were created at runtime (mock overlay) — forget cached distincts. */
export const clearShipmentSearchIndex = index.clear
```

- [ ] **Step 5: Run — expect PASS**

Run: `npx vitest run src/search/searchIndex-core.test.js`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/search/searchIndex-core.js apps/odyssey-one/src/search/searchIndex-core.test.js apps/odyssey-one/src/search/shipments/searchIndex.js
git commit -m "S150: the search index can forget its cache once shipments are created at runtime"
```

---

### Task 2: Shipments overlay in the mock data seam

**Files:**
- Modify: `apps/odyssey-one/src/data/index.js:1-9`
- Test: `apps/odyssey-one/src/data/shipmentsOverlay.test.js`

The overlay mirrors `orderService.ts:429` (`overlayRows`) — module-level state, prepended, reset hook for tests. Rows and details are keyed by `sellShipment` (the row id, route param and `/details/{id}` key — `adapter.js:338`).

- [ ] **Step 1: Write the failing test**

```js
// apps/odyssey-one/src/data/shipmentsOverlay.test.js
import { beforeEach, describe, it, expect } from 'vitest'
import { getAllShipments, addShipment, getOverlayShipmentDetail, __resetShipmentWriteState } from './index'

const row = { sellShipment: '26090001', buyShipment: '900090001', odysseyShipmentIdentifier: 'O60090001', orders: ['0000000090001'] }
const detail = { shipmentId: '26090001', orderList: [], shipmentStopList: [], historyList: [] }

beforeEach(() => __resetShipmentWriteState())

describe('shipments overlay', () => {
  it('prepends a created shipment to the seeded list', () => {
    const before = getAllShipments().length
    addShipment(row, detail)
    const all = getAllShipments()
    expect(all.length).toBe(before + 1)
    expect(all[0]).toEqual(row)
  })

  it('serves the created detail by sellShipment and null for anything else', () => {
    addShipment(row, detail)
    expect(getOverlayShipmentDetail('26090001')).toEqual(detail)
    expect(getOverlayShipmentDetail('25000178')).toBeNull()
  })

  it('replaces, not duplicates, a re-added sellShipment', () => {
    addShipment(row, detail)
    addShipment({ ...row, customerName: 'X' }, detail)
    expect(getAllShipments().filter(s => s.sellShipment === '26090001')).toHaveLength(1)
  })

  it('reset empties the overlay', () => {
    addShipment(row, detail)
    __resetShipmentWriteState()
    expect(getOverlayShipmentDetail('26090001')).toBeNull()
    expect(getAllShipments()[0].sellShipment).not.toBe('26090001')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/data/shipmentsOverlay.test.js`
Expected: FAIL — `addShipment` is not exported

- [ ] **Step 3: Implement the overlay**

Replace lines 1–9 of `apps/odyssey-one/src/data/index.js` with:

```js
import shipments from './shipments.json'
import { EQUIPMENT_CODES } from './master-data'

// ─── Shipment list (statically imported, ~0.9 MB) + runtime overlay ─────────
// Mock mode keeps a module-level in-memory overlay over shipments.json — the
// same shape orderService.ts uses for orders (overlayRows). A shipment created
// in the session (order create → direct shipment, S150) is prepended here and
// its SellShipmentOut blob is served from `overlayDetails` instead of
// /details/{id}.json. Lost on refresh — accepted, same as orders.
let overlayRows = []
const overlayDetails = new Map()

export function getAllShipments() {
  return overlayRows.length ? [...overlayRows, ...shipments] : shipments
}

/** Register a session-created shipment (row = grid row, detail = SellShipmentOut). */
export function addShipment(row, detail) {
  overlayRows = [row, ...overlayRows.filter(r => r.sellShipment !== row.sellShipment)]
  overlayDetails.set(row.sellShipment, detail)
}

/** The created shipment's detail blob, or null when the id is a seeded one. */
export function getOverlayShipmentDetail(sellShipment) {
  return overlayDetails.get(sellShipment) ?? null
}

/** Test hook — resets all mock shipment write state. */
export function __resetShipmentWriteState() {
  overlayRows = []
  overlayDetails.clear()
}
```

(Keep everything from `// ─── Search attributes` onward unchanged.)

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/data/shipmentsOverlay.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/data/index.js apps/odyssey-one/src/data/shipmentsOverlay.test.js
git commit -m "S150: the mock shipments seam gains an overlay for shipments created in the session"
```

---

### Task 3: The pure builder — `buildDirectShipment`

**Files:**
- Create: `apps/odyssey-one/api/_lib/planShipment.mjs`
- Test: `apps/odyssey-one/api/_lib/planShipment.test.mjs`

Inputs are the `ManualOrder` wire object (`src/api/types/createOrder.ts:70-135`, field names verbatim) plus the ids the caller already has. Output row shape = `ShipmentErrorRow` (`src/api/types/shipmentErrorList.ts:7-47`) exactly as `generate.mjs:2024-2070` emits it; detail shape = `SellShipmentOut` (`src/api/types/sellShipmentOut.ts`). Field-by-field derivation is in the code comments — keep them, they are the spec.

- [ ] **Step 1: Write the failing test**

```js
// apps/odyssey-one/api/_lib/planShipment.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDirectShipment, consolidatableOf, buildInsertShipmentQuery, buildLinkOrderQuery, buildSearchIndexQuery } from './planShipment.mjs'

// Mirrors mapFormToOrderInterface's output for orderFormValues.sample.ts
const mo = () => ({
  orderNumber: 'ORD-1001',
  customerId: 'ERCO_SYS_01',
  freightTermCode: 'P',
  shipDirectionCode: 'O',
  pickupNumber: '41197',
  poNumber: 'I567649422',
  requestedDateType: 'SHIP',
  requestedPickupDate: '2026-06-15T08:00:00', requestedPickupTimeZoneCode: 'CST',
  pickupAppointment: '2026-06-15T16:00:00', pickupAppointmentTimeZoneCode: 'CST',
  requestedDeliveryDate: undefined, requestedDeliveryTimeZoneCode: undefined,
  deliveryAppointment: '2026-06-18T12:00:00', deliveryAppointmentTimeZoneCode: 'CST',
  originPartnerId: 'EW-TX-001', originFullName: 'ERCO WORLDWIDE', originAddress1: '100 Industrial Blvd',
  originCity: 'Houston', originRegion: 'TX', originCountry: 'United States', originPostal: '77001',
  destinationPartnerId: 'GCR-TX-015', destinationFullName: 'GULF COAST RECEIVING', destinationAddress1: '114 Industrial Blvd',
  destinationCity: 'San Antonio', destinationRegion: 'TX', destinationCountry: 'United States', destinationPostal: '78201',
  grossWeightValue: 4300, grossWeightUomCode: 'lb', volumeValue: 730, volumeUomCode: 'cuft',
  orderCarrierEquipDetailList: [{ equipmentCode: 'VAN' }],
  orderLines: [
    { lineIdentifier: 1, shipItemIdentifier: '0000000100037', productDescription: 'Polyethylene Resin HD', grossWeightValue: 100, grossWeightUomCode: 'lb', volumeValue: 79, volumeUomCode: 'cuft', handlingUnitCount: 4 },
    { lineIdentifier: 2, shipItemIdentifier: '0000000100038', productDescription: 'Caustic Soda', grossWeightValue: 4200, grossWeightUomCode: 'lb', volumeValue: 651, volumeUomCode: 'cuft', hazardous: true },
  ],
  userFieldList: [{ userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: 'Y' }],
})
const args = () => ({ mo: mo(), orderNumber: 'ORD-1001', orderId: 90001, customerName: 'ERCO Systems Inc', now: new Date('2026-09-17T14:00:00Z'), userName: 'amy.cook' })

test('consolidatableOf: FLAG Y/absent → true, N → false', () => {
  assert.equal(consolidatableOf(mo()), true)
  assert.equal(consolidatableOf({ ...mo(), userFieldList: [{ userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: 'N' }] }), false)
  assert.equal(consolidatableOf({ ...mo(), userFieldList: undefined }), true)
})

test('ids: O prefix in the 60M band, sell/buy derived from orderId, load = order↔load 1:1', () => {
  const { row, detail } = buildDirectShipment(args())
  assert.equal(row.odysseyShipmentIdentifier, 'O60090001')
  assert.equal(row.sellShipment, '26090001')
  assert.equal(row.buyShipment, '900090001')
  assert.equal(row.load, '90001')
  assert.equal(detail.shipmentId, row.sellShipment)
  assert.equal(detail.odysseyShipmentIdentifier, 'O60090001')
})

test('a consolidatable order lands in the pool: monitoring/consolidation, Direct, no tender', () => {
  const { row } = buildDirectShipment(args())
  assert.equal(row.panel, 'monitoring')
  assert.equal(row.category, 'consolidation')
  assert.equal(row.shipmentType, 'Direct')
  assert.equal(row.tenderStatus, '')
  assert.equal(row.shipmentStatus, '')
  assert.equal(row.scac, null)
  assert.deepEqual(row.orders, ['ORD-1001'])
  assert.equal(row.orderCount, '1')
})

test('a non-consolidatable order lands on Hold', () => {
  const a = args(); a.mo.userFieldList = [{ userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: 'N' }]
  const { row, detail } = buildDirectShipment(a)
  assert.equal(row.category, 'hold')
  assert.match(detail.historyList[1].details, /moved to Hold/)
  assert.equal(detail.historyList[1].outcome, 'neutral')
})

test('row facts come from the order: customer, lane strings, dates, weight, refs, planning type', () => {
  const { row } = buildDirectShipment(args())
  assert.equal(row.customerId, 'ERCO_SYS_01')
  assert.equal(row.customerName, 'ERCO Systems Inc')
  assert.equal(row.consignor, 'ERCO WORLDWIDE')
  assert.equal(row.consignee, 'GULF COAST RECEIVING')
  assert.equal(row.origin, 'Houston TX US 77001')
  assert.equal(row.destination, 'San Antonio TX US 78201')
  assert.equal(row.pickupDate, '06/15/2026 08:00 CST')
  assert.equal(row.deliveryDate, '06/18/2026 12:00 CST')
  assert.equal(row.grossWeight, '4300')
  assert.equal(row.equipmentCode, 'VAN')
  assert.deepEqual(row.pickupNumbers, ['41197'])
  assert.deepEqual(row.poNumbers, ['I567649422'])
  assert.equal(row.planningType, 'SSD')
  assert.equal(row.loadCount, '2')
  assert.equal(row.legType, null)
})

test('timestamps for the DB follow the abbreviation, not a hardcoded zone', () => {
  const { pickupTs, deliveryTs } = buildDirectShipment(args())
  assert.equal(pickupTs, '2026-06-15T08:00:00-06:00')
  assert.equal(deliveryTs, '2026-06-18T12:00:00-06:00')
})

test('detail: one order, two stops carrying it, no routing, two history rows, pool state', () => {
  const { detail } = buildDirectShipment(args())
  assert.equal(detail.shipmentType, 'Direct')
  assert.equal(detail.customerName, 'ERCO Systems Inc')
  assert.equal(detail.numberOfStops, 2)
  assert.equal(detail.ratingStatus, 'Not Rated')
  assert.equal(detail.trackingUrl, null)
  assert.deepEqual(detail.shippingOptionList, [])
  assert.deepEqual(detail.droppedCarrierList, [])
  assert.equal(detail.orderList.length, 1)
  const o = detail.orderList[0]
  assert.equal(o.orderId, 'ORD-1001')
  assert.equal(o.consolidatable, true)
  assert.equal(o.origin.city, 'Houston')
  assert.equal(o.origin.country, 'US')
  assert.equal(o.grossWeightValue, 4300)
  assert.equal(o.orderLines.length, 2)
  assert.equal(o.orderLines[1].hazmatCode, 'HZ')
  assert.equal(o.orderLines[0].hazmatCode, null)
  const [pu, dl] = detail.shipmentStopList
  assert.equal(pu.stopType, 'pickup'); assert.equal(pu.stopSequence, 1)
  assert.deepEqual(pu.orderIds, ['ORD-1001'])
  assert.equal(pu.facilityName, 'ERCO WORLDWIDE')
  assert.equal(pu.scheduledDateTime, '06/15/2026 08:00 CST')
  assert.equal(pu.grossWeightValue, 4300)
  assert.equal(pu.packageCount, 4)
  assert.equal(pu.pickupNumber, '41197')
  assert.equal(dl.stopType, 'delivery'); assert.equal(dl.stopSequence, 2)
  assert.equal(dl.scheduledDateTime, '06/18/2026 12:00 CST')
  assert.equal(dl.pickupNumber, null)
  assert.equal(detail.historyList[0].action, 'Shipment Created')
  assert.match(detail.historyList[0].details, /Buy Shipment 900090001 and Sell Shipment 26090001 created successfully for Order ORD-1001/)
  assert.equal(detail.historyList[1].action, 'Optimization Evaluation')
  assert.match(detail.historyList[1].details, /moved to Consolidation/)
  assert.equal(detail.historyList[1].outcome, 'update')
  assert.deepEqual(detail.historyList[0].author, { name: 'OdysseyONE', kind: 'system' })
  assert.ok(detail.historyList[1].timestamp > detail.historyList[0].timestamp)
})

test('a blank delivery date yields empty display + null ts, never a crash', () => {
  const a = args(); a.mo.deliveryAppointment = undefined; a.mo.requestedDeliveryDate = undefined
  const { row, deliveryTs } = buildDirectShipment(a)
  assert.equal(row.deliveryDate, '')
  assert.equal(deliveryTs, null)
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd apps/odyssey-one && node --test api/_lib/planShipment.test.mjs`
Expected: FAIL — cannot find module `./planShipment.mjs`

- [ ] **Step 3: Write the builder**

```js
// apps/odyssey-one/api/_lib/planShipment.mjs — order created → ONE direct shipment.
//
// Dave Schultz (designed the old TMS; highest authority on the shipments
// domain — call 2026-09-17): the moment an order exists, the shipment domain
// creates its load AND a direct shipment holding that load; the shipment is
// then parked in the optimization pool (eligible for consolidation) or Hold
// (not eligible / too early). Nothing tenders on creation and the system never
// auto-re-tenders. This module is that step, pure, shared by the mock service
// (src/api/services/orderService.ts) and the live handler (api/_lib/orders.mjs)
// — same precedent as candidateOrders.mjs, which the client already imports.
//
// It is a REPRODUCTION of documented behaviour, never the source of a rule
// (memory: feedback_seed_data_is_not_a_source).
import { projectRow } from './search-registry.mjs'

// Same table seed.mjs uses to turn the generator's display strings into
// timestamptz — the abbreviation already encodes the DST decision.
const TZ_OFFSETS = {
  EST: '-05:00', EDT: '-04:00', CST: '-06:00', CDT: '-05:00', MST: '-07:00', MDT: '-06:00',
  PST: '-08:00', PDT: '-07:00', AKST: '-09:00', AKDT: '-08:00', HST: '-10:00',
}

// Identifier bands. Seeded shipments: sell 25xxxxxx, buy 8-digit random,
// odyssey seq from 50,000,000 (S148). Every band here is disjoint from those,
// and derived from the order's serial id so both runtimes mint the same ids
// without a sequence or a MAX() race.
//   odyssey  O + (60_000_000 + orderId)   — 'O' = single-order (Dave, 2026-09-15)
//   sell     26_000_000 + orderId
//   buy      900_000_000 + orderId        — 9 digits, never collides with an 8-digit seed
//   load     String(orderId)              — order ↔ load is 1:1 (Dave 00:59:20)
export function idsFor(orderId) {
  return {
    odysseyShipmentIdentifier: `O${60_000_000 + orderId}`,
    sellShipment: String(26_000_000 + orderId),
    buyShipment: String(900_000_000 + orderId),
    load: String(orderId),
  }
}

// The form's header checkbox rides the wire as a FLAG user field
// (mapFormToOrderInterface.ts:66). Checked by default (Q15), so absent = Y.
export function consolidatableOf(mo) {
  const f = (mo.userFieldList ?? []).find((u) => u.userfieldType === 'FLAG' && u.name === 'CONSOLIDATABLE')
  return f ? f.value !== 'N' : true
}

// 'United States' (the form's COUNTRIES vocabulary) → 'US' (the grid's lane
// string and the stop's country code). Codes pass through unchanged.
const COUNTRY_CODE = { 'United States': 'US', Canada: 'CA', Mexico: 'MX' }
const countryCode = (c) => COUNTRY_CODE[c] ?? (c || 'US')

// '2026-06-15T08:00:00' + 'CST' → '06/15/2026 08:00 CST' (generate.mjs formatDateTime shape)
function fmtDisplay(iso, tz) {
  if (!iso) return ''
  const [d, t = '00:00'] = iso.split('T')
  const [yyyy, mm, dd] = d.split('-')
  return `${mm}/${dd}/${yyyy} ${t.slice(0, 5)} ${tz || 'CST'}`
}
// '2026-06-15T08:00:00' + 'CST' → '2026-06-15T08:00:00-06:00'; null when unknown
function toTs(iso, tz) {
  if (!iso) return null
  const offset = TZ_OFFSETS[tz || 'CST']
  if (!offset) return null
  const [d, t = '00:00:00'] = iso.split('T')
  return `${d}T${t.length === 5 ? `${t}:00` : t}${offset}`
}

// ponytail: mode from weight — LTL under 10,000 lb, TL otherwise. Real mode
// comes from routing, which does not exist here; replace when it does.
const modeFor = (w) => (Number(w ?? 0) < 10_000 ? 'LTL' : 'TL')

function toAddress(mo, p) {
  return {
    externalIdentifier: mo[`${p}PartnerId`] ?? '',
    partnerId: mo[`${p}PartnerId`] ?? '',
    fullName: mo[`${p}FullName`] ?? mo[`${p}PartnerId`] ?? '',
    address1: mo[`${p}Address1`] ?? '',
    address2: mo[`${p}Address2`] || undefined,
    city: mo[`${p}City`] ?? '',
    region: mo[`${p}Region`] ?? '',
    postal: mo[`${p}Postal`] ?? '',
    country: countryCode(mo[`${p}Country`]),
    contactName: mo[`${p}ContactName`] ?? '',
    phone: mo[`${p}Phone`] ?? '',
    email: mo[`${p}Email`] ?? '',
  }
}

function toLine(l, i) {
  return {
    orderLineId: String(l.lineIdentifier ?? i + 1),
    lineNumber: String(l.lineIdentifier ?? i + 1),
    itemCode: l.shipItemIdentifier ?? '',
    itemDescription: l.productDescription ?? '',
    packageCount: l.handlingUnitCount ?? null,
    packageType: l.handlingUnit ?? undefined,
    grossWeightValue: l.grossWeightValue ?? 0,
    grossWeightUomCode: l.grossWeightUomCode ?? 'lb',
    volumeValue: l.volumeValue ?? undefined,
    volumeUomCode: l.volumeUomCode ?? undefined,
    // Only the flag reaches the wire (LINX-13893); 'HZ' is enough for
    // mapSellShipmentOutToDetail's hasHazmat (truthy hazmatCode).
    hazmatCode: l.hazardous ? 'HZ' : null,
    shippingClass: l.shipClass ?? undefined,
    declaredValue: l.declaredValue ?? undefined,
    declaredValueCurrency: l.declaredValueCurrency ?? undefined,
    lengthValue: l.lengthValue ?? undefined,
    widthValue: l.widthValue ?? undefined,
    heightValue: l.heightValue ?? undefined,
    countryOfOrigin: l.manufacturingCountryCode ?? undefined,
  }
}

/**
 * @param {object} a
 * @param {object} a.mo            ManualOrder (src/api/types/createOrder.ts)
 * @param {string} a.orderNumber   the assigned order number (user-supplied or padded id)
 * @param {number} a.orderId       the order's serial id (drives every shipment id)
 * @param {string} a.customerName  display name for mo.customerId
 * @param {Date}   a.now           creation instant (history timestamps)
 * @param {string} a.userName      creating user (kept for the caller's audit; not on the row)
 * @returns {{ row: object, detail: object, pickupTs: string|null, deliveryTs: string|null }}
 */
export function buildDirectShipment({ mo, orderNumber, orderId, customerName, now = new Date(), userName }) {
  const ids = idsFor(orderId)
  const consolidatable = consolidatableOf(mo)
  const lines = mo.orderLines ?? []
  const pickupIso = mo.requestedPickupDate, pickupTz = mo.requestedPickupTimeZoneCode
  const deliveryIso = mo.deliveryAppointment ?? mo.requestedDeliveryDate
  const deliveryTz = mo.deliveryAppointment ? mo.deliveryAppointmentTimeZoneCode : mo.requestedDeliveryTimeZoneCode
  const pickupDate = fmtDisplay(pickupIso, pickupTz)
  const deliveryDate = fmtDisplay(deliveryIso, deliveryTz)
  const grossWeight = mo.grossWeightValue ?? lines.reduce((s, l) => s + (l.grossWeightValue ?? 0), 0)
  const volume = mo.volumeValue ?? lines.reduce((s, l) => s + (l.volumeValue ?? 0), 0)
  const packageCount = lines.reduce((s, l) => s + (l.handlingUnitCount ?? 0), 0)
  const equipmentCode = mo.orderCarrierEquipDetailList?.[0]?.equipmentCode ?? ''
  const origin = toAddress(mo, 'origin')
  const destination = toAddress(mo, 'destination')
  // Optimization pool = the grid's Monitoring › Consolidation tab (Jana/Ramesh's
  // "Consolidation" status); Hold = not eligible. Review (no carrier list) is
  // not modelled — this prototype has no routing call to fail.
  const category = consolidatable ? 'consolidation' : 'hold'

  const row = {
    odysseyShipmentIdentifier: ids.odysseyShipmentIdentifier,
    buyShipment: ids.buyShipment,
    sellShipment: ids.sellShipment,
    orders: [orderNumber],
    pickupNumbers: mo.pickupNumber ? [mo.pickupNumber] : [],
    poNumbers: mo.poNumber ? [mo.poNumber] : [],
    shipmentType: 'Direct',               // LINX-11597: one mapped order
    planningType: mo.requestedDateType === 'DELIVERY' ? 'RDD' : 'SSD', // LINX-12902
    legType: null, shipmentSequenceLeg: null, nextShipmentId: null,
    pro: null,                            // no carrier yet
    customerId: mo.customerId ?? '',
    customerName: customerName ?? mo.customerId ?? '',
    consignor: origin.fullName,
    consignee: destination.fullName,
    origin: `${origin.city} ${origin.region} ${origin.country} ${origin.postal}`.trim(),
    destination: `${destination.city} ${destination.region} ${destination.country} ${destination.postal}`.trim(),
    pickupDate, deliveryDate,
    mode: modeFor(grossWeight),
    equipmentCode,
    equipment: '',                        // equipment NUMBER is assigned by the carrier
    seal: null,
    scac: null,
    tenderStatus: '',                     // never tendered on creation (Dave 00:21:30)
    shipmentStatus: '',
    panel: 'monitoring',
    category,
    validationMessage: null,
    grossWeight: String(grossWeight),
    load: ids.load,
    loadCount: String(lines.length || 1), // generate.mjs: Σ line count
    orderCount: '1',
    apFreightCost: '',                    // not rated
  }

  const t0 = new Date(now)
  const t1 = new Date(t0.getTime() + 30_000)
  const author = { name: 'OdysseyONE', kind: 'system' } // a MANUAL order did not come from an ERP
  const historyList = [
    { user: 'OdysseyONE', source: 'OdysseyONE', timestamp: t0.toISOString(), action: 'Shipment Created', category: 'create', outcome: 'update', author,
      details: `Buy Shipment ${ids.buyShipment} and Sell Shipment ${ids.sellShipment} created successfully for Order ${orderNumber}.` },
    { user: 'OdysseyONE', source: 'OdysseyONE', timestamp: t1.toISOString(), action: 'Optimization Evaluation', category: 'update', author,
      details: consolidatable
        ? 'Optimization evaluation completed. Shipment moved to Consolidation.'
        : 'Optimization evaluation completed. Shipment moved to Hold.',
      outcome: consolidatable ? 'update' : 'neutral' }, // DEC-87 outcome contract (generate.mjs:1664)
  ]

  const order = {
    orderId: orderNumber,
    orderNumber,
    customerId: mo.customerId ?? '',
    owningOrganization: row.customerName,
    consolidatable,
    equipmentCode,
    equipmentReferenceNumber: mo.equipmentNumber ?? null,
    customerRequiredCarrier: null,
    pickupNumber: mo.pickupNumber ?? null,
    specialServices: (mo.orderAccessorialDetails ?? []).map((a) => ({ code: a.accessorialCode, desc: a.accessorialCode })),
    userDefinedFieldList: (mo.userFieldList ?? []).filter((u) => u.userfieldType === 'REFERENCE').map((u) => ({ name: u.name, value: u.value })),
    poNumber: mo.poNumber ?? null,
    planningDateType: row.planningType,
    bolNo: null,
    shipDirectionCode: mo.shipDirectionCode ?? '',
    origin, destination,
    scheduledShipDate: pickupDate,
    requestedShipDate: fmtDisplay(mo.pickupAppointment, mo.pickupAppointmentTimeZoneCode) || pickupDate,
    scheduledDeliveryDate: fmtDisplay(mo.requestedDeliveryDate, mo.requestedDeliveryTimeZoneCode) || deliveryDate,
    requestedDeliveryDate: deliveryDate,
    pickupAppointment: null,
    deliveryAppointment: null,
    grossWeightValue: grossWeight,
    grossWeightUomCode: mo.grossWeightUomCode ?? 'lb',
    volumeValue: volume,
    volumeUomCode: mo.volumeUomCode ?? 'cuft',
    orderLines: lines.map(toLine),
    instructionList: (mo.orderInstructionList ?? []).map((ins, i) => ({ sequenceNumber: i + 1, text: ins.instructionText ?? ins.text ?? String(ins) })),
  }

  const stop = (seq, type, a, when) => ({
    stopSequence: seq, stopType: type, orderIds: [orderNumber],
    facilityName: a.fullName, address1: a.address1, city: a.city, region: a.region, postal: a.postal, country: a.country,
    timeZone: undefined, scheduledDateTime: when || null, appointmentTime: null,
    grossWeightValue: grossWeight, grossWeightUomCode: 'LB',
    volumeValue: volume, volumeUomCode: 'cuft',
    packageCount, pickupNumber: type === 'pickup' ? (mo.pickupNumber ?? null) : null,
  })

  const detail = {
    shipmentId: ids.sellShipment,
    odysseyShipmentIdentifier: ids.odysseyShipmentIdentifier,
    shipmentType: 'Direct',
    customerId: row.customerId,
    customerName: row.customerName,
    shipDirection: mo.shipDirectionCode ?? '',
    freightTerms: mo.freightTermCode ?? '',
    incotermInfo: null,
    numberOfStops: 2,
    pgiFlag: false,
    ratingStatus: 'Not Rated',
    trackingUrl: null,                    // only an ACCEPTED tender is trackable (S149)
    distanceMiles: null,
    totalVolumeValue: volume,
    totalVolumeUomCode: mo.volumeUomCode ?? 'cuft',
    acceptedCarrierLabel: null,
    seedEquipment: equipmentCode || null,
    utilizationPercent: null,
    costSummary: undefined,               // mapCost tolerates absence → '--'
    orderList: [order],
    shipmentStopList: [stop(1, 'pickup', origin, pickupDate), stop(2, 'delivery', destination, deliveryDate)],
    shippingOptionList: [],               // no routing yet → Tender tab "No routing options available."
    droppedCarrierList: [],
    documentList: [],
    noteList: [],
    historyList,
  }

  return { row, detail, pickupTs: toTs(pickupIso, pickupTz), deliveryTs: toTs(deliveryIso, deliveryTz) }
}
```

- [ ] **Step 4: Run — expect the builder tests to PASS and the three SQL tests to FAIL**

Run: `node --test api/_lib/planShipment.test.mjs`
Expected: the 8 `buildDirectShipment`/`consolidatableOf` tests PASS; the file still fails to import `buildInsertShipmentQuery` etc. — that is Task 4. (If node:test refuses to run the file because of the missing named exports, temporarily comment the three names out of the import line, confirm PASS, then restore them for Task 4.)

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/api/_lib/planShipment.mjs apps/odyssey-one/api/_lib/planShipment.test.mjs
git commit -m "S150: a ManualOrder becomes one direct shipment — the pure builder"
```

---

### Task 4: SQL builders for the live path

**Files:**
- Modify: `apps/odyssey-one/api/_lib/planShipment.mjs` (append)
- Modify: `apps/odyssey-one/api/_lib/planShipment.test.mjs` (append)

Column list = `tools/seed.mjs:110-116` verbatim (the seeded truth), so a runtime row is indistinguishable from a seeded one to every reader.

- [ ] **Step 1: Append the failing tests**

```js
test('insert query: seed.mjs column order, detail as JSON, ts columns from the builder', () => {
  const built = buildDirectShipment(args())
  const q = buildInsertShipmentQuery(built)
  assert.match(q.text, /INSERT INTO shipments \(/)
  assert.match(q.text, /sell_shipment, buy_shipment, orders, pro, customer_id, customer_name, consignor, consignee/)
  assert.match(q.text, /odyssey_shipment_id/)
  assert.equal(q.values[0], '26090001')
  assert.equal(q.values[1], '900090001')
  assert.deepEqual(q.values[2], ['ORD-1001'])
  assert.equal(q.values[12], '2026-06-15T08:00:00-06:00') // pickup_ts
  assert.equal(q.values[13], '2026-06-18T12:00:00-06:00') // delivery_ts
  assert.equal(typeof q.values[30], 'string')              // detail (JSON string)
  assert.equal(JSON.parse(q.values[30]).shipmentId, '26090001')
  assert.equal(q.values.at(-1), 'O60090001')               // odyssey_shipment_id
  assert.equal(q.values.length, 38)
})

test('link query: the order points at its shipment and reads Planned Shipment', () => {
  const q = buildLinkOrderQuery('ORD-1001', '26090001')
  assert.match(q.text, /UPDATE orders SET shipment_sell_id = \$1, order_status = 'Planned Shipment' WHERE order_number = \$2/)
  assert.deepEqual(q.values, ['26090001', 'ORD-1001'])
})

test('search-index query: one row per projected attribute, keyed by sell_shipment', () => {
  const { row } = buildDirectShipment(args())
  const q = buildSearchIndexQuery(row)
  assert.match(q.text, /INSERT INTO search_index \(domain, entity_id, attr, value, display\) VALUES/)
  assert.match(q.text, /ON CONFLICT DO NOTHING/)
  // 5 columns per row; values include the odyssey id and the order number
  assert.equal(q.values.length % 5, 0)
  assert.ok(q.values.includes('O60090001'))
  assert.ok(q.values.includes('ORD-1001'))
  assert.ok(q.values.every((v, i) => i % 5 !== 1 || v === '26090001'))
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `node --test api/_lib/planShipment.test.mjs`
Expected: FAIL — `buildInsertShipmentQuery is not a function` (or import error)

- [ ] **Step 3: Append the SQL builders**

```js
// ── Live SQL ────────────────────────────────────────────────────────────────
// Column order = tools/seed.mjs:110-116, so a runtime shipment is
// indistinguishable from a seeded one to every reader (ROW_COLUMNS,
// buildDetailQuery, the counts query). stops/tenders/events are NOT written:
// no read path selects from them (grep "FROM stops|FROM events" api/_lib → 0),
// and the detail blob carries the stops and history the modal renders.
const INSERT_COLS = [
  'sell_shipment', 'buy_shipment', 'orders', 'pro', 'customer_id', 'customer_name', 'consignor', 'consignee',
  'origin', 'destination', 'pickup_date', 'delivery_date', 'pickup_ts', 'delivery_ts', 'mode', 'equipment_code',
  'equipment', 'seal', 'scac', 'tender_status', 'shipment_status', 'panel', 'category', 'validation_message',
  'gross_weight', 'load', 'load_count', 'order_count', 'ap_freight_cost', 'pickup_numbers', 'detail',
  'shipment_type', 'planning_type', 'po_numbers', 'leg_type', 'sequence_leg', 'next_shipment_id',
  'odyssey_shipment_id',
]

export function buildInsertShipmentQuery({ row: s, detail, pickupTs, deliveryTs }) {
  const values = [
    s.sellShipment, s.buyShipment, s.orders, s.pro, s.customerId, s.customerName, s.consignor, s.consignee,
    s.origin, s.destination, s.pickupDate, s.deliveryDate, pickupTs, deliveryTs, s.mode, s.equipmentCode,
    s.equipment, s.seal, s.scac, s.tenderStatus, s.shipmentStatus, s.panel, s.category, s.validationMessage,
    s.grossWeight, s.load, s.loadCount, s.orderCount, s.apFreightCost, s.pickupNumbers ?? [],
    JSON.stringify(detail),
    s.shipmentType ?? null, s.planningType ?? null, s.poNumbers ?? [], s.legType ?? null, s.shipmentSequenceLeg ?? null, s.nextShipmentId ?? null,
    s.odysseyShipmentIdentifier,
  ]
  const placeholders = INSERT_COLS.map((c, i) => {
    const p = `$${i + 1}`
    if (c === 'detail') return `${p}::jsonb`
    if (c === 'pickup_ts' || c === 'delivery_ts') return `${p}::timestamptz`
    return p
  })
  return { text: `INSERT INTO shipments (${INSERT_COLS.join(', ')}) VALUES (${placeholders.join(', ')})`, values }
}

// orders.shipment_sell_id (001_schema.sql:52) — the FK the seed fills and the
// runtime never did. Ordered AFTER the shipment insert so a failure between
// the two leaves a truthful 'Ready for Planning', never a dangling link.
export function buildLinkOrderQuery(orderNumber, sellShipment) {
  return {
    text: `UPDATE orders SET shipment_sell_id = $1, order_status = 'Planned Shipment' WHERE order_number = $2`,
    values: [sellShipment, orderNumber],
  }
}

// search_index is the live free-text/attribute probe (003_search_index.sql);
// a shipment missing here is invisible to the search bar. Same projection the
// seed uses (project-search.mjs → search-registry.mjs projectRow), fed the
// snake_case keys the registry reads.
export function buildSearchIndexQuery(row) {
  const src = {
    odyssey_shipment_id: row.odysseyShipmentIdentifier, buy_shipment: row.buyShipment, sell_shipment: row.sellShipment,
    orders: row.orders, pro: row.pro, pickup_numbers: row.pickupNumbers, customer_id: row.customerId,
    customer_name: row.customerName, consignor: row.consignor, consignee: row.consignee, origin: row.origin,
    destination: row.destination, equipment: row.equipment, seal: row.seal, scac: row.scac, load: row.load,
    shipment_type: row.shipmentType, planning_type: row.planningType,
  }
  const rows = projectRow('shipments', src, row.sellShipment)
  const values = [], tuples = []
  rows.forEach((r, i) => {
    const b = i * 5
    tuples.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`)
    values.push(r.domain, r.entity_id, r.attr, r.value, r.display)
  })
  return {
    text: `INSERT INTO search_index (domain, entity_id, attr, value, display) VALUES ${tuples.join(', ')} ON CONFLICT DO NOTHING`,
    values,
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `node --test api/_lib/planShipment.test.mjs`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/api/_lib/planShipment.mjs apps/odyssey-one/api/_lib/planShipment.test.mjs
git commit -m "S150: the direct shipment knows how to write itself to Neon"
```

---

### Task 5: Live `createOrder` plans the shipment

**Files:**
- Modify: `apps/odyssey-one/api/_lib/orders.mjs:1-5` (import) and `:725-760` (handler)
- Modify: `apps/odyssey-one/api/_lib/orders.test.mjs:320-338`

Sequence after the existing order INSERT (which already RETURNs `order_id`): customer name → shipment INSERT → order link → search index. Drafts are untouched (a Draft never plans). Each statement is its own query on the pool — no transaction, deliberately: the order INSERT commits first with `Ready for Planning`, and only the successful shipment INSERT flips it to `Planned Shipment`, so any failure leaves a truthful state.

- [ ] **Step 1: Replace the existing create test and add two**

Replace the test at `orders.test.mjs:320-338` (`'create order: happy path …'` — the one with `rows: [{ order_number: '0000000001234', …`) with:

```js
test('create order: a non-draft order also creates its direct shipment and links it', async () => {
  const created = new Date('2026-09-17T14:00:00Z')
  const calls = []
  const db = {
    query: async (q) => {
      calls.push(q)
      if (/INSERT INTO orders/.test(q.text)) return { rows: [{ order_number: '0000000001234', order_id: 1234, created_at: created, created_tz: null }] }
      if (/FROM customers/.test(q.text)) return { rows: [{ name: 'ERCO Systems Inc' }] }
      return { rows: [] }
    },
  }
  const result = await createOrder({ body: { manualOrder: { customerId: 'ERCO_SYS_01', orderLines: [] } }, db })
  assert.equal(result.success, true)
  assert.equal(result.data.orderNumber, '0000000001234')
  assert.equal(result.data.shipmentMode, 'Ground')
  // additive — the confirmation page ignores these today
  assert.equal(result.data.odysseyShipmentIdentifier, 'O60001234')
  assert.equal(result.data.sellShipment, '26001234')
  const texts = calls.map((c) => c.text)
  assert.match(texts[0], /INSERT INTO orders/)
  assert.match(texts[1], /SELECT name FROM customers WHERE id = \$1/)
  assert.match(texts[2], /INSERT INTO shipments/)
  assert.match(texts[3], /UPDATE orders SET shipment_sell_id/)
  assert.match(texts[4], /INSERT INTO search_index/)
  assert.equal(calls.length, 5)
  assert.equal(calls[2].values[5], 'ERCO Systems Inc') // customer_name on the shipment row
  assert.deepEqual(calls[3].values, ['26001234', '0000000001234'])
})

test('create order: a DRAFT save creates no shipment', async () => {
  const calls = []
  const db = { query: async (q) => { calls.push(q); return { rows: [{ order_number: '0000000001235', order_id: 1235, created_at: new Date(), created_tz: null }] } } }
  const result = await createOrder({ body: { manualOrder: { orderStatus: { orderStatusCode: 'DRAFT' }, orderLines: [] } }, db })
  assert.equal(result.success, true)
  assert.equal(calls.length, 1)
  assert.equal(result.data.odysseyShipmentIdentifier, undefined)
})

test('create order: an unknown customer name falls back to the id, never blocks the create', async () => {
  const calls = []
  const db = {
    query: async (q) => {
      calls.push(q)
      if (/INSERT INTO orders/.test(q.text)) return { rows: [{ order_number: 'ORD-9', order_id: 9, created_at: new Date(), created_tz: null }] }
      return { rows: [] }
    },
  }
  await createOrder({ body: { manualOrder: { customerId: 'ZZZ_01', orderLines: [] } }, db })
  assert.equal(calls[2].values[5], 'ZZZ_01')
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `node --test api/_lib/orders.test.mjs`
Expected: the three new tests FAIL (only 1 query issued; no `odysseyShipmentIdentifier`)

- [ ] **Step 3: Wire the handler**

At the top of `api/_lib/orders.mjs`, after the `deriveAuditTrail` import, add:

```js
import { buildDirectShipment, buildInsertShipmentQuery, buildLinkOrderQuery, buildSearchIndexQuery } from './planShipment.mjs'
```

Replace the body of `createOrder` (`:725-760`) `try` block's success path with:

```js
export async function createOrder({ body, db }) {
  const mo = body?.manualOrder
  if (!mo || typeof mo !== 'object') { const e = new Error('manualOrder required'); e.status = 400; throw e }
  try {
    const { rows } = await db.query(buildCreateOrderQuery(mo, body?.userId))
    const row = rows[0]
    const data = {
      orderNumber: row.order_number,
      orderDate: row.created_at.toISOString(),
      // Q28 open (mock constant, orderService.ts:291-292) — no shipmentMode/
      // zone derivation exists server-side either; matched verbatim so the
      // confirmation page renders identically in both modes.
      orderDateTimeZoneCode: 'EST',
      shipmentMode: 'Ground',
    }
    // Order → load → direct shipment, on creation (Dave Schultz 2026-09-17;
    // api/_lib/planShipment.mjs). A Draft never plans. Sequenced so a failure
    // anywhere below leaves the order at a truthful 'Ready for Planning'.
    if (mo.orderStatus?.orderStatusCode !== 'DRAFT') {
      const { rows: cust } = await db.query({ text: 'SELECT name FROM customers WHERE id = $1', values: [mo.customerId ?? ''] })
      const built = buildDirectShipment({
        mo, orderNumber: row.order_number, orderId: row.order_id,
        customerName: cust[0]?.name ?? mo.customerId ?? '', now: row.created_at, userName: body?.userId ?? null,
      })
      await db.query(buildInsertShipmentQuery(built))
      await db.query(buildLinkOrderQuery(row.order_number, built.row.sellShipment))
      await db.query(buildSearchIndexQuery(built.row))
      data.odysseyShipmentIdentifier = built.row.odysseyShipmentIdentifier
      data.sellShipment = built.row.sellShipment
    }
    return { orderId: row.order_id, success: true, message: `Order ${row.order_number} created successfully`, data }
  } catch (err) {
    // (keep the existing 23505 → 409 and 23503 → 400 handling exactly as it is)
```

Keep the existing `catch` block unchanged.

- [ ] **Step 4: Run — expect PASS**

Run: `node --test api/_lib/orders.test.mjs`
Expected: PASS, all tests (the earlier 400/409/FK tests still pass — they throw before/at the first query)

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/api/_lib/orders.mjs apps/odyssey-one/api/_lib/orders.test.mjs
git commit -m "S150: creating an order in live also creates its direct shipment and links the two"
```

---

### Task 6: Mock `createOrder` plans the shipment; mock detail serves it

**Files:**
- Modify: `apps/odyssey-one/src/api/services/orderService.ts:1-20` (imports) and `:614-651` (createOrder)
- Modify: `apps/odyssey-one/src/api/services/shipmentService.ts:1-24`
- Modify: `apps/odyssey-one/src/api/services/orderServiceWrite.test.ts`
- Create: `apps/odyssey-one/src/api/services/shipmentService.overlay.test.ts`

- [ ] **Step 1: Update the existing write test and add assertions**

In `orderServiceWrite.test.ts`:

1. Extend the top mocks/imports. Below the existing `vi.mock('../../data/orders', …)` line add nothing (we want the REAL `../../data` overlay). Change the import line to also import the reset hook and the shipments seam:

```ts
import { createOrder, updateOrder, saveDraft, getDraft, getOrderList, getAuditTrail, __resetOrderWriteState } from './orderService'
import { getAllShipments, getOverlayShipmentDetail, __resetShipmentWriteState } from '../../data'
```

2. Change `beforeEach`:

```ts
beforeEach(() => { __resetOrderWriteState(); __resetShipmentWriteState() })
```

3. Rename and rewrite the test at :32-40:

```ts
  it('appends a Planned Shipment row the Summary grid can see', async () => {
    await createOrder(mapFormToOrderInterface(sample()))
    const list = await getOrderList(page())
    const row = list.orders.find(o => o.orderNumber === 'ORD-1001')
    expect(row).toBeDefined()
    expect(row!.orderStatus).toBe('Planned Shipment') // S150: the shipment exists, so the order is planned (Dave 2026-09-17)
    expect(row!.orderSource).toBe('MANUAL')
    expect(row!.customer).toBe('ERCO_SYS_01')
    expect(row!.consignor.locationId).toBe('EW-TX-001')
    expect(row!.grossWeight).toEqual({ value: 4300, uom: 'lb' })
  })

  it('creates ONE direct shipment holding the order, parked in Monitoring › Consolidation', async () => {
    const res = await createOrder(mapFormToOrderInterface(sample()))
    const ship = getAllShipments()[0]
    expect(ship.orders).toEqual(['ORD-1001'])
    expect(ship.shipmentType).toBe('Direct')
    expect(ship.odysseyShipmentIdentifier).toMatch(/^O6\d{7}$/)
    expect(ship.panel).toBe('monitoring')
    expect(ship.category).toBe('consolidation')
    expect(ship.tenderStatus).toBe('')
    expect(ship.customerName).toBe('ERCO Systems Inc')
    expect(res.data!.odysseyShipmentIdentifier).toBe(ship.odysseyShipmentIdentifier)
    expect(res.data!.sellShipment).toBe(ship.sellShipment)
    expect(getOverlayShipmentDetail(ship.sellShipment)!.orderList[0].orderId).toBe('ORD-1001')
  })

  it('an order with Consolidatable unchecked parks its shipment on Hold', async () => {
    const v = sample(); v.general.consolidatable = false
    await createOrder(mapFormToOrderInterface(v))
    expect(getAllShipments()[0].category).toBe('hold')
  })

  it('a draft save creates no shipment', async () => {
    const before = getAllShipments().length
    await saveDraft(sample())
    expect(getAllShipments().length).toBe(before)
  })
```

If any other test in this file asserts `'Ready for Planning'` for a *created* (non-draft, non-submitted) order, change it to `'Planned Shipment'`. Leave `submitDraftOrder`/`resolveOrder` expectations alone — they still land on `Ready for Planning` (out of scope, see header).

- [ ] **Step 2: Write the mock detail test**

```ts
// apps/odyssey-one/src/api/services/shipmentService.overlay.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))

import { getSellShipmentDetail } from './shipmentService'
import { addShipment, __resetShipmentWriteState } from '../../data'

beforeEach(() => __resetShipmentWriteState())

describe('getSellShipmentDetail (mock) with the overlay', () => {
  it('serves a session-created shipment without fetching /details', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    addShipment(
      { sellShipment: '26090001', buyShipment: '900090001', odysseyShipmentIdentifier: 'O60090001', orders: ['ORD-1'] },
      { shipmentId: '26090001', odysseyShipmentIdentifier: 'O60090001', shipmentType: 'Direct', customerId: 'ERCO_SYS_01', customerName: 'ERCO Systems Inc',
        orderList: [], shipmentStopList: [], shippingOptionList: [], droppedCarrierList: [], documentList: [], noteList: [], historyList: [] },
    )
    const vm = await getSellShipmentDetail('26090001')
    expect(vm.odysseyShipmentIdentifier).toBe('O60090001')
    expect(vm.shipmentType).toBe('Direct')
    expect(vm.routingData.options).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
```

- [ ] **Step 3: Run both — expect FAIL**

Run: `npx vitest run src/api/services/orderServiceWrite.test.ts src/api/services/shipmentService.overlay.test.ts`
Expected: FAIL — status still `Ready for Planning`; `getAllShipments()[0]` is a seeded row; the overlay detail test tries to `fetch`

- [ ] **Step 4: Wire the mock services**

`shipmentService.ts` — change the import on line 7 and the mock branch of `getSellShipmentDetail`:

```ts
import { getAllShipments, getOverlayShipmentDetail } from '../../data'
```

```ts
  // mock: a shipment created in this session lives in the overlay (S150) —
  // serve its blob; otherwise load the generated SellShipmentOut DTO file.
  const local = getOverlayShipmentDetail(id)
  if (local) return mapSellShipmentOutToDetail(structuredClone(local) as SellShipmentOut)
  const res = await fetch(`/details/${id}.json`)
```

`orderService.ts` — add imports:

```ts
import { addShipment } from '../../data'
import { OWNING_ORGS, EXTRA_ORGS } from '../../data/master-data'
import { buildDirectShipment } from '../../../api/_lib/planShipment.mjs'
import { clearShipmentSearchIndex } from '../../search/shipments/searchIndex'
```

Then in mock `createOrder` (`:614-651`), after `row.createdTimeZoneCode = CREATED_TZ` and before `overlayRows = [row, …]`, insert:

```ts
  // Order → load → direct shipment, on creation (Dave Schultz 2026-09-17;
  // api/_lib/planShipment.mjs is the one builder both runtimes use). The
  // shipment goes into the shipments overlay (src/data/index.js) and the
  // order is planned — 'Planned Load' is a blink nobody sees.
  const customerName = [...OWNING_ORGS, ...EXTRA_ORGS].find(o => o.value === mo.customerId)?.label ?? mo.customerId ?? ''
  const built = buildDirectShipment({ mo, orderNumber, orderId, customerName, now: new Date(), userName: row.createdBy })
  addShipment(built.row, built.detail)
  clearShipmentSearchIndex()
  row.orderStatus = 'Planned Shipment'
```

And extend the returned `data` object with the two additive fields:

```ts
    data: {
      orderNumber,
      orderDate: new Date().toISOString(),
      orderDateTimeZoneCode: CREATED_TZ,
      shipmentMode: 'Ground', // Q28 open — derivation unknown; mock constant
      odysseyShipmentIdentifier: built.row.odysseyShipmentIdentifier,
      sellShipment: built.row.sellShipment,
    },
```

`src/api/types/createOrder.ts` — extend `CreatedOrderData` (additive, optional):

```ts
  /** S150 — the direct shipment created with the order (both runtimes). Absent on a draft. */
  odysseyShipmentIdentifier?: string
  sellShipment?: string
```

- [ ] **Step 5: Run — expect PASS**

Run: `npx vitest run src/api/services/orderServiceWrite.test.ts src/api/services/shipmentService.overlay.test.ts`
Expected: PASS

- [ ] **Step 6: Run the whole suite + typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: all green. If `resolve.test.jsx` / `breadcrumb.test.jsx` assert `'Ready for Planning'` after a **create**, update them to `'Planned Shipment'`; if they assert it after **resolveOrder/submitDraftOrder**, leave them.

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/src/api/services/orderService.ts apps/odyssey-one/src/api/services/shipmentService.ts apps/odyssey-one/src/api/services/orderServiceWrite.test.ts apps/odyssey-one/src/api/services/shipmentService.overlay.test.ts apps/odyssey-one/src/api/types/createOrder.ts
git commit -m "S150: creating an order in mock also creates its direct shipment; the modal can open it"
```

---

### Task 7: The grids learn about it immediately

**Files:**
- Modify: `apps/odyssey-one/src/api/queries/useCreateOrder.ts`
- Modify: `apps/odyssey-one/src/api/queries/useCreateOrder.test.tsx`

- [ ] **Step 1: Extend the test**

In `useCreateOrder.test.tsx`, after the two existing `toContainEqual` lines add:

```ts
    // S150: the create also planted a shipment — the Shipments grid and its
    // tab badges must not show a stale count.
    expect(invalidatedKeys).toContainEqual(['shipment-error-list'])
    expect(invalidatedKeys).toContainEqual(['shipment-category-counts'])
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/api/queries/useCreateOrder.test.tsx`
Expected: FAIL on the new assertions

- [ ] **Step 3: Add the invalidations**

In `useCreateOrder.ts` `onSuccess`, after the two existing invalidations:

```ts
      // S150: the create also created a direct shipment (planShipment.mjs) —
      // the Shipments grid (useShipmentErrorList) and tab counts
      // (useCategoryCounts) key on these prefixes.
      queryClient.invalidateQueries({ queryKey: ['shipment-error-list'] })
      queryClient.invalidateQueries({ queryKey: ['shipment-category-counts'] })
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/api/queries/useCreateOrder.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/api/queries/useCreateOrder.ts apps/odyssey-one/src/api/queries/useCreateOrder.test.tsx
git commit -m "S150: a created order refreshes the shipments grid it just landed in"
```

---

### Task 8: Browser check, both runtimes (no deploy)

**Files:** none modified. Two terminals from `apps/odyssey-one/`.

- [ ] **Step 1: Mock mode**

Run: `npm run dev` (ensure `.env.local` is NOT forcing `VITE_API_MODE=live`, or temporarily run `VITE_API_MODE=mock npm run dev`).
1. Orders → Create order → fill the form (leave *Consolidatable* checked) → Create.
2. Confirmation shows the order number. Orders grid: the row reads **Planned Shipment**.
3. Shipments → **Monitoring › Consolidation**: the first row is `O6…` with the new order number, Direct, no tender badge. Click it: modal opens; Stops shows the 2 stops; Tender tab reads "No routing options available."; History shows *Shipment Created* then *Optimization Evaluation… moved to Consolidation*.
4. Create a second order with *Consolidatable* unchecked → it appears under **Monitoring › Hold**.
5. Type the new order number in the search bar → the glimpse offers it (Task 1's `clear()` doing its job).

- [ ] **Step 2: Live mode**

Terminal A: `npm run dev:api` — Terminal B: `npm run dev:local` (Vite prints `[api proxy] /api → http://localhost:3001`).
Repeat steps 1–3. Then confirm in Neon (psql or the Neon console):

```sql
SELECT o.order_number, o.order_status, o.shipment_sell_id, s.odyssey_shipment_id, s.category
FROM orders o JOIN shipments s ON s.sell_shipment = o.shipment_sell_id
ORDER BY o.id DESC LIMIT 2;
```
Expected: the two new orders at `Planned Shipment`, linked to `O6…` shipments in `consolidation` / `hold`.

- [ ] **Step 3: Record what the check showed** in the session notes (any mismatch is a finding for the wrap, not something to patch silently).

**Do NOT deploy.** Prod deploys need the user's explicit go for that deploy (memory `feedback_no_prod_deploy_without_permission`).

---

### Task 9: Traceability

**Files:**
- Modify: `vault/10-domains/shipments/decisions/decision-log.md` (append, following the file's existing ID scheme and template: title / Decided / Previous state / Decision / Rationale / Source / Affects)

- [ ] **Step 1: Append two decisions**

```markdown
## <next-id> — An order's creation creates its direct shipment
**Decided:** 2026-09-17
**Previous state:** `createOrder` (mock + live) wrote the order at `Ready for Planning` and touched no shipment; orders created in a session never appeared in Shipments. Seeded shipments could show "Sent to tender" immediately after creation.
**Decision:** Creating a valid non-draft order also creates ONE direct shipment (`O` + 60,000,000 + orderId; sell 26,000,000 + orderId; buy 900,000,000 + orderId; load = orderId) holding that order, parked in `Monitoring › Consolidation` (optimization pool) when the order is Consolidatable, `Monitoring › Hold` otherwise. The order moves straight to `Planned Shipment` (`Planned Load` is a transient nobody sees). No tender state is written; nothing auto-tenders; no timers. One pure builder, `api/_lib/planShipment.mjs`, serves both runtimes.
**Rationale:** Dave Schultz (designed the old TMS): a load is always in a shipment from the moment it exists; new shipments start in Optimization pool / Hold / Review, never tendering; the system never auto-re-tenders. Consolidation (manual, Oct MVP) is built FROM these direct shipments, so the pool has to fill when orders are created.
**Source:** `vault-sources/10-domains/shipments/sources/planning-and-consolidation-dave-adam-2026-09-17.vtt` 00:02:02, 00:21:30, 00:24:25, 00:17:30; identifier rulings 2026-09-15.
**Affects:** `api/_lib/planShipment.mjs`, `api/_lib/orders.mjs createOrder`, `src/api/services/orderService.ts createOrder`, `src/data/index.js` (shipments overlay), `src/api/services/shipmentService.ts`, `useCreateOrder`.

## <next-id+1> — Draft submit and Review state are NOT planned yet
**Decided:** 2026-09-17
**Previous state:** —
**Decision:** `submitDraftOrder` still lands on `Ready for Planning` without a shipment; the Review creation state (no carrier list) is not modelled — the prototype has no routing call to fail. Both are open follow-ups, not rulings.
**Rationale:** Scope held to "create an order → a shipment exists" (user, 2026-09-17: "we create an order, a shipment is created with that order in it, period").
**Source:** session S150.
**Affects:** backlog.
```

- [ ] **Step 2: Commit**

```bash
git add vault/10-domains/shipments/decisions/decision-log.md
git commit -m "S150: decision log — order creation plants a direct shipment in the pool"
```

---

## Self-review

**Spec coverage.** Order create → shipment exists (T3–T6) ✔. Lands in Consolidation / Hold by the Consolidatable flag (T3 `category`, T6 tests) ✔. Order → `Planned Shipment` (T4 link query, T6 mock) ✔. Both runtimes (T5 live, T6 mock) ✔. Never Sent, no timers (T3 `tenderStatus: ''`, nothing scheduled) ✔. Detail modal opens for the new shipment (T6 overlay + `shipmentService`) ✔. Grid refreshes (T7) ✔. Search finds it in mock (T1) and live (T4 `search_index`) ✔. Traceability (T9) ✔. Out of scope stated in the header ✔.

**Placeholder scan.** No TBDs; every code step has full code; commands have expected outcomes. Task 9 uses `<next-id>` because the decision-log's numbering must be read from the file at execution time — the implementer takes the last entry's number + 1.

**Type/name consistency.** `buildDirectShipment` returns `{ row, detail, pickupTs, deliveryTs }` everywhere it is consumed (T4 destructures the same object; T5 passes it whole to `buildInsertShipmentQuery`). `addShipment(row, detail)` / `getOverlayShipmentDetail(id)` / `__resetShipmentWriteState()` match between T2, T6 and the tests. `clearShipmentSearchIndex` is the name exported in T1 and imported in T6. Query keys in T7 match `useShipmentErrorList.ts:8` (`'shipment-error-list'`) and `useCategoryCounts.ts:28` (`'shipment-category-counts'`). Insert values count = 38 = `INSERT_COLS.length`.
