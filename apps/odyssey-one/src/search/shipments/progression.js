/**
 * Shipments search progression — the domain's filter vocabulary, structured from
 * vault/10-domains/shipments/data/attributes-progression-grouping.csv.
 *
 * Ordered by progression importance (the CSV's own order): "find the shipment" →
 * "who" → "where" → "when" → "how" → operational → cargo → financial → load.
 *
 * Progression order powers the EMPTY-input SUGGESTIONS only (it never restricts
 * what's valid to type or combine — all chip combinations are logically valid):
 *   - no chips committed → entry points (first N flattened attributes).
 *   - ≥1 chip committed  → the NEXT progression GROUP (drill forward; don't
 *     repeat the entry set). On the last group, suggest from that same group.
 * Each group carries a `label` — the human "drill stage" shown as the suggestion
 * list title (see composed-criteria.md → Empty-suggestion progression).
 *
 * `match` drives the input-class heuristic for typed queries (mirrors the proven
 * SearchChipPanel logic, generalized):
 *   'digits'  → surfaced when the query contains a digit
 *   'letters' → surfaced when the query contains a letter
 *   'both'    → identifiers that can be alphanumeric (digits OR letters)
 *   'date'    → date fields (digits or '/')
 *   'enum'    → surfaced when an enum value contains the query
 *
 * `dataKey` maps to the field in the fake JSON DB (shipments.json).
 *
 * `exact: true` marks count-like fields whose chips match by full equality
 * instead of substring — "Order Count: 2" must not match a count of 12.
 *
 * NOTE: this is the ONLY place Shipments search data lives. GlobalSearch and the
 * orchestration hook never import it — the adapter is the seam. Other domains
 * provide their own progression + adapter behind the same contract.
 */
import { EQUIPMENT_CODES } from '../../data/master-data'
import { FREE_TEXT_KEYS } from './criteria'

export const SHIPMENTS_PROGRESSION = [
  {
    group: 'Shipment Identifiers',
    label: 'Find the shipment',
    attributes: [
      { key: 'buy-shipment', label: 'Buy Shipment #', dataKey: 'buyShipment', match: 'digits' },
      { key: 'sell-shipment', label: 'Sell Shipment #', dataKey: 'sellShipment', match: 'digits' },
      { key: 'order', label: 'Order #', dataKey: 'orders', match: 'both' }, // LINX-9742: auto numbers are digits, user-provided keep letters
      { key: 'order-count', label: 'Order Count', dataKey: 'orderCount', match: 'digits', exact: true },
      { key: 'pro', label: 'Pro#/Booking #', dataKey: 'pro', match: 'digits' },
    ],
  },
  {
    group: 'Customers & Parties',
    label: 'Who it belongs to',
    attributes: [
      { key: 'customer-id', label: 'Customer ID', dataKey: 'customerId', match: 'letters' },
      { key: 'customer-name', label: 'Customer Name', dataKey: 'customerName', match: 'letters' },
      { key: 'consignor', label: 'Consignor', dataKey: 'consignor', match: 'letters' },
      { key: 'consignee', label: 'Consignee', dataKey: 'consignee', match: 'letters' },
    ],
  },
  {
    group: 'Route & Geography',
    label: 'Where it goes',
    attributes: [
      { key: 'origin', label: 'Origin', dataKey: 'origin', match: 'letters' },
      { key: 'destination', label: 'Destination', dataKey: 'destination', match: 'letters' },
    ],
  },
  {
    group: 'Schedule & Appointments',
    label: 'When it moves',
    attributes: [
      { key: 'pickup-date', label: 'Pickup Date', dataKey: 'pickupDate', match: 'date' },
      { key: 'delivery-date', label: 'Delivery Date', dataKey: 'deliveryDate', match: 'date' },
    ],
  },
  {
    group: 'Transport & Equipment',
    label: 'How it moves',
    attributes: [
      { key: 'mode', label: 'Mode', dataKey: 'mode', match: 'enum', values: ['TL', 'LTL', 'RR', 'IMD', 'AIR'] },
      { key: 'equipment-code', label: 'Equipment Code', dataKey: 'equipmentCode', match: 'enum', values: EQUIPMENT_CODES },
      { key: 'equipment', label: 'Equipment #', dataKey: 'equipment', match: 'digits' },
      { key: 'seal', label: 'Seal Number', dataKey: 'seal', match: 'letters' },
    ],
  },
  {
    group: 'Carrier & Tender Status',
    label: 'Operational status',
    attributes: [
      { key: 'scac', label: 'SCAC', dataKey: 'scac', match: 'letters' },
      { key: 'tender-status', label: 'Tender Status', dataKey: 'tenderStatus', match: 'enum', values: ['Sent', 'Accepted', 'Declined', 'Cancelled'] },
      { key: 'shipment-status', label: 'Shipment Status', dataKey: 'shipmentStatus', match: 'enum', values: ['Review', 'Done'] },
    ],
  },
  {
    group: 'Cargo & Handling',
    label: 'Cargo details',
    attributes: [
      { key: 'gross-weight', label: 'Gross Weight', dataKey: 'grossWeight', match: 'digits' },
    ],
  },
  {
    group: 'Rates & Costs',
    label: 'Financial details',
    attributes: [
      { key: 'ap-freight-cost', label: 'AP Freight Cost', dataKey: 'apFreightCost', match: 'digits' },
    ],
  },
  {
    group: 'Load Details',
    label: 'Load logistics',
    attributes: [
      { key: 'load', label: 'Load #', dataKey: 'load', match: 'digits' },
      { key: 'load-count', label: 'Load Count', dataKey: 'loadCount', match: 'digits', exact: true },
    ],
  },
]

/** Flattened, in progression (importance) order. Each attribute carries its group. */
export const SHIPMENTS_ATTRIBUTES = SHIPMENTS_PROGRESSION.flatMap((g) =>
  g.attributes.map((a) => ({ ...a, group: g.group })),
)

/**
 * The attributes a BARE CODE can resolve to — those the free-text filter actually
 * searches. Restricted to FREE_TEXT_KEYS so a row is never LABELLED (or RANKED)
 * by a field the filter didn't look at. Still in progression order, which is what
 * breaks ties between two attributes matching the same query equally well.
 */
export const FREE_TEXT_ATTRS = SHIPMENTS_ATTRIBUTES.filter((a) =>
  FREE_TEXT_KEYS.includes(a.dataKey),
)
