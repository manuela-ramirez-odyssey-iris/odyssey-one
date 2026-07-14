/**
 * Cell→tab mapping (S82+, iterated from cell-tab-mapping.xlsx user validation).
 * Shared by the table (cell click → bar tab) AND global search (match-row click
 * with an attribute chip → same tab) so both surfaces navigate identically.
 *
 * Values: tab key to open, or { tab, expandGeneral } for cells that should also
 * expand the Orders General Information section (customerId, customerName).
 * Blank in the xlsx = recommendation accepted. Not listed = row-select toggle.
 * Note: sellShipment/buyShipment left unmapped (user question pending on cost
 * context); proBookingNumber → routing (Tender) per recommendation, but user
 * flagged pro# isn't literally visible in that pane — revisit when Tender pane
 * surfaces carrier reference numbers; shipmentType/nextShipmentId → no mapping.
 */
export const CELL_TAB_MAP = {
  // Orders tab
  orders:         'order',
  orderCount:     'order',
  customerId:     { tab: 'order', expandGeneral: true },
  customerName:   { tab: 'order', expandGeneral: true },
  incotermInfo:   'order',

  // Stops tab
  consignor:              'stops',
  consignee:              'stops',
  origin:                 'stops',
  destination:            'stops',
  stops:                  'stops',
  mode:                   'stops',
  distance:               'stops',
  shipDirection:          'stops',
  pickupDate:             'stops',
  deliveryDate:           'stops',
  earliestPickupDate:     'stops',
  latestPickupDate:       'stops',
  earliestDeliveryDate:   'stops',
  latestDeliveryDate:     'stops',
  equipmentCode:          'stops',
  equipmentNumber:        'stops',
  sealNumber:             'stops',
  shipmentSequenceLeg:    'stops',

  // Tender tab
  scac:           'routing',
  tenderStatus:   'routing',
  shipmentStatus: 'routing',
  proBookingNumber: 'routing',

  // Cost Allocation tab
  apFreightCost:            'cost',
  preferredApDirectCost:    'cost',
  arFreightCost:            'cost',
  preferredArDirectCost:    'cost',
  freightTerms:             'cost',
  loadNumber:               'cost',
  loadCount:                'cost',
  loadStatus:               'cost',

  // Product tab
  grossWeight:    'product',
  netWeight:      'product',
  tareWeight:     'product',
  pkgCount:       'product',
  hazardous:      'product',

  // History tab (placeholder — revisit when pane is built)
  validationMessage: 'history',
}

// Search-progression dataKeys whose grid column key differs (the map above is
// keyed by COLUMN keys).
const DATA_KEY_ALIASES = {
  pro:       'proBookingNumber',
  equipment: 'equipmentNumber',
  seal:      'sealNumber',
  load:      'loadNumber',
}

/**
 * Normalized { tab, expandGeneral } for a search attribute's dataKey, or null
 * when the attribute has no tab mapping (plain row select).
 */
export function tabForDataKey(dataKey) {
  const mapping = CELL_TAB_MAP[DATA_KEY_ALIASES[dataKey] ?? dataKey]
  if (!mapping) return null
  return typeof mapping === 'object' ? mapping : { tab: mapping, expandGeneral: false }
}
