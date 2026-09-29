---
title: Order change — Save slice (C3, C6, C7, C8, C9, C21)
date: 2026-09-29
session: S163
status: approved direction (user 2026-09-29: "everything else ok go forward"); rulings N2/N3/N6 applied
---

# Order change — Save slice

Plan: `docs/superpowers/plans/2026-09-25-order-change-remaining.md` §C+ "Save slice". This spec fixes the correctness and data-loss gaps the S163 audit found in Edit Shipment Stops → Approve Changes (LINX-15671/15869/15872). **No new UI:** one tooltip reason, the confirm dialog's copy, and one error message. Paths are under `apps/odyssey-one/`. SB = `src/components/detail/order-change/stopsSandbox.js`, API = `api/_lib/shipments.mjs`, PS = `api/_lib/planShipment.mjs`.

Out of scope: C4, C5, C10–C13, C15–C17, C19–C20, C22–C23 (later slices); C14, C18 (on hold for design); no reseed, no deploy.

## T1 — C9: created stops keep their coordinates and time zone at Save (client + API)
- `toDto` (SB): add `lat: s.lat`, `lng: s.lng`, `timeZone: s.site?.timeZone` to each row. `placeOrder` already copies `lat`/`lng` from `at.site`, and the mapper's site carries `timeZone` (`mapSellShipmentOutToDetail.ts:74`).
- `mergeStops` (API): for each of `lat`, `lng`, `timeZone`, use `base.x ?? row.x`, the same precedence as `city`/`postal`. An existing stop keeps its own. The stored key names are `lat`, `lng`, `timeZone` (mapper `:205-206`, PS stop shape).
- Tests: `toDto` emits the three fields for a created stop; `mergeStops` keeps them for a created row (`sourceStopSequence: null`) and prefers `base` for an existing one.

## T2 — C7: a delivery-before-pickup order can't reach routing (sandbox)
- `isRoutable`: add `&& validSequence(sb.stops)`.
- `routeBlocker`: after `unsequenced` and before `undated`, return `'sequence'` when `!validSequence(sb.stops)`.
- Export `firstSequenceViolation(stops)`, which returns the first order id whose delivery stop comes before its pickup stop (or null). `validSequence` becomes `firstSequenceViolation(stops) == null`, so the rule lives in one place.
- `canReorderStop`: refuse a move only when it **breaks a valid sequence**: `validSequence(sb.stops) && !validSequence(next)`. When the current sequence is already invalid (a placement produced it), any move is allowed so the planner can repair it, and the arrows and drag stay consistent. Update the comment at SB `:243-247` to state this rule.
- `placeOrder`: a **new** pickup stop goes after the last pickup (today), **unless** the order already has a delivery stop at or before that index. Then it goes just before that delivery stop (LINX-15668 §2 "before the same order's delivery"). Deliveries are unchanged.
- `EditStopsView.jsx` Evaluate tooltip (the map at `:36`): `sequence` → `` `Order ${id} is delivered before it is picked up. Move its pickup stop above its delivery stop.` `` using `firstSequenceViolation`. If the map is static strings, compute this one reason at the call site (`:272`).
- The one-pickup-per-order model makes 15669's "all pickups on a multi-order delivery stop precede it" equivalent to the current per-order check. Leave a `ponytail:` note on `validSequence` saying so.
- Tests (sandbox):
  - The S163 repro: stops P1(O1) D1(O1) P2(O2) D2(O2); `addToStop` O3 with shipFrom = P2's site and shipTo = D1's site. Expect `isRoutable` false, `routeBlocker` `'sequence'`, and `firstSequenceViolation` `'O3'`. Moving P2 above D1 then makes it routable.
  - `canReorderStop` still refuses a move that breaks a valid sequence.
  - A new P? for an order whose delivery sits before the last pickup is inserted before that delivery.
- UI test: the Evaluate tooltip shows the sequence reason.

## T3 — C8: the server refuses an `externalOrders` body it can't honour (API)
In `resolveOrderChange` save-stops, before `pullExternalOrders`: every `externalOrders[].orderNumber` must be in `onStops`. Otherwise respond 400 `externalOrders must all be placed on stops: <ids>` with nothing written. The client already filters (`EditStopsView.jsx:316`), so this only guards the server. Test: a body with an external order not on any stop → 400, and no `BEGIN` issued (the fake db records no queries past the detail read).

## T4 — C6: the move block reads the live tender state (API)
Tender-tab actions write only the `tenders` table (`saveTender`), so `shipments.tender_status` is the seeded value.
- `buildSourceShipmentsQuery`: add `EXISTS (SELECT 1 FROM tenders t WHERE t.shipment_sell_id = shipments.sell_shipment AND t.status = ANY($2)) AS "activeTender"`, with `$2 = MOVE_BLOCKED_TENDER`.
- `pullExternalOrders`: blocked also when `src.activeTender`. Keep the `tenderStatus` check too (OR), so a seeded status and a live tender row both block.
- The **target's** Scenario A/B still comes from `body.priorTenderStatus`. The target's tendering is locked for the whole review (LINX-14509), so its seeded prior status can't drift. Say so in a comment. No change.
- Tests: a source whose row says `tender_status = ''` but whose tenders include a `Sent` row is blocked with `MOVE_MESSAGE`. The query text contains the `EXISTS` and passes the list.

## T5 — C3: an order left pending becomes its own shipment (API, DEC-205, ruling N3)
At save-stops, each order that was on the target before the save and is not on the final stops (`detail.orderList` minus `onStops`, external orders excluded) becomes a **new single-order Direct shipment** in the same transaction.

**Builder.** Add `buildSplitShipment({ source, orderRec, orderSerialId, now })` to PS, next to `buildDirectShipment`, returning the same `{ row, detail, pickupTs, deliveryTs }` shape so `buildInsertShipmentQuery` / `buildLinkOrderQuery` / `buildSearchIndexQuery` take it unchanged. It is sourced from the **consolidated shipment's pre-save state**, not from a `ManualOrder`: only 65% of seeded orders carry `manual_order`, and the stops already hold the full sites.
- `source` = `{ row, detail }` of the target before the save: `detail` from the existing read; `row` from a new `SELECT customer_id, customer_name, planning_type, equipment_code, equipment, mode FROM shipments WHERE sell_shipment = $1`, done in the same pre-transaction read.
- `ids = idsFor(orderSerialId)`: `orders.id`, read in one pre-transaction `SELECT id, order_number FROM orders WHERE order_number = ANY($1)`.
- **Stops:** the order's pickup stop and delivery stop from `source.detail.shipmentStopList` (the stops whose `orderIds` include it), through `mergeStops({ ...source.detail, orderList: [orderRec] }, rows)` with rows `{ stopSequence: 1|2, stopType, orderIds: [id], sourceStopSequence }`. The sites (address, lat/lng, timeZone, dates) come from the old stops; the totals are this order's own.
- **Row:**
  - `computeListAggregates([orderRec])`;
  - origin/destination/pickup/delivery strings in the seeded row's shape (read one seeded row's `origin` / `pickup_date` format, and the `pickup_ts` conversion via PS's `TZ_OFFSETS`);
  - customer, planning type, equipment and mode copied from `source.row`;
  - `scac`, `pro`, `seal` null; `tenderStatus` `''`; `apFreightCost` null;
  - `panel: 'monitoring'`, `category = orderRec.consolidatable === false ? 'hold' : 'consolidation'` (R6; verify the field name on a seeded `orderList` record; `consolidatableOf`'s default is Y);
  - `shipmentStatus = shipmentStatusFor(...)`, `validationMessage` null.
- **Detail:**
  - `buildDirectShipment`'s detail skeleton, with `orderList: [orderRec]`, the two stops, `shipmentType: 'Direct'`, `numberOfStops: 2`, `totalVolumeValue` = the order's volume;
  - `shippingOptionList: []`, `droppedCarrierList: []` (**N3: no carrier list until planned**);
  - no `orderChange`;
  - `historyList` = PS's two entries, the first reading `Buy Shipment … and Sell Shipment … created successfully for Order <id>, removed from shipment <source odysseyShipmentIdentifier> during order change review.`
- **Id reuse.** The band is keyed by `orders.id`, so an order split twice mints the same sell id. The earlier row can only be an emptied shell (its order has since moved). Before the insert, run `DELETE FROM search_index WHERE domain = 'shipments' AND entity_id = $1` and `DELETE FROM shipments WHERE sell_shipment = $1 AND order_count = '0'`. Check the `order_count` column type in `001_schema.sql` and compare accordingly. If a non-empty row somehow holds the id, the INSERT's PK violation rolls back the whole save. That is acceptable, and a comment should say so.
- **Writes, inside the existing transaction, after the target's save:** delete the stale shell (above), then `buildInsertShipmentQuery`, `buildLinkOrderQuery(orderNumber, newSell)` (this also sets `order_status = 'Planned Shipment'`), `buildSearchIndexQuery`.
- **Client copy.** The confirm body (`EditStopsView.jsx:42`) says pending orders "will be removed". Change it to: *"Orders left in Orders Pending To Assign will each be moved to a new shipment of their own."* Keep the rest of the VD sentence. DEC-205 is the source. Update its test.
- Tests (`shipments.test.mjs`, fake db):
  - one pending order produces the INSERT with sell `26000000 + id`, category per the flag, empty tender list, and the order link;
  - two pending orders produce two shipments;
  - zero pending issues no extra queries;
  - the stale-shell delete runs before the insert;
  - a rollback on insert failure leaves nothing committed.
- `buildSplitShipment` unit test: stops keep the source sites' coordinates and zone, and the weight equals the order's.

## T6 — C21: order-change Save is live-only (client, ruling N6)
`shipmentService.ts` `resolveOrderChange`: outside live mode, **throw** `new Error('Order change needs the live API: run with the deployed or local API to save this change.')` instead of returning. The existing `saveError` Alert (Edit Stops modal) and the approve paths (`useApproveOrderChange`) must surface it and must not navigate. Check both callers; the Stops-tab Approve Plan path must also show it (find where its errors render; if nowhere, route it to the same Alert pattern the Stops tab already uses for errors, or a toast if that's what the tab uses). Test: mock mode, Approve → the error shows and no navigation happens.

## Also: ruling N2 (C11 subset, one line, same slice)
After a save leaves the target with one order, `buildSaveStopsQuery` already sets the row's `shipment_type` to Direct. Also write `detail.shipmentType` to the same value, via one more `jsonb_set` on the target's `detailSql`, from `computeListAggregates(orderList).shipmentType`. This applies to target and source alike. Test: the query text sets `{shipmentType}`.

## Done when
- `npx vitest run src/components/detail src/routes/shipments api src/lib` passes, with the new tests above.
- `node --test api/_lib/*.test.mjs` passes, if that's how the API tests run (check `package.json`).
- The build (`npm run build:odyssey-one` from the root) passes.
- No write to Neon during development. The fake-db tests are the proof. The browser check against live Neon happens only on the user's go.
- Commits tagged `S163:`, staging only the files this spec touches. Unrelated uncommitted changes in `src/routes/shipments/ConsolidationReviewRoute*`, `consolidation-review.css` and `domain-usage.json` belong to a parallel session: **do not stage, edit or revert them.**
