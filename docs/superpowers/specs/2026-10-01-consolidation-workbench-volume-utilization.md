---
domain: consolidation
type: spec
tags: [consolidation, shipments-grid]
date: 2026-10-01
status: approved — user 2026-10-01
---

# Spec — workbench: Total Volume, Utilization %, location-ID tooltips

Source: Ramesh's sheet rows #4/#5/#6 (LINX-15786 BR II). User rulings 2026-10-01:
- *"you can introduce Total Volume, Weight Utilization %, Volume Utilization % for when consolidation is active"*
- *"Origin/Destination Location ID … could exist inside and ids can be shown by hovering through tooltip"*

Builds on `2026-10-01-consolidation-workbench-easy-fixes.md` (already in the working tree). Paths are under `apps/odyssey-one/`. Session S165.

**Not here:** Earliest/Latest windows, Hazmat, SCAC-from-order (not requested yet). Every filter/refresh item stays halted.

## V1. Data on the list row, consolidation mode only

- Four new row fields:
  - `totalVolume`: the sum of the shipment's orders' `orders.volume->>'value'`, numeric. The unit comes from `orders.volume->>'uom'` (seed: `cbf`). Display it as cuft.
  - `originLocationId`: `stops.location_id` of the lowest-sequence pickup.
  - `destinationLocationId`: `stops.location_id` of the highest-sequence delivery.
  - `null` whenever there's no data.
- **Only computed when the request is the consolidation pool.** Pass a list param, e.g. `extras: 'consolidation'`, which the route sends only while `inMode`. Other tabs pay nothing.
- **Performance:** compute the extras over the **paged** rows only. Wrap the existing paged SELECT as a subquery and join `LATERAL` aggregates in an outer SELECT. Never use a SELECT-list subquery under `count(*) OVER()`, because that evaluates for every matching row.
  - `orders.shipment_sell_id` has no index. Join on it only for the ≤ page-size rows.
  - `stops` is indexed (`stops_shipment`).
- Mock `gridService.ts`: the same fields, derived from `orders.json` (volume by `shipment.orders`) and `public/details` / existing detail data for the location IDs, if the mock has them. Otherwise `null`. The mock is a stand-in, so parity of *semantics*, not values (`project_orders_seed_vs_neon_drift`).
- `mapShipmentErrorRow`: pass the fields through, and keep the `NOT_IN_LIST_DTO` test honest.

## V2. Columns (consolidation mode set only)

- Three new COLUMN_CONFIG entries:
  - `totalVolume` "Total Volume": `12,345 cuft`, `--` if null;
  - `weightUtilization` "Weight Utilization %": computed client-side;
  - `volumeUtilization` "Volume Utilization %": computed client-side.
- Utilization = `utilizationPct(total, capacityFor(equipmentCode).weightLb | .volumeCuft)` from `src/consolidation/equipmentCapacity.js`. Weight comes from `grossWeight`, numeric only; an edited `"12,345 LB"` string parses its number, and a KG value converts to LB. Volume utilization is `--` when there's no volume (LINX-15786: "may be blank").
- **Placeholder capacities:** the header tooltip, or the column's existing tooltip mechanism, says *"Based on placeholder equipment capacities"*. Pick whichever exists; don't build a new header-tooltip feature.
- **Not sortable** (computed). Add them to the unsortable side of the SORTABLE_KEYS drift test.
- They're in the column catalog with `consolidationOnly: true`, or the equivalent the ColumnPanel already supports. They aren't offered outside the mode, because the data is only fetched there.
- `CONSOLIDATION_DEFAULT_COLUMNS`: insert `totalVolume, weightUtilization, volumeUtilization` right after `grossWeight` (the story's order: Weight, Volume, Weight Util %, Volume Util %).

## V3. Location-ID tooltip on Origin / Destination (consolidation mode)

- When the row carries `originLocationId` / `destinationLocationId`, the cell is wrapped in the existing `TooltipTrigger`, the same pattern as the Pickup Date cell: subtitle "Origin Location ID" / "Destination Location ID", content the ID. With no ID, the cell is plain text as today.
- The text stays the address; there are no new columns.

## Tests

- api:
  - the extras SQL is built only with the flag;
  - the outer-query shape: extras computed over the paged rows;
  - volume summed, and the first-pickup / last-delivery location chosen.
- mock: the fields are present in consolidation and absent otherwise.
- Columns:
  - formatting;
  - utilization from capacity;
  - `--` cases;
  - a KG string weight converted;
  - the mode shows the three columns in place, and Monitoring doesn't offer them.
- Tooltip: shows the ID on hover; no tooltip without an ID.
- The full app suite + `node --test api/_lib/` green, except the known `toast.test.js` / `StopDateField.test.jsx`.

## Verification

- `dev:api` browser pass (read-only): in the mode, the volume and utilization values are sane and the location tooltips show.
- No deploy, reseed or Neon write without the user's go.
