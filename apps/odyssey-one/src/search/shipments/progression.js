/**
 * Shipments search progression — the domain's filter vocabulary, structured from
 * vault/10-domains/shipments/data/attributes-progression-grouping.csv.
 *
 * Ordered by progression importance (the CSV's own order): "find the shipment" →
 * "who" → "where" → "when" → "how" → operational → cargo → financial → load.
 * The first N flattened attributes are the most important — used for the
 * empty-focus entry-point suggestions.
 *
 * `match` drives the input-class heuristic for typed queries (mirrors the proven
 * SearchChipPanel logic, generalized):
 *   'digits'  → surfaced when the query contains a digit
 *   'letters' → surfaced when the query contains a letter
 *   'both'    → identifiers that can be alphanumeric (digits OR letters)
 *   'date'    → date fields (digits or '/')
 *   'enum'    → surfaced when an enum value contains the query
 *
 * `dataKey` maps to the field in the fake JSON DB (shipments.json). It's carried
 * here for the future value-matching stage (the search index that feeds the
 * second panel) — attribute suggestions don't need it.
 *
 * NOTE: this is the ONLY place Shipments search data lives. GlobalSearch and the
 * orchestration hook never import it — the adapter is the seam. Other domains
 * provide their own progression + adapter behind the same contract.
 */
export const SHIPMENTS_PROGRESSION = [
  {
    group: 'Shipment Identifiers',
    attributes: [
      { key: 'buy-shipment', label: 'Buy Shipment #', dataKey: 'buyShipment', match: 'digits' },
      { key: 'sell-shipment', label: 'Sell Shipment #', dataKey: 'sellShipment', match: 'digits' },
      { key: 'order', label: 'Order #', dataKey: 'orders', match: 'letters' },
      { key: 'pro', label: 'Pro#/Booking #', dataKey: 'pro', match: 'digits' },
    ],
  },
  {
    group: 'Customers & Parties',
    attributes: [
      { key: 'customer-id', label: 'Customer ID', dataKey: 'customerId', match: 'letters' },
      { key: 'customer-name', label: 'Customer Name', dataKey: 'customerName', match: 'letters' },
      { key: 'consignor', label: 'Consignor', dataKey: 'consignor', match: 'letters' },
      { key: 'consignee', label: 'Consignee', dataKey: 'consignee', match: 'letters' },
    ],
  },
  {
    group: 'Route & Geography',
    attributes: [
      { key: 'origin', label: 'Origin', dataKey: 'origin', match: 'letters' },
      { key: 'destination', label: 'Destination', dataKey: 'destination', match: 'letters' },
    ],
  },
  {
    group: 'Schedule & Appointments',
    attributes: [
      { key: 'pickup-date', label: 'Pickup Date', dataKey: 'pickupDate', match: 'date' },
      { key: 'delivery-date', label: 'Delivery Date', dataKey: 'deliveryDate', match: 'date' },
    ],
  },
  {
    group: 'Transport & Equipment',
    attributes: [
      { key: 'mode', label: 'Mode', dataKey: 'mode', match: 'enum', values: ['TL', 'LTL', 'RR', 'IMD', 'AIR'] },
      { key: 'equipment-code', label: 'Equipment Code', dataKey: 'equipmentCode', match: 'enum', values: ['FLT', 'LTH', 'VAN', 'REEFER'] },
      { key: 'equipment', label: 'Equipment #', dataKey: 'equipment', match: 'digits' },
      { key: 'seal', label: 'Seal Number', dataKey: 'seal', match: 'letters' },
    ],
  },
  {
    group: 'Carrier & Tender Status',
    attributes: [
      { key: 'scac', label: 'SCAC', dataKey: 'scac', match: 'letters' },
      { key: 'tender-status', label: 'Tender Status', dataKey: 'tenderStatus', match: 'enum', values: ['Sent', 'Accepted', 'Declined', 'Cancelled'] },
      { key: 'shipment-status', label: 'Shipment Status', dataKey: 'shipmentStatus', match: 'enum', values: ['Review', 'Done'] },
    ],
  },
  {
    group: 'Cargo & Handling',
    attributes: [
      { key: 'gross-weight', label: 'Gross Weight', dataKey: 'grossWeight', match: 'digits' },
    ],
  },
  {
    group: 'Rates & Costs',
    attributes: [
      { key: 'ap-freight-cost', label: 'AP Freight Cost', dataKey: 'apFreightCost', match: 'digits' },
    ],
  },
  {
    group: 'Load Details',
    attributes: [
      { key: 'load', label: 'Load #', dataKey: 'load', match: 'digits' },
      { key: 'load-count', label: 'Load Count', dataKey: 'loadCount', match: 'digits' },
    ],
  },
]

/** Flattened, in progression (importance) order. Each attribute carries its group. */
export const SHIPMENTS_ATTRIBUTES = SHIPMENTS_PROGRESSION.flatMap((g) =>
  g.attributes.map((a) => ({ ...a, group: g.group })),
)
