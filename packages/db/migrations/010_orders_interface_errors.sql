-- 010: OIF Level 1 (structural / interface) validation errors reach Neon (S145,
-- 2026-09-10). LINX-16049 defines the Level 1 resolution cases and LINX-16028
-- the flag + count on the order; the generator has seeded both fields into
-- src/data/orders.json since S145, but there were no columns to seed them INTO,
-- so live mode returned interfaceErrorCount null on every row: Step 1 of the
-- resolution flow was unreachable and the grid's "Errors Count" (structural +
-- master data, Ramesh 2026-09-10) silently degraded to the master-data half.
-- That gap is Q-OIF-4 in vault/10-domains/orders/open-questions.md; this closes it.
--
-- Both nullable: only Validation-Errors rows carry them (draft_order_status IS
-- NOT NULL). class is NULL whenever the count is 0 — that row opens at Step 2.
ALTER TABLE orders
  ADD COLUMN interface_error_count integer,  -- 0–5; 0 = no structural faults
  ADD COLUMN interface_error_class text;     -- 'conflict' | 'structural' | 'mixed' | 'delete-flag' | 'unresolvable'
