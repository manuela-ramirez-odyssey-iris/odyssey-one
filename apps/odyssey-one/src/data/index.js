import shipments from './shipments.json'
import { EQUIPMENT_CODES } from './master-data'

// ─── Shipment list (statically imported, ~0.9 MB) + runtime overlay ─────────
// Mock mode keeps a module-level in-memory overlay over shipments.json — the
// same shape orderService.ts uses for orders (overlayRows). A shipment created
// in the session (order create → direct shipment, S150) is prepended here and
// its SellShipmentOut blob is served from `overlayDetails` instead of
// /details/{id}.json. Lost on refresh — accepted, same as orders.
let overlayRows = []
const overlayDetails = new Map()
// Consolidation empties its source shipments and they go away (CNS-01 /
// DEC-156). The seed is a frozen JSON import, so "removed" is a tombstone set
// filtered on read — the mock twin of the live DELETE. DEC-156's wording is
// "soft delete"; nothing in this prototype shows a deleted shell, so a
// tombstone and a DELETE are indistinguishable to every reader.
// ponytail: session-scoped, like the overlay — a refresh brings the sources back.
const removedSellShipments = new Set()

export function getAllShipments() {
  const rows = overlayRows.length ? [...overlayRows, ...shipments] : shipments
  // Tombstones are filtered from BOTH halves: a consolidation can consume a
  // shipment this session created as easily as a seeded one.
  return removedSellShipments.size ? rows.filter((r) => !removedSellShipments.has(r.sellShipment)) : rows
}

/** Consolidation took these shipments' loads — they no longer exist (CNS-01). */
export function removeShipments(sellShipmentIds = []) {
  for (const id of sellShipmentIds) removedSellShipments.add(id)
}

/** Register a session-created shipment (row = grid row, detail = SellShipmentOut). */
export function addShipment(row, detail) {
  // A re-added id is not a removed one: re-applying a consolidation reuses the
  // C… shipment's own id (CNS-09), so it is both a source (tombstoned) and the
  // result. Registering wins over removing — same as the live handler, which
  // deletes the old row and INSERTs the new one under the same PK.
  removedSellShipments.delete(row.sellShipment)
  overlayRows = [row, ...overlayRows.filter(r => r.sellShipment !== row.sellShipment)]
  overlayDetails.set(row.sellShipment, detail)
}

/** The created shipment's detail blob, or null when the id is a seeded one. */
export function getOverlayShipmentDetail(sellShipment) {
  return overlayDetails.get(sellShipment) ?? null
}

/** Test hook — resets all mock shipment write state. */
export function __resetShipmentWriteState() {
  overlayRows = []
  overlayDetails.clear()
  removedSellShipments.clear()
}

// ─── Search attributes ──────────────────────────────────────

export const SEARCH_ATTRIBUTES = [
  { key: 'buy-shipment', label: 'Buy Shipment #', type: 'number-text', dataKey: 'buyShipment' },
  { key: 'sell-shipment', label: 'Sell Shipment #', type: 'number-text', dataKey: 'sellShipment' },
  { key: 'order', label: 'Order #', type: 'text', dataKey: 'orders' },
  { key: 'pro', label: 'Pro#/Booking #', type: 'number-text', dataKey: 'pro' },
  { key: 'customer-id', label: 'Customer ID', type: 'text', dataKey: 'customerId' },
  { key: 'customer-name', label: 'Customer Name', type: 'text', dataKey: 'customerName' },
  { key: 'consignor', label: 'Consignor', type: 'text', dataKey: 'consignor' },
  { key: 'consignee', label: 'Consignee', type: 'text', dataKey: 'consignee' },
  { key: 'origin', label: 'Origin', type: 'text', dataKey: 'origin' },
  { key: 'destination', label: 'Destination', type: 'text', dataKey: 'destination' },
  { key: 'mode', label: 'Mode', type: 'dropdown', dataKey: 'mode', values: ['TL', 'LTL', 'RR', 'IMD', 'AIR'] },
  { key: 'scac', label: 'SCAC', type: 'dropdown', dataKey: 'scac' },
  { key: 'tender-status', label: 'Tender Status', type: 'dropdown', dataKey: 'tenderStatus', values: ['Sent', 'Accepted', 'Declined', 'Cancelled'] },
  { key: 'shipment-status', label: 'Shipment Status', type: 'dropdown', dataKey: 'shipmentStatus', values: ['Review', 'Done'] },
  { key: 'equipment-code', label: 'Equipment Code', type: 'dropdown', dataKey: 'equipmentCode', values: EQUIPMENT_CODES },
]
