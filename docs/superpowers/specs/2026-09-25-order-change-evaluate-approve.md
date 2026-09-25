---
title: Order change — Evaluate → Approve on both review screens, and the new tender list actually becomes current
date: 2026-09-25
session: S160
status: draft — awaiting user approval
plan: docs/superpowers/plans/2026-09-25-order-change-remaining.md (C0, C1, C2)
decisions: DEC-200, DEC-207 (vault/10-domains/shipments/decisions/decision-log.md)
---

# Evaluate → Approve, and the new list becomes current

Written by Opus from a code map (file:line claims verified where they carry a decision). Implementation: Sonnet, one task at a time, spec review then quality review, then a browser check on local (`localhost:5199`, local API, Neon). **No deploy.**

## What already exists (don't rebuild)
- **Scenario A/B navigation after a consolidated save exists** (`OrderChangeEditStopsRoute.jsx:83-101`).
  - Active prior tender: `openSheet('/shipments/order-change/:id', { replace: true })`, the Direct decision screen.
  - Otherwise: `closeSheet('/shipments', { requestedTab: { key: 'routing' } … })`, the Tender tab.
  - The server's `save-stops` already refiles Scenario B (`api/_lib/shipments.mjs:609-613`).
- **The Direct decision screen renders for a consolidated shipment unchanged.** The seed builds the Direct payload for every order-change shipment (`generate.mjs:1425`).
- **`ViewRoutingModal`** (`ModalMedium`, a `footer` slot, reads the seeded `newTenderList`/`priorTenderList`/`droppedCarriers.new`).
- **`ConfirmDialog`**: "Approve Shipment Change" (`EditStopsView.jsx:434-446`).
- **`newOption.rank`** already carries the prior carrier's rank in the new list, including the equipment-group insertion rank when routing didn't return it (`generate.mjs:2961`, `insertionRank` `:2745`).

## The gap this spec closes besides C0
**No resolution ever makes the new tender list current.** Nothing writes `newTenderList` into `tenders`/`shippingOptionList`. After Re-tender, Bypass, Cancel or a Scenario-B save, the Tender tab still shows the **prior** list, and only the prior carrier's `rateAmount` changes (`buildOrderChangeCostQuery`). LINX-14510/14514/15671 all say the new routing result becomes the tender list ("V2"), with the prior kept as history ("V1"). This affects **Direct and consolidated** alike.

---

## T1. Sandbox (`src/components/detail/order-change/stopsSandbox.js`)
1. **A Prior that is really prior** (user default, 2026-09-25). `initSandbox` snapshots `prior` after the relocation loop (`:165-166`), so Prior shows the moved order already at its `P?`. Changes:
   - Take `prior` from `sbStops` **before** the loop, with empty stops removed.
   - Keep a second snapshot, `arrival`, where `prior` is taken today (post-relocation).
   - "Did the planner change anything" (`priorDiff`'s planner-change marks, the amber marks from S143) compares against **`arrival`**. The Prior column renders **`prior`**.
   - The customer's relocation shows in Prior as the order's original stop. Stop badges on the New side follow the existing customer-change styling (purple), never the planner's amber.
2. **Keep here** (user default). New `confirmStop(sb, key)` clears `unsequenced` on that stop without moving it and marks the sandbox `dirty`. No-op on a sequenced stop.
3. **The created stop's default date fits every order on it** (user default). When `placeOrder` joins an order to a `new:*` stop the planner hasn't dated by hand (track a `dateEdited` flag set by `setStopDate`), recompute the default:
   - the **latest** of its orders' earliest bound (pickup: `earliestPickup`; delivery: `earliestDelivery`);
   - kept only if it is ≤ the **earliest** of their latest bounds;
   - otherwise keep today's first-order default (the flag then shows, truthfully).
   - Same zone formatting as `defaultsFor`.
4. **Remove the `routed` state.** Delete `markRouted` and every `routed:` assignment. The gate is now only `isRoutable` (no `?`, every stop dated).
5. `isRoutable`'s reason: export `routeBlocker(sb)` returning `'unsequenced' | 'undated' | null` for the Evaluate tooltip.

Tests: prior vs arrival on a location-change fixture (Prior has the original stop; New has `P?`; no planner-change mark on arrival); `confirmStop`; the joint default date inside both windows, and fallback when disjoint; `routeBlocker`.

## T2. Edit Shipment Stops UI (`EditStopsView.jsx`, `ViewRoutingModal.jsx`)
- Footer (`StepperButtonsFooter`, `:403-410`): `cancelLabel="Cancel"`, `primaryLabel="Evaluate"`, `primaryDisabled={!isRoutable(sb) || saving}`. When disabled, a tooltip from `routeBlocker`:
  - unsequenced: *"Place every P? / D? stop first"* (today's copy);
  - undated: *"Set a date on every stop"*.
  
  `onPrimary` opens the routing modal.
- **Remove** the separate *View Routing* button (`:359-365`) and `handleViewRouting`.
- `ViewRoutingModal` gains optional `footer` props:
  - `secondaryLabel`/`onSecondary` and `primaryLabel`/`onPrimary`, rendered with `ModalFooter type="confirm"` (`cancelLabel`/`saveLabel`);
  - with neither passed, no footer (the Stops-tab read-only use stays byte-identical until T3 changes it).
  - In Edit Stops: **Keep Editing** (closes) and **Approve Changes**, which opens the existing ConfirmDialog; confirming calls `onApprove(toDto(sb), externalOrdersOnStops)` exactly as today.
- **Keep here:** on a `P?`/`D?` stop in the New timeline, a small secondary text button **Keep here** beside the arrows. It calls `confirmStop`, and the stop animates like a move (pulse only, no slide).
- **Prior column** renders `sb.prior` (T1.1).
- The All Stops distance total uses the app's number formatter with a thousands separator (`2,305.10 mi`, like the header).
- While the approve mutation runs: the modal's primary shows the loading state and both buttons are disabled. On error, the modal stays open and shows the existing `saveError` Alert inside the modal body (the planner is still "on the Order Change Review screen", per 15872).

Tests: the Evaluate gate and its tooltip reasons; Evaluate → modal → Approve Changes → confirm → `onApprove` payload; Keep Editing closes with state intact; no View Routing button; Keep here; the Prior column shows the pre-change stop.

## T3. Stops-tab review (`src/components/detail/StopsTab.jsx`) + API `approve-plan`
- Buttons:
  - **Edit Shipment Stops** (unchanged);
  - **Evaluate** (primary) replaces both *View Routing* (`:242-251`) and the *Approve Plan* stub (`:224`, `ComingSoon`). Keep *View Planning Dates*.
- Evaluate's existing block: disabled while `c.locationChange` with *"Finalize stop changes in Edit Shipment Stops first"* (LINX-15438: a location change can't be approved without re-sequencing).
- Evaluate opens `ViewRoutingModal` with **Keep Reviewing** / **Approve Plan**. Approve Plan opens a ConfirmDialog:
  - title *"Approve Plan"*;
  - body *"The shipment will be approved with the order changes as shown."*;
  - confirm *"Approve"*.
- On confirm, the same A/B branch as `OrderChangeEditStopsRoute.handleApprove`. **Extract that branch into one shared helper** (e.g. `useApproveOrderChange`), so both screens use one code path:
  - **A** (prior tender active): `openSheet` the Direct decision screen (no server call; the stops are unchanged).
  - **B**: `resolve.mutate({ action: 'approve-plan', priorTenderStatus })`, then `closeSheet` to the Tender tab.
- API: `OC_OUTCOMES['approve-plan']` = `save-stops`' outcome for a non-active prior. It writes the resolution `{ action: 'approve-plan', resolvedAt }` and then **T4's adoption**. It writes no stops.

Tests: StopsTab (Evaluate replaces both buttons, the location-change block, the modal footer); the helper's A/B; API `approve-plan` (400 for unknown stays; writes the resolution plus adoption).

## T4. The new tender list becomes current (all resolutions, Direct and consolidated)
In `api/_lib/shipments.mjs`, inside one transaction (reuse the save-stops client pattern: one checked-out client, BEGIN/COMMIT/ROLLBACK), for **retender, bypass, cancel, approve-plan, and save-stops Scenario B**:
1. Replace the shipment's `tenders` rows with `detail.orderChange.newTenderList`, in rank order.
2. **Retender / bypass:**
   - The prior carrier's row: if `newTenderList` lacks `prior.scac`, insert the prior row at `newOption.rank` (the seed's insertion rank), shifting later ranks.
   - Set its `rateAmount` (and `tenders.rate_amount`) to the chosen `cost.amount`.
   - Set its `status`: retender → `Sent`; bypass → the prior status (the `OC_OUTCOMES` rule).
   - Every other row: `status` `''`.
3. **Cancel:** the new list is current and nothing is tendered. The prior carrier appears only if routing returned it, with status `Cancelled` (LINX-14514: cancel lands on Tender Review with the new options).
4. **Scenario B / approve-plan:** the new list is current and nothing is tendered (15671: "No tender action shall be automatically initiated").
5. `detail.shippingOptionList` is set to the same rows (the mock and live read paths agree).
6. `priorTenderList` stays in `detail.orderChange` untouched: it is V1.
7. The existing `buildOrderChangeCostQuery` becomes unnecessary (step 2 covers it). Delete it and its call.

Routing History: `deriveRoutingHistory`'s `orderChangeVersion()` already renders `priorTenderList` as **Version 1**. Verify it still does after resolution, and that the Tender tab now shows the new list. **How V1 and V2 appear on screen is Q1 below.**

Tests (API): each action's resulting tender rows (the insertion case, the cost applied, statuses); rollback on a failing write; the mock path (non-live `resolveOrderChange` is a no-op today, so the mock Tender tab won't change; acceptable, local runs live).

## Browser check (after T4, on local)
Evaluate on each screen; Keep here; Prior column; the approve paths:
- Stops tab Approve Plan on a Scenario-B shipment;
- Edit Stops Approve on a Scenario-A shipment → the Direct screen → Re-tender;
- Direct (non-consolidated) Re-tender.

After each, the Tender tab shows the **new** list with the right carrier status and cost, and Routing History shows the prior list as Version 1.

## Out of scope
C3 (removed orders' own shipment), C4 (tender dates from stops), C5 (hide emptied), D1–D5, statuses, deploy.

## Open question for the user
**Q1. Where do V1 and V2 show?** LINX-15671 Scenario B says the Tender screen shows *"V2 (new) and V1 (prior). V2 is on the top"*.
- **Default:** the Tender tab shows **V2 only** (the current list, the one tendering acts on), and **Routing History** shows V1. It exists for exactly that, and it's already built.
- **Alternative:** the Tender tab stacks V2 above a collapsed, read-only V1.
