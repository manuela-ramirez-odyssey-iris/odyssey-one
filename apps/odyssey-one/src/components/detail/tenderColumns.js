/**
 * The Tender screen's column vocabulary — the LOCKED identity columns that ride
 * every sub-tab, the five sub-tabs' own column groups, and the collapse rules.
 *
 * Extracted from RoutingGuideTab.jsx (S152, LINX-15895) so the Routing History
 * tab can render a past routing version with the SAME columns the live Tender
 * screen shows — the AC's "snapshot of the data captured during that routing
 * execution" is those fields, so a second copy of them would be a second thing
 * to keep in sync. The definitions are unchanged by the move; the comments are
 * the originals.
 */

/* Header width for a deliberately two-line label (`wrapHeader`). Wide enough that
   its LONGEST WORD clears the 32px of cell padding — at 78 the wrap worked but
   "Tender" itself ellipsized to "Ten…" — and narrow enough that the two words
   still can't share a line. Same number suits Tender Status and Notify Method. */
export const WRAP_HEADER_W = 96

export const LOCKED_COLUMNS = [
  { key: 'routeRank', label: 'Route Rank', primary: true, narrow: true },
  { key: 'rank', label: 'Rank', primary: true, narrow: true },
  { key: 'scac', label: 'SCAC', narrow: true },
  { key: 'carrierName', label: 'Carrier Name', primary: true },
  { key: 'equipment', label: 'Equipment' },
  { key: 'cost', label: 'AP Cost', narrow: true },
  // wrapHeader = the header width that breaks the label onto two lines ("Tender" /
  // "Status", user 2026-08-17). Not `narrow`: the CELLS stay left-aligned and
  // full-width, only the header stacks.
  { key: 'status', label: 'Tender Status', wrapHeader: WRAP_HEADER_W },
  { key: 'pickupDateTime', label: 'Pickup Date/Time' },
  { key: 'deliveryDateTime', label: 'Delivery Date/Time' },
]

export const NEVER_COLLAPSE_KEYS = ['routeRank', 'rank', 'status']
export const COLLAPSIBLE_KEYS = ['scac', 'carrierName', 'equipment', 'cost', 'pickupDateTime', 'deliveryDateTime']


export const TAB_COLUMNS = {
  'routing-options': [
    { key: 'transit', label: 'Transit Time', wrapHeader: WRAP_HEADER_W },
    { key: 'distance', label: 'Distance' },
    { key: 'api', label: 'Notify Method', wrapHeader: WRAP_HEADER_W },
    { key: 'notifyDateTime', label: 'Notify Date' },
    { key: 'responseMethod', label: 'Response Method' },
    { key: 'responseDateTime', label: 'Response Date' },
    { key: 'responseUser', label: 'Response User' },
    { key: 'carrierQuoted', label: 'Carrier Quoted', narrow: true },
    { key: 'networkLeverage', label: 'Network Leverage', narrow: true },
  ],
  'notify-response': [
    { key: 'proNumber', label: 'Pro #' },
    { key: 'transportingCarrier', label: 'Transporting Carrier' },
    { key: 'equipNumber', label: 'Equip #' },
    { key: 'routeGroup', label: 'Route Group' },
  ],
  'volume-commitment': [
    { key: 'commitment', label: 'Commitment', narrow: true },
    { key: 'uom', label: 'UOM', narrow: true },
    { key: 'vcEquipNumber', label: 'Equip #' },
    { key: 'vcOpen', label: 'Open', narrow: true },
    { key: 'vcAccept', label: 'Accept', narrow: true },
    { key: 'vcDecline', label: 'Decline', narrow: true },
  ],
  'additional-info': [
    { key: 'carrierPickup', label: 'Carrier Pickup #' },
    { key: 'carrierApiTenderId', label: 'Carrier API Tender ID' },
    { key: 'breakPoint', label: 'Break Point' },
    { key: 'rateSource', label: 'Rate Source' },
    { key: 'distanceSource', label: 'Distance Source' },
    { key: 'description', label: 'Description' },
    { key: 'transitTimeSource', label: 'Transit Time Source' },
    { key: 'transitTimeId', label: 'Transit Time ID' },
    { key: 'loadboardExpiry', label: 'Loadboard Expiry' },
    { key: 'rcpId', label: 'RCP ID' },
    { key: 'lcePkId', label: 'LCE PK_ID' },
  ],
  others: [
    { key: 'modifyUser', label: 'Modify User' },
    { key: 'modifyDate', label: 'Modify Date' },
    { key: 'indirectPoint', label: 'Indirect Point' },
    { key: 'roundTrip', label: 'Round Trip', narrow: true },
    { key: 'customerPreferred', label: 'Customer Preferred', narrow: true },
    { key: 'orderEquip', label: 'Order Equip' },
    { key: 'contactExped', label: 'Contact Exped' },
    { key: 'note', label: 'Note' },
  ],
}

export const SUB_TABS = [
  { key: 'routing-options', label: 'Routing Options' },
  { key: 'notify-response', label: 'Notify & Response Method' },
  { key: 'volume-commitment', label: 'View Volume Commitment' },
  { key: 'additional-info', label: 'Additional Info' },
  { key: 'others', label: 'Others' },
]
