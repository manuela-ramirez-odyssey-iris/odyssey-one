# Order Change (Direct Shipment) Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Model policy (hard rule):** all implementation subagents run on **Sonnet**. Planning/review stays at the main model.

**Goal:** Ship the Direct Order Change review flow — a new "Order Change" exceptions tab, a per-row "Review Order Change" action, and the full-page review screen (Laura's Figma node `1794-5544`, file `x38TOJGsNryYl3LsKhCtSc`) with cost selection, tender resolution actions, prior/new tender lists and comparison accordions.

**Architecture:** `category` is a stored, seeded column — the new tab is one `panelConfig.js` entry plus a generator change and a Neon reseed. The review payload rides in `shipments.detail` (jsonb) as a new `orderChange` key, returned verbatim by `sellShipmentDetail` (DEC-106 passthrough pattern). Resolution is one new PATCH endpoint that records the decision and moves the shipment out of the tab. The screen is a new route reusing the orders-preview idioms (`SubAccordion` stack, `PageHeader`, `DataTable`, `QuoteModal`).

**Tech Stack:** React 19 + React Router 6, TanStack Table (`DataTable`), `@odyssey/ui`, Neon Postgres via `api/_lib`, node --test (api/generator), vitest + testing-library (FE).

**Sources (provenance):**
- Jira ACs `LINX-14509…14515` (epic LINX-5921), fetched 2026-08-29 → `vault-sources/10-domains/shipments/sources/linx-order-change-direct-ac-2026-08-29.md`. **14516 is NOT in scope** (renamed to "Auto Tender Rule System Error Handling", epic LINX-5920).
- Jana's call 2026-08-29 → `vault/00-inbox/Order change Review.vtt` (esp. 09:27–16:24 scenario walkthrough, 25:03–27:27 bypass semantics, 28:44–29:32 quote-copy rule, 31:23 dropped carriers included, 36:39 "keep the same design").
- Laura's Figma: `https://www.figma.com/design/x38TOJGsNryYl3LsKhCtSc/Shipments---Odyssey-One?node-id=1794-5544`.
- Preview-section mocks (user, 2026-08-30) — each section has List and Table modes:
  - Preview Tender List: `1931-7398` (Table = side-by-side), `1931-7821` (List = stacked columnar)
  - Preview Tender Details: `1931-8797` (Table), `1931-9173` (List = Changed/Unchanged field bands)
  - Preview Hazardous Material Information: `1931-9497` (Table), `1931-9699` (List)
- Upstream context: LINX-8820 (TR fields), LINX-8284 (decision tree), LINX-8253 (tender statuses).

**Scope guards:**
- Direct shipments only. Consolidation is explicitly out (no stories exist).
- 14513 "dates missing → editable required fields" is **deferred** — Laura's mock renders dates as display-only; flagged as an open question for Jana/Laura, not built in v1.
- No prod deploy, no Neon reseed without explicit user permission for THAT action (memory hard rules).

---

## File structure

| File | Responsibility |
|---|---|
| `apps/odyssey-one/tools/generate.mjs` (modify) | Seed `order-change` category + `detail.orderChange` payload. **Zero new main-sequence faker draws** — local PRNG keyed on sellShipment (id-stability rule). |
| `apps/odyssey-one/tools/generate.test.mjs` (modify) | Payload shape + id-stability tests. |
| `apps/odyssey-one/api/_lib/shipments.mjs` (modify) | `resolveOrderChange` handler + query builder. |
| `apps/odyssey-one/api/_lib/router.mjs` (modify) | Route for the PATCH. |
| `apps/odyssey-one/api/_lib/shipments.test.mjs` (modify) | Handler/builder tests. |
| `apps/odyssey-one/src/data/panelConfig.js` (modify) | `order-change` category entry. |
| `apps/odyssey-one/src/routes/shipments/ShipmentsRoute.jsx` (modify) | Badge count wiring for `orderChange`. |
| `apps/odyssey-one/src/api/types/shipmentRowVm.ts` + `mapShipmentErrorRow.ts` (modify) | Add `category` to the row VM (whitelist mapper — currently DROPS it). |
| `apps/odyssey-one/src/components/shipments/ShipmentTable.jsx` (modify) | Per-row actions; "Review Order Change" gated on `category === 'order-change'`. |
| `apps/odyssey-one/src/api/types/shipmentDetail.ts` (modify) | `OrderChangeVM` types. |
| `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts` (modify) | `orderChange` DTO→VM mapping (reuses `mapRoutingOption`). |
| `apps/odyssey-one/src/api/mutations/useResolveOrderChange.ts` (create) | PATCH mutation + query invalidation. |
| `apps/odyssey-one/src/App.jsx` (modify) | `/shipments/order-change/:sellShipment` route. |
| `apps/odyssey-one/src/routes/shipments/OrderChangeReviewRoute.jsx` (create) | Route shell: breadcrumb, header, data fetch, accordions, resolution wiring. |
| `apps/odyssey-one/src/components/shipments/order-change/OrderChangeActionsCard.jsx` (create) | "Actions to Keep Current Carrier": cost radios, prior/new panel, tender action buttons. |
| `apps/odyssey-one/src/components/shipments/order-change/ComparisonPreviewCard.jsx` (create) | Shared preview-section shell: title + collapse, "Differences (N)" + clickable purple filter badges, ButtonToggle List/Table, renders the mode the child sections feed it. |
| `apps/odyssey-one/src/components/shipments/order-change/OrderChangeTenderLists.jsx` (create) | Preview Tender List section — GroupTables in both modes. |
| `apps/odyssey-one/src/components/shipments/order-change/OrderChangeTenderDetails.jsx` (create) | Preview Tender Details section (LINX-14512 comparison) — GroupTables in both modes. |
| `apps/odyssey-one/src/components/shipments/order-change/OrderChangeHazmat.jsx` (create) | Preview Hazardous Material Information section — GroupTables in both modes. |
| `apps/odyssey-one/src/components/shipments/order-change/order-change.css` (create) | Screen styles (tokens only — no raw colors/radii/type). |

Commit tag: `S134:` on every commit (session thread; product work → `progress.md`).

---

### Task 1: Seed the order-change category + `detail.orderChange` payload

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs`
- Test: `apps/odyssey-one/tools/generate.test.mjs`

**Hard constraint (memory: seeded-ids-are-load-bearing):** no new `faker.*` calls anywhere in the per-shipment path. All new randomness comes from a local mulberry32 PRNG seeded by the sellShipment id. Category weights change is safe (same single `weightedPick` draw, different mapping).

- [ ] **Step 1: Write the failing tests** — append to `apps/odyssey-one/tools/generate.test.mjs` (node --test style, matching the file's existing imports of the generator internals; if it currently shells the generator, follow that pattern instead):

```js
test('order-change shipments carry a coherent detail.orderChange payload', () => {
  const ds = generateDataset() // whatever entry point generate.test.mjs already uses
  const ocRows = ds.shipments.filter(s => s.category === 'order-change')
  assert.ok(ocRows.length >= 20, `expected a healthy order-change population, got ${ocRows.length}`)
  for (const s of ocRows) {
    assert.equal(s.panel, 'exceptions')
    const oc = ds.details.get(s.sellShipment)?.orderChange
    assert.ok(oc, `${s.sellShipment} missing detail.orderChange`)
    assert.ok(['returned', 'not-returned'].includes(oc.scenario))
    assert.ok(['Sent', 'Accepted', 'To Be Tendered'].includes(oc.prior.tenderStatus))
    // LINX-14511: comparison = prior list vs new list, each a routing-option-shaped array
    assert.ok(Array.isArray(oc.priorTenderList) && oc.priorTenderList.length > 0)
    assert.ok(Array.isArray(oc.newTenderList) && oc.newTenderList.length > 0)
    const inNew = oc.newTenderList.some(o => o.scac === oc.prior.scac)
    assert.equal(inNew, oc.scenario === 'returned', `${s.sellShipment} scenario/list mismatch`)
    // LINX-14513: not-returned ⇒ no new cost (greyed out radio)
    if (oc.scenario === 'not-returned') assert.equal(oc.newOption.apCost, null)
    else assert.ok(oc.newOption.apCost > 0)
    // LINX-14512: changed fields exist and are flagged
    assert.ok(oc.comparison.some(f => f.changed))
    assert.ok(oc.comparison.every(f => 'field' in f && 'prior' in f && 'new' in f && 'source' in f))
  }
})

test('non order-change shipments have no orderChange key', () => {
  const ds = generateDataset()
  const other = ds.shipments.find(s => s.category !== 'order-change')
  assert.equal(ds.details.get(other.sellShipment)?.orderChange, undefined)
})
```

- [ ] **Step 2: Run tests, verify they fail** — `cd apps/odyssey-one && rtk test node --test tools/generate.test.mjs`. Expected: FAIL (`order-change` never produced / `orderChange` undefined).

- [ ] **Step 3: Implement in `generate.mjs`.**

3a. Category weights (~line 2150) — add the new category, keep 5-way relative feel:

```js
  exceptions: {
    items:   ['date-issues', 'routing-review', 'tender-issues', 'tender-review', 'bid-review', 'order-change'],
    weights: [24, 18, 18, 15, 8, 17], // order-change: LINX-14509 review population
  },
```

3b. Validation messages (~line 159):

```js
  'order-change': [
    'Transportation-relevant order change — review required',
    'Order updated by customer — tender locked pending review',
    'Order change received — new tender option version generated',
  ],
```

3c. Local PRNG + payload builder — add near the other helpers (module scope):

```js
// LINX-14509–14515 — Order Change review payload. Deterministic per shipment:
// mulberry32 keyed on the sellShipment id so NO main faker draws are added
// (a new draw re-numbers every subsequent shipment id — S122 lesson).
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const seedFrom = (str) => [...String(str)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7)

function buildOrderChange(sellShipment, routingOptions) {
  const rnd = mulberry32(seedFrom(sellShipment))
  const pickR = (arr) => arr[Math.floor(rnd() * arr.length)]
  const scenario = rnd() < 0.5 ? 'returned' : 'not-returned'
  // prior = the option the tender was riding on (LINX-14511 "Prior Options")
  const prior = routingOptions[0]
  const priorStatus = pickR(['Sent', 'Accepted', 'To Be Tendered'])
  const priorQuoted = rnd() < 0.3

  // New list = re-run routing after the order change. Derived from the seeded
  // options: perturb AP costs deterministically; in 'not-returned' the prior
  // carrier is absent (routing did not bring it back — LINX-14514 title case).
  const perturb = (v) => Math.round(v * (1 + (rnd() * 0.18 - 0.06)) * 100) / 100
  const newList = routingOptions
    .filter(o => scenario === 'returned' || o.scac !== prior.scac)
    .map((o, i) => ({
      ...o,
      rank: i + 1,
      status: '',
      rateDetails: { ...o.rateDetails, baseRate: perturb(o.rateDetails.baseRate) },
    }))
  const newForPrior = scenario === 'returned' ? newList.find(o => o.scac === prior.scac) : null

  // LINX-14512 comparison rows — subset of the 26-field AC table, changed
  // fields first (the screen sorts them to the top anyway; seed them ordered).
  const shiftDay = (iso, d) => { const t = new Date(iso); t.setDate(t.getDate() + d); return t.toISOString() }
  const changedPool = [
    { field: 'Pickup Date/Time', source: 'Routing', prior: prior.pickupDateTime, new: shiftDay(prior.pickupDateTime, 1 + Math.floor(rnd() * 3)) },
    { field: 'Delivery Date', source: 'Routing', prior: prior.deliveryDateTime, new: shiftDay(prior.deliveryDateTime, 1 + Math.floor(rnd() * 3)) },
    { field: 'Gross Weight', source: 'Shipment', prior: '2,000 LB', new: `${2000 + Math.floor(rnd() * 500)} LB` },
    { field: 'Package Count', source: 'Shipment', prior: '10', new: String(10 + Math.floor(rnd() * 4)) },
    { field: 'Volume', source: 'Shipment', prior: '100 CuFt', new: `${100 + Math.floor(rnd() * 40)} CuFt` },
  ]
  const changedCount = 1 + Math.floor(rnd() * 3)
  const comparison = [
    ...changedPool.slice(0, changedCount).map(f => ({ ...f, changed: true })),
    { field: 'Incoterm Info', source: 'Order', prior: 'FOB', new: 'FOB', changed: false },
    { field: 'Ship Direction', source: 'Order', prior: 'Inbound', new: 'Inbound', changed: false },
    { field: 'Seed Equipment', source: 'Order', prior: prior.equipment, new: prior.equipment, changed: false },
    { field: 'Distance', source: 'Routing', prior: '282 MI', new: '282 MI', changed: false },
    { field: 'Distance Source', source: 'Routing', prior: 'PCMILER PRACTICAL', new: 'PCMILER PRACTICAL', changed: false },
  ]

  return {
    scenario,
    prior: {
      scac: prior.scac, carrierName: prior.carrierName, equipment: prior.equipment,
      tenderStatus: priorStatus,
      routeRank: prior.routeRank ?? prior.rank, rank: prior.rank,
      pickupDateTime: prior.pickupDateTime, deliveryDateTime: prior.deliveryDateTime,
      apCost: prior.rateDetails.baseRate, quoted: priorQuoted,
    },
    newOption: {
      scac: prior.scac, equipment: prior.equipment,
      tenderStatus: null, // undecided until the user picks an action (transcript 13:10)
      routeRank: newForPrior ? (newForPrior.routeRank ?? newForPrior.rank) : null, // blank when not in list (11:59)
      rank: newForPrior ? newForPrior.rank : newList.length + 1, // insertion slot: bottom of equipment group (12:18)
      pickupDateTime: prior.pickupDateTime, deliveryDateTime: prior.deliveryDateTime,
      apCost: newForPrior ? newForPrior.rateDetails.baseRate : null, // null ⇒ New Cost greyed (14513 Scenario 2)
    },
    priorTenderList: routingOptions.map(o => ({ ...o })),
    newTenderList: newList,
    // Preview Hazardous Material Information (Figma 1931-9497/9699): rows by
    // Line #, prior/new usually identical (mock shows "Differences (0)").
    hazmat: Array.from({ length: 1 + Math.floor(rnd() * 2) }, (_, i) => {
      const line = 87000 + Math.floor(rnd() * 999) + i
      const row = {
        line,
        boilingPoint: `Line #${100 + i} C`,
        hazmatClass: pickR(['I', 'II', 'III']),
        hazmatDescription: pickR(['Flammable Liquid', 'Corrosive', 'Oxidizer']),
        itemDescription: `UN000${10 + Math.floor(rnd() * 89)}`,
        marinePollutant: rnd() < 0.5 ? 'Y' : 'N',
      }
      return { prior: row, new: { ...row } } // identical both sides in v1
    }),
  }
}
```

3d. Wire it where the detail object is assembled (the same place `droppedCarrierList` was attached in S122 — find the detail construction for the shipment and add):

```js
if (category === 'order-change') {
  detail.orderChange = buildOrderChange(sellShipment, routingOptions)
}
```

*(Adapt local variable names to that scope — `routingOptions` is in scope at the panel/category derivation, ~line 1094. If the routing options attached to detail use the DTO field names (`routeRank`, `pickupDateTime`…), reuse those; mirror whatever `droppedCarrierList` did.)*

- [ ] **Step 4: Run tests** — `rtk test node --test tools/generate.test.mjs`. Expected: PASS (all pre-existing tests too).

- [ ] **Step 5: Verify id stability** (non-negotiable): run old vs new generator in one process (same pattern as DEC-107) or simply:

```bash
git stash && node tools/generate.mjs && node -e "const s=require('./src/data/shipments.json'); console.log(s.length); require('fs').writeFileSync('/tmp/ids-old.txt', s.map(x=>x.sellShipment).join('\n'))" 2>/dev/null || node --input-type=module -e "import s from './src/data/shipments.json' with {type:'json'}; import fs from 'fs'; fs.writeFileSync('/tmp/ids-old.txt', s.map(x=>x.sellShipment).join('\n'))"
git stash pop && node tools/generate.mjs && node --input-type=module -e "import s from './src/data/shipments.json' with {type:'json'}; import fs from 'fs'; fs.writeFileSync('/tmp/ids-new.txt', s.map(x=>x.sellShipment).join('\n'))"
diff /tmp/ids-old.txt /tmp/ids-new.txt && echo IDS-IDENTICAL
```

Expected: `IDS-IDENTICAL`. If ids drift, a main-sequence draw slipped in — find it and remove it; do not proceed.

- [ ] **Step 6: Commit**

```bash
rtk git add tools/generate.mjs tools/generate.test.mjs
rtk git commit -m "S134: seed order-change exceptions category + detail.orderChange payload (LINX-14509-14515)"
```

---

### Task 2: Neon reseed — STOP FOR PERMISSION

- [ ] **Step 1: STOP.** Ask the user for explicit permission to reseed Neon for this change (memory hard rule — the permission is per-reseed, never carried forward).
- [ ] **Step 2 (after yes):** run the seed script exactly as S122 did (`node tools/seed.mjs` from `apps/odyssey-one` with the Neon env—check `tools/seed.mjs` header for the invocation it expects).
- [ ] **Step 3: Verify:** `curl` the deployed/local API category counts and confirm `order-change` appears:
`curl -s '<api>/shipment-service/v1/shipment/error/category/count?panel=exceptions' | grep order-change` → non-zero count.

---

### Task 3: API — resolve endpoint

**Files:**
- Modify: `apps/odyssey-one/api/_lib/shipments.mjs`, `apps/odyssey-one/api/_lib/router.mjs`
- Test: `apps/odyssey-one/api/_lib/shipments.test.mjs`

Semantics (LINX-14514 + LINX-8253 mapping):
- `retender` → carrier kept, message sent ⇒ `tender_status='Sent'`, `panel='monitoring'`, `category='sent'` (prior Accepted **also** becomes Sent — AC line "If the prior tender status was Accepted, then the new tender status is sent").
- `bypass` → status retained, no message ⇒ `tender_status = prior status`; `Accepted` ⇒ `panel='monitoring', category='approved'`, else `panel='monitoring', category='sent'`.
- `cancel` → tender cancelled, user re-decides on Tender tab ⇒ stays `panel='exceptions'`, `category='tender-review'`, `tender_status='Cancelled'` (AC: "Shipment is in 'Review' status → Tender Review").
- All three: record `detail.orderChange.resolution = { action, cost, resolvedAt }` via jsonb update, so the review screen can render a resolved state if revisited.

- [ ] **Step 1: Write failing tests** in `shipments.test.mjs` (mirror the existing fake-db handler test style, e.g. the `saveShipmentOverrides`/`categoryCounts` tests):

```js
test('resolveOrderChange: retender moves the shipment to monitoring/sent and stamps the resolution', async () => {
  let seen = []
  const db = { query: async (q) => { seen.push(q); return { rowCount: 1, rows: [{}] } } }
  const res = await resolveOrderChange({
    params: ['S260000010'],
    body: { action: 'retender', cost: { choice: 'prior', amount: 1901.56 } },
    db,
  })
  assert.deepEqual(res, { success: true })
  const text = seen.map(q => q.text).join('\n')
  assert.match(text, /tender_status/)
  assert.match(text, /'?monitoring'?|\$\d/) // status fields parameterized
  const values = seen.flatMap(q => q.values)
  assert.ok(values.includes('Sent') && values.includes('monitoring') && values.includes('sent'))
  assert.ok(values.some(v => typeof v === 'string' && v.includes('"action":"retender"')))
})

test('resolveOrderChange: rejects unknown action', async () => {
  await assert.rejects(
    () => resolveOrderChange({ params: ['S1'], body: { action: 'nuke' }, db: { query: async () => ({ rowCount: 1 }) } }),
    /action/
  )
})

test('resolveOrderChange: 404 on unknown shipment', async () => {
  await assert.rejects(
    () => resolveOrderChange({ params: ['NOPE'], body: { action: 'cancel' }, db: { query: async () => ({ rowCount: 0 }) } }),
    /No shipment/
  )
})
```

- [ ] **Step 2: Run** — `rtk test node --test api/_lib/shipments.test.mjs`. Expected: FAIL (`resolveOrderChange is not a function`).

- [ ] **Step 3: Implement** in `shipments.mjs` (below `saveShipmentOverrides`):

```js
// PATCH /shipment-service/v1/sell-shipment-out/:id/order-change — LINX-14514
// Tender Resolution Actions. Records the decision into detail.orderChange and
// re-files the shipment: retender/bypass leave the review (monitoring),
// cancel stays in exceptions as Tender Review.
const OC_OUTCOMES = {
  retender: (prior) => ({ tenderStatus: 'Sent', panel: 'monitoring', category: 'sent' }),
  bypass:   (prior) => prior === 'Accepted'
    ? ({ tenderStatus: 'Accepted', panel: 'monitoring', category: 'approved' })
    : ({ tenderStatus: prior || 'Sent', panel: 'monitoring', category: 'sent' }),
  cancel:   () => ({ tenderStatus: 'Cancelled', panel: 'exceptions', category: 'tender-review' }),
}

export function buildOrderChangeResolveQuery(sellShipment, outcome, resolution) {
  return {
    text: `UPDATE shipments
             SET tender_status = $1, panel = $2, category = $3, validation_message = NULL,
                 detail = jsonb_set(detail, '{orderChange,resolution}', $4::jsonb)
           WHERE sell_shipment = $5 RETURNING sell_shipment`,
    values: [outcome.tenderStatus, outcome.panel, outcome.category, JSON.stringify(resolution), sellShipment],
  }
}

export async function resolveOrderChange({ params, body, db }) {
  const action = body?.action
  if (!OC_OUTCOMES[action]) { const e = new Error(`Unknown action: ${action ?? '(none)'}`); e.status = 400; throw e }
  const outcome = OC_OUTCOMES[action](body?.priorTenderStatus)
  const resolution = { action, cost: body?.cost ?? null, resolvedAt: new Date().toISOString() }
  const { rowCount } = await db.query(buildOrderChangeResolveQuery(params[0], outcome, resolution))
  if (rowCount === 0) { const e = new Error(`No shipment: ${params[0]}`); e.status = 404; throw e }
  return { success: true }
}
```

Router (`router.mjs`) — import `resolveOrderChange` alongside the existing shipment handlers and add (match the file's existing param-path syntax — copy how the overrides/tender routes declare `:id`):

```js
  { name: 'resolveOrderChange', method: 'PATCH', path: '/shipment-service/v1/sell-shipment-out/:id/order-change', handler: resolveOrderChange },
```

- [ ] **Step 4: Run tests** — `rtk test node --test api/_lib/shipments.test.mjs api/_lib/router.test.mjs`. Expected: PASS. Add a `matchRoute` case to `router.test.mjs` mirroring the existing `categoryCounts` route test.

- [ ] **Step 5: Commit**

```bash
rtk git add api/_lib/shipments.mjs api/_lib/router.mjs api/_lib/shipments.test.mjs api/_lib/router.test.mjs
rtk git commit -m "S134: PATCH order-change resolution endpoint (LINX-14514 dispositions)"
```

**Reminder:** to see this locally, the dev server must run against the LOCAL api: `cd apps/odyssey-one && npm run dev:api` in a second terminal (plain `dev` proxies to the DEPLOYED function and this endpoint won't exist there).

---

### Task 4: The "Order Change" exceptions tab

**Files:**
- Modify: `apps/odyssey-one/src/data/panelConfig.js`
- Modify: `apps/odyssey-one/src/routes/shipments/ShipmentsRoute.jsx` (badge wiring ~line 240)

- [ ] **Step 1: panelConfig** — append to `PANEL_CONFIG.exceptions.categories`:

```js
      { key: 'order-change', label: 'Order Change', badgeKey: 'orderChange' },
```

- [ ] **Step 2: ShipmentsRoute badge count** — in the metrics `useMemo` that builds per-category counts from `exceptionCounts` (the block with `c(monitoringCounts, 'hold')` etc.), add alongside its exceptions siblings:

```js
      orderChange: c(exceptionCounts, 'order-change'),
```

- [ ] **Step 3: Verify visually** — with `dev:api` + `dev:local` running: the Shipment Exceptions panel shows an "Order Change" pill with a non-zero badge; clicking it filters the table (the list SQL already filters on the stored `category` column — no other change needed).

- [ ] **Step 4: Run FE tests** — `rtk vitest run src/routes/shipments` . Expected: pass (tab-order merge logic already handles late-added categories — `mergeTabOrder`; if a snapshot/test pins the category list, update it).

- [ ] **Step 5: Commit**

```bash
rtk git add src/data/panelConfig.js src/routes/shipments/ShipmentsRoute.jsx
rtk git commit -m "S134: Order Change category tab in Shipment Exceptions (LINX-14509)"
```

---### Task 5: Row VM `category` + "Review Order Change" row action

**Files:**
- Modify: `apps/odyssey-one/src/api/types/shipmentRowVm.ts`, `apps/odyssey-one/src/api/mappers/mapShipmentErrorRow.ts` (+ its test)
- Modify: `apps/odyssey-one/src/components/shipments/ShipmentTable.jsx`

The row DTO carries `category` but the whitelist mapper **drops** it (the 5×-shipped bug class — this is occurrence prevention, not speculation: the action gate needs it).

- [ ] **Step 1: Failing test** — in `mapShipmentErrorRow.test.ts` add:

```ts
it('carries category through (Review Order Change action gate)', () => {
  const vm = mapShipmentErrorRow({ ...baseRow, category: 'order-change' } as ShipmentErrorRow)
  expect(vm.category).toBe('order-change')
})
```

(reuse the file's existing `baseRow`/fixture name.)

- [ ] **Step 2: Run** — `rtk vitest run src/api/mappers/mapShipmentErrorRow.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** — `shipmentRowVm.ts`: add `category: string` to `ShipmentRowVM`. `mapShipmentErrorRow.ts`: add `category: s(row.category),` to the returned object.

- [ ] **Step 4: Run** — PASS (including the ALL_COLUMNS pin test — `category` is not a table column, so it shouldn't trip; if the pin complains about extra VM keys, follow how `validationMessage` (non-column field) is handled there).

- [ ] **Step 5: Row action** — in `ShipmentTable.jsx`: the ActionMenu currently gets static `SHIPMENT_ACTIONS`. Make the cell row-aware and gate the new action:

```jsx
import { useNavigate } from 'react-router-dom'   // top of file
// inside the component:
const navigate = useNavigate()
// replace the actionColumn cell:
      cell: ({ row }) => (
        <ActionMenu
          icon={<EllipsisVertical {...ICON_MD} />}
          options={
            row.original.category === 'order-change'
              ? [
                  // LINX-14509 — review is required; tender actions stay locked until it completes
                  { label: 'Review Order Change', onSelect: () => navigate(`/shipments/order-change/${row.original.sellShipment}`) },
                  ...SHIPMENT_ACTIONS,
                ]
              : SHIPMENT_ACTIONS
          }
          align="right"
          ariaLabel="Shipment actions"
        />
      ),
```

`columns` useMemo dep array gains `navigate` (stable from react-router, harmless).

- [ ] **Step 6: Test** — add to `ShipmentTable.test.jsx` (follow its existing render/fixture helpers):

```jsx
test('order-change rows expose Review Order Change in the actions menu', async () => {
  renderTable({ shipments: [{ ...rowFixture, category: 'order-change' }] })
  fireEvent.click(screen.getByLabelText('Shipment actions'))
  expect(screen.getByText('Review Order Change')).toBeInTheDocument()
})

test('other rows do not', async () => {
  renderTable({ shipments: [{ ...rowFixture, category: 'date-issues' }] })
  fireEvent.click(screen.getByLabelText('Shipment actions'))
  expect(screen.queryByText('Review Order Change')).toBeNull()
})
```

(If the table needs a Router context now, wrap the test render in `<MemoryRouter>` — check how other navigating components' tests do it.)

- [ ] **Step 7: Run** — `rtk vitest run src/components/shipments`. Expected: PASS.

- [ ] **Step 8: Commit**

```bash
rtk git add src/api/types/shipmentRowVm.ts src/api/mappers/mapShipmentErrorRow.ts src/api/mappers/mapShipmentErrorRow.test.ts src/components/shipments/ShipmentTable.jsx src/components/shipments/ShipmentTable.test.jsx
rtk git commit -m "S134: category through the row whitelist + Review Order Change row action"
```

---

### Task 6: FE types + detail mapper passthrough

**Files:**
- Modify: `apps/odyssey-one/src/api/types/shipmentDetail.ts`
- Modify: `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts` (+ its test)

- [ ] **Step 1: Types** — in `shipmentDetail.ts` add (near `DroppedCarrierVM`):

```ts
export interface OrderChangeComparisonRowVM {
  field: string
  source: 'Routing' | 'Order' | 'Shipment' | string
  prior: string
  new: string
  changed: boolean
}

export interface OrderChangeCarrierVM {
  scac: string
  carrierName?: string
  equipment: string
  tenderStatus: string | null
  routeRank: number | string | null
  rank: number
  pickupDateTime: string
  deliveryDateTime: string
  apCost: number | null
  quoted?: boolean
}

export interface OrderChangeHazmatLineVM {
  line: number
  boilingPoint: string
  hazmatClass: string
  hazmatDescription: string
  itemDescription: string
  marinePollutant: string
}

export interface OrderChangeVM {
  scenario: 'returned' | 'not-returned'
  prior: OrderChangeCarrierVM
  newOption: OrderChangeCarrierVM
  priorTenderList: RoutingOptionVM[]
  newTenderList: RoutingOptionVM[]
  comparison: OrderChangeComparisonRowVM[]
  hazmat: { prior: OrderChangeHazmatLineVM; new: OrderChangeHazmatLineVM }[]
  resolution?: { action: string; cost: { choice: string; amount: number } | null; resolvedAt: string } | null
}
```

and on `ShipmentDetailVM`: `orderChange: OrderChangeVM | null`.

Mirror the DTO on the `SellShipmentOut` side the same way `droppedCarrierList` is declared in `sellShipmentOut.ts` (add `orderChange?: …` with the raw shape; raw tender lists are `SellShipmentRoutingOption[]`).

- [ ] **Step 2: Failing mapper test** — in `mapSellShipmentOutToDetail.test.ts`:

```ts
it('maps orderChange: tender lists through mapRoutingOption, carriers and comparison verbatim', () => {
  const dto = { ...baseDto, orderChange: {
    scenario: 'not-returned',
    prior: { scac: 'ODFL', equipment: 'LTH', tenderStatus: 'Sent', routeRank: 1, rank: 1, pickupDateTime: 'X', deliveryDateTime: 'Y', apCost: 1901.56, quoted: true },
    newOption: { scac: 'ODFL', equipment: 'LTH', tenderStatus: null, routeRank: null, rank: 3, pickupDateTime: 'X', deliveryDateTime: 'Y', apCost: null },
    priorTenderList: [baseRoutingOptionDto],
    newTenderList: [baseRoutingOptionDto],
    comparison: [{ field: 'Gross Weight', source: 'Shipment', prior: '2,000 LB', new: '2,400 LB', changed: true }],
  }}
  const vm = mapSellShipmentOutToDetail(dto)
  expect(vm.orderChange?.scenario).toBe('not-returned')
  expect(vm.orderChange?.newOption.apCost).toBeNull()
  expect(vm.orderChange?.priorTenderList[0].scac).toBe(baseRoutingOptionDto.scac)
  expect(vm.orderChange?.comparison[0].changed).toBe(true)
})

it('orderChange absent → null', () => {
  expect(mapSellShipmentOutToDetail(baseDto).orderChange).toBeNull()
})
```

(reuse the file's actual fixture names for the base DTO and a routing-option DTO.)

- [ ] **Step 3: Run** — FAIL. **Step 4: Implement** in `mapSellShipmentOutToDetail.ts` (near the `droppedCarriers` mapping, line ~635):

```ts
    orderChange: dto.orderChange
      ? {
          scenario: dto.orderChange.scenario,
          prior: dto.orderChange.prior,
          newOption: dto.orderChange.newOption,
          priorTenderList: (dto.orderChange.priorTenderList ?? []).map(mapRoutingOption),
          newTenderList: (dto.orderChange.newTenderList ?? []).map(mapRoutingOption),
          comparison: dto.orderChange.comparison ?? [],
          hazmat: dto.orderChange.hazmat ?? [],
          resolution: dto.orderChange.resolution ?? null,
        }
      : null,
```

- [ ] **Step 5: Run** — PASS (whole file: `rtk vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts`).

- [ ] **Step 6: Commit**

```bash
rtk git add src/api/types/shipmentDetail.ts src/api/types/sellShipmentOut.ts src/api/mappers/mapSellShipmentOutToDetail.ts src/api/mappers/mapSellShipmentOutToDetail.test.ts
rtk git commit -m "S134: OrderChangeVM types + detail mapper passthrough"
```

---

### Task 7: Resolution mutation hook

**Files:**
- Create: `apps/odyssey-one/src/api/mutations/useResolveOrderChange.ts` (put it wherever the existing save mutations live — check `src/api/` for the `saveTender`/overrides mutation module and co-locate; follow its fetch wrapper + invalidation idiom)

- [ ] **Step 1: Implement** (adapt imports to the existing mutation module's style — it already has the api base + react-query client patterns):

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client' // ← use the SAME helper the other mutations use

export interface ResolveOrderChangeInput {
  sellShipment: string
  action: 'retender' | 'bypass' | 'cancel'
  priorTenderStatus: string | null
  cost: { choice: 'prior' | 'new' | 'quote'; amount: number } | null
}

export function useResolveOrderChange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sellShipment, ...body }: ResolveOrderChangeInput) =>
      apiFetch(`/shipment-service/v1/sell-shipment-out/${sellShipment}/order-change`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      // row leaves the Order Change tab + counts change + detail gains resolution
      qc.invalidateQueries() // ponytail: blanket invalidate; scope by key if it visibly janks
    },
  })
}
```

- [ ] **Step 2: Test** — follow the existing mutation-test idiom if one exists (e.g. `useShipmentDetail.test.ts` mocks); one test asserting URL + method + body serialization is enough:

```ts
it('PATCHes the resolution to the order-change endpoint', async () => {
  // mock apiFetch, call mutateAsync({ sellShipment:'S1', action:'bypass', priorTenderStatus:'Accepted', cost:{choice:'prior',amount:1901.56} })
  // expect apiFetch called with '/shipment-service/v1/sell-shipment-out/S1/order-change', method PATCH, body containing "bypass"
})
```

- [ ] **Step 3: Run + Commit**

```bash
rtk vitest run src/api/mutations
rtk git add src/api/mutations
rtk git commit -m "S134: useResolveOrderChange mutation"
```

---

### Task 8: Review screen — route shell + layout

**Files:**
- Modify: `apps/odyssey-one/src/App.jsx`
- Create: `apps/odyssey-one/src/routes/shipments/OrderChangeReviewRoute.jsx`
- Create: `apps/odyssey-one/src/components/shipments/order-change/order-change.css`

Layout per Figma `1794-5544` (matches LINX-14515 section order): breadcrumb `Shipment > Tender > Review Order Change`; PageHeader "Buy Shipment {n}" + **Cancel tender** (outline) top-right; Card 1 = Actions to Keep Current Carrier; Card 2 = Preview Tender List; divider "Additional Changes Preview"; two collapsed SubAccordions — **Preview Tender Details** (the LINX-14512 comparison table) and **Preview Hazardous Material Information** (hazmat rows of the same comparison, by line #). Reuse the orders-preview chrome (`SubAccordion` from `@odyssey/ui`, `order-summary.css` conventions — copy its page scaffold classes, don't import its css file).

- [ ] **Step 1: Route** — in `App.jsx` add above the `/shipments/*` line:

```jsx
import OrderChangeReviewRoute from './routes/shipments/OrderChangeReviewRoute.jsx'
…
        <Route path="/shipments/order-change/:sellShipment" element={<OrderChangeReviewRoute />} />
```

- [ ] **Step 2: Route shell** — `OrderChangeReviewRoute.jsx`:

```jsx
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader, Button } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell.jsx' // match how OrderSummaryRoute wraps chrome — copy its exact shell usage
import { useShipmentDetail } from '../../api/queries/useShipmentDetail'
import { useResolveOrderChange } from '../../api/mutations/useResolveOrderChange'
import OrderChangeActionsCard from '../../components/shipments/order-change/OrderChangeActionsCard.jsx'
import OrderChangeTenderLists from '../../components/shipments/order-change/OrderChangeTenderLists.jsx'
import OrderChangeTenderDetails from '../../components/shipments/order-change/OrderChangeTenderDetails.jsx'
import OrderChangeHazmat from '../../components/shipments/order-change/OrderChangeHazmat.jsx'
import '../../components/shipments/order-change/order-change.css'

const DASH = '--'

export default function OrderChangeReviewRoute() {
  const { sellShipment } = useParams()
  const navigate = useNavigate()
  const { data: detail, isLoading } = useShipmentDetail(sellShipment)
  const resolve = useResolveOrderChange()
  const oc = detail?.orderChange

  const finish = (action, cost) =>
    resolve.mutateAsync({ sellShipment, action, priorTenderStatus: oc.prior.tenderStatus, cost })
      .then(() => navigate('/shipments', { state: { panel: 'exceptions', tab: 'order-change' } }))

  if (isLoading) return null /* match the app's loading idiom */
  if (!oc) return null       /* not an order-change shipment — nothing to review */

  return (
    /* same chrome scaffold as OrderSummaryRoute (breadcrumb strip + content column) */
    <div className="order-change">
      <div className="order-change__header">
        <PageHeader title={`Buy Shipment ${detail.buyShipment ?? sellShipment}`} />
        {/* LINX-14514 Cancel Tender — top-right, outline (Figma 1794:5320) */}
        <Button variant="outline" size="lg" onClick={() => finish('cancel', null)}>
          Cancel tender
        </Button>
      </div>

      <OrderChangeActionsCard oc={oc} shipmentTz={detail.timezone} onAction={finish} />
      <OrderChangeTenderLists oc={oc} />

      <div className="order-change__divider">
        <span>Additional Changes Preview</span>
      </div>

      {/* LINX-14512 — informational comparison sections. All three share the
          ComparisonPreviewCard shell (Task 10): Differences badges + List/Table
          toggle + GroupTables. Built in Task 10; the shell renders nothing
          until then, so wire the imports as part of that task. */}
      <OrderChangeTenderDetails oc={oc} />
      <OrderChangeHazmat oc={oc} />
    </div>
  )
}
```

*(`OrderChangeTenderLists` moves between the actions card and the divider — see Figma 1794-5544: it sits ABOVE "Additional Changes Preview". Check `SubAccordion`'s real prop names in `packages/ui/src/` — `OrderPaneSections.jsx` drives it with `expanded`/`onToggle`; the preview sections use `ComparisonPreviewCard` (its own collapse chevron per the 1931-* mocks), not `SubAccordion`.)*

- [ ] **Step 3: CSS** — `order-change.css`, tokens only:

```css
/* Order Change review (LINX-14515, Figma 1794-5544). Page scaffold mirrors
   the orders preview (order-summary.css) — cards on --surface-default. */
.order-change { display: flex; flex-direction: column; gap: var(--space-lg, 24px); }
.order-change__header { display: flex; align-items: center; justify-content: space-between; }
.order-change__divider {
  display: flex; align-items: center; gap: var(--space-md, 12px);
  color: var(--text-secondary);
}
.order-change__divider::before, .order-change__divider::after {
  content: ''; flex: 1; border-top: 1px solid var(--border-default);
}
.order-change__preview-head { display: flex; align-items: center; gap: var(--space-md, 12px); }
.order-change__preview-badges { display: flex; gap: var(--space-sm, 8px); }
.order-change__side-by-side { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md, 16px); }
```

*(Verify every var against `packages/tokens/tokens.css` — if a name doesn't exist, use the nearest existing token; NEVER invent hex values. Changed-value highlights are `Badge variant="purple"` — no custom highlight CSS.)*

- [ ] **Step 3b: Stub the later-task components so this task compiles standalone** — create `OrderChangeActionsCard.jsx` (Task 9), `OrderChangeTenderLists.jsx`, `OrderChangeTenderDetails.jsx`, `OrderChangeHazmat.jsx` (Task 10) each as `export default function X() { return null } // built in Task 9/10`.

- [ ] **Step 4: Smoke test** (jsdom) — `OrderChangeReviewRoute.test.jsx` next to the route: mock `useShipmentDetail` to return a detail with `orderChange` fixture; assert the title and Cancel tender button render. Run `rtk vitest run src/routes/shipments/OrderChangeReviewRoute.test.jsx` → PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/App.jsx src/routes/shipments/OrderChangeReviewRoute.jsx src/routes/shipments/OrderChangeReviewRoute.test.jsx src/components/shipments/order-change/order-change.css
rtk git commit -m "S134: Order Change review route shell (LINX-14515 layout)"
```

---

### Task 9: Actions card — cost selection + tender actions

**Files:**
- Create: `apps/odyssey-one/src/components/shipments/order-change/OrderChangeActionsCard.jsx`
- Test: `apps/odyssey-one/src/components/shipments/order-change/OrderChangeActionsCard.test.jsx`

Behavior (LINX-14513 + transcript):
- Radios: **Prior Cost** (with `Quoted Cost` badge when `oc.prior.quoted`), **New Cost**, **New Quote**.
- Scenario `returned`: New Cost **pre-selected** (transcript 19:17 "automatically it selects the new cost"). Scenario `not-returned`: New Cost **disabled** (no cost — 18:05), Prior Cost pre-selected.
- New Quote selected → open `QuoteModal` (mode `'add'`, `carrierData` = the prior carrier's routing option from `oc.priorTenderList` matched by scac, reuse of the Tender-page quote flow — LINX-13895 rules apply); saved quote amount fills the quote input.
- Prior | New panel: SCAC, Equipment, Tender Status (Badge), Route Rank (Badge), Rank (Badge), Delivery/Pickup Date-Time. New side: `routeRank === null` renders `--`, tenderStatus null renders `--` (undecided until action — 13:10).
- Bottom row: `Select Tender Action *` label + **Bypass Tender** and **Re tender** primary buttons → `onAction('bypass'|'retender', { choice, amount })`.

- [ ] **Step 1: Write failing tests:**

```jsx
const baseOc = {
  scenario: 'returned',
  prior: { scac: 'ODFL', carrierName: 'OLD DOMINION', equipment: 'LTH', tenderStatus: 'Sent', routeRank: 1, rank: 1, pickupDateTime: '2026-06-02T08:00:00Z', deliveryDateTime: '2026-06-04T08:00:00Z', apCost: 1901.56, quoted: false },
  newOption: { scac: 'ODFL', equipment: 'LTH', tenderStatus: null, routeRank: 2, rank: 2, pickupDateTime: '2026-06-02T08:00:00Z', deliveryDateTime: '2026-06-04T08:00:00Z', apCost: 2000 },
  priorTenderList: [], newTenderList: [], comparison: [],
}

test('returned scenario pre-selects New Cost', () => {
  render(<OrderChangeActionsCard oc={baseOc} onAction={vi.fn()} />)
  expect(screen.getByRole('radio', { name: /New Cost/ })).toBeChecked()
})

test('not-returned scenario disables New Cost and pre-selects Prior', () => {
  const oc = { ...baseOc, scenario: 'not-returned', newOption: { ...baseOc.newOption, apCost: null, routeRank: null } }
  render(<OrderChangeActionsCard oc={oc} onAction={vi.fn()} />)
  expect(screen.getByRole('radio', { name: /New Cost/ })).toBeDisabled()
  expect(screen.getByRole('radio', { name: /Prior Cost/ })).toBeChecked()
})

test('Re tender emits the selected cost', () => {
  const onAction = vi.fn()
  render(<OrderChangeActionsCard oc={baseOc} onAction={onAction} />)
  fireEvent.click(screen.getByRole('radio', { name: /Prior Cost/ }))
  fireEvent.click(screen.getByRole('button', { name: /Re tender/ }))
  expect(onAction).toHaveBeenCalledWith('retender', { choice: 'prior', amount: 1901.56 })
})

test('quoted prior shows the Quoted Cost badge', () => {
  render(<OrderChangeActionsCard oc={{ ...baseOc, prior: { ...baseOc.prior, quoted: true } }} onAction={vi.fn()} />)
  expect(screen.getByText('Quoted Cost')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run** — FAIL (component doesn't exist).

- [ ] **Step 3: Implement:**

```jsx
import { useState } from 'react'
import { Badge, Button, Radio } from '@odyssey/ui'
import { QuoteModal } from '../../detail/QuoteModal.jsx' // named export — check import style used by RoutingGuideTab

const DASH = '--'
const fmt = (n) => (n == null ? '' : n.toFixed(2))

// LINX-14513 Cost Selection & Carrier Retention + LINX-14514 actions.
// The whole card is about ONE carrier — the prior one (transcript 09:50:
// "the decision is about the prior carrier").
export default function OrderChangeActionsCard({ oc, shipmentTz, onAction }) {
  const newCostAvailable = oc.newOption.apCost != null
  const [choice, setChoice] = useState(newCostAvailable ? 'new' : 'prior')
  const [quote, setQuote] = useState(null)     // saved QuoteModal payload
  const [quoteOpen, setQuoteOpen] = useState(false)

  const amounts = { prior: oc.prior.apCost, new: oc.newOption.apCost, quote: quote?.amount ?? null }
  const emit = (action) => onAction(action, { choice, amount: amounts[choice] })

  const pickQuote = () => { setChoice('quote'); setQuoteOpen(true) }

  return (
    <section className="order-change__card">
      <h2 className="text-label-md-medium">Actions to Keep Current Carrier</h2>

      <div className="order-change__cost">
        <span className="text-label-sm-regular">Select Cost</span>
        <div className="order-change__cost-options">
          <label>
            <Radio checked={choice === 'prior'} onChange={() => setChoice('prior')} />
            Prior Cost {oc.prior.quoted && <Badge>Quoted Cost</Badge>}
            <input readOnly value={fmt(oc.prior.apCost)} aria-label="Prior cost amount" /><span>USD</span>
          </label>
          <label>
            <Radio checked={choice === 'new'} onChange={() => setChoice('new')} disabled={!newCostAvailable} />
            New Cost
            <input readOnly disabled={!newCostAvailable} value={fmt(oc.newOption.apCost)} aria-label="New cost amount" /><span>USD</span>
          </label>
          <label>
            <Radio checked={choice === 'quote'} onChange={pickQuote} />
            New Quote
            <input readOnly placeholder="Enter Quote" value={fmt(quote?.amount)} onClick={pickQuote} aria-label="New quote amount" /><span>USD</span>
          </label>
        </div>
      </div>

      <div className="order-change__compare-panel">
        {[['Prior', oc.prior], ['New', oc.newOption]].map(([label, c]) => (
          <div key={label} className="order-change__compare-side">
            <h3 className="text-label-sm-medium">{label}</h3>
            <dl>
              <div><dt>SCAC</dt><dd>{c.scac}</dd></div>
              <div><dt>Equipment</dt><dd>{c.equipment}</dd></div>
              <div><dt>Tender Status</dt><dd>{c.tenderStatus ? <Badge>{c.tenderStatus}</Badge> : DASH}</dd></div>
              <div><dt>Route Rank</dt><dd>{c.routeRank ?? DASH}</dd></div>
              <div><dt>Rank</dt><dd>{c.rank}</dd></div>
              <div><dt>Delivery Date/Time</dt><dd>{c.deliveryDateTime}</dd></div>
              <div><dt>Pickup Date/Time</dt><dd>{c.pickupDateTime}</dd></div>
            </dl>
          </div>
        ))}
      </div>

      <div className="order-change__actions">
        <span className="text-label-sm-regular">Select Tender Action *</span>
        <div>
          <Button variant="primary" size="lg" onClick={() => emit('bypass')}>Bypass Tender</Button>
          <Button variant="primary" size="lg" onClick={() => emit('retender')}>Re tender</Button>
        </div>
      </div>

      {quoteOpen && (
        <QuoteModal
          mode="add"
          carrierData={oc.priorTenderList.find((o) => o.scac === oc.prior.scac) ?? oc.priorTenderList[0]}
          shipmentTz={shipmentTz}
          onSave={(q) => { setQuote({ amount: q.rateDetails?.baseRate ?? q.amount, raw: q }); setQuoteOpen(false) }}
          onClose={() => setQuoteOpen(false)}
        />
      )}
    </section>
  )
}
```

*(Before wiring `QuoteModal`, read its `onSave` payload shape in `QuoteModal.jsx` and adapt the `setQuote` line — do not guess. Date formatting: run the datetimes through the same formatter the detail tabs use — grep for the shared date util in `components/detail`. Add the card/cost/panel CSS classes to `order-change.css` with tokens, mirroring the compare-panel split from the Figma: two `--border-default`-separated columns.)*

- [ ] **Step 4: Run** — `rtk vitest run src/components/shipments/order-change`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/shipments/order-change
rtk git commit -m "S134: Order Change actions card — cost selection scenarios + tender actions (LINX-14513/14514)"
```

---

### Task 10: Preview sections — shared card + GroupTables (List/Table modes)

**Files:**
- Create: `apps/odyssey-one/src/components/shipments/order-change/ComparisonPreviewCard.jsx`
- Create: `apps/odyssey-one/src/components/shipments/order-change/OrderChangeTenderLists.jsx`
- Create: `apps/odyssey-one/src/components/shipments/order-change/OrderChangeTenderDetails.jsx`
- Create: `apps/odyssey-one/src/components/shipments/order-change/OrderChangeHazmat.jsx`
- Test: `…/previewSections.test.jsx`

**Design contract (user ruling 2026-08-30 + Figma 1931-*):** every preview section is one card with:
- Title + collapse chevron.
- **`Differences (N)`** + one **clickable purple Badge per changed field** (`variant="purple"` — user ruling: purple, NOT the mock's red). Clicking a badge filters the section to that field/those cells only; clicking it again clears the filter. Changed-VALUE highlights inside tables are also purple badges.
- **`ButtonToggle`** — text mode, `firstLabel="List"` / `secondLabel="Table"`. (Mock shows icon+label; ButtonToggle's contract is icons OR labels, never mixed — conform to the component API, note the deviation for Efrain.)
- **List mode** = stacked full-width **GroupTables** (`header` ON via `header={{ title }}`, every group `expandable: false`).
- **Table mode** = **two GroupTables side by side** (Prior left, New right), same header/expandable flags, KV-style rows.

- [ ] **Step 1: Failing tests** (`previewSections.test.jsx`):

```jsx
const oc = ocFixture() // fixture: 3 options per list; AP cost changed on OLD Dominion; ranks reordered; comparison w/ 2 changed; 1 hazmat line

test('tender list: differences badges + both list titles', () => {
  render(<OrderChangeTenderLists oc={oc} />)
  expect(screen.getByText(/Differences \(2\)/)).toBeInTheDocument()   // Rank Order Change + AP Cost
  expect(screen.getByText('Rank Order Change')).toBeInTheDocument()
  expect(screen.getByText('Prior Tender List')).toBeInTheDocument()
  expect(screen.getByText('New Tender List')).toBeInTheDocument()
})

test('tender list: toggle switches List/Table mode', () => {
  render(<OrderChangeTenderLists oc={oc} />)
  fireEvent.click(screen.getByRole('button', { name: 'Table' })) // check ButtonToggle's actual roles/labels
  // Table mode = side-by-side KV GroupTables: the columnar header row is gone
  expect(screen.queryByText('Carrier Name', { selector: 'th' })).toBeNull()
})

test('tender details: changed rows band first, badge filter narrows to one field', () => {
  render(<OrderChangeTenderDetails oc={oc} />)
  expect(screen.getByText('Changed Fields')).toBeInTheDocument()
  expect(screen.getByText('Unchanged Fields')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Pick Up Date\/Time/ })) // filter badge
  expect(screen.queryByText('Distance')).toBeNull()                           // other changed field hidden
  fireEvent.click(screen.getByRole('button', { name: /Pick Up Date\/Time/ })) // toggle off
  expect(screen.getByText('Distance')).toBeInTheDocument()
})

test('hazmat: renders lines, Differences (0), no filter badges', () => {
  render(<OrderChangeHazmat oc={oc} />)
  expect(screen.getByText(/Differences \(0\)/)).toBeInTheDocument()
  expect(screen.getByText(`Line ${oc.hazmat[0].prior.line}`)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run** — FAIL (components don't exist).

- [ ] **Step 3: Implement the shared shell** — `ComparisonPreviewCard.jsx`:

```jsx
import { useState } from 'react'
import { Badge, ButtonToggle } from '@odyssey/ui'

// Shared shell for the three "Additional Changes Preview" sections
// (Figma 1931-7398/7821, 1931-8797/9173, 1931-9497/9699).
// `differences`: string[] of changed-field tags → purple filter badges.
// `children(mode, filter)`: render prop — section renders its GroupTables for
// 'list' | 'table' with the active filter (null = show everything).
export default function ComparisonPreviewCard({ title, differences = [], children }) {
  const [open, setOpen] = useState(true)     // mocks show sections expanded
  const [mode, setMode] = useState('list')
  const [filter, setFilter] = useState(null) // one active filter at a time (mock behavior)

  return (
    <section className="order-change__card">
      <div className="order-change__preview-head">
        <h2 className="text-label-md-medium">{title}</h2>
        {/* collapse chevron — reuse the app's chevron Button idiom */}
        <button aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`} onClick={() => setOpen(!open)} className="order-change__chevron" />
      </div>
      {open && (
        <>
          <div className="order-change__preview-head">
            <span className="text-label-sm-medium">Differences ({differences.length})</span>
            <div className="order-change__preview-badges">
              {differences.map((d) => (
                <button key={d} onClick={() => setFilter(filter === d ? null : d)} aria-pressed={filter === d}>
                  <Badge variant="purple">{d}</Badge>
                </button>
              ))}
            </div>
            <ButtonToggle
              firstLabel="List"
              secondLabel="Table"
              selected={mode === 'list' ? 'first' : 'second'}
              onChange={(next) => setMode(next === 'first' ? 'list' : 'table')}
            />
          </div>
          {children(mode, filter)}
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Implement `OrderChangeTenderLists.jsx`** — diffs computed at render (no seed key needed):

```jsx
import { Badge, GroupTable } from '@odyssey/ui'
import ComparisonPreviewCard from './ComparisonPreviewCard.jsx'

const DASH = '--'
const cost = (o) => (o.rateDetails ? `${o.rateDetails.baseRate.toLocaleString()} USD` : DASH)

// Diff tags (Figma 1931-7398 shows "Rank Order Change", "AP Cost"): match rows
// across lists by SCAC+equipment; rank moved → Rank Order Change, cost changed → AP Cost.
export function tenderListDifferences(prior, next) {
  const tags = new Set()
  for (const p of prior) {
    const n = next.find((o) => o.scac === p.scac && o.equipment === p.equipment)
    if (!n) continue
    if (n.rank !== p.rank || n.routeRank !== p.routeRank) tags.add('Rank Order Change')
    if (n.rateDetails?.baseRate !== p.rateDetails?.baseRate) tags.add('AP Cost')
  }
  return [...tags]
}

// Column model shared by both modes. `changed(o)` → purple badge on the value.
const FIELDS = [
  { key: 'rank', label: 'Rank' },
  { key: 'routeRank', label: 'Route Rank' },
  { key: 'scac', label: 'SCAC' },
  { key: 'carrierName', label: 'Carrier Name' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'apCost', label: 'AP Cost', render: cost },
  { key: 'status', label: 'Tender Status', badge: true },
  { key: 'pickupDateTime', label: 'Pickup Date/Time' },
  { key: 'deliveryDateTime', label: 'Delivery Date/Time' },
]

export default function OrderChangeTenderLists({ oc }) {
  const differences = tenderListDifferences(oc.priorTenderList, oc.newTenderList)
  return (
    <ComparisonPreviewCard title="Preview Tender List" differences={differences}>
      {(mode, filter) =>
        mode === 'list' ? (
          <>
            <GroupTable header={{ title: 'Prior Tender List' }} columns={/* FIELDS → GroupTable column defs */} groups={[{ id: 'prior', rows: oc.priorTenderList, expandable: false }]} />
            <GroupTable header={{ title: 'New Tender List' }} columns={/* same */} groups={[{ id: 'new', rows: oc.newTenderList, expandable: false }]} />
          </>
        ) : (
          <div className="order-change__side-by-side">
            {/* Table mode (1931-7398): each side a GroupTable, header ON, one
                non-expandable group per option, rows = the FIELDS as KV pairs */}
            <GroupTable header={{ title: 'Prior Tender List' }} columns={KV_COLUMNS} groups={kvGroups(oc.priorTenderList, filter)} />
            <GroupTable header={{ title: 'New Tender List' }} columns={KV_COLUMNS} groups={kvGroups(oc.newTenderList, filter)} />
          </div>
        )
      }
    </ComparisonPreviewCard>
  )
}
```

**Implementation notes (read before coding):**
- Read `GroupTable.jsx`'s actual `columns`/`groups` contracts (packages/ui/src — docblock at the top) and build the column defs to it; the snippets above pin intent, not the final prop shapes.
- Changed cells (AP Cost on the moved carrier, Rank badges) render their value inside `<Badge variant="purple">` — match rows by SCAC+equipment as in `tenderListDifferences`.
- `filter` narrows what renders: with `'AP Cost'` active, non-cost columns/KV rows drop out (list mode: hide unrelated columns is overkill — mock filters FIELD rows in KV/detail sections; for tender list, filtering highlights only the matching cells' rows. Keep it simple: filter rows to those whose tagged field changed).
- Dropped carriers already ride inside the seeded lists (Jana 31:23) — no special casing.

- [ ] **Step 5: Implement `OrderChangeTenderDetails.jsx`** — LINX-14512, list mode is ONE GroupTable with two groups (Figma 1931-9173):

```jsx
import { Badge, GroupTable } from '@odyssey/ui'
import ComparisonPreviewCard from './ComparisonPreviewCard.jsx'

export default function OrderChangeTenderDetails({ oc }) {
  const changed = oc.comparison.filter((r) => r.changed)
  const unchanged = oc.comparison.filter((r) => !r.changed)
  return (
    <ComparisonPreviewCard title="Preview Tender Details" differences={changed.map((r) => r.field)}>
      {(mode, filter) => {
        const show = (rows) => (filter ? rows.filter((r) => r.field === filter) : rows)
        return mode === 'list' ? (
          // 3 columns: Field | Prior Tender | New Tender; two bands, changed first,
          // changed VALUES as purple badges, unchanged plain text.
          <GroupTable
            columns={DETAIL_COLUMNS /* field, prior (badge when changed), new (badge when changed) */}
            groups={[
              { id: 'changed', label: 'Changed Fields', rows: show(changed), expandable: false },
              { id: 'unchanged', label: 'Unchanged Fields', rows: show(unchanged), expandable: false },
            ]}
          />
        ) : (
          // Table mode (1931-8797): Prior Tender | New Tender side by side,
          // KV pairs, changed values as purple badges, changed pairs on top.
          <div className="order-change__side-by-side">
            <GroupTable header={{ title: 'Prior Tender' }} columns={KV_COLUMNS} groups={kvComparisonGroups(show([...changed, ...unchanged]), 'prior')} />
            <GroupTable header={{ title: 'New Tender' }} columns={KV_COLUMNS} groups={kvComparisonGroups(show([...changed, ...unchanged]), 'new')} />
          </div>
        )
      }}
    </ComparisonPreviewCard>
  )
}
```

- [ ] **Step 6: Implement `OrderChangeHazmat.jsx`** — same card, rows by Line # (Figma 1931-9497/9699): list mode = two stacked GroupTables (`Prior Tender List` / `New Tender List` headers; columns Line, Boiling Point, Hazmat Class, Hazmat Description, Item Description, Marine Pollutant); table mode = side-by-side, one non-expandable group per line labeled `Line {n}` with the five KV pairs. `differences` = `[]` in v1 (seed keeps prior/new identical) so the card reads `Differences (0)` with no badges.

- [ ] **Step 7: Run** — `rtk vitest run src/components/shipments/order-change`. Expected: PASS.

- [ ] **Step 8: Commit**

```bash
rtk git add src/components/shipments/order-change
rtk git commit -m "S134: preview sections — GroupTable list/table modes, purple diff filters (LINX-14510/14511/14512)"
```

---

### Task 11: End-to-end resolution wiring check

**Files:**
- Test: `apps/odyssey-one/src/routes/shipments/OrderChangeReviewRoute.test.jsx` (extend)

- [ ] **Step 1: Test** — mock `useResolveOrderChange` and assert each button fires the right action:

```jsx
test('Re tender resolves with retender + selected cost and navigates back to the tab', async () => {
  const mutateAsync = vi.fn().mockResolvedValue({ success: true })
  mockResolve.mockReturnValue({ mutateAsync })
  renderRoute() // fixture: scenario 'returned'
  fireEvent.click(screen.getByRole('button', { name: /Re tender/ }))
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(
    expect.objectContaining({ action: 'retender', priorTenderStatus: 'Sent', cost: { choice: 'new', amount: 2000 } })
  ))
})

test('Cancel tender resolves with cancel and null cost', async () => {
  const mutateAsync = vi.fn().mockResolvedValue({ success: true })
  mockResolve.mockReturnValue({ mutateAsync })
  renderRoute()
  fireEvent.click(screen.getByRole('button', { name: /Cancel tender/ }))
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(
    expect.objectContaining({ action: 'cancel', cost: null })
  ))
})
```

- [ ] **Step 2: Run full suite** — `rtk vitest run`. Expected: entire suite green (baseline was 1328+; nothing unrelated broken).

- [ ] **Step 3: Commit**

```bash
rtk git add src/routes/shipments
rtk git commit -m "S134: resolution wiring — actions PATCH and return to the Order Change tab"
```

---

### Task 12: Manual QA + wrap (no deploy)

- [ ] **Step 1: Local run** — terminal A: `cd apps/odyssey-one && npm run dev:api`; terminal B: `npm run dev:odyssey-one` from root (confirm Vite prints `[api proxy] /api → local`).
- [ ] **Step 2: Walk the flow** — Shipments → Exceptions → Order Change tab (badge > 0) → row ⋮ → Review Order Change → screen matches Figma sections → pick each cost option in both scenarios (find one `returned`, one `not-returned` row; New Cost greyed on the latter) → New Quote opens the quote modal → Re tender → lands back on the tab, row gone, badge decremented. Repeat with Cancel tender → row moves to Tender Review.
- [ ] **Step 2b: Preview sections** — in each of the three cards: toggle List↔Table (Table = two GroupTables side by side, headers on, nothing expandable), click a purple difference badge → section narrows to that field, click again → clears; changed values render as purple badges (NOT the mock's red — intentional ruling).
- [ ] **Step 3: jsdom ceilings** — layout fidelity vs Figma (spacing, the highlight tint, badge variants) is checked by eye here, not by tests (memory: jsdom can't see layout).
- [ ] **Step 4:** Screenshot for Jana. **No `vercel --prod` without explicit permission.**
- [ ] **Step 5:** `/wrap` when the user calls it (progress.md S134 entry; the inbox VTT still owes a `/analyze order-change` canon cycle — note as carry-forward, do NOT archive the VTT without running it).

---

## Open questions (carry to Jana/Laura — do not block v1)

1. **Editable Pickup/Delivery dates** when routing returns none (LINX-14513 note 2, "Refer VD") — Laura's mock shows display-only dates. Deferred; needs a VD ruling.
2. **Hazmat differences** — v1 seeds prior/new hazmat lines identical (mock shows `Differences (0)`); confirm with Jana whether hazmat fields can realistically change in a TR order change and seed a changed case then.
2b. **ButtonToggle icon+label** — the 1931-* mocks show icon+text segments; the normalized ButtonToggle is icons OR labels. Built with labels; raise with Efrain whether the component gains a mixed mode.
3. **14509's multi-version history** (LINX-14510 "previously generated versions retained") — v1 seeds exactly one prior + one new version; the version-history list UI has no design yet.
4. **Quote validation parity** — QuoteModal enforces LINX-13895 rules; confirm the same "no dates → no quote" gate applies inside the review (AC says yes, mock doesn't show it).

## Self-review notes

- AC coverage: 14509 → Tasks 1/4/5 (exception category, gate, lock is inherent — actions only exist on this screen); 14510 → Task 1 seeds per-version lists, Task 10 renders both; 14511 → Tasks 9/10 (7-field panel + carrier lists); 14512 → Task 10 Tender Details section (changed-first bands, purple highlights, field filters); 14513 → Task 9 (3 cost options, scenario gating, quote copy noted in seed via `quoted` flag); 14514 → Tasks 3/9/11 (three dispositions + status semantics in `OC_OUTCOMES`); 14515 → Task 8 (section order). 14516 excluded (different epic).
- Component conformance: preview sections use normalized `GroupTable` (header On via `header={{title}}`, `expandable: false` per group), `ButtonToggle` (text mode), `Badge variant="purple"` — all verified present in `@odyssey/ui` with these exact APIs.
- Known deliberate cuts are listed under Open questions; each is an AC note, not an AC core rule.
