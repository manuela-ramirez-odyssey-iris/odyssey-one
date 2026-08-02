-- 003: search_index — the progressive-search projection (S104).
-- One row per (entity, attribute, searchable value). Replaces OR-across-14-columns
-- with one index probe, and makes "which attribute matched" a COLUMN — which is
-- what GS-15 row labelling reads. Multi-domain by construction: orders/carriers/
-- tracking are more rows here, and cross-domain search drops the domain predicate.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE search_index (
  domain     text NOT NULL,
  entity_id  text NOT NULL,   -- shipments: sell_shipment (the selection key)
  attr       text NOT NULL,   -- registry key: 'order' | 'pro' | 'scac' | ...
  value      text NOT NULL,   -- normalized (upper; per-attr rules)
  display    text NOT NULL,   -- original casing for the UI
  PRIMARY KEY (domain, attr, entity_id, value)
);

-- exact + prefix tiers. text_pattern_ops makes LIKE 'X%' index-served
-- regardless of collation; INCLUDE keeps the ranked lookup index-only.
CREATE INDEX si_prefix ON search_index (domain, value text_pattern_ops)
  INCLUDE (attr, entity_id);

-- contains tier. Only earns its write cost for substring match; trigram
-- indexes cannot serve patterns shorter than 3 chars (see search.mjs MIN_TRGM).
CREATE INDEX si_trgm ON search_index USING gin (value gin_trgm_ops);
