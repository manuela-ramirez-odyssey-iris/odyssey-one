import orders from './orders.json'
import orderDetails from './order-details.json'

// ─── Orders data seam ───────────────────────────────────────────────────────
// BOTH files are emitted by tools/generate.mjs in the same pass as the
// shipments dataset (regenerate via `npm run generate-data`), so every order a
// shipment carries exists here with the same id/customer/facts — see the
// correlation invariants documented at the top of tools/generate.mjs.

export function getAllOrders() {
  return orders
}

// ManualOrder-shaped enrichment (lines, instructions, services, contacts) for
// the subset of orders that carry full detail; null → the caller falls back to
// the lean list row (consistent aggregates).
export function getOrderEnrichment(orderNumber) {
  return orderDetails[orderNumber] ?? null
}
