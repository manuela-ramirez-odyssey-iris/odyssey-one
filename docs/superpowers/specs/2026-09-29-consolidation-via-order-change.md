---
domain: consolidation
type: spec
tags: [consolidation, order-change, edit-stops]
date: 2026-09-29
status: draft — awaiting user approval
---

# Spec — manual consolidation on the order-change editor

Plan: `docs/superpowers/plans/2026-09-29-consolidation-via-order-change.md` (rulings R1–R7). Source: Jana ↔ Manuela 2026-09-29, `vault/00-inbox/Order Change Sync.vtt` `@24:40–35:11`. Paths are under `apps/odyssey-one/`.

**Build gate:** don't start until the parallel S164 session has committed its work on `EditStopsView.jsx`, `edit-stops.css`, `ViewRoutingModal.jsx` and `StopsTab`. Start from its final state.

**Model:** consolidation **reuses the order-change screen and its pure helpers; it does not use order change.** No `detail.orderChange` is read or written, the order-change API (`save-stops` / `approve-plan`) is never called, and saving goes through the consolidation endpoint. A consolidation creates a **new C**, so there is **no Prior**. Before it's created, the C is a sandbox built from the selected pool shipments. Once created, it is a normal shipment, filed like a new O.

---

## S1. Selection scoped to the pool (`src/routes/shipments/ShipmentsRoute.jsx`)

- **S1.1** `enterConsolidate` sets `activePanel = 'monitoring'` and `activeTab = 'consolidation'` (was `exceptions` / `all`).
- **S1.2** While `inMode`, the panel switcher and every category tab except Consolidation are hidden. Use the same mechanism that hides PGI/PGR (`visiblePanels`).
- **S1.3** Unchanged: the `shipment-type: Direct` mode chip (single-order shipments only; Jana `@29:22`), the customer lock (CNS-10), the guards (CNS-12), show-selected-on-top, and the exit restore.
- **S1.4** The mode's primary CTA opens `/shipments/consolidate/stops` via `openSheet`, with `state: { rows: [...selection] }` in selection order. It is enabled at ≥2 rows, as today.
- **S1.5** Row menu **Edit** on a Consolidation-type row (`consolidationEditReason` still gates it) opens `/shipments/consolidate/stops` directly with `state: { rows: [row] }`. It no longer re-enters the mode.

## S2. Sandbox from N sources (`src/components/detail/order-change/stopsSandbox.js`)

- **S2.1** Add `initFromSources(sources)`, where `sources = [{ row, detail }]` and `detail` is the mapped VM from `getSellShipmentDetail`. It is pure and returns the same shape as `initSandbox`:
  - `stops`: every source's `detail.stopsData.stops` pickups in selection order (a source's own order kept), then every delivery, same rule. Map each stop exactly as `initSandbox` does, but key it `src:<sellShipment>:<stopNumber>`.
  - **Merge:** a stop whose type and `siteKey` match an earlier stop of the result (the `sameSite` rule) is folded into it. `orderIds` are unioned; everything else is kept from the first stop.
  - Every stop starts `unsequenced: false`, `dateEdited: true`.
  - `prior: []`, `arrival` = a copy of `stops`, `pending: []`, `dirty: false`, `seq: 0`.
- **S2.2** `toDto`: a key matching `^src:(\d+):(\d+)$` emits `sourceSellShipment` and `sourceStopSequence`. The `s<n>` keys (order change) keep `sourceStopSequence` and emit `sourceSellShipment: null`. Created `new:` stops emit both as null.

## S3. Stop sequence: order change's rule, nothing new (user, 2026-09-29)

- **S3.1** Consolidation uses order change's rule as it is (LINX-15669 §2 / BR-3). A drag or arrow move that would put an order's delivery above its pickup is **refused**, with the existing message. `canReorderStop`/`canMoveStop` are unchanged, and no new prop is added.
- **S3.2** Consol's own out-of-order validation (DEC-219: allow the move, then a red pair, dimmed and locked stops, blocked Save) is **not carried over**. It solved the same rule a different way, and the user prefers preventing the move. A placement-made invalid sequence (C7) keeps order change's existing handling: repair moves are allowed, and Evaluate is disabled with its tooltip.

## S4. Editor host (`src/routes/shipments/ConsolidateStopsRoute.jsx`, new; route in `src/App.jsx`)

- **S4.1** Route `/shipments/consolidate/stops`, reading `location.state.rows`. `useQueries` fetches each source's detail, the same way `ConsolidationReviewRoute` does. It shows a spinner until all have loaded and an error + Retry if any fails. No rows → an EmptyState with a **Back to Shipments** button (exits the mode).
- **S4.2** Shell: `AppShell` with `sidebarHidden`, and `titleMode.title = 'Manual Consolidation'`.
  - Crumbs: **Shipments Consolidation** (back to the mode) › **Edit Shipment Stops** (current).
  - `PageHeader`: `New Consolidated Shipment`, or `Shipment {C id}` when the single source is a C (S1.5).
- **S4.3** Props for `EditStopsView`:
  - `initial` = `initFromSources(sources)`. New prop: when it's given, it replaces the `initSandbox` call.
  - `orders` = the union of every source's `orderDetails`.
  - `tenderList` = `anchor.routingData.options.map(routingOptionVmToDto).map((o) => ({ ...o, status: '' }))`. The anchor is `sources[0]` (R1, the stand-in for the routing call). **No `orderChange` prop is passed** (see S5.9).
  - `summary` = `{ headerDistance: anchor distance, seedEquipment: anchor's, utilization: from equipmentCapacity.js over the live totals, or '--' }`.
  - `consolidation` = `{ costs: { newConsolidated: rank-1 of reroutedNewList(...) } }`, recomputed live.
  - `showPrior={false}`, `minOrders={2}`, `confirmApprove={false}`, `approveLabel="Apply Consolidation"`.
  - `sellShipment` = the anchor (Add Orders), plus the anchor's `customerId`/`customerName`.
- **S4.4** Leaving:
  - Cancel, X and the first crumb all go through the editor's dirty check (`cancelRef`, as the order-change route does). Then `closeSheet('/shipments', { state: { consolidate: { rows } } })` returns to the mode with the selection kept (the old `backInModeWith`).
  - For S1.5 (a C opened from the row menu), leaving goes to `/shipments` with no mode.

## S5. `EditStopsView` props for no-Prior mode

- **S5.1** `showPrior` (default true). With it false:
  - no Prior `<section>`, no collapse buttons, and no `priorCollapsed`/`priorMotion`/prior-line measuring effects run;
  - New takes the width;
  - `priorDiff`-driven badges never show (`prior` is empty anyway).
- **S5.2** The strip with `showPrior={false}` holds only **Distance, Gross Weight, Volume**, as live values, with no changed icons (nothing to compare against). `ReviewKpiStrip` gets a `fields` override, or a `mode="new"`; pick whichever is the smaller diff.
- **S5.3** The All Stops row with `showPrior={false}` holds **Consolidated Cost** (label with no "New"), **Seed Equipment** and **Utilization**, then View Planning Dates. There is no Accepted Carrier.
- **S5.4** `minOrders` (default 1). Remove is disabled with a tooltip while the orders on stops number `<= minOrders`. Consol copy: `A consolidation needs at least two orders.`; order change keeps `LAST_ORDER_TOOLTIP`.
- **S5.5** `ViewRoutingModal` gets `showPrior` (default true). With it false, there is no Prior table, and the New table's cost cells show no diff.
- **S5.6** `confirmApprove` (default true). With it false, the routing modal's primary (`approveLabel`, default `Approve Changes`) calls `onApprove(toDto(sb), externalOrdersOnStops, <the re-routed tenderList>)` directly, with no `ConfirmDialog`. The host shows its own confirm. The routing modal stays open underneath, as today.
- **S5.7** `externalOrdersOnStops` also carries `sourceTenderStatus`. `AddOrdersModal` rows already have `tenderStatus`; keep it on `extraOrders`.
- **S5.9** Decouple the editor from the order-change payload name:
  - `EditStopsView` and `ViewRoutingModal` take `tenderList` (the list to re-route), `priorTenderList` (default `[]`) and `droppedCarriers` (default `[]`) as plain props instead of reading them off `orderChange`.
  - `reroutedNewList(list, stops, baselineMiles)` takes the list and the baseline directly.
  - The order-change route unpacks its `detail.orderChange` into these props. It is a rename at the call sites, with no behaviour change.
- **S5.8** Order change passes none of the consol props and must render **exactly** as before. The existing `EditStopsView`, route and StopsTab tests must pass unchanged.

## S6. Apply modal: confirm ⇄ Tendered Shipment Detected (`src/components/consolidation/ConsolidationApplyModal.jsx` + `useTenderedCheck.js`, extracted)

- **S6.1** Move the whole B3/B4 flow out of `ConsolidationReviewRoute.jsx` unchanged in behaviour and copy:
  - the merged modal (confirm phase and error phase);
  - `TenderedCheckTable`, the radio cards, the success/cancelled Alerts and `CONFIRM_REROLL_MS`;
  - the first-Approve 50% `simulateConcurrentTender`, and the cancel-tender path through `applyTenderAction` + `saveTenderOption`.
  - Its CSS moves to `consolidation-apply.css`.
- **S6.2** The rows checked are the **selected sources**, plus one row per **external order's source shipment** (from `sourceTenderStatus`, with `odysseyShipmentIdentifier` and `orders` from the candidate row). A row counts as tendered on the existing `ACTIVE_TENDER`.
- **S6.3** Outcomes, now expressed on the sandbox:
  - **Remove:** the tendered rows' orders go back to pending (`moveToPending` per order; external ones are dropped from `extraOrders`), and the modal returns to confirm with the removed Alert. It is offered when ≥2 source shipments remain; otherwise **Discard**.
  - **Discard:** back to the mode with the selection minus the tendered rows.
  - **Cancel tender:** as today; the rows stay.
  - The editor exposes an imperative `removeOrders(ids)` through the same `cancelRef`-style ref (`actionsRef`) so the host can do Remove.
- **S6.4** Confirm phase → `useApplyConsolidation().mutate({ sellShipments, stops, externalOrders, tenderList })`. On success → S8. On error, the error stays in the modal.

## S7. Write path (`api/_lib/consolidateShipments.mjs`, `api/_lib/consolidations.mjs`, `src/api/services/consolidationService.ts`)

- **S7.1** Body: `{ sellShipments: string[], stops: StopDto[], externalOrders: [{ orderNumber, sourceSellShipment }], tenderList: Option[] }`. `stopOrder` is removed.
- **S7.2** Guards, all 400, in `applyConsolidation` (every caller goes through it):
  - a source not in `category = 'consolidation'` → `Only shipments in Consolidation can be consolidated: {ids}`;
  - more than one customer (existing check);
  - fewer than 2 orders on the DTO's stops → `A consolidation needs at least two orders.` (CNS-14);
  - an invalid sequence on the DTO (a delivery above its pickup for any order) → `Stops are out of order.`;
  - `sellShipments.length` may now be 1 (a C being edited, S1.5).
- **S7.3** Stops: `buildConsolidatedShipment` takes `stops` (the DTO). Each DTO stop copies its full fields from the source detail's `shipmentStopList` entry at `(sourceSellShipment, sourceStopSequence)`, then the DTO's sequence, orders and date.
  - Generalize `shipments.mjs`'s `mergeStops` to a lookup function rather than duplicating it; order change passes its single detail.
  - A created stop (both null) keeps its DTO fields (C9).
- **S7.4** Orders:
  - The C's `orderList` = every order on the DTO's stops, taken from the sources' `orderList` plus the external records.
  - External orders go through `pullExternalOrders` exactly as `resolveOrderChange` save-stops does, which is also the 15872 backstop. Emptied external sources are handled the same way.
  - A **selected Direct source** whose order is left pending is untouched (not consolidated, stays in the pool).
  - A **selected C source** (S1.5) whose orders are left pending: each one becomes its own Direct shipment through the same C3 builder save-stops uses.
- **S7.5** Ids: unchanged `idsForConsolidation`, including the rule that reuses a single C source's ids. Only the sources that were actually consumed (every order moved) are removed.
- **S7.6** Filing, as a new O (R1 ruling, `planShipment.mjs:162`):
  - `category` = `'consolidation'` if every order's record is consolidatable (`consolidatable !== false`), else `'hold'`;
  - `panel: 'monitoring'`, `tenderStatus: ''`, `shipmentStatus: shipmentStatusFor(...)`.
  - The history entries are as today.
- **S7.7** `detail.shippingOptionList = tenderList`, with every `status` blank and no notify/response fields. The Tender tab then lists them untendered (CNS-16). `droppedCarrierList: []`.
- **S7.8** Mock: `consolidationService.ts` calls the same builder with the same guards, as today.

## S8. Landing + animation (`ShipmentsRoute.jsx`)

- **S8.1** On success: `closeSheet('/shipments', { state: { consolidateExit: true, createdShipment: row, panel: 'monitoring', tab: row.category } })`.
  - `ShipmentsRoute` applies the panel/tab **after** `exitConsolidate`'s prior-panel restore, so the planner sees the tab where the C was filed.
  - The S155 pin + highlight run as today.
- **S8.2** **Land animation** on the pinned row: it enters from slightly above (translateY -12px → 0, opacity 0 → 1, ~400ms, ease-out), then the existing highlight pulse runs. The page scrolls the table to the top first.
  - CSS keyframes on the pinned row's class; no JS animation library.
  - `prefers-reduced-motion: reduce` → no motion, highlight only.
  - Load the `web-motion-design` skill when building it.

## S9. Delete

- `src/routes/shipments/ConsolidationReviewRoute.jsx` + `.test.jsx` + `consolidation-review.css`, after S6.1 has moved the modal out;
- `src/consolidation/stopOrder.js` + test, and `src/consolidation/proposal.js` + test (keep `equipmentCapacity.js`);
- the `/shipments/consolidate/review` route.
- Then grep: `consolidate/review`, `ConsolidationReviewRoute`, `buildProposal`, `reorderStops`, `invalidStopKeys`, `stopOrder:`. Every hit is either updated or gone.

## S10. Canon (main thread, not the implementers)

- Consolidation decision log:
  - **CNS-18**: pool-only scope. Previous: CNS-08 and Dave 09-17 (any Direct, Hold fine).
  - **CNS-19**: consolidation runs in the order-change editor from New, with no Prior. Stop sequence follows order change's LINX-15669 rule (refuse the move). The tendered modal carries over. Supersedes the S161 Review & Apply page and DEC-219's allow-then-fix validation.
  - **CNS-20**: a created C is filed like a new O, carries the evaluated carrier list and is animated into the list. Adopts CNS-16.
- Shipments decision log: DEC-219 is marked superseded by CNS-19.
- `vault/10-domains/consolidation/consolidation.md`: flow section rewritten.
- No search-vocabulary change, so no progression regen.

---

## Implementation split (two `implementer` agents, disjoint files)

- **A, client:**
  - S1: `ShipmentsRoute.jsx`, `ShipmentTable.jsx` row menu;
  - S2: `stopsSandbox.js` + test;
  - S5: `EditStopsView.jsx`, `edit-stops.css`, `ReviewKpiStrip.jsx`, `ViewRoutingModal.jsx`;
  - S4: the new route + `App.jsx`;
  - S6: the extracted modal/hook/CSS;
  - S8 and S9.
- **B, server + mock:**
  - S7: `consolidateShipments.mjs`, `consolidations.mjs`, `shipments.mjs` (`mergeStops` generalization only), `consolidationService.ts`, `useApplyConsolidation` payload type;
  - their tests.
- `toDto`'s DTO (S2.2) is the contract between A and B. B works from this spec and doesn't read A's files.

## Tests (each agent, own files)

- **`initFromSources`:** pickup-first ordering, same-site merge, `src:` keys, `prior: []`; `toDto` emits `sourceSellShipment`.
- **`EditStopsView` in consol props:**
  - no Prior panel;
  - a strip of three fields;
  - an out-of-order drag or arrow move is refused with the LINX-15669 message;
  - Remove is blocked at 2 orders;
  - the routing primary calls `onApprove` with 3 args and no ConfirmDialog.
- **`EditStopsView` in order change:** **every existing test passes unchanged.**
- **Apply modal:** an external order from an Accepted shipment → Tendered Shipment Detected; Remove sends it to pending; Discard returns to the mode.
- **Route:** Approve → `/shipments` state carries `createdShipment` and the C's panel/tab. `consolidateMode.test.jsx`: entering lands on Monitoring › Consolidation and the other tabs are hidden.
- **API:**
  - the four 400 guards;
  - stops built from a 2-source DTO with a merged pickup;
  - external order pulled;
  - Hold filing when an order isn't consolidatable;
  - a C edit reuses ids and splits a pending order;
  - `shippingOptionList` = the posted list with statuses blank.

## Verification (main thread)

- `rtk vitest` (app + api) and the build.
- A browser click-through on `dev:api`:
  - pick 2–3 pool Directs sharing a pickup site and check the merge;
  - drag a delivery above its pickup and check that it's refused;
  - fix it, add an external order, Evaluate, then Apply Consolidation;
  - check the landing animation and that the Tender tab lists the untendered carriers.
  - **The Apply and the concurrent-tender roll write Neon, so ask before that click.**
- No reseed. One deploy at the end, on the user's go, bundle-grepped for `Only shipments in Consolidation` and `A consolidation needs at least two orders`.
