-- 002: Orders grid per-tab fields (S94). consignor/consignee JSONB now also
-- carry name+address (no schema change needed for those); these are the typed
-- columns for filtering/sorting + the tab-specific display fields.
ALTER TABLE orders
  ADD COLUMN hazardous boolean NOT NULL DEFAULT false,
  ADD COLUMN created_at timestamptz,
  ADD COLUMN created_by text,
  ADD COLUMN last_edit_at timestamptz,
  ADD COLUMN draft_order_status text,   -- 'Ready' | 'Complete' | 'Purge' (VE rows)
  ADD COLUMN error_count integer;
