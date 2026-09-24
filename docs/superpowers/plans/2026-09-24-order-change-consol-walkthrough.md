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

### B4. Reseed + verification
- Regenerate. Diff shipment/order **ids** before vs after (must be identical). Reseed Neon. **Explicit user go needed for the reseed.**
- Probe 3 consolidated shipments live: the header cost equals View Routing's selected row, the header distance equals the sum of legs, and each compare modal has line blocks.

## Order of work
A1–A5 (small, independent) → A7 → A8 → A6 UI → **[user go: reseed]** → B1–B3 → B4.
Every step: `npx vitest run` for touched files; the app is run once at the end of each wave.
