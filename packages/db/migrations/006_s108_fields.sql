-- 006_s108_fields.sql — S108/S110 combined motion.
-- ADDITIVE ONLY. No DROP, no data rewrite. Run WITHOUT --reset so the live
-- user_preferences rows (saved filters, column presets) survive — the documented
-- `--reset --yes` ritual would DROP SCHEMA public CASCADE and take them with it.

-- Save Filters sharing (spec 2026-08-04-save-filters-design.md).
-- Personal filters stay a user_preferences key; they cannot live there once
-- SHARED, because every preference read is hard-scoped to the calling user
-- (api/_lib/preferences.mjs) — user B could never see user A's row.
CREATE TABLE IF NOT EXISTS shared_filters (
  id            text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  chips         jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- Listing is always "all shared filters, newest first" + an author join.
CREATE INDEX IF NOT EXISTS shared_filters_created_at_idx ON shared_filters (created_at DESC);

-- Shipment classification (LINX-11597, QA Testing).
-- shipment_type: 'Direct' (one order mapped) | 'Consolidation' (>1).
--   NOTE: distinct from the CSV row-52 "Shipment Type" (Pooling / Cross customer /
--   Line haul / Rule 11), which is a multi-leg linkage concept sharing the name.
--   That one is deliberately NOT seeded — it needs a real chain topology and is
--   pending a Jana answer (questions-for-jana-2026-08-05.md).
-- planning_type: 'RDD' (Requested Delivery Date) | 'SSD' (Scheduled Ship Date),
--   LINX-12902: RDD if ANY mapped order is RDD, else SSD.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipment_type text;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS planning_type text;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS po_numbers    text[] NOT NULL DEFAULT '{}';

-- Order-header references (LINX-12039: poNumber is a sibling of pickupNumber)
-- + planning basis (LINX-12898: PlanningDateType).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS po_number          text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS planning_date_type text;
