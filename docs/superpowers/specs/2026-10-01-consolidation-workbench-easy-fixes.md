---
domain: consolidation
type: spec
tags: [consolidation, shipments-grid, sorting]
date: 2026-10-01
status: approved — user 2026-10-01 ("13 yes turn on sorting, do the easy")
---

# Spec — Ramesh's workbench corrections, easy pass + grid sorting

Source: Ramesh's sheet `Manual Consol_Vercel Vs Jira_29Sept26.xlsx` (2026-09-30), LINX-15786 AC (Scenario 2, BR II columns), LINX-15893 BR I (sorting). Paths are under `apps/odyssey-one/`. Session S165.

**Halted (user):** every LINX-15893 filter/refresh item: the Hazmat filter, removing the Tender Status filter, the weight/volume comparators, Refresh, and Last Refreshed.
**Not here (medium, needs list data):** Total Volume, Weight/Volume Utilization %, Earliest/Latest windows, location IDs, **Hazmat**. `hazardous` isn't on the list DTO (`mapShipmentErrorRow.test.ts` NOT_IN_LIST_DTO), so the column renders `--` for every row today.

## E1. Consolidation-mode column set (`ShipmentsRoute.jsx`, `ColumnPanel.jsx`)

- Add `CONSOLIDATION_DEFAULT_COLUMNS` to `ColumnPanel.jsx`. It follows the story's BR II order, restricted to columns the list carries today:
  `odysseyShipmentIdentifier, buyShipment, shipmentType, customerId, customerName, origin, destination, equipmentCode, grossWeight, pickupDate, deliveryDate, planningType, scac`
  - No `tenderStatus` (Ramesh #8: tendering happens after consolidation).
  - No `pickupNumbers` (#11).
  - No `shipmentStatus`: everything in the pool is the same status.
  - Planning Type sits right after the dates (#12).
  - Customer ID **and** Name (#3; `customerName` is already on the row).
- While `inMode`, the grid uses this set. Implement it as a `consolidation` key in `columnsByPanel`, chosen when `inMode`, so the column panel edits it like any other set. Leaving the mode restores the panel's set untouched.
- SCAC stays as the row carries it (`--` when blank). Whether a pool row's SCAC is order-provided is a medium question.

## E2. Scenario 2 empty state (`ShipmentTable.jsx` + `ShipmentsRoute.jsx`)

- `ShipmentTable` gets an `emptyMessage` prop (default `No shipments found`).
- In consolidate mode, with no search active and no customer lock, it reads **`No Consolidation Candidates Available`** (LINX-15786 Scenario 2, exact copy).
- With a search or a customer lock, the generic message stays, because the pool isn't empty, the filter is.

## E3. Sorting on (whole grid) — LINX-15893 BR I, user 2026-10-01

- Pass DataTable's `sortable` to the shipments grid again. This reverses the S85 test switch; the plumbing (`sorting` → `sortBy`/`orderBy`) is already wired.
- **No silent fallback.** `buildListQuery` sends an unknown `sortBy` to `pickup_ts`, so a header that looks sorted but isn't would be a lie.
  - Extend `SORT_MAP` (`api/_lib/shipments.mjs`) with every plain row column: `customerId→customer_id, origin, destination, equipmentCode→equipment_code, shipmentType→shipment_type, planningType→planning_type, legType→leg_type, orderCount→order_count, loadCount→load_count, apFreightCost→ap_freight_cost, consignor, consignee, pro`.
  - `grossWeight` → `(COALESCE(overrides->>'grossWeight', gross_weight))`, but only if `gross_weight` is a sortable scalar. Check the column type; if it's jsonb/text with units, leave it unsortable.
  - Every column **not** in SORT_MAP (arrays like `orders`/`pickupNumbers`/`poNumbers`, the detail-fed ones, `hazardous`, `message`, `edit`) gets `enableSorting: false`.
  - Export one `SORTABLE_KEYS` list. A test asserts that every COLUMN_CONFIG key is either in it or marked unsortable, and that SORT_MAP covers every sortable key, so the two can't drift.
- `gridService.ts` (mock) already sorts by any key. It must produce the same order for the new keys, so string keys compare case-insensitively the way Postgres text does; null/`--` last.
- **Default in consolidate mode: Shipment ID descending** (BR I). Entering the mode sets `[{ id: 'odysseyShipmentIdentifier', desc: true }]`; exiting restores the default. The existing search/relevance effect (`ShipmentsRoute.jsx:~593`) must not fight it.
- The `showSelectedOnTop` client sort (`:~343`) uses the same sorting state, unchanged.
- The other session's working-tree edits in `api/_lib/shipments.mjs` + `shipments.test.mjs` must be left as they are (add hunks only).

## E4. Canon (main thread)

- Consolidation decision log **CNS-24**: workbench columns (Ramesh #2/3/8/9/11/12), the Scenario 2 copy, sorting with a desc Shipment ID default. Halted items listed. Title (#1) and Audit Trail (#19) answered against CNS-07 / CNS-21-22, unchanged.
- Shipments decision log: sorting re-enabled grid-wide (reverses the S85 test switch).

## Tests

- Mode: entering shows exactly the E1 columns in that order; leaving restores Monitoring's set.
- Scenario 2: an empty pool shows the story copy; an empty search inside the mode shows the generic one.
- Sorting:
  - headers clickable only on sortable columns;
  - a click sends `sortBy`/`orderBy` for that key;
  - in mode the default is Shipment ID desc;
  - the SORTABLE_KEYS ↔ SORT_MAP drift test;
  - an api test that each new SORT_MAP entry builds valid ORDER BY SQL.
- The full app suite + `node --test api/_lib/` green, except the known `toast.test.js` and `StopDateField.test.jsx`.

## Verification

- `dev:api` browser pass: sort by Origin, then Customer ID, in Monitoring and in the mode. Check the order is real on live data. Read-only.
- No deploy, reseed or Neon write without the user's go.
