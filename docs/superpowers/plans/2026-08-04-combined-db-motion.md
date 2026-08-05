# Combined DB motion (S108) — ONE migration + ONE reseed

**Status:** plan, awaiting explicit reseed approval · **Date:** 2026-08-04

Goal: batch every outstanding DB need into a single motion so Neon isn't touched
again for the Save Filters work. User directive (2026-08-04): *"now that you are
touching neon, let's do all of it now to avoid touching the DB again later."*

## Measured starting state (read-only probe, 2026-08-04)

The DB is **current, not stale** — an earlier inference that it predated the
notes/pickup commits was WRONG and was corrected by direct query:

| | Value |
|---|---|
| shipments / orders / search_index | 10,000 / 23,992 / 162,818 |
| pickup_numbers populated | **7,749 / 10,000** (`PU-392664`) |
| notes non-empty | **8,331 / 10,000** |
| documents / history non-empty | 10,000 / 10,000 |
| history entries carrying `source` | **0** ← added today, needs reseed |
| users with username | 13 / 13 |
| trackingUrl / created_tz | 10,000 / 23,990 |
| `user_preferences` rows | **1** ⚠️ wiped by `--reset` |

Consequence: notes and Pickup # were never seed gaps. Pickup # shows nothing
only because the column is **not default-visible** (user ruling 2026-08-02,
`ShipmentTable.jsx:95`). This motion is therefore about *new* data, not repair.

## Migration `006_s108_fields.sql`

```sql
-- Save Filters sharing (spec 2026-08-04-save-filters-design.md)
CREATE TABLE shared_filters (
  id            text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  chips         jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Shipment classification (LINX-11597, QA Testing)
ALTER TABLE shipments ADD COLUMN shipment_type text;   -- 'Direct' | 'Consolidation'
ALTER TABLE shipments ADD COLUMN planning_type text;   -- 'RDD' | 'SSD'
ALTER TABLE shipments ADD COLUMN po_numbers    text[] NOT NULL DEFAULT '{}';

-- Order-header references (LINX-12039) + planning basis (LINX-12898/12902)
ALTER TABLE orders ADD COLUMN po_number          text;
ALTER TABLE orders ADD COLUMN planning_date_type text;  -- 'RDD' | 'SSD'
```

## Data rules (all canon-derived, invention flagged)

| Field | Rule | Source |
|---|---|---|
| `shipments.shipment_type` | `Direct` when 1 order mapped, `Consolidation` when >1 | **LINX-11597 verbatim** |
| `orders.planning_date_type` | `RDD` or `SSD` per order | LINX-12898 (`PlanningDateType`) |
| `shipments.planning_type` | `RDD` if ANY order is RDD, else `SSD` | **LINX-12902 verbatim** |
| `orders.po_number` | order-header ref, alphanumeric, sibling of `pickupNumber` | **LINX-12039 verbatim** (`"poNumber": "string"`) |
| `shipments.po_numbers` | dedup array of its orders' PO numbers | mirrors `pickup_numbers` (D3 pattern) |
| RDD/SSD **ratio** | ~35% RDD / 65% SSD | ⚠️ **INVENTED** — no canon defines the mix |
| `po_number` **format/coverage** | `PO-######`, ~60% (mirrors pickup) | ⚠️ **INVENTED** — canon gives type, not shape |

## Generator changes (`tools/generate.mjs`)

1. **Notes always present** — `noteCount` min `0` → `1`. Today 1,669 shipments
   render an empty Notes tab because `min: 0` is a legal roll (user: "we need
   some default notes").
2. **History actors become real users** — `HISTORY_USERS` (invented list: only
   "David Johns" matches a seeded row) → draw from the seeded `USERS` pool so
   the audit trail names people who actually exist. Keeps today's system-actor
   `source` branch (ERP/UI/Legacy TMS/Linx) untouched.
3. **New fields** per the table above.

## Search / UI wiring (code-only, no DB dependency beyond the columns)

4. **New "Classification" progression group**, placed **after** `Carrier &
   Tender Status` — mid-low, beside the other operational enums:
   ```js
   { group: 'Classification', label: 'Shipment classification', attributes: [
       { key: 'shipment-type',  label: 'Shipment Type',  dataKey: 'shipmentType',
         match: 'enum', values: ['Direct', 'Consolidation'] },
       { key: 'planning-type',  label: 'Planning Type',  dataKey: 'planningType',
         match: 'enum', values: ['RDD', 'SSD'] },
   ]}
   ```
   **Deliberately NOT promoted to the top.** Progression order drives
   empty-input suggestions; prime slots belong to high-selectivity needles. A
   2-value enum matches ~5,000 of 10,000 rows. The stakeholder CSV independently
   binned Shipment Type as "Others / Advanced / Rare Fields". Adding it to the
   progression is still REQUIRED because `ShipmentsFiltersView` renders
   `SHIPMENTS_PROGRESSION` — absent from it means unfilterable.
   ⚠️ `priority` values in `search-registry.mjs` MUST equal the flattened index
   of the same key in the progression — inserting a group mid-list shifts every
   later index (`registryParity.test.js` pins this; it caught an off-by-one in S105).
5. **Project both into `search_index`** so chips actually filter instead of
   degrading to honest-empty (the S105 non-projected-chip class). Add to
   `REGISTRY.attrs` with `trgm: false` (exact enums, no fuzzy) + `buildProjection`.
6. **`ROW_COLUMNS`** in `api/_lib/shipments.mjs` gains `shipment_type`,
   `planning_type`, `po_numbers`.
7. **`ShipmentTable.jsx` column defs** for Shipment Type / Planning Type / PO #
   (array-join like Pickup #). None default-visible — Shipment Type currently
   renders blank for anyone who picks it, which is the reported bug.
8. **ColumnPanel** already lists Shipment Type; add Planning Type + PO #.

## NOT in this motion (deliberate)

- **The multi-leg linkage triplet** — `Shipment Type` as
  `Pooling / Cross customer / Line haul / Rule 11`, `Shipment Sequence Leg`,
  `Next Shipment ID`. These are ONE feature: "Next Shipment ID — used for
  pooling or Rule 11" means they must agree with each other, which requires a
  real chain topology in the seed, not a column fill. Faking it yields IDs
  pointing at nothing. **→ Jana question.**
- `Distance`, `Stops` ("Pickups 1, Dropoffs 2"), `Preferred AP/AR Direct Cost`,
  `Source ID`/`Source Name` (LINX-11591/11597) — not audited against what we
  already have; out of scope until measured.
- The two CSV rows marked "(skipped)" — dropped in the stakeholder split.

## Execution order

1. Migration 006 (needs approval) → verify columns exist
2. Generator changes + `node tools/generate.mjs` (local mock JSONs)
3. Registry/progression/projection/UI wiring + tests green
4. **Reseed** (needs its own approval) → probe verification
5. Deploy (needs its own approval — API changes must ride with the data)

## Verification probes (post-reseed)

- `shipment_type` distribution matches order-count reality: every 1-order
  shipment is `Direct`, every multi-order is `Consolidation` (0 exceptions)
- `planning_type` = RDD exactly where ≥1 order is RDD
- notes non-empty = **10,000 / 10,000** (the min:1 change)
- every history entry's `user` resolves to a real `users` row (or is a system source)
- `po_numbers` populated, `search_index` contains shipment-type/planning-type rows
- probe a Shipment Type chip end-to-end in live search (not honest-empty)

## ⚠️ Reseed hazards

- `migrate.mjs --reset` **drops the public schema** → wipes the 1 existing
  `user_preferences` row (someone's saved column presets) and would wipe
  `shared_filters` too. If preferences must survive, dump/restore that table
  or run migration 006 additively **without** `--reset`.
- Reseed changes the faker stream → mock JSONs and every seeded value shift.
  Deterministic (seed 42) but prior screenshots/QA rows won't match.
