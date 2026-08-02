// Builds search_index rows from the generated shipment dataset (S104).
// Runs inside seed.mjs — the data is generator-owned, so the projection is
// rebuilt wholesale on every reseed rather than trigger-maintained.
import { projectRow } from '../api/_lib/search-registry.mjs'

// Registry cols are snake_case (DB truth); the generated dataset is camelCase.
// Verified against generate.mjs mainRow (:1178).
const SRC_KEY = {
  buy_shipment: 'buyShipment', sell_shipment: 'sellShipment', orders: 'orders',
  pro: 'pro', customer_id: 'customerId', customer_name: 'customerName',
  consignor: 'consignor', consignee: 'consignee', origin: 'origin',
  destination: 'destination', equipment: 'equipment', seal: 'seal',
  scac: 'scac', load: 'load',
}

export function buildProjection(shipments) {
  const out = []
  for (const s of shipments) {
    const src = {}
    for (const [col, key] of Object.entries(SRC_KEY)) src[col] = s[key]
    // Dedup on the table's PRIMARY KEY. An array field with a repeated element
    // (two orders normalizing to the same value) would otherwise abort the whole
    // insert on a unique violation — 19 minutes into a reseed.
    const seen = new Set()
    for (const r of projectRow('shipments', src, s.sellShipment)) {
      const pk = `${r.attr}|${r.value}`
      if (seen.has(pk)) continue
      seen.add(pk)
      out.push(r)
    }
  }
  return out
}
