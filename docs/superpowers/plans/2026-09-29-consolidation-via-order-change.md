---
domain: consolidation
type: plan
tags: [consolidation, order-change, edit-stops, jana]
date: 2026-09-29
status: rulings in — spec next
---

# Manual consolidation, rebuilt on the order-change flow

**Goal:** a planner only consolidates shipments that are in the **Consolidation** pool. After picking them, they work in the order-change **Edit Shipment Stops** editor, starting from New with no Prior. The Review & Apply page goes away.

**Why:** the stories (Ramesh) never said this. Jana did, on the 2026-09-29 sync (`vault/00-inbox/Order Change Sync.vtt`):
- `@27:13–29:42` — *"you just have to be in consolidation state… you will see only 159 shipments. Within that, you choose"*. Hold is out because it already failed Allow Optimization (`@33:01`).
- `@29:14–29:22` — only single-order shipments are picked. Manuela: *"consolidate the shipments that have one order only, right?"* Jana: *"Correct, correct."*
- `@34:06–34:51` — *"you select a couple of orders… you don't have the prior… directly you start from new, rest of the page exactly remains the same… add order is there… order, move, add, whatever they want, in that same screen."*
- `@26:04–26:18` — no prior tender, *"it just has a routing list"*.
- `@35:07` — *"the first step is okay. What you did, the first step is good. Only thing is it has to look into the consolidation tab."*
- The 09-23 call (`Consoloidation Questions 2.vtt` `@44:00`, still unanalyzed) agrees: a new shipment re-runs the rules, and an optimizable one sits in the pool.

**Seed check (mock, 2026-09-29):** the pool holds 303 shipments: 172 single-order Direct, 129 two-order C and 2 one-order C. All are untendered, and each Direct has a routing list (5 options). **No reseed is needed.**

---

## What stays, what's reused, what goes

| | |
|---|---|
| **Stays (step 1)** | Consolidate mode in `ShipmentsRoute`: the customer lock (CNS-10), selection guards (CNS-12), show-selected-on-top, exit restore, and the "Direct only" chip (single-order). |
| **Changes (step 1)** | Scope: entering the mode lands on **Monitoring › Consolidation** and the other panels/tabs are hidden for the whole mode. The mode's CTA opens the editor instead of Review & Apply. |
| **Reused (step 2)** | `EditStopsView` + `stopsSandbox` (move, drag, Remove, Add Orders, dates, Evaluate), `AddOrdersModal`/`candidateOrders` as they are, `ViewRoutingModal` (New list only), `rerouteTenderList`, `pullExternalOrders` (server backstop for the 15872 block), and `buildConsolidatedShipment` + `applyConsolidation` for the write. |
| **Moved out of the Review page, then kept** (user, 2026-09-29) | (a) ~~The out-of-order stop validation~~ **dropped** (user, 2026-09-29): the same rule as LINX-15669, solved differently; order change's refuse-the-move is preferred. (b) **The Tendered Shipment Detected modal** (Remove / Discard / Cancel tender, with the Tender tab's Cancel mechanism and the concurrent-tender simulation), opened on Approve. |
| **Deleted** | The rest of `ConsolidationReviewRoute.jsx` (+ test, + `consolidation-review.css`), `consolidation/stopOrder.js` (+ test), `buildProposal` (keep `equipmentCapacity.js` for Utilization), and the route `/shipments/consolidate/review`. This supersedes Efrain's S161 Review & Apply page (VD 2249:46444); DEC-219's allow-then-fix validation is retired. |

---

## Rulings (user, 2026-09-29)

- **No Prior anything.** Consolidating creates a new C, so there is nothing to compare:
  - no Prior column, no Prior table in View Routing, no prior/new pairs, no Prior Cost or Direct Cost;
  - strip: **Distance, Gross Weight, Volume**, live;
  - All Stops row: **Consolidated Cost, Seed Equipment, Utilization**, then View Planning Dates.
- **After creation a C is treated like any other new O.**
  - It's filed by `planShipment`'s rule: Consolidation pool if consolidatable, else Hold. It is untendered, with status from `shipmentStatus.js`.
  - The planner lands on the Shipments list, where the C is pinned (S155) and **animated in** (user's idea, accepted; honours reduced motion).
  - Because it's a normal shipment, it gets the carrier list the planner evaluated. It is Evaluate's list, saved as the C's `shippingOptionList`; a new O has none today only because the prototype has no routing call (`planShipment.mjs:76,161`).
- **R1, the carrier list's source (my call; you said you don't know):** the first selected shipment's list, re-costed by the edited stops' miles, the same prototype stand-in as DEC-215. It's only a placeholder for the routing call.
- **R4:** the Review & Apply page is deleted, keeping (b) above. Efrain hears that his S161 page is retired.
- **R5 (Add Orders):** as order change, any of the customer's shipments. The 09-28 review `@06:06`: *"you can do the what-if scenario, you cannot finalize it."* An added order from a tendered shipment is what opens the Tendered Shipment Detected modal at Approve.
- **R6:** the 09-23 and 09-28 calls were spot-checked and nothing contradicts this plan. A full intake is still owed for canon.
- **R7 (user, 2026-09-29):** one rule for both screens: order change's LINX-15669 refusal. The move is never allowed. Consol's allow-then-fix validation is dropped, and order change is untouched.

Recorded, not re-opened: Dave (2026-09-17, CNS-08) allowed any Direct including Hold and exceptions. Jana's pool-only scope supersedes that per the user. The CNS entry names Dave's position as the previous state.

---

## Steps

Implementation waits until the parallel S164 session is finished. It is still editing `EditStopsView.jsx`, `edit-stops.css`, `ViewRoutingModal.jsx` and the Stops tab (audit fixes and padding), and this plan touches the same files. The strip starts from that session's final DEC-225 layout and drops everything prior. The strip keeps Distance, Gross Weight and Volume; the All Stops row keeps Consolidated Cost, Seed Equipment and Utilization.

### 1. Selection scoped to the pool (`ShipmentsRoute.jsx`)
- `enterConsolidate` lands on `monitoring` / `consolidation` instead of `exceptions` / `all`.
- While in the mode, hide the panel switcher and the other category tabs, the same way PGI/PGR are hidden today.
- Keep the `shipment-type: Direct` mode chip. Pool C rows stay unselectable and are edited through the row menu (step 4).
- The CTA navigates to `/shipments/consolidate/stops` with `state.rows`.
- The eligibility tender rule stays. Pool rows are untendered, so it is inert but harmless.

### 2. Sandbox from N sources (`stopsSandbox.js`)
- New pure `initFromSources(sources)`, where `sources = [{ row, detail }]` in selection order.
- It builds one sandbox with `prior: []` and `arrival` equal to the initial stops.
- Stops: every pickup, then every delivery (the CNS-11 default, Dave 09-17). Same-type stops at the same site merge through `placeOrder`'s `sameSite` rule. Customers own 4 ship-from sites (DEC-210), so shared pickups will be common.
- Stops start sequenced (the system organizes them, Jana `@25:34`).
- Keys are `src:<sell>:<stopSequence>`. `toDto` emits `sourceSellShipment` next to `sourceStopSequence`, and stays null for order change.

### 3. Editor host (`ConsolidateStopsRoute.jsx`, new; `EditStopsView.jsx`)
- The route fetches each source's detail (`useQueries`) and passes `EditStopsView` the following:
  - `initial` from `initFromSources`;
  - `orders` = the union of `orderDetails`;
  - a synthetic `orderChange` = `{ priorTenderList: [], newTenderList: anchor options, droppedCarriers: { new: anchor's } }`;
  - `summary.headerDistance` = the anchor's distance (the reroute baseline);
  - `consolidation.costs.newConsolidated` = the rank-1 of the re-routed list.
- `EditStopsView` gets one prop, `showPrior` (default true). With `false`:
  - no Prior panel and no collapse buttons;
  - the strip holds Distance, Gross Weight and Volume only;
  - the All Stops row holds Consolidated Cost, Seed Equipment and Utilization;
  - `ViewRoutingModal` has no Prior table;
  - confirm copy is passed in as a prop.
- **Stop sequence:** order change's refusal (R7), unchanged; no new prop.
- **Tendered Shipment Detected (b):** Approve first checks every source plus every added order's source for an active tender, then either opens the modal or proceeds.
  - The first-Approve concurrent-tender simulation stays.
  - *Remove* drops those orders back to pending, *Discard* returns to the mode without them, and *Cancel tender* uses `applyTenderAction`.
- Add Orders: `sellShipment` = the anchor. The other sources' orders are already excluded through `excludeOrderIds` (they're on stops).
- Remove works as in order change. An order still pending at Approve is not consolidated: its single-order source stays untouched in the pool.
- Crumbs: Shipments › Consolidate › Edit Shipment Stops. Cancel/X returns to the mode with the rows (the existing `backInModeWith`).

### 4. Row menu "Edit" on a pool C
Opens the same editor with `sources = [thatC]`. The server already reuses a single C source's ids (CNS-11/CNS-14). Removing one of its orders splits it through the C3 rule.

### 5. Write path (`consolidateShipments.mjs`, `consolidations.mjs`, `consolidationService.ts`)
- The body becomes `{ sellShipments, stops, externalOrders, tenderList }`.
- Server guards, at the one place every caller goes through:
  - every source must be `category = 'consolidation'` (400);
  - the result must hold ≥2 loads (CNS-14, 400);
  - one customer (existing check).
- Stops come from the DTO; the server re-checks the sequence (400 when it's invalid). Each stop's full fields are pulled from `(sourceSellShipment, sourceStopSequence)`, the multi-source version of `mergeStops`. A created stop keeps its DTO fields (C9).
- External orders go through `pullExternalOrders`, whose 15872 block is the server backstop for (b). An emptied source is removed, the existing behaviour.
- `shippingOptionList` = the posted re-routed list (R1). It is filed like a new O (`planShipment`'s consolidatable → pool, else Hold), untendered, with status from `shipmentStatus.js`.
- The mock runtime runs the same builder (one builder, both runtimes).

### 6. Delete and re-point
- Remove the files in the "Deleted" row above, plus the route in `App.jsx`.
- After Approve, the planner lands on the Shipments list, on the tab where the C was filed, with the S155 `createdShipment` pin and a new **land animation**. It honours `prefers-reduced-motion`, and the `web-motion-design` skill applies when it's built.
- Grep for `consolidate/review`, `buildProposal`, `reorderStops`, `invalidStopKeys` and `consolidateExit` callers.

### 7. Canon
- Consolidation decision log:
  - **CNS-18**: pool-only scope (previous: CNS-08 / Dave 09-17);
  - **CNS-19**: the order-change editor from New (supersedes the S161 review page and DEC-219);
  - **CNS-20**: a created C is treated like any new O. It carries the evaluated carrier list (adopts CNS-16) and is filed by the consolidatable rule; the planner lands on the list.
- Shipments decision log: the R7 outcome for order change (amends LINX-15669 handling if (a) is adopted there).
- Shipments decision log: DEC-219 marked superseded.
- `vault/10-domains/consolidation/consolidation.md` updated.
- The search vocabulary doesn't change, so no progression regen is needed.
- Archive `Order Change Sync.vtt` to vault-sources with the /analyze step, on the user's go.

---

## Execution
- **Spec:** one spec, `docs/superpowers/specs/2026-09-29-consolidation-via-order-change.md`, written in the main thread once R7 is answered.
- **Build:** two `implementer` agents on disjoint files.
  - **A (client):** steps 1–4 and 6.
  - **B (server + mock):** step 5.
- **Tests:**
  - `initFromSources` (same-site merge, pickup-first order, keys);
  - the builder with a DTO plus external orders;
  - the three 400 guards;
  - the editor in `showPrior={false}` (no Prior panel, out-of-order move refused, Evaluate → Approve → list with the pinned C);
  - Tendered Shipment Detected for an added order from a tendered shipment;
  - `consolidateMode.test.jsx` lands on the pool.
- **Browser click-through** on `dev:api`: pick 2–3 pool Directs, merge a shared pickup, add an external order, Remove one, Evaluate, then Approve.
  - The live Approve writes Neon, so ask first.
- **No reseed. One deploy** at the end, on the user's go, verified by grepping the live bundle.
