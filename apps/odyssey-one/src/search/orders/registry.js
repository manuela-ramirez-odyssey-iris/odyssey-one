/**
 * Orders filter registry — the Orders domain's filter vocabulary.
 *
 * ONE catalog, tab-tagged. The three stories specify three DIFFERENT filter
 * sets, and LINX-10285's note settles that this is deliberate, not an
 * oversight: "Basic filters are applicable for ~~all 3~~ **'All' tab only**"
 * (strikethrough in the ticket). So `tabs` is a ruling, not an inference.
 *
 * Sources (AC read verbatim from customfield_10032, 2026-08-20):
 *   all                → LINX-10285
 *   draft              → LINX-11663
 *   validation-errors  → LINX-11659
 *
 * Tab keys match OrdersRoute's MAIN_TABS keys exactly — a rename there must
 * rename here or a tab silently renders zero fields.
 *
 * `control` picks the widget (see OrdersFiltersView.renderControl):
 *   'text'       → plain FormField. Free text, comma-separated for several
 *                  values — the Shipments Order # treatment (GS-12 IN-list),
 *                  reachable from the search bar OR typed here (user ruling,
 *                  2026-08-20). NOT a dropdown: order numbers are pasted from
 *                  a document far more often than picked from a list.
 *   'combobox'   → ComboBox + committed-value chips, options LAZY-LOADED in
 *                  pages (user ruling: "those need to lazyload in case they
 *                  are many"). Entity lists that can run to thousands.
 *   'enum'       → toggle chips (short fixed value set)
 *   'location'   → lazy ComboBox over City-State-Country triples
 *   'date-range' → one DatePicker in range mode (From–To)
 *   'comparator' → operator Dropdown + integer FormField
 *
 * `param` maps to OrderListRequest.filters — a string for single-field
 * controls, a tuple for the two-field ones. Fields marked NEW are OUR contract
 * extension (the LLD has no Draft/VE filters at all), on the same footing as
 * the /order-service/v3/order/tab-counts endpoint we already invented.
 *
 * NOTE: this is the ONLY place the Orders filter vocabulary lives. The phase-2
 * GlobalSearch integration (progression + criteria matcher + chip layer) is
 * meant to consume THIS registry rather than restate it.
 */
import { getAllOrders } from '../../data/orders'

// LINX-10285 "Order Status" — the All tab's 7 lifecycle DISPLAY labels, matching
// what the mock service stores on the row (code→label mapping is still deferred;
// see orderService's oneOf comment). Sourced from the seeded status set, which
// is itself the /order-status/lookup enum minus the codes.
export const ORDER_STATUS_VALUES = [
  'Draft', 'Ready For Plan', 'Load Planned', 'Shipment Planned',
  'Planning Failed', 'Shipment Failed', 'Cancelled',
]

// LINX-11659 verbatim: "options are Complete, Ready & Purge". This is
// `draftOrderStatus` (the OIF validation state, LINX-11137) — a DIFFERENT
// vocabulary from ORDER_STATUS_VALUES above. The ticket calls the column
// "Order Status", which is why binding it to `orderStatuses` is the easy
// mistake: it would filter against lifecycle labels and always return nothing.
export const DRAFT_ORDER_STATUS_VALUES = ['Ready', 'Complete', 'Purge']

// Status → Badge variant. Lives HERE rather than in ordersColumns.jsx so the
// search layer can render the same badge without importing a React module for a
// colour map; ordersColumns re-exports these, so the grid and the search preview
// can never disagree about what colour a status is. Figma pins New=blue,
// Ready for Planning=green, Rating/Routing Failed=red; our label vocabulary maps
// onto the same tones.
export const ORDER_STATUS_VARIANT = {
  'Draft': 'gray',
  'Ready For Plan': 'green',
  'Shipment Planned': 'green',
  'Load Planned': 'blue',
  'Planning Failed': 'red',
  'Shipment Failed': 'red',
  'Cancelled': 'gray',
}

export const DRAFT_ORDER_STATUS_VARIANT = { Ready: 'green', Complete: 'blue', Purge: 'red' }

// LINX-11659 verbatim — the Error Count operator dropdown.
export const ERROR_COUNT_OPERATORS = [
  { value: 'gt', label: 'Greater Than' },
  { value: 'eq', label: 'Equals' },
  { value: 'lt', label: 'Less Than' },
]

export const ORDERS_FILTER_ATTRS = [
  {
    key: 'orderNumber',
    label: 'Order Number',
    control: 'text',
    dataKey: 'orderNumber',
    param: 'orderNumbers',
    tabs: ['all', 'draft', 'validation-errors'],
  },
  {
    key: 'orderStatus',
    label: 'Order Status',
    control: 'enum',
    values: ORDER_STATUS_VALUES,
    param: 'orderStatuses',
    tabs: ['all'],
  },
  {
    key: 'customer',
    label: 'Customer',
    control: 'combobox',
    dataKey: 'customer',
    param: 'customers',
    tabs: ['all', 'draft', 'validation-errors'],
  },
  {
    key: 'origin',
    label: 'Origin City, State, Country',
    control: 'location',
    dataKey: 'consignor',
    param: 'originLocations',
    lldParams: ['originCities', 'originStates', 'originCountries'],
    tabs: ['all'],
  },
  {
    key: 'destination',
    label: 'Destination City, State, Country',
    control: 'location',
    dataKey: 'consignee',
    param: 'destinationLocations',
    lldParams: ['destinationCities', 'destinationStates', 'destinationCountries'],
    tabs: ['all'],
  },
  {
    key: 'latestPickup',
    label: 'Latest Pickup Date',
    control: 'date-range',
    param: ['latestPickupDateFrom', 'latestPickupDateTo'],
    tabs: ['all'],
  },
  {
    key: 'latestDelivery',
    label: 'Latest Delivery Date',
    control: 'date-range',
    param: ['latestDeliveryDateFrom', 'latestDeliveryDateTo'],
    tabs: ['all'],
  },
  {
    key: 'createdDate',
    label: 'Created Date',
    control: 'date-range',
    param: ['createdDateFrom', 'createdDateTo'], // NEW
    tabs: ['draft'],
  },
  {
    key: 'lastEditDate',
    label: 'Last Edit Date',
    control: 'date-range',
    param: ['lastEditDateFrom', 'lastEditDateTo'], // NEW
    tabs: ['draft'],
  },
  {
    key: 'createdBy',
    label: 'Created By',
    control: 'combobox',
    dataKey: 'createdBy',
    param: 'createdBy', // NEW
    tabs: ['draft'],
  },
  {
    key: 'lastEditedBy',
    label: 'Last Edit By',
    control: 'combobox',
    dataKey: 'lastEditedBy',
    param: 'lastEditedBy', // NEW
    tabs: ['draft'],
  },
  {
    key: 'draftOrderStatus',
    label: 'Order Status',
    control: 'enum',
    values: DRAFT_ORDER_STATUS_VALUES,
    param: 'draftOrderStatuses', // NEW
    tabs: ['validation-errors'],
  },
  {
    key: 'errorCount',
    label: 'Error Count',
    control: 'comparator',
    param: ['errorCountOperator', 'errorCountValue'], // NEW
    tabs: ['validation-errors'],
  },
]

/** The attributes one tab shows, in catalog order. */
export function attrsForTab(tab) {
  return ORDERS_FILTER_ATTRS.filter((a) => a.tabs.includes(tab))
}

// ── Value suggestions (LAZY, PAGED) ────────────────────────────────────────
/**
 * `getOrdersAttributeValues(attr, query, skip)` → `{ options, total }`, the
 * shape ComboBox's paged mode wants: it fetches page 0 on focus/typing and
 * calls back with `skip = accumulated.length` as the list is scrolled, until
 * `accumulated.length >= total`. Customer / Origin / Destination / Created By /
 * Last Edit By can all run long, so none of them is ever fully materialised in
 * the dropdown (user ruling, 2026-08-20).
 *
 * Deliberately LOCAL in live mode too, exactly like `lookupService.getLookupOptions`:
 * our Neon API has no value-lookup endpoints yet, and the previous
 * `live → null` branch is what left every dropdown empty — the same shape as
 * the S95 customer-search bug that lookupService's own comment records.
 * Serving the local pool is strictly better than serving nothing. Restore a
 * live branch here when the lookup slice ships — this function is the only
 * place the panel reads option values from, so that swap touches nothing else.
 */

const PAGE_SIZE = 25

// Every distinct non-empty value of one row field, sorted. Full scan of the
// local dataset — fine at this size, and the reason paging happens on the
// RESULT rather than the scan.
function distinctValues(dataKey, query) {
  const q = (query || '').trim().toLowerCase()
  const seen = new Set()
  for (const row of getAllOrders()) {
    const v = row?.[dataKey]
    if (v == null || v === '') continue
    const str = String(v)
    if (q && !str.toLowerCase().includes(q)) continue
    seen.add(str)
  }
  return [...seen].sort().map((v) => ({ value: v, label: v }))
}

/**
 * The display form of a committed location value — the exact inverse of the
 * "City|State|Country" join below. Exported so a consumer can render a STORED
 * value without the option it came from: reopening the filter panel has the
 * value but not the option list, and showing the raw pipe-joined string there
 * ("Chicago|IL|US") is not a label.
 */
export function locationLabel(value) {
  return String(value ?? '').split('|').filter(Boolean).join(', ')
}

/**
 * Distinct City-State-Country triples off one location field, matched per
 * LINX-10285: the query hits if it appears in City OR State OR Country
 * ("MI" → Miami/Florida/US, Detroit/Michigan/US, Palikir/Micronesia — the
 * ticket's own examples). The option VALUE is the "City|State|Country" join so
 * a triple round-trips as one selection; the label is the display form.
 */
function distinctLocations(dataKey, query) {
  const q = (query || '').trim().toLowerCase()
  const byValue = new Map()
  for (const row of getAllOrders()) {
    const loc = row?.[dataKey]
    if (!loc?.city) continue
    const parts = [loc.city, loc.state, loc.country].filter(Boolean)
    if (q && !parts.some((p) => String(p).toLowerCase().includes(q))) continue
    const value = `${loc.city ?? ''}|${loc.state ?? ''}|${loc.country ?? ''}`
    if (!byValue.has(value)) byValue.set(value, { value, label: locationLabel(value) })
  }
  return [...byValue.values()].sort((a, b) => a.label.localeCompare(b.label))
}

/** All matching options for an attribute, unpaged. Exported for tests. */
export function allAttributeValues(attr, query) {
  return attr.control === 'location'
    ? distinctLocations(attr.dataKey, query)
    : distinctValues(attr.dataKey, query)
}

export function getOrdersAttributeValues(attr, query, skip = 0) {
  const all = allAttributeValues(attr, query)
  return Promise.resolve({
    options: all.slice(skip, skip + PAGE_SIZE),
    total: all.length,
  })
}
