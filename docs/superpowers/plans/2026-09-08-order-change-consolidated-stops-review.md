# Order Change (Consolidated) — Stops-tab Review Implementation Plan (Part 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Model policy (hard rule):** all implementation subagents run on **Sonnet**. Planning/review stays at the main model.

**Goal:** Give the planner a way to resolve an Order Change on a **consolidated** shipment from the Stops tab — header deltas, cost comparison, stop/order change highlighting, Planning Dates + View Routing modals, per-order compare, and Approve Plan — per LINX-15435…15438 and Laura's three VDs.

**Architecture:** The Stops tab (`StopsTab.jsx`, hosted by `BottomBar`) gains a *review mode* that switches on when `shipmentDetails.orderChange?.consolidation` is present and unresolved. The review data rides inside the existing `detail.orderChange` jsonb under a new `consolidation` key (DEC-106 passthrough), seeded only for multi-order order-change shipments. Approve Plan reuses the Direct review's Actions card for the tender decision (LINX-15671 Scenario A) and adds one `approve-plan` action to the existing PATCH.

**Tech Stack:** React 19 + React Router 6, `@odyssey/ui` (`SummaryStrip`, `Timeline`/`StopBadge`, `HeaderStrip`, `TitleSubtitle`, `Badge`, `GroupTable`, `ModalMedium`, `Button`), Neon Postgres via `api/_lib`, node --test (generator/api), vitest + testing-library (FE).

**Part 2 (not in this plan):** *Edit Shipment Stops* → Compare Screen sandbox (LINX-15667…15671, 15869…15872). Waits on Laura's next VDs. This plan leaves `Edit Shipment Stops` rendered but **disabled with a "Coming soon" tooltip** so the header matches the VD without inventing the sandbox.

---

## Sources (provenance)

| Source | Cited as | Notes |
|---|---|---|
| Jira ACs LINX-15435, 15436, 15437, 15438 (+ 15667…15872 for context) | `AC 154xx` | `vault-sources/10-domains/shipments/sources/linx-order-change-consolidation-ac-2026-09-08.md`. 15435/15436 are **On Hold, `optmizer_pending`**; all 13 are `VD_Pending`. |
| Laura's VD — Stops Consolidated | `VD stops` | Figma `x38TOJGsNryYl3LsKhCtSc` node `1910-31512` (1160×1081). |
| Laura's VD — Planning Dates modal | `VD planning` | node `2102-10502` (`ModalMedium` + `GroupTable`). |
| Laura's VD — View Routing modal | `VD routing` | node `2108-14708` (`ModalMedium` + two `GroupTable`s, New above Prior). |
| Laura's VD — per-order compare modal | `VD compare` | node `2107-12719` (`ModalMedium` + one `GroupTable`: group header "Order Number: N", Changed Fields / Unchanged Fields strips, columns Prior Tender / New Tender, hazmat rows in the same table). Title reads "Planning Dates" — copy leftover (Q6). |
| Direct canon | canon | `vault/10-domains/shipments/order-change.md` §1–§9 (rules reused verbatim: New above Prior, purple diff signal, dropped carriers ride inside the review). |
| Jana 2026-08-14 call | `disc @mm:ss` | already synthesized in canon §10; nothing new. |

## VD ↔ AC reconciliation (decisions locked here)

| # | VD shows | AC says | Build |
|---|---|---|---|
| R1 | SummaryStrip: Distance / Gross Weight / Volume as **Prior / New badge pairs**, then Accepted Carrier, Seed Equipment, Utilization, **Margin** | 15435: same first six + Prior Cost / New Direct Cost / New Consolidated Cost; prior+new **only when changed** | Pairs only when changed (AC); **Margin dropped** (user ruling 2026-09-08 — on the DTO as `costSummary.marginAmount`, but not in 15435's header list). Utilization stays `--` (LINX-12067). |
| R2 | Costs (Prior / New Direct / New Consol) sit in the All Stops card head as `TitleSubtitle` | 15435 lists them under "shipment header" | VD placement wins (presentation is ours). Labels use AC wording: **New Consolidated Cost**. |
| R3 | Buttons: "Edit Shipment Stop", "Approve Plan", "View Planning Dates", "View Routing" | 15435: Edit Shipment **Stops**, View Routing, Approve Plan; 15667 uses "Edit Shipment Stops" | AC wording: **Edit Shipment Stops**. View Planning Dates is VD-only — keep (it's how the AC's planning table is surfaced). |
| R4 | Changed values = purple Badge with warning triangle (Date, changed Order ids) | 15436: highlight 14 fields; orders with changes distinguished; stop summary without opening details | Purple badge = the Direct review's diff signal (`DiffValue`), plus `AlertTriangle` leftIcon per VD. Fields not on the stop grid (Site ID, Address 2/3, State, Zip, Country) collapse into **Location/Address** badges. |
| R5 | Right column per stop: "Affected Orders" list of order links → arrow | 15437: select a changed order → prior/new compare | Link opens the per-order compare (Task 7). VD's P1 header reads "Prior Tender List" — **mock typo**, all three read "Affected Orders" (user ruling 2026-09-08). VD's "Subtitle/Location" placeholder on Stop 1 ignored. |
| R6 | Planning Dates modal first column `01`, `02` | 15435: "for all orders in the shipment" | First column = **Order #** (user ruling 2026-09-08 — rows are orders, not product lines). Columns: Order, Planning Type, Earliest Ship, Latest Ship, Earliest Delivery, Latest Delivery. |
| R7 | View Routing modal: New + Prior tables, 8 columns, purple AP Cost when changed | 15438: also **Dropped Carriers** + the three costs | Add a third `GroupTable` **Dropped Carriers** (New version's list — canon §7). Costs already in the card head; not repeated in the modal. |
| R8 | — | 15438 note: View Routing **disabled** when a site/location change is unfinalized | `disabled` when `consolidation.locationChange && !resolution`, tooltip "Finalize stop changes in Edit Shipment Stops first". |
| R9 | — | 15438 note: Approve Plan → new list becomes V2 on Tender tab | Version history is still OC-open-4 (unbuilt). Approve Plan here: **active tender → hand off to the Direct Actions card** (15671 Scenario A, same rules); **no active tender → PATCH `approve-plan`**, exception clears, land on Tender tab. **ON HOLD (Q4)** — Task 8 does not run until Laura's post-approval VD lands; the button renders disabled with tooltip "Coming soon" meanwhile. |
| R10 | StopBadge with green check overlay | — | `StopBadge status="completed"` already renders that; a stop with changes uses `status="issue"` so the rail itself signals it. |

**Rulings (user, 2026-09-08):** Q1 Margin dropped · Q2 all three columns "Affected Orders" · Q3 Order # column · Q5 name follows purpose — Stops tab *View Routing* (results already exist), Compare Screen *Call Routing* (the click runs routing; Part 2).

**Still open — OC-open-8/9 (log in canon §12):**
- **Q6** Per-order compare modal title — VD 2107-12719 says "Planning Dates" (same as the sibling modal). Using "Order Changes" until Laura confirms.
- **Q4** What happens after Approve Plan (active tender vs none)? Waiting on Laura's next VD. Task 8 halted.

## Seed reality check (measured 2026-09-08)

`public/details/*.json`: **218** order-change shipments, **131** of them multi-order (66 with >2 stops). Today every one of them opens the **Direct** review — LINX-14509 says that flow "applies only to Direct Shipments". Task 3 fixes the branch; Task 1 gives the 131 a consolidation payload. No new faker draws (memory: `seeded-ids-are-load-bearing`).

---

## File structure

| File | Responsibility |
|---|---|
| `apps/odyssey-one/tools/generate.mjs` (modify) | `buildConsolidationChange()` — id-stable PRNG salted `':occ'`; attached as `orderChange.consolidation` when `orders.length > 1`. |
| `apps/odyssey-one/tools/generate.test.mjs` (modify) | Payload coherence + id-stability tests. |
| `apps/odyssey-one/src/api/types/sellShipmentOut.ts` (modify) | `SellShipmentConsolidationChange` DTO + `shipmentType` already present. |
| `apps/odyssey-one/src/api/types/shipmentDetail.ts` (modify) | `ConsolidationChangeVM`, `shipmentType` on `ShipmentDetailVM`. |
| `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts` (modify) | `mapConsolidationChange`, `shipmentType` passthrough. |
| `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts` (modify) | Mapper tests. |
| `apps/odyssey-one/src/components/shipments/ShipmentTable.jsx` (modify) | Row action branches: Consolidation → select row + `stops` tab. |
| `apps/odyssey-one/src/components/detail/RoutingGuideTab.jsx` (modify) | "Review Order Change" button branches the same way (via `onRequestTab`). |
| `apps/odyssey-one/src/components/detail/BottomBar.jsx` (modify) | Passes `orderChange`, `orderDetails`, `shipment` and a tab-request callback into `StopsTab`. |
| `apps/odyssey-one/src/components/detail/StopsTab.jsx` (modify) | Review mode: strip deltas, card head (costs + 4 actions), per-stop change badges, Affected Orders column, modal state. |
| `apps/odyssey-one/src/components/detail/StopsTab.test.jsx` (create) | Review-mode rendering tests. |
| `apps/odyssey-one/src/components/detail/order-change/PlanningDatesModal.jsx` (create) | `VD planning`. |
| `apps/odyssey-one/src/components/detail/order-change/ViewRoutingModal.jsx` (create) | `VD routing` + Dropped Carriers table. |
| `apps/odyssey-one/src/components/detail/order-change/OrderCompareModal.jsx` (create) | Per-order prior/new compare hosting `OrderChangeTenderDetails`. |
| `apps/odyssey-one/src/components/detail/order-change/*.test.jsx` (create) | One test file per modal. |
| `apps/odyssey-one/src/styles/panes/stops.css` (modify) | Review-mode styles (tokens only). |
| `apps/odyssey-one/api/_lib/shipments.mjs` (modify) | `approve-plan` outcome in `OC_OUTCOMES`. |
| `apps/odyssey-one/api/_lib/shipments.test.mjs` (modify) | Outcome test. |
| `apps/odyssey-one/src/api/queries/useResolveOrderChange.ts` (modify) | `'approve-plan'` in the action union. |
| `vault/10-domains/shipments/order-change.md` (modify) | §10 rewritten from the 13 ACs; §12 open items. |
| `vault/10-domains/shipments/decisions/decision-log.md` (modify) | DEC-132…135. |

Commit tag: **`S142:`** on every commit (product thread → `progress.md`).

---

### Task 1: Seed `orderChange.consolidation`

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs` (after `buildOrderChange`, ~line 2356; call site ~line 1186)
- Test: `apps/odyssey-one/tools/generate.test.mjs`

**Hard constraint:** zero new `faker.*` calls. All randomness from `mulberry32(seedFrom(sellShipment + ':occ'))`.

- [ ] **Step 1: Write the failing test** — append to `generate.test.mjs`:

```js
test('multi-order order-change shipments carry a coherent orderChange.consolidation payload', () => {
  const ds = buildDataset()
  const rows = ds.shipments.filter(s => s.category === 'order-change')
  let multi = 0
  for (const s of rows) {
    const d = ds.details.get(s.sellShipment)
    const c = d.orderChange.consolidation
    if (d.orderList.length === 1) { assert.equal(c, undefined, `${s.sellShipment}: direct must not carry consolidation`); continue }
    multi++
    assert.ok(c, `${s.sellShipment} missing consolidation`)
    assert.equal(typeof c.locationChange, 'boolean')
    assert.ok(c.changedOrderIds.length >= 1 && c.changedOrderIds.length <= d.orderList.length)
    const orderIds = new Set(d.orderList.map(o => o.orderId))
    for (const id of c.changedOrderIds) assert.ok(orderIds.has(id))
    // every changed order is referenced by ≥1 stop change, and every stop change points at a real stop
    const seqs = new Set(d.shipmentStopList.map(st => st.stopSequence))
    for (const [seq, sc] of Object.entries(c.stopChanges)) {
      assert.ok(seqs.has(Number(seq)))
      assert.ok(sc.changedOrderIds.every(id => c.changedOrderIds.includes(id)))
      assert.ok(Object.keys(sc.fields).length >= 1)
      for (const f of Object.values(sc.fields)) assert.ok('prior' in f && 'new' in f && f.prior !== f.new)
    }
    for (const id of c.changedOrderIds) {
      assert.ok(Object.values(c.stopChanges).some(sc => sc.changedOrderIds.includes(id)), `${id} changed but no stop references it`)
      assert.ok(Array.isArray(c.orderComparisons[id]) && c.orderComparisons[id].some(r => r.changed))
    }
    // costs: prior blank only when no active tender; consolidated cost absent on a location change
    assert.equal(typeof c.costs.newDirect, 'number')
    if (c.locationChange) assert.equal(c.costs.newConsolidated, null)
    else assert.equal(typeof c.costs.newConsolidated, 'number')
    // summary deltas coherent with stop deltas: grossWeight delta = Σ weight deltas
    const wDelta = Object.values(c.stopChanges).reduce((t, sc) => t + (sc.fields.weight ? sc.fields.weight.new - sc.fields.weight.prior : 0), 0)
    if (c.summaryChanges.grossWeight) assert.equal(c.summaryChanges.grossWeight.new - c.summaryChanges.grossWeight.prior, wDelta)
  }
  assert.ok(multi >= 20, `expected a healthy consolidated population, got ${multi}`)
})

test('consolidation payload is id-stable across builds', () => {
  const a = buildDataset({ totalShipments: 400 }), b = buildDataset({ totalShipments: 400 })
  const s = a.shipments.find(x => x.category === 'order-change' && a.details.get(x.sellShipment).orderList.length > 1)
  assert.ok(s)
  assert.deepEqual(a.details.get(s.sellShipment).orderChange.consolidation, b.details.get(s.sellShipment).orderChange.consolidation)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/odyssey-one && node --test tools/generate.test.mjs 2>&1 | tail -20`
Expected: FAIL — `missing consolidation`.

- [ ] **Step 3: Implement `buildConsolidationChange`** — add after `buildOrderChange`:

```js
// LINX-15435…15438 — the consolidated half of an order change. Only multi-
// order shipments get this; the Direct review (buildOrderChange) is "Direct
// Shipments only" (LINX-14509). Salted ':occ' so it owns its own PRNG stream
// (same reasoning as ':oc' above) — zero faker draws, id-stable.
//
// Coherence rules (feedback_seeded_data_must_be_coherent):
//  - a changed ORDER is always referenced by the stop(s) that carry it;
//  - a stop's weight/volume/packageCount deltas are the Σ of its changed
//    orders' deltas, and the summary delta is the Σ of the stop deltas;
//  - a location change (LINX-15438: site id / address / city / state / zip /
//    country) suppresses New Consolidated Cost — routing can't consolidate an
//    unfinalized stop structure.
function buildConsolidationChange(sellShipment, orders, stops, ctx) {
  const { tenderStatus, prior, newOption, grossWeight, totalVolume, distanceMiles, baseDate, originTz } = ctx;
  const rnd = mulberry32(seedFrom(sellShipment + ':occ'));
  const pickN = (arr, n) => { const a = [...arr]; const out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return out; };
  const locationChange = rnd() < 0.35;
  const changedOrders = pickN(orders, 1 + Math.floor(rnd() * Math.min(2, orders.length)));
  const changedOrderIds = changedOrders.map(o => o.orderId);

  // Per-order deltas, drawn once and reused everywhere they surface.
  const delta = Object.fromEntries(changedOrders.map(o => {
    const weight = Math.round(o.orderGross * (0.05 + rnd() * 0.25));
    const volume = Math.round(o.orderVolume * (0.05 + rnd() * 0.2));
    const packages = 1 + Math.floor(rnd() * 3);
    const dateShiftDays = 1 + Math.floor(rnd() * 3);
    return [o.orderId, { weight, volume, packages, dateShiftDays }];
  }));

  const stopChanges = {};
  for (const st of stops) {
    const ids = st.orderIds.filter(id => changedOrderIds.includes(id));
    if (!ids.length) continue;
    const fields = {};
    const w = ids.reduce((t, id) => t + delta[id].weight, 0);
    const v = ids.reduce((t, id) => t + delta[id].volume, 0);
    const p = ids.reduce((t, id) => t + delta[id].packages, 0);
    fields.weight = { prior: st.grossWeightValue, new: st.grossWeightValue + w };
    fields.volume = { prior: st.volumeValue, new: st.volumeValue + v };
    fields.packageCount = { prior: st.packageCount, new: st.packageCount + p };
    // Date moves on the FIRST changed order's shift (one stop, one date).
    const shift = delta[ids[0]].dateShiftDays;
    const at = new Date(baseDate); at.setDate(at.getDate() + shift);
    fields.date = { prior: st.scheduledDateTime, new: `${formatDate(at)} ${st.scheduledDateTime.slice(11)}` };
    if (locationChange && st.stopType === 'pickup') {
      const loc = pick(LOCATIONS.filter(l => l.city !== st.city));
      fields.location = { prior: `${st.facilityName}, ${st.city}`, new: `${loc.facility}, ${loc.city}` };
    }
    stopChanges[st.stopSequence] = { changedOrderIds: ids, fields };
  }

  // Per-order compare rows — SAME row shape as buildOrderChange's
  // `comparison` (field/source/prior/new/changed) so OrderChangeTenderDetails
  // renders them untouched.
  const orderComparisons = Object.fromEntries(changedOrders.map(o => {
    const d = delta[o.orderId];
    const rows = [
      { field: 'Gross Weight', source: 'Order', prior: `${fmtInt(o.orderGross)} LB`, new: `${fmtInt(o.orderGross + d.weight)} LB`, changed: true },
      { field: 'Volume', source: 'Order', prior: `${o.orderVolume} cuft`, new: `${o.orderVolume + d.volume} cuft`, changed: true },
      { field: 'Package Count', source: 'Order', prior: String(o.orderPackages), new: String(o.orderPackages + d.packages), changed: true },
      { field: 'Pickup Date/Time', source: 'Routing', prior: formatDateTime(baseDate, originTz), new: formatDateTime(genDate(baseDate, d.dateShiftDays), originTz), changed: true },
      { field: 'Incoterm', source: 'Order', prior: ctx.freightTerms, new: ctx.freightTerms, changed: false },
      { field: 'Ship Direction', source: 'Order', prior: 'Outbound', new: 'Outbound', changed: false },
      { field: 'Order Requested Date', source: 'Order', prior: o.planningDateType, new: o.planningDateType, changed: false },
    ];
    if (locationChange) rows.unshift({ field: 'Ship From', source: 'Order', prior: stopChanges[stops.find(s => s.orderIds.includes(o.orderId) && s.stopType === 'pickup')?.stopSequence]?.fields.location?.prior ?? '--', new: stopChanges[stops.find(s => s.orderIds.includes(o.orderId) && s.stopType === 'pickup')?.stopSequence]?.fields.location?.new ?? '--', changed: true });
    return [o.orderId, rows];
  }));

  const wTotal = Object.values(stopChanges).filter((_, i) => stops[i]?.stopType !== 'delivery').reduce((t, sc) => t + (sc.fields.weight.new - sc.fields.weight.prior), 0);
  const pickupStopDeltaW = stops.filter(s => s.stopType === 'pickup' && stopChanges[s.stopSequence]).reduce((t, s) => t + (stopChanges[s.stopSequence].fields.weight.new - stopChanges[s.stopSequence].fields.weight.prior), 0);
  const pickupStopDeltaV = stops.filter(s => s.stopType === 'pickup' && stopChanges[s.stopSequence]).reduce((t, s) => t + (stopChanges[s.stopSequence].fields.volume.new - stopChanges[s.stopSequence].fields.volume.prior), 0);
  const summaryChanges = {
    grossWeight: { prior: grossWeight, new: grossWeight + pickupStopDeltaW },
    volume: { prior: totalVolume, new: totalVolume + pickupStopDeltaV },
  };
  if (locationChange) summaryChanges.distance = { prior: distanceMiles, new: Math.round(distanceMiles * (1.1 + rnd() * 0.5)) };

  // LINX-15435 Prior Cost: current tender cost while tendering is active,
  // preferred-carrier AP before tendering starts, blank when exhausted.
  const activeTender = ['To Be Tendered', 'Sent', 'Accepted'].includes(tenderStatus);
  const priorCost = activeTender ? prior.rateDetails.apTotal : null;
  const newDirect = Math.round(orders.reduce((t, o) => t + o.orderGross, 0) * (0.9 + rnd() * 0.4) * 100) / 100;
  const newConsolidated = locationChange ? null : newOption.rateDetails.apTotal;
  return { locationChange, changedOrderIds, stopChanges, orderComparisons, summaryChanges, costs: { prior: priorCost, newDirect, newConsolidated } };
}
```

Note on the `wTotal` line: it's a leftover — **delete it** before committing; `pickupStopDeltaW/V` are the real sums (delivery stops mirror pickups, so summing both sides would double count).

- [ ] **Step 4: Attach it at the call site** — right after `orderChangePayload = buildOrderChange(...)` (~line 1186):

```js
    if (orders.length > 1) {
      orderChangePayload.consolidation = buildConsolidationChange(sellShipment, orders, stops, {
        tenderStatus, prior: orderChangePayload.prior, newOption: orderChangePayload.newOption,
        grossWeight, totalVolume, distanceMiles, baseDate, originTz, freightTerms,
      });
    }
```

`orderChangePayload.prior` / `.newOption` must be the raw routing-option objects (with `rateDetails.apTotal`). Confirm `buildOrderChange` returns them in that form; if it returns display-shaped carriers, pass `prior` (the routing option found in `buildOrderChange`) through by adding it to the returned object as `priorOption`/`newOptionRaw` and read those here.

- [ ] **Step 5: Run tests**

Run: `cd apps/odyssey-one && node --test tools/generate.test.mjs 2>&1 | tail -20`
Expected: PASS (all, including the pre-existing id-stability tests — a failure there means a faker draw crept in).

- [ ] **Step 6: Regenerate + commit** (`node tools/generate.mjs` writes `public/details`, gitignored — no reseed of Neon without explicit permission; local dev uses `npm run dev:api`).

```bash
rtk git add apps/odyssey-one/tools/generate.mjs apps/odyssey-one/tools/generate.test.mjs
rtk git commit -m "S142: seed orderChange.consolidation for multi-order order-change shipments (LINX-15435…15438)"
```

---

### Task 2: DTO + VM types and mapper

**Files:**
- Modify: `apps/odyssey-one/src/api/types/sellShipmentOut.ts` (`SellShipmentOrderChange`)
- Modify: `apps/odyssey-one/src/api/types/shipmentDetail.ts` (`OrderChangeVM`, `ShipmentDetailVM`)
- Modify: `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts` (`mapOrderChange`, top-level)
- Test: `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts`

- [ ] **Step 1: Failing mapper test** — append:

```ts
it('maps orderChange.consolidation and shipmentType', () => {
  const dto = { ...baseDto, shipmentType: 'Consolidation', orderList: [order('A'), order('B')],
    orderChange: { ...baseOrderChange, consolidation: {
      locationChange: false, changedOrderIds: ['A'],
      stopChanges: { 1: { changedOrderIds: ['A'], fields: { weight: { prior: 100, new: 120 }, date: { prior: '06/04/2026 03:00 PDT', new: '06/05/2026 03:00 PDT' } } } },
      orderComparisons: { A: [{ field: 'Gross Weight', source: 'Order', prior: '100 LB', new: '120 LB', changed: true }] },
      summaryChanges: { grossWeight: { prior: 200, new: 220 } },
      costs: { prior: 1500, newDirect: 2000, newConsolidated: 3000 },
    } } }
  const vm = mapSellShipmentOutToDetail(dto)
  expect(vm.shipmentType).toBe('Consolidation')
  const c = vm.orderChange!.consolidation!
  expect(c.stopChanges['1'].fields.weight).toEqual({ prior: '100 LB', new: '120 LB' })
  expect(c.summaryChanges.grossWeight).toEqual({ prior: '200 LB', new: '220 LB' })
  expect(c.costs).toEqual({ prior: '1,500.00 USD', newDirect: '2,000.00 USD', newConsolidated: '3,000.00 USD' })
  expect(c.orderComparisons.A[0].changed).toBe(true)
})
it('consolidation is null on a direct order change', () => {
  expect(mapSellShipmentOutToDetail({ ...baseDto, orderChange: baseOrderChange }).orderChange!.consolidation).toBeNull()
})
```
(`baseDto`, `order()`, `baseOrderChange` — reuse the fixtures already in this test file for the existing `orderChange` tests; if named differently, use those names.)

- [ ] **Step 2: Run** — `cd apps/odyssey-one && rtk vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts` → FAIL (type errors / undefined).

- [ ] **Step 3: Types** — `sellShipmentOut.ts`, inside/after `SellShipmentOrderChange`:

```ts
export interface SellShipmentConsolidationChange {
  locationChange: boolean
  changedOrderIds: string[]
  stopChanges: Record<string, { changedOrderIds: string[]; fields: Record<string, { prior: string | number; new: string | number }> }>
  orderComparisons: Record<string, SellShipmentOrderChangeComparisonRow[]>
  summaryChanges: { distance?: { prior: number; new: number }; grossWeight?: { prior: number; new: number }; volume?: { prior: number; new: number } }
  costs: { prior: number | null; newDirect: number; newConsolidated: number | null }
}
// …and on SellShipmentOrderChange:
  consolidation?: SellShipmentConsolidationChange | null
```

`shipmentDetail.ts`:

```ts
export interface ConsolidationChangeVM {
  locationChange: boolean
  changedOrderIds: string[]
  stopChanges: Record<string, { changedOrderIds: string[]; fields: Record<string, { prior: string; new: string }> }>
  orderComparisons: Record<string, OrderChangeComparisonRowVM[]>
  summaryChanges: { distance?: { prior: string; new: string }; grossWeight?: { prior: string; new: string }; volume?: { prior: string; new: string } }
  costs: { prior: string; newDirect: string; newConsolidated: string }
}
// OrderChangeVM gains:
  consolidation: ConsolidationChangeVM | null
// ShipmentDetailVM gains (LINX-14509 "Direct only" branch needs it):
  shipmentType: string
```

- [ ] **Step 4: Mapper** — in `mapOrderChange` return object add `consolidation: mapConsolidationChange(oc.consolidation)`; add:

```ts
const fmtUsd = (v: number | null | undefined) => (v == null ? DASH : `${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`)
const fmtPair = (p: { prior: number; new: number } | undefined, unit: string) =>
  p ? { prior: `${fmtInt(p.prior)} ${unit}`, new: `${fmtInt(p.new)} ${unit}` } : undefined

function mapConsolidationChange(c: SellShipmentConsolidationChange | null | undefined): ConsolidationChangeVM | null {
  if (!c) return null
  const unitFor: Record<string, string> = { weight: 'LB', volume: 'cuft' }
  const fmtField = (k: string, v: string | number) => typeof v === 'number' ? `${fmtInt(v)}${unitFor[k] ? ` ${unitFor[k]}` : ''}` : v
  return {
    locationChange: c.locationChange,
    changedOrderIds: c.changedOrderIds ?? [],
    stopChanges: Object.fromEntries(Object.entries(c.stopChanges ?? {}).map(([seq, sc]) => [seq, {
      changedOrderIds: sc.changedOrderIds,
      fields: Object.fromEntries(Object.entries(sc.fields).map(([k, f]) => [k, { prior: fmtField(k, f.prior), new: fmtField(k, f.new) }])),
    }])),
    orderComparisons: Object.fromEntries(Object.entries(c.orderComparisons ?? {}).map(([id, rows]) => [id, rows.map(mapOrderChangeComparisonRow)])),
    summaryChanges: {
      distance: c.summaryChanges?.distance ? { prior: fmtDistance(c.summaryChanges.distance.prior), new: fmtDistance(c.summaryChanges.distance.new) } : undefined,
      grossWeight: fmtPair(c.summaryChanges?.grossWeight, 'LB'),
      volume: fmtPair(c.summaryChanges?.volume, 'cuft'),
    },
    costs: { prior: fmtUsd(c.costs?.prior), newDirect: fmtUsd(c.costs?.newDirect), newConsolidated: fmtUsd(c.costs?.newConsolidated) },
  }
}
```
Top-level mapper object: `shipmentType: orDash(dto.shipmentType),`.

- [ ] **Step 5: Run** — same command → PASS. Also `rtk tsc --noEmit -p apps/odyssey-one` clean.

- [ ] **Step 6: Commit**

```bash
rtk git add apps/odyssey-one/src/api
rtk git commit -m "S142: ConsolidationChangeVM + shipmentType on the detail VM"
```

---

### Task 3: Entry branching — Consolidation opens the Stops tab

**Files:**
- Modify: `apps/odyssey-one/src/components/shipments/ShipmentTable.jsx:279-297`
- Modify: `apps/odyssey-one/src/components/detail/RoutingGuideTab.jsx:1647-1665`
- Modify: `apps/odyssey-one/src/components/detail/BottomBar.jsx` (thread `onRequestTab` to RoutingGuideTab; it already owns `setActiveTab`)
- Test: `apps/odyssey-one/src/components/shipments/ShipmentTable.test.jsx`

- [ ] **Step 1: Failing test** (ShipmentTable):

```jsx
it('Review Order Change on a Consolidation row selects the row on the stops tab instead of navigating', () => {
  const onRowSelect = vi.fn()
  renderTable({ shipments: [{ ...ocRow, shipmentType: 'Consolidation' }], onRowSelect })
  fireEvent.click(screen.getByLabelText('Shipment actions'))
  fireEvent.click(screen.getByText('Review Order Change'))
  expect(onRowSelect).toHaveBeenCalledWith(ocRow.id, 'stops', false)
  expect(navigateMock).not.toHaveBeenCalled()
})
```
(`renderTable`, `ocRow`, `navigateMock` — reuse the file's existing helpers for the Direct "Review Order Change" test.)

- [ ] **Step 2: Run** — `rtk vitest run src/components/shipments/ShipmentTable.test.jsx` → FAIL.

- [ ] **Step 3: Implement** — replace the `onSelect` of the Review Order Change option:

```jsx
// LINX-14509: the Direct review route is "Direct Shipments only". A
// consolidated shipment reviews on its Stops tab (LINX-15435 "Stops tab
// shall be selected by default when accessed from an Order Change exception").
onSelect: () => row.original.shipmentType === 'Consolidation'
  ? onRowSelect(row.original.id, 'stops', false)
  : navigate(`/shipments/order-change/${row.original.sellShipment}`, { state: { buyShipment: row.original.buyShipment } }),
```

RoutingGuideTab: the same branch on `shipmentDetails?.shipmentType === 'Consolidation'` → `onRequestTab('stops')`. `BottomBar` passes `onRequestTab={handleTabChange}` into `<RoutingGuideTab …/>` (the tab-switch callback already exists as `handleTabChange`).

- [ ] **Step 4: Run** → PASS. Manually: pick a multi-order order-change row → Stops tab opens.

- [ ] **Step 5: Commit** — `rtk git commit -m "S142: consolidated order changes review on the Stops tab, Direct keeps its route"`.

---

### Task 4: StopsTab review mode

**Files:**
- Modify: `apps/odyssey-one/src/components/detail/StopsTab.jsx`
- Modify: `apps/odyssey-one/src/components/detail/BottomBar.jsx:406` — `<StopsTab data={shownDetails.stopsData} orderChange={shownDetails.orderChange} orderDetails={shownDetails.orderDetails} shipment={shipment} onRequestTab={handleTabChange} />`
- Modify: `apps/odyssey-one/src/styles/panes/stops.css`
- Test: `apps/odyssey-one/src/components/detail/StopsTab.test.jsx` (create)

- [ ] **Step 1: Failing tests**

```jsx
// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StopsTab from './StopsTab'
afterEach(cleanup)

const summary = { distance: '364.14 mi', grossWeight: '54,907 LB', volume: '226 cuft', acceptedCarrier: 'SEFL - LTL', seedEquipment: 'LTH', utilization: '--' }
const stops = [
  { type: 'pickup', stopNumber: 1, order: 'A, B', orderIds: ['A', 'B'], location: 'COLUMBUS PL, Kansas City', address: '831 8th Street', date: '06/04/2026 03:00 PDT', appointment: '3:00 PDT', weight: '32,333 LB', volume: '300 cuft', packageCount: '180', pickupNo: 'PU-1' },
  { type: 'delivery', stopNumber: 2, order: 'A, B', orderIds: ['A', 'B'], location: 'X', address: 'Y', date: '06/06/2026 03:00 PDT', appointment: '3:00 PDT', weight: '32,333 LB', volume: '300 cuft', packageCount: '180', pickupNo: '' },
]
const consolidation = {
  locationChange: false, changedOrderIds: ['B'],
  stopChanges: { 1: { changedOrderIds: ['B'], fields: { date: { prior: '06/04/2026 03:00 PDT', new: '06/05/2026 03:00 PDT' }, weight: { prior: '32,333 LB', new: '34,000 LB' } } } },
  orderComparisons: { B: [{ field: 'Gross Weight', source: 'Order', prior: '1 LB', new: '2 LB', changed: true }] },
  summaryChanges: { grossWeight: { prior: '54,907 LB', new: '70,907 LB' } },
  costs: { prior: '1,500.00 USD', newDirect: '2,000.00 USD', newConsolidated: '3,000.00 USD' },
}
const oc = { scenario: 'returned', prior: {}, newOption: {}, priorTenderList: [], newTenderList: [], comparison: [], hazmat: [], droppedCarriers: { prior: [], new: [] }, resolution: null, consolidation }
const render_ = (extra = {}) => render(<StopsTab data={{ summary, stops }} orderChange={oc} orderDetails={[]} shipment={{ sellShipment: '1', buyShipment: 'B1', tenderStatus: 'Sent' }} onRequestTab={() => {}} {...extra} />)

describe('StopsTab review mode', () => {
  it('stays plain without a consolidation payload', () => {
    render(<StopsTab data={{ summary, stops }} orderChange={null} />)
    expect(screen.queryByText('Approve Plan')).toBeNull()
    expect(screen.queryByText('Prior')).toBeNull()
  })
  it('shows prior/new pairs only for changed summary cells', () => {
    render_()
    const strip = screen.getByLabelText('Shipment KPIs')
    expect(within(strip).getByText('70,907 LB')).toBeTruthy()
    expect(within(strip).getAllByText('Prior')).toHaveLength(1)
    expect(within(strip).queryByText('Margin')).toBeNull()
  })
  it('renders the four actions and three costs with AC wording', () => {
    render_()
    expect(screen.getByText('Edit Shipment Stops')).toBeTruthy()
    expect(screen.getByText('Approve Plan')).toBeTruthy()
    expect(screen.getByText('View Planning Dates')).toBeTruthy()
    expect(screen.getByText('View Routing')).toBeTruthy()
    expect(screen.getByText('New Consolidated Cost')).toBeTruthy()
    expect(screen.getByText('3,000.00 USD')).toBeTruthy()
  })
  it('badges changed stop fields and changed orders, lists affected orders', () => {
    render_()
    expect(screen.getByText('06/05/2026 03:00 PDT').closest('.odyssey-badge, [data-badge]')).toBeTruthy()
    const stop1 = screen.getByText('Stop 1').closest('.odyssey-timeline__row')
    expect(within(stop1).getByText('Affected Orders')).toBeTruthy()
    expect(within(stop1).getByRole('button', { name: /B/ })).toBeTruthy()
  })
  it('disables View Routing on an unfinalized location change', () => {
    render_({ orderChange: { ...oc, consolidation: { ...consolidation, locationChange: true } } })
    expect(screen.getByText('View Routing').closest('button')).toBeDisabled()
  })
})
```
Adjust the badge selector to the class `Badge` actually renders (check `packages/ui/src/Badge.jsx` root className before writing the assertion).

- [ ] **Step 2: Run** — `rtk vitest run src/components/detail/StopsTab.test.jsx` → FAIL.

- [ ] **Step 3: Implement** — `StopsTab.jsx` becomes:

```jsx
import React, { useState } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Badge, Button, ButtonLink, HeaderStrip, SummaryStrip, Timeline, TitleSubtitle } from '@odyssey/ui'
import { ICON_SM } from '@odyssey/tokens'
import PaneEmpty from './PaneEmpty'
import TooltipTrigger from '../ui/TooltipTrigger.jsx'
import PlanningDatesModal from './order-change/PlanningDatesModal.jsx'
import ViewRoutingModal from './order-change/ViewRoutingModal.jsx'
import OrderCompareModal from './order-change/OrderCompareModal.jsx'
import useApprovePlan from './order-change/useApprovePlan.js'

// LINX-15435…15438 — review mode. The Stops tab IS the consolidated
// order-change review screen (VD 1910-31512): the plain tab plus (a) prior/new
// pairs in the KPI strip, (b) a cost row + four actions in the card head,
// (c) purple change badges on stop fields / changed orders, (d) an Affected
// Orders column per stop. Everything keys off `oc.consolidation`; without
// it (Direct, or no order change) the tab renders exactly as before.

const Changed = ({ children }) => (
  <Badge variant="purple" leftIcon={<AlertTriangle {...ICON_SM} />}>{children}</Badge>
)

function KpiStrip({ summary, changes }) {
  const pair = (key, label, value) => {
    const c = changes?.[key]
    if (!c) return { label, value }
    return { label, value: (
      <span className="stops-kpi__pair">
        <span><Badge variant="gray">Prior</Badge> {c.prior}</span>
        <span><Badge variant="purple">New</Badge> {c.new}</span>
      </span>
    ) }
  }
  const items = [
    pair('distance', 'Distance', summary.distance),
    pair('grossWeight', 'Gross Weight', summary.grossWeight),
    pair('volume', 'Volume', summary.volume),
    { label: 'Accepted Carrier', value: summary.acceptedCarrier },
    { label: 'Seed Equipment', value: summary.seedEquipment },
    { label: 'Utilization', value: summary.utilization },
  ]
  return <SummaryStrip items={items} aria-label="Shipment KPIs" />
}

// Field value with optional change badge (LINX-15436 stop-level highlight).
function Field({ label, value, change }) {
  return (
    <TitleSubtitle subtitle={label} title={change ? undefined : (value || '--')}
      badge={change ? <Changed>{change.new}</Changed> : undefined} />
  )
}

// Order list: unchanged ids plain, changed ids badged (LINX-15436 "orders
// with changes shall be visually distinguished").
function OrderField({ orderIds, changedIds }) {
  return (
    <div className="title-subtitle">
      <span className="text-label-xs-medium title-subtitle__subtitle">Order</span>
      <div className="stops-order-list">
        {orderIds.map(id => changedIds.includes(id)
          ? <Changed key={id}>{id}</Changed>
          : <span key={id} className="text-label-sm-medium">{id}</span>)}
      </div>
    </div>
  )
}

function StopContent({ stop, change, review, onOpenOrder }) {
  const isPickup = stop.type === 'pickup'
  const f = change?.fields ?? {}
  const changedIds = change?.changedOrderIds ?? []
  return (
    <div className="stops-item">
      <div className="stops-item__main">
        <HeaderStrip title={`Stop ${stop.stopNumber}`} badge={<Badge variant="green">{isPickup ? 'Pickup' : 'Delivery'}</Badge>} />
        <div className="stops-item__fields">
          <Field label="Location" value={stop.location} change={f.location} />
          <Field label="Date" value={stop.date} change={f.date} />
          <Field label="Appointment" value={stop.appointment} change={f.appointment} />
          {review ? <OrderField orderIds={stop.orderIds} changedIds={changedIds} /> : <Field label="Order" value={stop.order} />}
          <Field label="Address" value={stop.address} change={f.address} />
          <Field label="Weight" value={stop.weight} change={f.weight} />
          <Field label="Volume" value={stop.volume} change={f.volume} />
          <Field label="Package Count" value={stop.packageCount} change={f.packageCount} />
          {isPickup && <Field label="PickUp no." value={stop.pickupNo} />}
        </div>
      </div>
      {review && (
        <aside className="stops-item__affected">
          <HeaderStrip title="Affected Orders" />
          {changedIds.length === 0 && <span className="stops-item__affected-empty">--</span>}
          {changedIds.map(id => (
            <ButtonLink key={id} className="stops-item__affected-row" onClick={() => onOpenOrder(id)}>
              {id} <ArrowRight {...ICON_SM} />
            </ButtonLink>
          ))}
        </aside>
      )}
    </div>
  )
}

const StopsTab = React.memo(function StopsTab({ data, orderChange, orderDetails = [], shipment, onRequestTab }) {
  const [modal, setModal] = useState(null) // 'planning' | 'routing' | { order: id }
  const approvePlan = useApprovePlan(shipment, orderChange, onRequestTab)
  if (!data) return <PaneEmpty message="No stops data available." col="medium" />
  const { summary, stops } = data
  const c = orderChange?.consolidation
  const review = !!c && !orderChange.resolution

  let pCount = 0, dCount = 0
  const items = stops.map((stop, idx) => {
    const isPickup = stop.type === 'pickup'
    if (isPickup) pCount++; else dCount++
    const change = review ? c.stopChanges[String(stop.stopNumber)] : undefined
    return {
      key: stop.stopNumber ?? idx,
      label: isPickup ? `P${pCount}` : `D${dCount}`,
      status: change ? 'issue' : (stop.status || 'completed'),
      content: <StopContent stop={stop} change={change} review={review} onOpenOrder={(id) => setModal({ order: id })} />,
    }
  })

  const routingBlocked = review && c.locationChange
  return (
    <div className="pane-canvas">
      <KpiStrip summary={summary} changes={review ? c.summaryChanges : null} />
      <div className="pane-col pane-col--medium">
        <div className="pane-card">
          <div className="pane-card__header">
            <h2 className="pane-card__title">All Stops</h2>
            {review && (
              <div className="stops-review__actions">
                {/* Part 2 (LINX-15667…) — Compare Screen sandbox. Rendered so the header matches VD 1910-31512; disabled until built. */}
                <TooltipTrigger content="Coming soon"><Button variant="secondary" disabled>Edit Shipment Stops</Button></TooltipTrigger>
                {/* Task 8 on hold (Q4) — enable once the post-approval VD lands. */}
                <TooltipTrigger content="Coming soon"><Button variant="primary" disabled>Approve Plan</Button></TooltipTrigger>
              </div>
            )}
          </div>
          {review && (
            <div className="stops-review__head">
              <div className="stops-review__costs">
                <TitleSubtitle subtitle="Prior Cost" title={c.costs.prior} />
                <TitleSubtitle subtitle="New Direct Cost" title={c.costs.newDirect} />
                <TitleSubtitle subtitle="New Consolidated Cost" title={c.costs.newConsolidated} />
              </div>
              <div className="stops-review__actions">
                <Button variant="secondary" onClick={() => setModal('planning')}>View Planning Dates</Button>
                {/* LINX-15438 note: not available while a site change is unfinalized. */}
                <TooltipTrigger content={routingBlocked ? 'Finalize stop changes in Edit Shipment Stops first' : null}>
                  <Button variant="secondary" disabled={routingBlocked} onClick={() => setModal('routing')}>View Routing</Button>
                </TooltipTrigger>
              </div>
            </div>
          )}
          <Timeline animate items={items} className={`stops-timeline${review ? ' stops-timeline--review' : ''}`} aria-label="All stops" />
        </div>
      </div>
      {modal === 'planning' && <PlanningDatesModal orders={orderDetails} onClose={() => setModal(null)} />}
      {modal === 'routing' && <ViewRoutingModal orderChange={orderChange} onClose={() => setModal(null)} />}
      {modal?.order && <OrderCompareModal orderId={modal.order} rows={c.orderComparisons[modal.order] ?? []} onClose={() => setModal(null)} />}
      {approvePlan.dialog}
    </div>
  )
})
export default StopsTab
```

Until Tasks 5–8 exist, stub the three modals and `useApprovePlan` as files that `return null` / `{ start(){}, pending:false, dialog:null }` so the test suite runs; they get real bodies in their own tasks.

CSS (`stops.css`, tokens only):

```css
.stops-kpi__pair { display: flex; flex-direction: column; gap: var(--spacing-1); }
.stops-review__head { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--spacing-4); padding: 0 0 var(--spacing-4); }
.stops-review__costs { display: flex; gap: var(--spacing-6); }
.stops-review__actions { display: flex; gap: var(--spacing-4); }
.stops-timeline--review .stops-item { display: grid; grid-template-columns: 1fr 227px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
.stops-timeline--review .stops-item__main { display: flex; flex-direction: column; gap: var(--spacing-4); }
.stops-timeline--review .stops-item__fields { padding: 0 var(--spacing-4) var(--spacing-4); }
.stops-item__affected { border-left: 1px solid var(--border-subtle); display: flex; flex-direction: column; }
.stops-item__affected-row { display: flex; align-items: center; justify-content: center; gap: var(--spacing-2); height: 48px; border-bottom: 1px solid var(--border-subtle); }
.stops-item__affected-empty { padding: var(--spacing-3) var(--spacing-4); color: var(--text-tertiary); }
.stops-order-list { display: flex; flex-direction: column; gap: var(--spacing-1); align-items: flex-start; }
```

- [ ] **Step 4: Run** → PASS. Then `rtk vitest run src/components/detail` (nothing else regressed).

- [ ] **Step 5: Commit** — `rtk git commit -m "S142: Stops tab review mode — KPI deltas, cost row, change badges, Affected Orders (LINX-15435/15436)"`.

---

### Task 5: Planning Dates modal

**Files:**
- Create: `apps/odyssey-one/src/components/detail/order-change/PlanningDatesModal.jsx`
- Test: `apps/odyssey-one/src/components/detail/order-change/PlanningDatesModal.test.jsx`

- [ ] **Step 1: Failing test**

```jsx
// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import PlanningDatesModal from './PlanningDatesModal'
afterEach(cleanup)
const orders = [
  { orderNumber: '000000004850', planningType: 'SSD', earliestPickup: '05/23/2026', latestPickup: '05/24/2026', earliestDelivery: '05/25/2026', latestDelivery: '05/26/2026' },
  { orderNumber: '000000004852', planningType: 'RDD', earliestPickup: '05/23/2026', latestPickup: '05/24/2026', earliestDelivery: '05/25/2026', latestDelivery: '05/26/2026' },
]
it('lists one row per order with the AC columns and closes on Go Back', () => {
  const onClose = vi.fn()
  render(<PlanningDatesModal orders={orders} onClose={onClose} />)
  expect(screen.getByRole('dialog', { name: 'Planning Dates' })).toBeTruthy()
  for (const h of ['Order', 'Planning Type', 'Earliest Ship', 'Latest Ship', 'Earliest Delivery', 'Latest Delivery']) expect(screen.getByText(h)).toBeTruthy()
  expect(screen.getAllByText('000000004852')).toHaveLength(1)
  fireEvent.click(screen.getByText('Go Back'))
  expect(onClose).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement**

```jsx
import { Button, GroupTable, ModalMedium } from '@odyssey/ui'
import { rowsToFlatGroups } from '../../shipments/order-change/comparisonHelpers.jsx'

// LINX-15435 "Planning information shall be displayed for all orders in the
// shipment (data will be from order)" — VD 2102-10502. Per-order planning
// type is the ORDER's planningDateType (OrderDetailVM.planningType); the four
// bounds are the order's own earliest/latest pickup/delivery already mapped
// for the Orders tab. First column is the ORDER NUMBER (VD shows 01/02 — Q3).
const COLUMNS = [
  { key: 'order', label: 'Order' }, { key: 'planningType', label: 'Planning Type' },
  { key: 'earliestShip', label: 'Earliest Ship' }, { key: 'latestShip', label: 'Latest Ship' },
  { key: 'earliestDelivery', label: 'Earliest Delivery' }, { key: 'latestDelivery', label: 'Latest Delivery' },
]
export default function PlanningDatesModal({ orders, onClose }) {
  const rows = orders.map(o => ({ order: o.orderNumber, planningType: o.planningType ?? '--', earliestShip: o.earliestPickup, latestShip: o.latestPickup, earliestDelivery: o.earliestDelivery, latestDelivery: o.latestDelivery }))
  return (
    <ModalMedium title="Planning Dates" ariaLabel="Planning Dates" onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>Go Back</Button>}>
      <GroupTable flat columns={COLUMNS} groups={rowsToFlatGroups(rows, COLUMNS, (r, c) => r[c.key])} />
    </ModalMedium>
  )
}
```
`OrderDetailVM` has no per-order `planningType` today — add `planningType: order.planningDateType ?? DASH` to `mapOrderDetail` in Task 2's mapper (and to the VM interface). The strip-style header in the VD is `GroupTable`'s default column header; no `header` prop.

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `rtk git commit -m "S142: Planning Dates modal (LINX-15435, VD 2102-10502)"`.

---

### Task 6: View Routing modal

**Files:**
- Create: `apps/odyssey-one/src/components/detail/order-change/ViewRoutingModal.jsx`
- Test: `…/ViewRoutingModal.test.jsx`

- [ ] **Step 1: Failing test**

```jsx
// @vitest-environment jsdom
import { render, screen, cleanup, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import ViewRoutingModal from './ViewRoutingModal'
afterEach(cleanup)
const opt = (over) => ({ routeRank: '3', rank: '1', scac: 'DDFL', equipment: 'LTH', cost: '$1,445,543.00', status: '', pickupDateTime: '05/23/2026 - 14:30 CDT', deliveryDateTime: '05/23/2026 - 14:30 CDT', ...over })
const oc = {
  newTenderList: [opt({ cost: '$1,500.00' })], priorTenderList: [opt({ status: 'Sent' })],
  droppedCarriers: { prior: [], new: [{ scac: 'JBHT', carrierName: 'J.B. HUNT', reason: 'Missing Transit Time' }] },
}
it('renders New above Prior, then Dropped Carriers, and badges a changed AP cost', () => {
  render(<ViewRoutingModal orderChange={oc} onClose={() => {}} />)
  const titles = screen.getAllByRole('heading').map(h => h.textContent)
  expect(titles.indexOf('New')).toBeLessThan(titles.indexOf('Prior'))
  expect(titles.indexOf('Prior')).toBeLessThan(titles.indexOf('Dropped Carriers'))
  for (const h of ['Route Rank', 'Rank', 'SCAC', 'Equipment', 'AP Cost', 'Tender Status', 'Pickup Date/Time', 'Delivery Date/Time']) expect(screen.getAllByText(h).length).toBeGreaterThan(0)
  expect(screen.getByText('$1,500.00').closest('[class*="badge"]')).toBeTruthy()
  expect(screen.getByText('JBHT')).toBeTruthy()
})
```
If `GroupTable`'s `header` renders a non-heading element, assert on `getByText('New')` order via `compareDocumentPosition` instead.

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** — reuse the Direct review's list machinery:

```jsx
import { Badge, Button, GroupTable, ModalMedium } from '@odyssey/ui'
import { DiffValue, rowsToFlatGroups } from '../../shipments/order-change/comparisonHelpers.jsx'

// LINX-15438 View Routing — VD 2108-14708: New above Prior (canon §7, same as
// Direct), 8 tender columns, AP Cost badged purple when it differs from the
// same carrier's prior row. The AC also lists Dropped Carriers (canon §7:
// "dropped carriers ride inside the review") — the VD omits them; added as a
// third table (R7). Prior/New Direct/New Consolidated costs already sit in
// the card head and are not repeated here.
const COLS = [
  { key: 'routeRank', label: 'Route Rank' }, { key: 'rank', label: 'Rank' }, { key: 'scac', label: 'SCAC' },
  { key: 'equipment', label: 'Equipment' }, { key: 'cost', label: 'AP Cost' }, { key: 'status', label: 'Tender Status' },
  { key: 'pickupDateTime', label: 'Pickup Date/Time' }, { key: 'deliveryDateTime', label: 'Delivery Date/Time' },
]
const DROP_COLS = [{ key: 'scac', label: 'SCAC' }, { key: 'carrierName', label: 'Carrier Name' }, { key: 'reason', label: 'Reason' }]
const STATUS_VARIANT = { Sent: 'blue', Accepted: 'green', Cancelled: 'gray', Declined: 'red' }

function TenderTable({ title, rows, priorByScac }) {
  const cell = (r, c) => {
    if (c.key === 'cost') return <DiffValue value={r.cost} changed={!!priorByScac && priorByScac[r.scac] && priorByScac[r.scac] !== r.cost} />
    if (c.key === 'status') return r.status ? <Badge variant={STATUS_VARIANT[r.status] ?? 'gray'}>{r.status}</Badge> : ''
    return r[c.key] ?? '--'
  }
  return <GroupTable flat header={{ title }} columns={COLS} groups={rowsToFlatGroups(rows, COLS, cell)} />
}

export default function ViewRoutingModal({ orderChange: oc, onClose }) {
  const priorByScac = Object.fromEntries(oc.priorTenderList.map(o => [o.scac, o.cost]))
  const dropped = oc.droppedCarriers?.new ?? []
  return (
    <ModalMedium title="View Routing" ariaLabel="View Routing" onClose={onClose} scrollableContent
      footer={<Button variant="secondary" onClick={onClose}>Go Back</Button>}>
      <TenderTable title="New" rows={oc.newTenderList} priorByScac={priorByScac} />
      <TenderTable title="Prior" rows={oc.priorTenderList} />
      <GroupTable flat header={{ title: 'Dropped Carriers' }} columns={DROP_COLS}
        groups={rowsToFlatGroups(dropped, DROP_COLS, (r, c) => r[c.key] ?? '--')} />
    </ModalMedium>
  )
}
```
`RoutingOptionVM` field names (`routeRank`, `rank`, `scac`, `equipment`, `cost`, `status`, `pickupDateTime`, `deliveryDateTime`) — verify against `mapRoutingOption` in the mapper before relying on them; `OrderChangeTenderLists.jsx` already reads the same VM and is the reference.

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `rtk git commit -m "S142: View Routing modal — New/Prior/Dropped tables (LINX-15438, VD 2108-14708)"`.

---

### Task 7: Per-order compare modal (LINX-15437)

`VD compare` (2107-12719) IS the Direct review's comparison section (`OrderChangeTenderDetails`: Changed/Unchanged bands, purple diffs, hazmat merged) inside a `ModalMedium`. Deltas from the VD: (1) a group header `Order Number: <id>` above the bands; (2) the two value columns are labelled **Prior Tender / New Tender** (the section already uses those labels — verify, don't re-label); (3) hazmat rows ride in the same table (already the S137 behaviour — pass the order's hazmat lines, or `[]` when the seed has none). Modal title: the VD says "Planning Dates" (leftover from the sibling modal) — use **"Order Changes"** pending Q6.

**Files:**
- Create: `apps/odyssey-one/src/components/detail/order-change/OrderCompareModal.jsx`
- Test: `…/OrderCompareModal.test.jsx`

- [ ] **Step 1: Failing test**

```jsx
// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import OrderCompareModal from './OrderCompareModal'
afterEach(cleanup)
it('titles by order and renders changed rows first', () => {
  render(<OrderCompareModal orderId="000000004852" onClose={() => {}} rows={[
    { field: 'Incoterm', source: 'Order', prior: 'FOB', new: 'FOB', changed: false },
    { field: 'Gross Weight', source: 'Order', prior: '100 LB', new: '120 LB', changed: true },
  ]} />)
  expect(screen.getByRole('dialog', { name: 'Order Changes' })).toBeTruthy()
  expect(screen.getByText('Order Number: 000000004852')).toBeTruthy()
  const all = screen.getAllByText(/Gross Weight|Incoterm/).map(e => e.textContent)
  expect(all[0]).toBe('Gross Weight')
})
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**

```jsx
import { Button, HeaderStrip, ModalMedium } from '@odyssey/ui'
import OrderChangeTenderDetails from '../../shipments/order-change/OrderChangeTenderDetails.jsx'
import '../../shipments/order-change/order-change.css'

// LINX-15437 — "comparison view shall display Prior and New values side-by-
// side (refer LINX-14512)". Same section as the Direct review, fed this
// ORDER's rows instead of the shipment's. VD 2107-12719.
export default function OrderCompareModal({ orderId, rows, onClose }) {
  return (
    <ModalMedium title="Order Changes" ariaLabel="Order Changes" onClose={onClose} scrollableContent
      footer={<Button variant="secondary" onClick={onClose}>Go Back</Button>}>
      {/* VD 2107-12719 — group header strip above the Changed/Unchanged bands. */}
      <HeaderStrip title={`Order Number: ${orderId}`} />
      <OrderChangeTenderDetails oc={{ comparison: rows, hazmat: [] }} />
    </ModalMedium>
  )
}
```
Check `OrderChangeTenderDetails`'s prop contract (it takes the `oc` object — `comparison` + `hazmat`); if it also expects a collapse callback, pass a no-op.

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `rtk git commit -m "S142: per-order compare modal reuses the Direct comparison section (LINX-15437)"`.

---

### Task 8: Approve Plan — **ON HOLD (Q4)** — do not execute until the post-approval VD lands

**Files:**
- Modify: `apps/odyssey-one/api/_lib/shipments.mjs` (`OC_OUTCOMES`)
- Test: `apps/odyssey-one/api/_lib/shipments.test.mjs`
- Modify: `apps/odyssey-one/src/api/queries/useResolveOrderChange.ts` (action union)
- Create: `apps/odyssey-one/src/components/detail/order-change/useApprovePlan.js`

- [ ] **Step 1: Failing API test**

```js
test('approve-plan clears the order-change exception and keeps the live tender status', async () => {
  const calls = []
  const db = { query: async (q) => { calls.push(q); return { rowCount: 1 } } }
  await resolveOrderChange({ params: ['123'], body: { action: 'approve-plan', priorTenderStatus: 'Accepted' }, db })
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].values.slice(0, 3), ['Accepted', 'monitoring', 'approved'])
})
```

- [ ] **Step 2: Run** — `node --test api/_lib/shipments.test.mjs` → FAIL (400 Unknown action).

- [ ] **Step 3: Implement** — in `OC_OUTCOMES`:

```js
  // LINX-15435/15438 Approve Plan (consolidated review, no active-tender
  // decision needed): the exception clears and whatever the tender already
  // was stands — same re-filing as bypass. With NO tender at all the row
  // goes back to Review/monitoring for the planner to tender from the Tender
  // tab (LINX-15671 Scenario B).
  'approve-plan': (prior) => OC_OUTCOMES.bypass(prior),
```
`useResolveOrderChange.ts`: `action: 'retender' | 'bypass' | 'cancel' | 'approve-plan'`.

`useApprovePlan.js`:

```js
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../../common/ConfirmDialog.jsx'
import { useResolveOrderChange } from '../../../api/queries/useResolveOrderChange'

const ACTIVE = ['To Be Tendered', 'Sent', 'Accepted']

// Approve Plan (LINX-15435). Two exits, mirroring LINX-15671:
//  A) active tender → the planner still owes a decision on the tendered
//     carrier (Cancel / Re-Tender / Bypass) — hand off to the Direct review's
//     Actions card, which already implements LINX-14513/14514 verbatim.
//  B) no active tender → record approve-plan, exception clears, land on the
//     Tender tab so the planner tenders from the new list. (Q4 for Jana.)
export default function useApprovePlan(shipment, orderChange, onRequestTab) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const resolve = useResolveOrderChange()
  const active = ACTIVE.includes(shipment?.tenderStatus)
  const start = () => setOpen(true)
  const confirm = () => {
    setOpen(false)
    if (active) {
      navigate(`/shipments/order-change/${shipment.sellShipment}`, { state: { buyShipment: shipment.buyShipment, from: 'stops' } })
      return
    }
    resolve.mutate({ sellShipment: shipment.sellShipment, action: 'approve-plan', priorTenderStatus: shipment.tenderStatus ?? null, cost: null, priorScac: null },
      { onSuccess: () => onRequestTab?.('routing-guide') })
  }
  const dialog = open ? (
    <ConfirmDialog title="Approve Plan"
      message={active
        ? 'The updated plan will be approved. Next you will decide what happens to the current tendered carrier.'
        : 'The updated plan will be approved and the new routing options will be available on the Tender tab. Do you want to continue?'}
      confirmLabel="Approve" onConfirm={confirm} onCancel={() => setOpen(false)} />
  ) : null
  return { start, pending: resolve.isPending, dialog }
}
```
Tender tab key: confirm the BottomBar tab key for `RoutingGuideTab` (grep `case 'routing` in `BottomBar.jsx:~400`) and use that literal.

- [ ] **Step 4: Run** — API test PASS; `rtk vitest run src/components/detail` PASS. Manually: consolidated OC row → Approve Plan → (Sent) lands on Direct Actions card; (no tender) row leaves the Order Change tab.

- [ ] **Step 5: Commit** — `rtk git commit -m "S142: Approve Plan — hand off to the tender decision or clear the exception (LINX-15435/15438, 15671 A/B)"`.

---

### Task 9: Canon + decision log + progress

**Files:**
- Modify: `vault/10-domains/shipments/order-change.md` — replace §10 ("intent only") with the AC-backed model: two surfaces (Stops-tab review / Compare Screen sandbox), the reconciliation table above, Part-2 items marked *not built*; §12 adds OC-open-8…12 (Q1–Q5).
- Modify: `vault/10-domains/shipments/decisions/decision-log.md` — **DEC-132** consolidated OC reviews on the Stops tab, Direct route stays Direct-only (source: LINX-14509 + 15435; previous: all 218 OC rows opened the Direct route). **DEC-133** VD-vs-AC copy: AC wording wins (Edit Shipment Stops, New Consolidated Cost). **DEC-134** View Routing adds Dropped Carriers (AC 15438 over VD). **DEC-135** Approve Plan exits A/B (inference from 15671 — flagged Q4).
- `progress.md` — S142 entry via `/wrap`.

- [ ] Commit — `rtk git commit -m "S142: canon §10 rewritten from LINX-15435…15872; DEC-132…135"`.

---

## Self-review

- **Spec coverage:** 15435 header/costs/planning/actions → T4+T5+T8; 15436 highlighting (14 fields collapsed to the stop grid, orders distinguished, stop-level summary via badges + rail status) → T4; 15437 → T7; 15438 auto-routing (seeded as the `newTenderList`), View Routing contents + disabled rule, Approve Plan → T6+T8. **Not covered on purpose:** Tender Option versioning (OC-open-4), Margin (Q1), Edit Shipment Stops (Part 2).
- **Names used across tasks:** `orderChange.consolidation` (T1/T2/T4), `stopChanges[String(stopNumber)]` keyed by `stopSequence` — the mapper must keep `stopNumber = stopSequence` (it does today via `mapStop`); `costs.{prior,newDirect,newConsolidated}`; `useApprovePlan(shipment, orderChange, onRequestTab)`; `onRequestTab` threaded BottomBar → StopsTab and → RoutingGuideTab.
- **Reseed:** local `public/details` only. Neon reseed + prod deploy each need explicit permission.
