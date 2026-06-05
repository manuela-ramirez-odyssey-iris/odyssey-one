import shipments from './shipments.json'

// ─── Shipment list (statically imported, ~0.9 MB) ───────────

export function getAllShipments() {
  return shipments
}

export function getShipmentById(id) {
  return shipments.find(s => s.buyShipment === id) || null
}

// ─── Pre-built indexes for O(1) panel/category lookups ──────

const byPanel = Map.groupBy(shipments, s => s.panel)

const byPanelAndCategory = new Map()
for (const [panel, items] of byPanel) {
  byPanelAndCategory.set(panel, Map.groupBy(items, s => s.category))
}

export function getShipmentsByPanel(panel) {
  return byPanel.get(panel) || []
}

export function getShipmentsByPanelAndCategory(panel, category) {
  const panelMap = byPanelAndCategory.get(panel)
  if (!panelMap) return []
  return panelMap.get(category) || []
}

export function getCategoryCount(panel, category) {
  const panelMap = byPanelAndCategory.get(panel)
  if (!panelMap) return 0
  return panelMap.get(category)?.length ?? 0
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
  { key: 'equipment-code', label: 'Equipment Code', type: 'dropdown', dataKey: 'equipmentCode', values: ['FLT', 'LTH', 'VAN', 'REEFER'] },
]
