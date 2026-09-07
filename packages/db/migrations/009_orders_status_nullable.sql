-- ORD-24 (2026-09-05): Validation Errors orders are integrated rejects that never
-- entered the lifecycle, so their order_status is NULL; draft_order_status is
-- the tab's marker. Created = order_status != 'Draft' AND draft_order_status IS NULL.
ALTER TABLE orders ALTER COLUMN order_status DROP NOT NULL;
