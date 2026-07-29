import shipments from './shipments.json'
import { EQUIPMENT_CODES } from './master-data'

// ─── Shipment list (statically imported, ~0.9 MB) ───────────

export function getAllShipments() {
  return shipments
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
