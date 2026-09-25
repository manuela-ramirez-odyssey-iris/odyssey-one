---
title: Consolidated order change — Jana walkthrough fixes (DEC-191…199)
date: 2026-09-24
session: S159
status: draft
---

# Consolidated order change — Jana walkthrough fixes

Source: `vault/10-domains/shipments/order-change.md` §10b (Jana walkthrough 2026-09-24 + user rulings), `decisions/decision-log.md` DEC-191…DEC-199.
Halted (do not touch): View Routing new window (OC-open-24), tender-sent add timing (OC-open-25), post-approval routing/planning/finalize flow (OC-open-26).

Two waves. **Wave A** is UI over data the DB already holds, and ships without a reseed. **Wave B** changes the seed so every number on this feature comes from one DB source. It needs a **Neon reseed** (explicit user permission, id-stability check).

## Wave A — UI only (no seed change)

### A1. Affected Orders on pickup stops only (DEC-191)
`StopsTab.jsx` `ReviewStopContent`: render the `stops-item__affected` aside only when `isPickup`. Keep the layout: delivery stops keep an empty aside of the same width so the columns stay aligned. Test: a delivery stop with a changed order shows no Affected link.

### A2. System placement, no stop picker (DEC-193)
- `stopsSandbox.js` `addToStop(sb, id, orders)`: drop the `stopKey` param. Both legs always go through `placeOrder` (same type + same location → join, else new `P?`/`D?`). Pickup/delivery never cross (already enforced by `placeOrder`'s type match).
- `EditStopsView.jsx` pending row: replace the `ActionMenu` with a plain `Button variant="secondary"` "Add". No icon, per DEC-194's no-icon rule applied to the pair.
- Tests: the existing `addToStop` stop-key cases are rewritten. A new-location order yields `P?` + `D?`. A same-location order joins the existing stop.
- Canon: DEC-140's "buffer pool" wording is superseded by DEC-193 (already logged).

### A3. "Move To Pending" → "Set Aside", no icon (DEC-194)
`EditStopsView.jsx`: label + both buttons lose `icon`. `LAST_ORDER_TOOLTIP` unchanged. Tests are updated by label.

### A4. A stop shows only its own date (DEC-195)
`EditStopsView.jsx` fields: pickup → "Pickup Date", delivery → "Delivery Date", one field. The Distance field moves out of the grid (A6).

### A5. Prior | New side by side, no toggle, nothing collapsible (DEC-197)
- Remove the `ButtonToggle` + `view` state. The body becomes three columns: **Prior** (read-only timeline of `sb.prior`, Removed/Moved badges from `priorDiff`) · **New** (the editable timeline) · **Orders Pending To Assign**.
- Width: the pending column drops from 391px to ~300px, and stop cards go denser (fields grid 2 → 1 column in Prior). Prior is always visible, including before any edit (it equals New until the first change).
- Head metrics show New values with prior diffs, as today.
- Tests: both timelines render. Prior carries no move/set-aside controls.

### A6. Distance per leg (DEC-198), UI half
- Between consecutive stops, a leg label ("412 mi") on the rail connector. The first stop has no leg.
- Legs + header total recompute from the current `sb.stops` order on every move/place.
- Distance function: `legMiles(a, b)` from stop coordinates. **Needs coordinates on stops (B2).** Until B2 lands, the leg reads `--` and the total keeps today's source. No invented numbers.

### A7. Editable stop date/time + out-of-window flags (DEC-199, OC-open-13)
- Each stop card's own date becomes `DatePicker` + `TimePicker` (`@odyssey/ui`), in the New timeline only. The sandbox gets `setStopDate(sb, key, value)`, which sets `dirty`, clears `routed`, and flows to `toDto().scheduledDateTime` (already persisted by `save-stops`).
- Flag: for each order on a pickup stop, a stop date outside `[earliestPickup, latestPickup]` gets a warning badge on that order row ("Outside planning window", tooltip names the window). Delivery stops check `[earliestDelivery, latestDelivery]`. **Flag, never block.**
- `PlanningDatesModal` receives the same per-order violations and highlights the missed bound cells.
- Order planning dates are never editable.
- Pure `windowViolations(sb, orders)` in the sandbox + tests (inside, before, after, a bound missing).

### A8. Per-order compare: Direct field set, line blocks (DEC-196), UI half
- `OrderCompareModal` renders the Changed / Unchanged bands with **line-level fields grouped per order line** (a "Line 001", "Line 002" group header in each band). Each line carries its own changed marker.
- Line values come from the order's own `orderLines` (already in the DB: hazmatCode, flashPoint, itemCode, boilingPoint…). Prior = new for lines until B3 seeds line changes. That's truthful, because no line change exists in the data.
- Field set: whatever B3 seeds. Until then, today's 7 rows + the line blocks.

## Wave B — coherent, DB-sourced values (reseed required)

One rule: **every number is computed once in the seed from the same stops/orders/tender list, and the UI reads, never re-derives, except A6/A7's live sandbox recomputation, which uses the same function the seed used.**

### B1. Costs (DEC-192)
In `buildConsolidationChange`:
- `costs.newConsolidated` = the **new tender list's selected carrier** `totalCostAmount` (the row View Routing shows). The random factor is removed.
- `costs.prior` = the prior accepted/sent row's `totalCostAmount` (same basis; closes OC-open-2's base-vs-total mismatch for this surface).
- `costs.newDirect` = the sum of each order's own direct-lane cost (`orderList[].cost.directCostAmount`, already seeded).
- `locationChange` keeps `newConsolidated: null` (routing not re-run), per LINX-15438.

### B2. Coordinates + distances (DEC-198)
- `data-pools.mjs` LOCATIONS gains static `lat`/`lng` (a constant table, **zero RNG draws**, so no id shift).
- Stops carry `lat`/`lng`. `legMiles` = haversine × 1.2 road factor (ponytail: straight-line estimate; upgrade path = a real mileage source, PC*Miler per `distanceSource`).
- Shipment `distanceMiles`, each routing option's `distanceMiles` and `summaryChanges.distance` are all computed with `legMiles` over the stop sequence, so the header, routing and legs agree.
- One shared module (`src/utils/legMiles.js`, imported by `tools/generate.mjs`), so seed and sandbox can't disagree.

### B3. Per-order comparison rows (DEC-196)
`orderComparisons[id]` grows to the Direct field set (Pickup/Delivery Date, Gross Weight, Package Count, Volume, Incoterm, Ship Direction, Seed Equipment, Distance, Distance Source, Network Leverage, Order Requested Date, Bill To, Freight Terms, Pickup/Delivery Appointment, Ship From/To), sourced from that order's own record, plus a per-line hazmat pair list built from `orderLines` (id-keyed `rnd` only; one changed field on some lines so the path is reachable). Closes OC-open-12.

### B3b. Found in the browser check (live 25412375)
- Stops are scheduled **outside their own orders' windows**: order windows are seeded in CST, stops in local zones, and e.g. a 14:00 EST pickup falls after the order's 11:30 CST latest. The seed must place each stop's `scheduledDateTime` inside the window of every order on it, so a flag only appears after a planner edit.
- The editor header's Gross Weight (51,498 LB, summed from the order records) disagrees with the KPI strip's New value (53,812 LB, from `summaryChanges`). One source: `summaryChanges` must equal the sum of the changed orders' own records.

- A location change lives only in `orderChange.consolidation.stopChanges`; the order's own `origin`/`destination` still hold the old site. Setting such an order aside and adding it back puts it at the OLD site. The seed must write the new site onto the order record too.
- Order `origin.address1` differs from its stop's `address1` for the same site: one address per site.

### B5. List aggregates follow a move (OC-open-22, user 2026-09-25). No reseed needed
`api/_lib/shipments.mjs` `buildSaveStopsQuery` already writes `detail`, `orders` and `order_count`. The same UPDATE (target AND every source, same transaction) must also rewrite the list columns derived from the order roster, recomputed from the resulting `orderList` and stops exactly as `tools/generate.mjs` derives them for the row (~L2195–2260):
- `gross_weight` = Σ order gross weight, in the generator's `String(n)` format.
- `load_count` = Σ order line counts.
- `po_numbers`, `pickup_numbers` = the orders' own values, same order and dedupe as the generator.
- `shipment_type` = `'Consolidation'` when more than one order, else `'Direct'` (generator L2201).
- Leave origin/destination/dates alone (the stops' first/last are the planner's, and the row's date columns are already out of scope for this story).
Tests: extend `shipments.test.mjs`. The query carries the recomputed values for a target that gained an order AND a source that lost one.

### B6. Block a move that would empty its source (OC-open-23, user 2026-09-25). No reseed needed
LINX-15872 never says what happens when a source loses every order. User ruling: **block it at add**, same pattern as OC-open-11's blocked rows.
- `api/_lib/candidateOrders.mjs` `buildCandidateRows`: a row is also `blocked` when its source shipment carries one order (`ordersInShipment.length === 1`). Add `blockReason: 'status' | 'last-order'` so the tooltip can say which. New constant `LAST_ORDER_MOVE_TOOLTIP = 'This order cannot be moved: it is the only order on its shipment.'`. `AddOrdersModal` picks the tooltip by `blockReason`.
- Multi-pick can still empty a multi-order source (all its orders picked together). The server is the backstop: `pullExternalOrders` rejects when the picks cover **every** order of a source, 400 with `Order impacted: …`, nothing written (the same shape as the status block).
- Measured consequence: 971 of 4,536 mock orders (21%) sit on single-order shipments and will read greyed.
Tests: candidateOrders (single-order source blocked, reason set), shipments (all-orders-of-a-source pick → 400, no BEGIN), AddOrdersModal (tooltip by reason).

### B4. Reseed + verification
- Regenerate. Diff shipment/order **ids** before vs after (must be identical). Reseed Neon. **Explicit user go needed for the reseed.**
- Probe 3 consolidated shipments live: the header cost equals View Routing's selected row, the header distance equals the sum of legs, and each compare modal has line blocks.

### Wave B hard constraints (every generator task)
- **Zero new faker draws, zero removed ones.** Values that must change but come from a faker draw (stop `address1`, B3b) keep the draw and discard the value (S151's accessorials trick). New randomness uses only the function's own id-keyed `rnd` (`':occ'`).
- **Id stability is verified, not argued:** regenerate, then diff every `sellShipment`/`buyShipment`/order number against the pre-change dataset. The diff must be empty.
- `data-pools.mjs` is a data migration (its header says so). Adding `lat`/`lng` is additive, and `seed.mjs` `locations` inserts stay unchanged unless a column exists.
- The UI reads the seeded numbers. The only live recomputation is the sandbox's (A6 legs/total, A7 flags), and it imports the same `legMiles` the seed uses.
- Out of scope: OC-open-20 (awaiting the user), 19/24/25/26 (halted).

## Order of work (updated 2026-09-25, S160)
Wave A shipped in S159. Remaining work, as two parallel tracks over disjoint files:
- **Track 1 (API/UI, no reseed):** B5 + B6. Files: `api/_lib/shipments.mjs`, `api/_lib/candidateOrders.mjs`, `AddOrdersModal.jsx` + their tests.
- **Track 2 (generator + reseed):** B1 → B2 (incl. A6 wiring in `stopsSandbox.js`/`EditStopsView.jsx`) → B3 → B3b, then B4. Files: `tools/generate.mjs`, `tools/data-pools.mjs`, new `src/utils/legMiles.js`, the order-change UI that reads the new fields.

## Order of work (original, S159)
A1–A5 (small, independent) → A7 → A8 → A6 UI → **[user go: reseed]** → B1–B3 → B4.
Every step: `npx vitest run` for touched files; the app is run once at the end of each wave.
