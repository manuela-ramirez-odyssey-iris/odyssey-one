/**
 * Orders search progression — the domain's search vocabulary, built from the
 * ORDERS DATATABLE COLUMNS (user ruling, S130: "Orders have its own columns,
 * that is why we are defining its own progression").
 *
 * Twin of `search/shipments/progression.js`, same contract, same `match`
 * heuristic, so `useGlobalSearch` and the criteria core treat both domains
 * identically. Read that file first — this header only records what DIFFERS.
 *
 * ── Source: every column on all three tabs (components/orders/ordersColumns.jsx)
 *   all               → Order Number · Hazardous · Order Source · Order Status ·
 *                       Customer · Ship Direction · Freight Terms · Equipment ·
 *                       Shipper Location · Destination Location ·
 *                       Latest Pickup · Latest Delivery · Gross Weight · Volume
 *   draft             → Created · Created By · Last Edit · Last Edited By
 *   validation-errors → Draft Order Status · Errors Count
 * Nothing here is NOT a column. Fields that exist on the row but on no grid
 * (poNumber, commodity, planningDateType, the `earliest` timestamps) are
 * deliberately out — add them here and to `orderSearchRow` together if a column
 * ever appears for them.
 *
 * ── FLAT, not tab-scoped (user ruling, S130) ───────────────────────────────
 * The Filters PANEL stays tab-scoped — that is LINX-10285's explicit ruling
 * ("Basic filters are applicable for 'All' tab only"), and `attrsForTab` in
 * registry.js keeps owning it. The BAR is not: searching for a Created By while
 * the All tab is open must find the order, and a vocabulary that shifted under
 * the user on every tab switch would be its own bug. One catalog, two consumers
 * with different scoping rules.
 *
 * ── Group order is the drill-forward order ─────────────────────────────────
 * identifier → who → where → when → how → status → classification → cargo →
 * audit. Same logic as Shipments, so the empty-bar progression behaves the same
 * way; groups 1-8 reuse Shipments' own group names wherever the concept matches.
 * "Created & Edited" is new — Shipments has no audit columns, and the Orders
 * Draft tab is built on them.
 *
 * ── Enum values are DISPLAY labels, never stored codes ─────────────────────
 * `shipDirection` is stored 'I'/'O' and `freightTerms` 'A'/'T'/'P'/'N'/'C', but
 * the grid shows Inbound / Pre-Paid. A chip has to read the way the column
 * reads, so `orderSearchRow` below projects the LABEL and the matcher compares
 * labels — the alternative (chip shows a label, matcher compares a code) needs a
 * code↔label split in every consumer. Same reason `orderSource` ('INTEGRATED')
 * projects to 'Integrated', and `hazardous` (a boolean) projects to the badge
 * text its column renders — 'Hazmat', or blank for a non-hazmat order.
 */
import { EQUIPMENT_CODES, FREIGHT_TERMS, SHIP_DIRECTIONS, freightTermLabel, shipDirectionLabel } from '../../data/master-data'
import { ORDER_STATUS_VALUES, DRAFT_ORDER_STATUS_VALUES } from './registry'

export const ORDERS_PROGRESSION = [
  {
    group: 'Order Identifiers',
    label: 'Find the order',
    attributes: [
      // Auto-generated numbers are digits, customer-provided ones keep letters —
      // same reasoning as Shipments' Order # (LINX-9742).
      { key: 'order-number', label: 'Order Number', dataKey: 'orderNumber', match: 'both' },
    ],
  },
  {
    group: 'Customers & Parties',
    label: 'Who it belongs to',
    attributes: [
      { key: 'customer', label: 'Customer', dataKey: 'customer', match: 'letters' },
    ],
  },
  {
    // The panel calls these `origin`/`destination` (registry.js) because it
    // filters them as City|State|Country triples. The COLUMNS call them Shipper
    // and Destination Location, and the column is what a user is reading when
    // they type — so the bar uses the column's name. Reconciling the two labels
    // is a follow-up, not a silent rename of either.
    group: 'Route & Geography',
    label: 'Where it goes',
    attributes: [
      { key: 'shipper-location', label: 'Shipper Location', dataKey: 'shipperLocation', match: 'letters' },
      { key: 'destination-location', label: 'Destination Location', dataKey: 'destinationLocation', match: 'letters' },
    ],
  },
  {
    group: 'Schedule & Appointments',
    label: 'When it moves',
    attributes: [
      { key: 'latest-pickup', label: 'Latest Pickup Date', dataKey: 'latestPickup', match: 'date' },
      { key: 'latest-delivery', label: 'Latest Delivery Date', dataKey: 'latestDelivery', match: 'date' },
    ],
  },
  {
    group: 'Transport & Equipment',
    label: 'How it moves',
    attributes: [
      { key: 'equipment', label: 'Equipment', dataKey: 'equipment', match: 'enum', exact: true, values: EQUIPMENT_CODES },
      { key: 'ship-direction', label: 'Ship Direction', dataKey: 'shipDirection', match: 'enum', exact: true, values: SHIP_DIRECTIONS.map((d) => d.label) },
      { key: 'freight-terms', label: 'Freight Terms', dataKey: 'freightTerms', match: 'enum', exact: true, values: FREIGHT_TERMS.map((t) => t.label) },
    ],
  },
  {
    group: 'Order Status & Source',
    label: 'Operational status',
    attributes: [
      { key: 'order-status', label: 'Order Status', dataKey: 'orderStatus', match: 'enum', exact: true, values: ORDER_STATUS_VALUES },
      { key: 'order-source', label: 'Order Source', dataKey: 'orderSource', match: 'enum', exact: true, values: ['Integrated', 'Manual'] },
      // LINX-11659's OIF validation state — a DIFFERENT vocabulary from
      // ORDER_STATUS_VALUES above, which is why it keeps its own attribute
      // rather than sharing 'order-status' (registry.js records the same trap).
      { key: 'draft-order-status', label: 'Draft Order Status', dataKey: 'draftOrderStatus', match: 'enum', exact: true, values: DRAFT_ORDER_STATUS_VALUES },
      // Exact, like Shipments' Order Count: "Errors Count: 1" must not match 12.
      // The PANEL's version is an operator + value comparator (Greater Than 5);
      // a bar chip has no room for an operator, so the bar's is equality only.
      { key: 'error-count', label: 'Errors Count', dataKey: 'errorCount', match: 'digits', exact: true },
    ],
  },
  {
    group: 'Classification',
    label: 'Order classification',
    attributes: [
      // The COLUMN renders a "Hazmat" badge (or '-'), so that is the value a
      // user reads and therefore the value they type. 'Yes'/'No' was invented
      // here and matched nothing anybody could see (S130).
      { key: 'hazardous', label: 'Hazardous', dataKey: 'hazardous', match: 'enum', exact: true, values: ['Hazmat'] },
    ],
  },
  {
    group: 'Cargo & Handling',
    label: 'Cargo details',
    attributes: [
      { key: 'gross-weight', label: 'Gross Weight', dataKey: 'grossWeight', match: 'digits' },
      { key: 'volume', label: 'Volume', dataKey: 'volume', match: 'digits' },
    ],
  },
  {
    group: 'Created & Edited',
    label: 'Who touched it',
    attributes: [
      { key: 'created-date', label: 'Created', dataKey: 'createdDate', match: 'date' },
      { key: 'created-by', label: 'Created By', dataKey: 'createdBy', match: 'letters' },
      { key: 'last-edit-date', label: 'Last Edit', dataKey: 'lastEditDate', match: 'date' },
      { key: 'last-edited-by', label: 'Last Edited By', dataKey: 'lastEditedBy', match: 'letters' },
    ],
  },
]

/** Flattened, in progression (importance) order. Each attribute carries its group. */
export const ORDERS_ATTRIBUTES = ORDERS_PROGRESSION.flatMap((g) =>
  g.attributes.map((a) => ({ ...a, group: g.group })),
)

// ── Row projection ─────────────────────────────────────────────────────────
// ISO timestamp → M/D/YYYY, the shape `parseSearchDate` (criteria-core) reads.
// Time-of-day is dropped: the columns show it, but no date CRITERION is finer
// than a day, and a trailing time would only ever be noise in a chip label.
const isoToMdy = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''))
  return m ? `${+m[2]}/${+m[3]}/${m[1]}` : ''
}

// A location as one searchable string: facility name first (what people say),
// then the city/state/country the panel filters on.
const locationText = (loc) =>
  [loc?.name, loc?.city, loc?.state, loc?.country].filter(Boolean).join(', ')

/**
 * A raw `orders.json` row projected FLAT, one field per progression `dataKey`.
 *
 * The criteria core reads `row[attr.dataKey]` directly (`fieldIncludes`), so
 * every attribute above needs a flat, display-valued field — and an order row is
 * not flat: locations are objects, dates are ISO, weight/volume are
 * `{ value, uom }`, and three fields are stored as codes. This is the single
 * place that gap is closed; it is the mock twin of what the live search index
 * would project server-side.
 */
export function orderSearchRow(row) {
  return {
    ...row,
    orderNumber: row.orderNumber,
    customer: row.customer,
    shipperLocation: locationText(row.consignor),
    destinationLocation: locationText(row.consignee),
    latestPickup: isoToMdy(row.consignor?.latestPickupDateTime),
    latestDelivery: isoToMdy(row.consignee?.latestDeliveryDateTime),
    equipment: row.equipment,
    shipDirection: shipDirectionLabel(row.shipDirection),
    freightTerms: freightTermLabel(row.freightTerms),
    orderStatus: row.orderStatus,
    orderSource: row.orderSource ? row.orderSource[0] + row.orderSource.slice(1).toLowerCase() : '',
    draftOrderStatus: row.draftOrderStatus ?? '',
    errorCount: row.errorCount == null ? '' : String(row.errorCount),
    hazardous: row.hazardous ? 'Hazmat' : '', // '' = not indexable, matching the column's '-'
    grossWeight: row.grossWeight?.value == null ? '' : String(row.grossWeight.value),
    volume: row.volume?.value == null ? '' : String(row.volume.value),
    createdDate: isoToMdy(row.createdAt),
    createdBy: row.createdBy ?? '',
    lastEditDate: isoToMdy(row.lastEditAt),
    lastEditedBy: row.lastEditedBy ?? '',
  }
}
