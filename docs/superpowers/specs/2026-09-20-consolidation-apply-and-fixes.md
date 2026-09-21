# Manual Consolidation — Apply + S155 fixes (spec)

**Session:** S155 · **Date:** 2026-09-20 · **Source:** user bug list + feature asks (2026-09-20), closing the loop S154 left open ("Apply creates nothing").
**Stories:** LINX-15787 (review & apply). **Canon touched:** CNS-01 / DEC-156 (consolidation takes loads; emptied directs are soft-deleted), CNS-09 (Consolidation ID = Odyssey Shipment Identifier `C…`).

Runtime rule: every behaviour below is identical in mock and live. Mock = `src/data/index.js` overlay; live = Neon via `api/_lib`. **No schema migration** (ids are derived, see §3).

---

## 1. Consolidate mode (`/shipments`, `ShipmentsRoute.jsx`)

### 1.1 The customer lock must not open the search glimpse
`ShipmentsGlobalSearch.jsx` open/close effect: the "newly committed chip" heuristic compares `chips.length > prev.chipCount`. A **locked** chip is host-committed, never user-committed — exclude locked chips from both counts (`chips.filter(c => !c.locked).length`, stored in `prevOpenKeyRef` too). Nothing else changes; the lock effect stays as is.

### 1.2 Clearing the bar while locked → confirm dialog
`handleClearAll` in `ShipmentsGlobalSearch.jsx`: when `lockedChip` is present, do NOT clear — open a `ConfirmDialog` (components/common) instead:
- title **"Clear Customer Selection"**
- message: host-supplied via new prop `lockedClearMessage` (string). ShipmentsRoute passes `Clearing the search will also clear all ${selection.size} selected shipment(s) for ${anchor.customerName || anchor.customerId}.`
- confirm **"Yes, Clear"** / cancel **"No"**.
- On confirm: call new prop `onClearLocked?.()` THEN `onClear()` + `onCommitQuery?.(null)` (existing path). The hook's `onClear` keeps the locked chip; the lock effect removes it on the next render once the host drops `lockedChip`.
- Host (`ShipmentsRoute`) `onClearLocked`: empty the selection **without** restoring `priorCriteria` (the planner asked for an empty bar): `setConsolidate({ ...consolidate, rows: new Map() })` and drop the `priorCriteria` key.

### 1.3 Select-all is wrong (root cause: batch check before an anchor exists)
Today the header checkbox with no anchor checks every eligible row on the page across **all customers**; the first row locks the customer, the table narrows, and the other customers' rows stay selected but invisible — so the header reads partial and "deselect all" only unchecks the visible page.
- Fix in the shared path `handleSelectionChange(rows, checked)` (ShipmentsRoute): when `checked`, restrict `rows` to one customer — `anchorCustomerId ?? rows[0]?.customerId`. One guard, every caller.
- `ShipmentTable` header checkbox unchecked → `onSelectionChange([...selection.values()], false)` (clears the whole selection, not just the page). aria-label stays "Select all eligible shipments on this page".
- **Limit:** none exists and none is added. Equipment capacity is a placeholder table; utilization can exceed 100% silently. Recorded as open question for Dave (Q-CNS-limit).

### 1.4 Header spacing + the customer row is always present in mode
- `PageHeader` `marginBottom`: in mode **8** (was 12 when anchored), normal **25** unchanged.
- `.consolidate-customer` `margin-bottom: var(--spacing-8)` (was spacing-6) — more air above the tabs.
- Render the row whenever `inMode` (not only when `anchor`):
  - anchored: `Selected Customer:` + blue Badge (as today)
  - no anchor: plain text **"Select shipments you want to consolidate. Only direct shipments are consolidatable"** (same `text-label-sm-regular`, `--text-tertiary`).

### 1.5 Sticky select column (DataTable API)
`DataTable` reads `columnDef.meta.sticky === 'right'` today. Generalise to `'left' | 'right'`:
- `headClassName`/`cellClassName` take the side; new class `odyssey-table__cell--sticky-left` (`position: sticky; left: 0; z-index: 2; box-shadow: 2px 0 4px rgba(0,0,0,0.06)`, background inherits the row/header like sticky-right does — copy whatever sticky-right does for background).
- `edgeGrip` logic unchanged (right side only).
- Document in `DataTable.demo.jsx` props table (`meta.sticky: 'left' | 'right'`).
- `ShipmentTable` select column: `meta: { fixedWidth: true, sticky: 'left' }`. Review-screen select column: same.

---

## 2. Review & Apply (`ConsolidationReviewRoute.jsx`)

### 2.1 Planned stops
- `<Timeline animate …>` (existing prop; CSS-only choreography).
- Spacing: `.consolidation-review__stop { padding-bottom: var(--spacing-5); }` so consecutive stops breathe (row height is content-driven, the segment stretches).

### 2.2 Consolidation Summary
- `<h2>` uses `text-heading-xl-semibold` (the `text-display-xs-semibold` class does not exist — S154 QA).
- **Customer Name / Selected Shipments (N)** become a `SummaryStrip background={false}` with two items; the Selected Shipments value is the purple Badge list (SummaryStrip `value` must accept a node — if it doesn't today, extend it to render a non-string `value` as-is, no `title`/truncation). Delete `.consolidation-review__info*` CSS.
- The metrics strip gets its background back: remove `background={false}` from the second `SummaryStrip`.

### 2.3 Footer
- `StepperButtonsFooter`: `cancelLabel="Cancel Consolidation"`, `showSave saveLabel="Edit Consolidation" onSave={backInMode}`, `primaryLabel="Apply Consolidation"`. The SubAccordion `action` (Modify Whole Selection) is removed.
- Sticky: `.consolidation-review__footer { position: sticky; bottom: 0; z-index: 1; }` (keep `margin-top: auto` + bleed).

### 2.4 Minimum two shipments
Any toggle (row or header) that would leave `checkedIds.size < 2` is **refused**; instead open `ConfirmDialog`:
- title **"Minimum Two Shipments"**, message *"A consolidation needs at least two shipments. To change the selection, go back to Shipments Consolidation and modify it."*, confirm **"Modify Selection"**, cancel **"Stay"**.
- Confirm → `leaveTo('/shipments', { state: { consolidate: { rows: <checkedRows minus the row(s) the planner tried to uncheck> } } })`. Cancel → nothing changes.

### 2.5 Apply confirm
`ConfirmDialog` accepts a node `message` (render as-is when not a string). Content: `<p>Are you sure you want to apply the proposed consolidation?</p>` + the identifier Badges (purple, wrap). Confirm **"Yes, Apply"** / **"No"**. Yes → `useApplyConsolidation().mutate({ sellShipments })`.

### 2.6 After Apply (the page becomes a preview)
State `applied = { row }` (the created row VM from the service).
- Success `Alert variant="success"` **above** the `PageHeader`, `showLink linkLabel="View Shipment"`, close allowed: *"Consolidation Successfully Applied! Consolidation ID: {row.odysseyShipmentIdentifier}. {n} Shipments successfully consolidated."*
- `PageHeader` title → **`Review {id}`**; breadcrumb current → `Review {id}`.
- Table: `readOnly` (no select column); summary/stops unchanged (they already reflect the checked set).
- Footer → cancel **"Back to Shipments"** (→ `leaveTo('/shipments')`, no dialog), primary **"Edit Consolidated Shipment"** (→ `leaveTo('/shipments', { state: { consolidate: { rows: [row] } } })` — consolidate mode with the new `C…` row as the anchor selection; see §3.3 for why a Consolidated row can be a source). `showSave=false`.
- "View Shipment" → `leaveTo('/shipments', { state: { createdShipment: row } })` (§4).
- Error → `Alert variant="error"` with the message; page stays editable.

---

## 3. Apply mechanics (both runtimes)

### 3.1 Pure builder — `api/_lib/consolidateShipments.mjs`
`buildConsolidatedShipment({ sources, seq, now })` where `sources = [{ row, detail }]` (grid row VM + raw `SellShipmentOut`), in the planner's selection order. Returns `{ row, detail, pickupTs, deliveryTs, removedSellShipments }` in exactly `buildDirectShipment`'s shapes so `buildInsertShipmentQuery` / `buildSearchIndexQuery` are reused unchanged.
- **Ids** (band disjoint from seed 25xxxxxx/5xxxxxxx and from planShipment 26xxxxxx/60xxxxxx/9xxxxxxxx): `odyssey C${70_000_000 + seq}`, `sell String(27_000_000 + seq)`, `buy String(910_000_000 + seq)`, `load` = sources' loads joined `,`. **If exactly one source is `shipmentType === 'Consolidated'`, reuse ITS three ids** (editing keeps the Consolidation ID stable — CNS-09).
- `row`: `shipmentType: 'Consolidated'`, `orders` = union (ordered, deduped), `orderCount` = String(union.length), `loadCount` = Σ, `grossWeight` = Σ parsed, `customerId/customerName` = anchor, `consignor/origin/pickupDate` = first pickup, `consignee/destination/deliveryDate` = last delivery (pickupDate = earliest, deliveryDate = latest by parsed date), `mode` = weight rule (reuse planShipment's `modeFor` — export it), `equipmentCode` = anchor's, `planningType` = anchor's, `pro/scac/seal/equipment` = null/'' , `tenderStatus: ''`, `shipmentStatus: ''`, `panel: 'monitoring'`, `category: 'consolidation'` (born in the pool — DEC-156/157), `pickupNumbers/poNumbers` = unions, `apFreightCost: ''`, `legType/shipmentSequenceLeg/nextShipmentId: null`, `validationMessage: null`.
- `detail` (SellShipmentOut): `orderList` = concat of sources' `orderList`; `shipmentStopList` = all sources' pickup stops (in order) then all delivery stops, re-sequenced 1..n; `numberOfStops`; totals summed; `historyList` = `[Shipment Created, Manual Consolidation]` entries (`details: "Consolidated from O…, O…"` naming source odyssey ids; author OdysseyONE/system, DEC-87 outcome contract); everything else like `buildDirectShipment` (no routing, not rated, no tender).
- `removedSellShipments` = every source's `sellShipment`.
- Unit tests: ids/band, single-C id reuse, unions, stop ordering, weight sum, history text.

### 3.2 Mock — `src/api/services/consolidationService.ts` + `src/data/index.js`
`applyConsolidation({ sellShipments }) → Promise<{ row, detail }>`:
- rows from `getAllShipments()`; raw details via a new exported `getRawSellShipmentOut(id)` in `shipmentService.ts` (overlay first, else `/details/{id}.json` — the same two branches `getSellShipmentDetail` has, lifted out).
- `seq` = module counter (like `createSeq`).
- `addShipment(row, detail)`; `removeShipments(removedSellShipments)` — **new** tombstone `Set` in `data/index.js`, filtered in `getAllShipments()` (overlay and seed), cleared by `__resetShipmentWriteState`; `clearShipmentSearchIndex()`.
- Order overlay: if `orderService` keeps a shipment link on order rows, repoint it; otherwise leave (note in code).

### 3.3 Live — `api/_lib/consolidations.mjs`, route `POST /shipment-service/v1/consolidation`
Body `{ sellShipments: string[], userId }`. Steps, sequenced so a failure leaves the sources intact:
1. `SELECT <ROW_COLUMNS>, detail FROM shipments WHERE sell_shipment = ANY($1)` → map to row VMs with the same mapper `shipmentErrorList` uses; order by the request's array order. 400 if any missing or if customers differ.
2. `seq` = `SELECT count(*) FROM shipments WHERE sell_shipment BETWEEN '27000000' AND '27999999'` + 1. `// ponytail: count-based seq, races under two concurrent planners; a sequence needs a migration`.
3. build → `DELETE FROM search_index WHERE domain='shipments' AND entity_id = ANY($old)`; if reusing a C id, `DELETE FROM shipments WHERE sell_shipment = <old C>` (stops/tenders/events cascade) **before** the insert (PK); `INSERT` via `buildInsertShipmentQuery`; `UPDATE orders SET shipment_sell_id = $new WHERE shipment_sell_id = ANY($old)`; `DELETE FROM shipments WHERE sell_shipment = ANY($old minus new)`; `buildSearchIndexQuery` (it already dedupes tuples — the comment there about "a multi-order consolidation would hit this" is now exercised: verify the dedupe holds, fix if not).
4. Return `{ success: true, data: { row, detail } }`.
Handler tests with a fake `db.query` (pattern in `orders.test.mjs`). `tools/local-api.mjs` picks routes from `router.mjs` — confirm nothing else to register.

### 3.4 Hook — `src/api/queries/useApplyConsolidation.ts`
`useMutation`, `onSuccess` invalidates `shipment-error-list`, `shipment-category-counts`, `order-list`, `order-tab-counts`, and the detail keys of the removed ids.

---

## 4. "See what you created" — pin + highlight (Shipments and Orders)

### 4.1 DataTable
New prop `highlightRowId` → `data-highlight` on that `<tr>`. CSS (components.css, next to `tr[data-selected]`): `@keyframes odyssey-row-highlight` from `var(--carolina-blue-100)` to transparent, `animation: 2.4s ease-out 1` on `td`; `prefers-reduced-motion` → no animation, no fill.

### 4.2 Shipments
`ShipmentsRoute`: `const [created, setCreated] = useState(location.state?.createdShipment ?? null)`. While set: rows handed to `ShipmentTable` = `[created, ...rows.filter(r => r.id !== created.id)]` (page 1 only; other pages unchanged) and `highlightId={created.id}`. Cleared when `listParams` changes after mount (sort/page/search/tab — the planner moved on) — one effect with a first-run skip ref. Default sort is by identifier ascending, so the new `C7…` id would otherwise land off page 1; the pin is what guarantees visibility. **Answer to the user's question:** no, the table does not put the newest on top by default; the pin does that for the created row only.

### 4.3 Orders
Orders' default sort is already `created desc` (mock overlay unshifts, live sorts), so no pin is needed — only the highlight. Every "back to the list" navigation in `ConfirmationView`/`CreateOrderForm` that follows a successful create carries `state: { createdOrder: orderNumber }`; `OrdersRoute` starts on the `created` tab when present and passes `highlightRowId` through `OrdersTable`. The success Alert's "Click here" keeps its 2026-07-28 ruling (the order's summary page).

---

## 5. Tests
- Update `consolidateMode.test.jsx` (§1.1–1.4), `ConsolidationReviewRoute.test.jsx` (§2), DataTable tests (sticky-left, highlight), `planShipment`-style unit tests for the builder, handler tests for the live route, service test for mock apply (tombstone honoured by `getAllShipments`).
- Baseline: 2,804 tests / 205 files. Run `npm run test -w odyssey-one-app` and `npm run build:odyssey-one` before reporting.

## 6. Out of scope / open
- Where the emptied direct shells are viewed after Apply (Dave, CNS-01). Mock tombstones and live DELETE both make them vanish; no "deleted" view.
- Stop re-sequencing; utilization targets; a selection limit (Q-CNS-limit).
- Angular twins for changed `@odyssey/ui` components (`DataTable` sticky-left + highlight, `SummaryStrip` node value if extended) — D-thread; flag NORMALIZING in both DSMs via `tools/dsm-flags.mjs`.
- No deploy, no Neon reseed this session unless the user says so.
