// Per-domain search registry (S104). Drives: which fields are projected, how
// each is normalized, which tiers apply, and the label a matched row shows.
// Adding a domain = adding an entry here + a `project` function. Nothing else.
//
// `priority` MUST equal the flattened index of the same key in
// src/search/shipments/progression.js SHIPMENTS_ATTRIBUTES, so server and client
// tie-break identically (GS-15). This file is the SERVER TWIN — it cannot import
// the client module (that pulls in the browser data layer), so the equality is
// asserted instead: src/search/shipments/registryParity.test.js fails on drift.

const upper = (v) => String(v).trim().toUpperCase()
// Identifiers users paste with punctuation the DB doesn't store (PRO-123456).
const upperStrip = (v) => upper(v).replace(/[\s\-_/.]/g, '')

export const SHIPMENTS_ATTRS = {
  'buy-shipment':  { label: 'Buy Shipment #',  col: 'buy_shipment',  normalize: upperStrip, trgm: true,  priority: 0 },
  'sell-shipment': { label: 'Sell Shipment #', col: 'sell_shipment', normalize: upperStrip, trgm: true,  priority: 1 },
  'order':         { label: 'Order #',         col: 'orders',        normalize: upperStrip, trgm: true,  priority: 2, array: true },
  'pro':           { label: 'Pro#/Booking #',  col: 'pro',           normalize: upperStrip, trgm: true,  priority: 4 },
  // Array, like `order`: a shipment consolidates N orders, each with its own
  // customer-provided pickup reference (D3).
  'pickup-number': { label: 'Pickup #',        col: 'pickup_numbers', normalize: upperStrip, trgm: true, priority: 5, array: true },
  'customer-id':   { label: 'Customer ID',     col: 'customer_id',   normalize: upper,      trgm: true,  priority: 6 },
  'customer-name': { label: 'Customer Name',   col: 'customer_name', normalize: upper,      trgm: true,  priority: 7 },
  'consignor':     { label: 'Consignor',       col: 'consignor',     normalize: upper,      trgm: true,  priority: 8 },
  'consignee':     { label: 'Consignee',       col: 'consignee',     normalize: upper,      trgm: true,  priority: 9 },
  'origin':        { label: 'Origin',          col: 'origin',        normalize: upper,      trgm: true,  priority: 10 },
  'destination':   { label: 'Destination',     col: 'destination',   normalize: upper,      trgm: true,  priority: 11 },
  'equipment':     { label: 'Equipment #',     col: 'equipment',     normalize: upperStrip, trgm: true,  priority: 16 },
  'seal':          { label: 'Seal Number',     col: 'seal',          normalize: upperStrip, trgm: true,  priority: 17 },
  // 4-char code: prefix is always enough, so skip the trigram write cost.
  'scac':          { label: 'SCAC',            col: 'scac',          normalize: upper,      trgm: false, priority: 18 },
  'load':          { label: 'Load #',          col: 'load',          normalize: upperStrip, trgm: true,  priority: 23 },
}

export const REGISTRY = {
  shipments: {
    attrs: SHIPMENTS_ATTRS,
    entityKey: 'sellShipment',
    // The wide fields a preview ROW renders (route/customer/carrier/badge) — the
    // narrow index carries only the matched value. Fetched by primary key for the
    // ≤15 ranked hits ONLY, never scanned: spec §6a's bound is "payload stays
    // single-digit KB while typing", and 15 keyed rows is ~4KB.
    // `panel` is not decorative — GS-18 picks the landing tab from it.
    hydrate: {
      table: 'shipments',
      key: 'sell_shipment',
      columns: `sell_shipment AS "sellShipment", buy_shipment AS "buyShipment", panel,
                origin, destination, customer_name AS "customerName", scac, pro,
                tender_status AS "tenderStatus", shipment_status AS "shipmentStatus"`,
    },
  },
}

/** Registry key → attr priority, for the ORDER BY tiebreaker. */
export function attrPriority(domain, attr) {
  return REGISTRY[domain]?.attrs[attr]?.priority ?? 99
}

/** Projection rows for ONE source row. Skips null/empty; expands array fields. */
export function projectRow(domain, row, entityId) {
  const { attrs } = REGISTRY[domain]
  const out = []
  for (const [attr, cfg] of Object.entries(attrs)) {
    const raw = row[cfg.srcKey ?? cfg.col]
    if (raw == null) continue
    const values = cfg.array ? raw : [raw]
    for (const v of values) {
      const display = String(v).trim()
      if (!display) continue
      out.push({ domain, entity_id: entityId, attr, value: cfg.normalize(display), display })
    }
  }
  return out
}
