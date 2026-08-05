-- 007_multileg_chains.sql — multi-leg linkage chains (user ruling 2026-08-05).
-- ADDITIVE ONLY, mirrors 006's discipline: no DROP, no data rewrite, IF NOT
-- EXISTS throughout. Run WITHOUT --reset (see 006's header comment) so live
-- user_preferences / shared_filters rows survive.

-- Freight sometimes moves in LEGS: a truck hauls it to a rail yard, a
-- railroad carries it onward. Different carrier/contract per leg, so each leg
-- is its own `shipments` row; these three columns stitch the rows into one
-- journey.
--
-- ⚠ NAME COLLISION, flagged for the user: our source CSV (attributes-
-- progression-grouping.csv row 52) calls this "Shipment Type", but
-- `shipments.shipment_type` ALREADY EXISTS (see 006) holding LINX-11597's
-- Direct/Consolidation (one mapped order vs. many) — a completely different
-- concept that happens to share the CSV's label. Reusing that column here
-- would silently overwrite a shipped, QA'd field with unrelated data, so this
-- migration gives the linkage concept its OWN column, `leg_type`, labeled
-- "Leg Type" in the UI. Which of the two concepts should own the user-facing
-- label "Shipment Type" is still an open question for Jana
-- (vault/10-domains/shipments/questions-for-jana-2026-08-05.md, Q1).
--
-- leg_type: 'Pooling' (consolidate at a pool point, then break out) |
--   'Rule 11' (deliberately billed as separate segments so the shipper uses
--   their own rail contract for the middle leg). Seeded values only — see
--   tools/generate.mjs for why 'Line haul' and 'Cross customer' (the CSV's
--   other two values) are deliberately NOT generated.
-- sequence_leg: 1-based position of this row within its chain (1, 2, 3 …),
--   dense — no gaps.
-- next_shipment_id: the id of the row holding the NEXT leg; null on the last
--   leg (the chain terminator). No FK constraint — same reasoning as the
--   other roll-up columns in 006: this is a display/grid field, not a
--   relational integrity boundary enforced at the DB layer today.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS leg_type         text;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sequence_leg     int;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS next_shipment_id text;
