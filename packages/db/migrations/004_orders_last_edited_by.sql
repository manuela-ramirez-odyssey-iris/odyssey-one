-- 004: Orders — last_edited_by (S104 R2-4). created_by/last_edited_by store the
-- Odyssey USERNAME, not the display name: multiple users share a display name,
-- which makes the name ambiguous as an identity (user ruling 2026-08-01).
-- Deviates from LINX-11663 ("plain full names") — logged in the orders decision log.
--
-- The usernames are INVENTED for now: they will come from the user-management
-- domain, which does not exist yet (user, 2026-08-02). They are derived from the
-- seeded users so a created_by value always names a row in `users` — an identity
-- that resolves to nobody is not an identity.
ALTER TABLE orders ADD COLUMN last_edited_by text;

-- created_by is looked up by user (creator) far more often than scanned; a
-- ~30k-row table doesn't earn last_edited_by its own index too.
CREATE INDEX orders_created_by_idx ON orders (created_by);

-- R2-3: zone codes ride BESIDE the naive timestamps (LLD pattern, same as
-- requestedPickupTimeZoneCode) — do NOT change the timestamp wire shape.
-- Naive-as-UTC storage keeps live wall times ≡ mock wall times; emitting real
-- offsets would shift every displayed hour in live mode only.
ALTER TABLE orders ADD COLUMN created_tz text;
ALTER TABLE orders ADD COLUMN last_edit_tz text;
-- The queryable identity: created_by/last_edited_by values must resolve to a
-- row here, or "username as identity" is a derivation, not a fact.
ALTER TABLE users ADD COLUMN username text UNIQUE;
