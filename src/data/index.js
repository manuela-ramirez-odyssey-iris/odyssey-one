import shipments from './shipments.json'
import details from './shipment-details.json'

export function getAllShipments() {
  return shipments
}

export function getShipmentById(id) {
  return shipments.find(s => s.buyShipment === id) || null
}

export function getShipmentDetails(id) {
  return details[id] || null
}

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
  { key: 'mode', label: 'Mode', type: 'dropdown', dataKey: 'mode', values: ['FTL', 'LTL', 'INTERMODAL'] },
  { key: 'scac', label: 'SCAC', type: 'dropdown', dataKey: 'scac' },
  { key: 'tender-status', label: 'Tender Status', type: 'dropdown', dataKey: 'tenderStatus', values: ['Done', 'Pending', 'Rejected'] },
  { key: 'shipment-status', label: 'Shipment Status', type: 'dropdown', dataKey: 'shipmentStatus', values: ['Tender', 'In Transit', 'Delivered', 'Booked'] },
  { key: 'equipment-code', label: 'Equipment Code', type: 'dropdown', dataKey: 'equipmentCode', values: ['FLT', 'LTH', 'VAN', 'REEFER'] },
]
