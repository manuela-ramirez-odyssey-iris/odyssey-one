---
title: Order change — consistency slice (C4, C5, C10, C11, C12, C19, C22)
date: 2026-09-29
session: S163
status: approved direction (user 2026-09-29: "spec the consistency slice, deploy after"); rulings DEC-206, DEC-215 applied
---

# Order change — consistency slice

Plan: `docs/superpowers/plans/2026-09-25-order-change-remaining.md` §C+ "Consistency", plus C4/C5 and C12 (DEC-215 ties C12 to C4). The goal: every number the consolidated order change shows agrees with every other, before and after Save (DEC-192), and the paths QA needs are reachable in the seed. **No new UI.** Paths are under `apps/odyssey-one/`. API = `api/_lib/shipments.mjs`, GEN = `tools/generate.mjs`.

Needs a **Neon reseed** (seed changes in T1/T2), which happens only on the user's go, with the deploy. Out of scope: C13, C15–C17, C20, C23 (the AC-gap slice); C14, C18 (on hold for design).

## T1 — C10: one weight/volume convention in the seed (GEN `buildConsolidationChange`)
The order update is already applied to the order (Jana 09-25 `@00:02:24`), so **the DB value is New and Prior = DB − delta**. `summaryChanges` already follows this (GEN `:3322`); the stop fields and the per-order compare run the other way.
- Stop `fields` (GEN ~`:3133`): `weight: { prior: st.grossWeightValue - sum('weight'), new: st.grossWeightValue }`, and the same for `volume` and `packageCount`.
- `orderComparisons` rows (GEN ~`:3244`): Gross Weight / Volume / Package Count become prior = own − delta, new = own. The deltas are 5–30% of the order's own value, so prior stays > 0; keep a `Math.max(1, …)` guard anyway.
- Zero new rnd/faker draws, so the draw order is unchanged.
- **Seed test** (the generator's existing test file; find it): for every consolidated order-change shipment:
  - `summaryChanges.grossWeight.new` = Σ `orderList` weights;
  - every changed stop's `fields.weight.new` = that stop's `grossWeightValue`;
  - every compare's Gross Weight `new` = the order's own weight.

## T2 — C22: seed reachability (GEN, id-keyed rnd only, zero faker draws)
- **Scenario B share:** the `':oc-notender'` gate (GEN ~`:1419`) goes from `0.03` to `0.10`. Today 5 of 74 consolidated order changes are Scenario B.
- **Dropped-carriers-only list:** for a third of the Scenario B consolidated rows (a new salted draw, `':oc-empty'`), the order change's `newTenderList` is `[]` and its carriers are appended to `droppedCarriers` with the same shape and reason vocabulary that buildOrderChange already uses for a dropped carrier. Read how `droppedCarriers` is built first and reuse it. Because rank 1 doesn't exist, `costs.newConsolidated` is null (GEN `:3367` already handles `selectedNew` undefined). LINX-15671 Scenario B "(or only dropped carriers if the list is empty)"; Jana 09-25 `@00:21:39`.
- **Line-level changes:** every changed order gets at least one changed line. In `orderLinePairs` (GEN ~`:3290`), the **first** line of an eligible order always flips. A line without `hazmatCode` flips `shippingClass` to another value from the generator's shipping-class vocabulary. Remaining lines keep today's 50% hazmat-only rule. Today 11 of 116 changed orders have a changed line.
- **Id check (mandatory):** capture the `sellShipment`/`odysseyShipmentIdentifier` list of `src/data/shipments.json` before, regenerate (`node tools/generate.mjs`), and diff. It must be empty. Report the new counts: Scenario B rows, empty-list rows, and changed orders with a changed line.

## T3 — C4 + C12 (DEC-206, DEC-215): one shared re-route function
New pure module `src/lib/orderChangeRouting.js`, imported by the client and the API (same precedent as `src/lib/shipmentStatus.js` and `src/utils/legMiles.js`).
- `stopDateToDisplay(long)`: **move** it here from API (`shipments.mjs`); the API imports it back. Long `"March 4, 2026 10:00 PST"` → short `"03/04/2026 10:00 PST"`.
- `applyStopDates(options, stops)`, where `stops` are normalized `{ type, date, lat, lng, timeZone }`: every option's `pickupDateTime` = the **first pickup** stop's date and `deliveryDateTime` = the **last delivery** stop's (short form). `pickupTZ`/`deliveryTZ` come from those stops' `timeZone` when present, else they stay unchanged.
- `rerouteTenderList(options, stops, baselineMiles)` = `applyStopDates` plus a cost scale:
  - `factor = totalMiles(stops) / baselineMiles` (from `src/utils/legMiles.js`). The factor is 1 when either value is null or 0, or when a leg can't be computed.
  - Each option: `baseRate' = round2(rateDetails.baseRate × factor)`, `totalCostAmount = baseRate' + Σ additionalCharges`, `rateAmount = baseRate'`, `rateDetails.{baseRate, apTotal, arTotal}` updated the way `withApTotal` (API) does it. Better, move `withApTotal` into this module and reuse it.
  - Carriers, ranks and statuses are untouched.
  - `ponytail:` comment: a stand-in for the routing engine the prototype lacks; the ceiling is linear-in-miles cost and no carrier re-selection; replace when routing exists.
- `baselineMiles` = `orderChange.consolidation.summaryChanges.distance?.new ?? detail.distanceMiles`: the distance the seeded new list was priced at.
- **Client:**
  - `ViewRoutingModal` shows `rerouteTenderList(newTenderList, stops, baseline)` for the New list. Edit Stops passes the sandbox stops (normalize `type`, `date`, `lat`, `lng`, `site?.timeZone`); the Stops tab passes the detail's stops.
  - The Prior list stays as it was: it is history.
  - The Stops-tab header's New Consolidated Cost reads the same rerouted rank-1 `totalCostAmount` (DEC-192: header = routing). Check `StopsTab.jsx` and the mapper for where it reads `costs.newConsolidated`, and compute it where it's rendered from the same call.
- **API:**
  - save-stops: compute `rerouteTenderList(orderChange.newTenderList, mergedStops, baseline)` once. Write it to `detail.orderChange.newTenderList` in the target's save (Scenario A's Direct review then shows it). Also hand it to Scenario B's `adoptNewTenderList` (pass `{ ...orderChange, newTenderList: rerouted }`).
  - approve-plan: the same, over the detail's own stops.
  - retender/bypass on a **consolidated** order change (the detail has `orderChange.consolidation`): after `adoptNewTenderList`, run `applyStopDates(rows, detailStops)`, so the inserted prior carrier also carries the stop dates (Jana 09-25 `@00:15:03–00:16:29`).
  - Direct order changes are untouched.
- **Tests:**
  - unit (`orderChangeRouting.test.js`): dates from first pickup / last delivery; factor 1 on a null baseline; cost scale with charges unchanged; ranks unchanged;
  - API fake-db: save-stops writes the rerouted list to `orderChange.newTenderList`, and Scenario B adopts it; approve-plan adopts rerouted dates;
  - client: the modal shows stop dates.

## T4 — C11: Save recomputes the header (API)
After save-stops, the target's detail has these rewritten in the same write, through one helper `recomputeReviewTotals(detail, orderList, stops, rerouted)`:
- `totalVolumeValue` = Σ `orderList[].volumeValue`;
- `distanceMiles` = `totalMiles(stops)` when it's computable, otherwise unchanged;
- `orderChange.consolidation.summaryChanges`:
  - `grossWeight.new` = Σ weights, `volume.new` = Σ volumes; the priors stay (they're the customer's pre-change values);
  - `distance` = `{ prior: <existing prior ?? old distanceMiles>, new: totalMiles }` when it's computable;
- `orderChange.consolidation.costs`: `newConsolidated` = rerouted rank-1 `totalCostAmount` (null when the list is empty); `newDirect` = Σ `orderList[].cost.directCostAmount` (verified present on seeded order records); `prior` unchanged.

Sources in a 15872 move get `totalVolumeValue` and `distanceMiles` recomputed; they have no review state to touch.

This removes the unexplained `--`: New Consolidated Cost is now a number after Save unless the list is genuinely empty. Test: fake-db save-stops. The written detail has the recomputed volume, distance, the summaryChanges `new` values and both costs.

## T5 — C19: list-row columns follow the stops (API)
One helper `rowFromStops(stops)` → `{ origin, destination, consignor, consignee, pickupDate, deliveryDate, pickupTs, deliveryTs }`, from the **first pickup** and **last delivery** stop. The formats are the ones `buildSplitShipment` already uses: origin `"City ST US 12345"`, short date, `tsFromDisplay`. `buildSplitShipment` switches to it.
- `buildSaveStopsQuery` also sets `origin`, `destination`, `consignor`, `consignee`, `pickup_date`, `delivery_date`, `pickup_ts`, `delivery_ts` from it. This covers the target and every source.
- A source left with no stops keeps its columns (it is hidden by T6 anyway).
- Check `search_index` for origin/consignor projections; if the target's changed, refresh its rows the way `buildSearchIndexQuery` writes them (delete + insert for that entity). If that's heavier than it looks, leave a `ponytail:` note and report it.
- Tests: query values include the recomputed columns; emptied source → columns untouched.

## T6 — C5 (DEC-202): an emptied shipment is hidden
A shipment with `order_count = '0'` (text column) is excluded from the Shipments list (`buildListQuery`), the tab counts (`buildCountsQuery`, `categoryCounts`) and global/attribute search over shipments (grep `api/_lib/search*.mjs` for the shipments query). The detail stays readable by id (`sellShipmentDetail` unchanged). Apply it in the one shared place if one exists (`scope()`?); otherwise add it to each query. Tests: query text contains the filter.

## Done when
- API: `node --test api/_lib/*.test.mjs` passes. Client: `npx vitest run` passes, apart from the known `src/utils/toast.test.js`. `npm run build:odyssey-one` passes.
- The generator has been rerun, `src/data/shipments.json` is regenerated, the id diff is empty, and the new counts are reported.
- `npm run progression:audit` is clean. Nothing in the search vocabulary should change; if it does, stop and report.
- **No reseed, no deploy, no DB contact.** The orchestrator asks the user.
- Nothing is staged or committed by implementers. The parallel session's uncommitted files (`src/routes/shipments/ConsolidationReviewRoute*`, `consolidation-review.css`, `src/routes/design-system/domain-usage.json`) are not touched.
