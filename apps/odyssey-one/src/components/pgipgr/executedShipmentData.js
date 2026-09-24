/**
 * Executed Shipment Details — HARDCODED field data (S159 restyle), read
 * verbatim off Figma node 2577:77880 (x38TOJGsNryYl3LsKhCtSc). One fixture
 * reused regardless of which row's Shipment ID linked here — this is a UI-only
 * prototype, not a per-id lookup.
 *
 * `dropdown: true` fields render with a trailing chevron to read as a select;
 * `error` is the exact copy shown under the field. Field ids are just React
 * keys / local-state keys, not real API field names.
 */

export const HEADER_NUMBER = '15800558'

export const SHIPMENT_INFO_ROWS = [
  [
    { id: 'shipInfo.odysseyId', label: 'Odyssey Shipment Identifier', value: 'S260004NGW' },
    { id: 'shipInfo.sellShipment', label: 'Sell Shipment #', value: '1811', dropdown: true, error: 'No matching shipment found' },
    { id: 'shipInfo.mbol', label: 'MBoL #', value: '810291815' },
    { id: 'shipInfo.freightTerm', label: 'Freight Term', value: 'Pre-Paid' },
  ],
  [
    { id: 'shipInfo.equipmentType', label: 'Equipment Type', value: 'LTL' },
    { id: 'shipInfo.scac', label: 'SCAC', value: 'RLCA' },
    { id: 'shipInfo.equipmentNumber', label: 'Equipment #', value: '80890879' },
    { id: 'shipInfo.sale', label: 'Sale #', value: '-' },
  ],
  [
    { id: 'shipInfo.carrierTracking', label: 'Carrier Tracking #', value: '079869769' },
    { id: 'shipInfo.ratingStatus', label: 'Rating Status', value: 'RLCA' },
    { id: 'shipInfo.bol', label: 'BoL #', value: '01-6578898' },
    { id: 'shipInfo.shipDirection', label: 'Ship Direction', value: 'Outbound' },
  ],
]

export const HEADER_ROWS = [
  [
    { id: 'header.bol', label: 'BoL #', value: '810291815' },
    { id: 'header.buyLoadId', label: 'Buy load Identifier', value: '01-410225153' },
    { id: 'header.customerOrder', label: 'Customer Order', value: '01-410225153' },
    { id: 'header.pickupSeq', label: 'Pickup Sequence#', value: '1' },
  ],
  [
    { id: 'header.dropoffSeq', label: 'Dropoff Sequence #', value: '2' },
    { id: 'header.shippedFlag', label: 'Shipped Flag', value: '-' },
    { id: 'header.incoterm', label: 'Incoterm', value: '-' },
    { id: 'header.contact', label: 'Contact', value: 'TRAVIS' },
  ],
  [
    { id: 'header.scheduledPickup', label: 'Scheduled Pickup Date and Time', value: '07/08/2026 00:00 EST' },
    { id: 'header.requestedDelivery', label: 'Requested Delivery Date and Time', value: '07/09/2026 00:00 EST' },
    { id: 'header.scheduledDelivery', label: 'Scheduled Delivery Date and Time', value: '07/09/2026 00:00 EST' },
    { id: 'header.actualShip', label: 'Actual Ship Date and Time', value: '07/08/2026 00:00 EST' },
  ],
  [
    { id: 'header.equipment', label: 'Equipment', value: '-', dropdown: true, error: 'Enter an option' },
    { id: 'header.shipmentWeight', label: 'Shipment Weight', value: '-', dropdown: true, error: 'Enter an option' },
  ],
]

// Pickup/Delivery — two identical field groups (Shipper / Destination), each
// an address block + a "Contact Information" sub-block. The mock's own sample
// values are identical between the two columns (shipper==destination) — that
// reads as mock laziness, so these fixtures deliberately differ instead.
function addressGroup(prefix, { idOrg, longName, addr1, addr2, city, state, postal, country, contactName, phone, email }) {
  return {
    address: [
      { id: `${prefix}.idOrg`, label: 'ID/Org Name', value: idOrg },
      { id: `${prefix}.longName`, label: 'Long Name', value: longName },
      { id: `${prefix}.addr1`, label: 'Address 1', value: addr1 },
      { id: `${prefix}.addr2`, label: 'Address 2', value: addr2 },
      { id: `${prefix}.city`, label: 'City', value: city },
      { id: `${prefix}.state`, label: 'State', value: state },
      { id: `${prefix}.postal`, label: 'Postal Code', value: postal },
      { id: `${prefix}.country`, label: 'Country', value: country },
    ],
    contact: [
      { id: `${prefix}.contactName`, label: 'Contact Name', value: contactName },
      { id: `${prefix}.phone`, label: 'Phone Number', value: phone },
      { id: `${prefix}.email`, label: 'Email Address', value: email },
    ],
  }
}

export const SHIPPER = addressGroup('shipper', {
  idOrg: 'ZMB1234', longName: 'RDH Warehouse', addr1: '456 Distribution Ave', addr2: '',
  city: 'Eden Lake', state: 'GA', postal: '30160', country: 'United States',
  contactName: 'Nick Strauss', phone: '+1 (765) 670-4444', email: 'nick.strauss@krm.com',
})

export const DESTINATION = addressGroup('destination', {
  idOrg: 'ZMB5678', longName: 'Kemira NA DC 4', addr1: '900 Commerce Pkwy', addr2: 'Dock 12',
  city: 'Dallas', state: 'TX', postal: '75201', country: 'United States',
  contactName: 'Priya Anand', phone: '+1 (214) 555-0198', email: 'priya.anand@kemira.com',
})

// READ-ONLY mode's "Shipper details" column has its own sample values (Figma
// node 2701:9930, screenshot-confirmed: KRM1234 / KRM Engineering / 123
// Warehouse St / Muscoda, WI 53573) — genuinely different from EDIT mode's
// SHIPPER, not a copy of it. "Consignee details" reuses DESTINATION (the mock
// itself reuses EDIT mode's SHIPPER as its consignee sample, including a
// bogus "Email Address: Nick Strauss" value — mock sloppiness, not copied).
export const READONLY_SHIPPER = addressGroup('shipperView', {
  idOrg: 'KRM1234', longName: 'KRM Engineering', addr1: '123 Warehouse St', addr2: '',
  city: 'Muscoda', state: 'WI', postal: '53573', country: 'United States',
  contactName: 'Nick Strauss', phone: '+1 (765) 670-4444', email: 'nick.strauss@krm.com',
})

// Title source for both modes — EDIT: "Executed Shipment: <sell shipment #>".
export const SELL_SHIPMENT_NUMBER = SHIPMENT_INFO_ROWS[0][1].value

// Reference — "Order #" here, not the mock's "Orde #" (obvious typo, S159 —
// Efrain's mock copy isn't canonical).
export const REFERENCE_ROW = [
  { id: 'reference.orderNumber', label: 'Order #', value: '810291815' },
  { id: 'reference.companyCode', label: 'Company Code', value: '01' },
  { id: 'reference.fType', label: 'FType', value: '01-410225153' },
]

// General — replaced by the 2026-09-24 Figma pass (node 2665:15155):
// Line #, External Line Identifier, Third Party Ref #, Third Party Line Ref
// #, Third Party Ref Date, Batch/Lot #, Tunnel Code, Ship Item Identifier,
// Commodity Code, NMFC, Harmonized Code (S159 EDIT/READ-ONLY diff pass).
export const LINE_GENERAL_ROWS = [
  [
    { id: 'line.general.lineNumber', label: 'Line #', value: '1' },
    { id: 'line.general.externalLineId', label: 'External Line Identifier', value: '310198124' },
    { id: 'line.general.thirdPartyRef', label: 'Third Party Ref #', value: '-' },
    { id: 'line.general.thirdPartyLineRef', label: 'Third Party Line Ref #', value: '-' },
  ],
  [
    { id: 'line.general.thirdPartyRefDate', label: 'Third Party Ref Date', value: '-' },
    { id: 'line.general.batchLot', label: 'Batch/Lot #', value: '-' },
    { id: 'line.general.tunnelCode', label: 'Tunnel Code', value: '-' },
    { id: 'line.general.shipItemId', label: 'Ship Item Identifier', value: '324BSTO' },
  ],
  [
    { id: 'line.general.commodityCode', label: 'Commodity Code', value: '-' },
    { id: 'line.general.nmfc', label: 'NMFC', value: '-' },
    { id: 'line.general.harmonizedCode', label: 'Harmonized Code', value: '-' },
  ],
]

export const LINE_PACKAGING_ROWS = [
  [
    { id: 'line.packaging.packagingId', label: 'Packaging Identifier', value: 'Pallet' },
    { id: 'line.packaging.packageCount', label: 'Package Count', value: '2' },
  ],
  [
    { id: 'line.packaging.length', label: 'Length', value: '-' },
    { id: 'line.packaging.width', label: 'Width', value: '-' },
    { id: 'line.packaging.height', label: 'Height', value: '-' },
    { id: 'line.packaging.volume', label: 'Volume', value: '-' },
  ],
]

export const LINE_PRODUCT_ROWS = [
  [
    { id: 'line.product.grossWeight', label: 'Gross Weight', value: '5960.00 Lb' },
    { id: 'line.product.netWeight', label: 'Net Weight', value: '5800.00 Lb' },
    { id: 'line.product.tareWeight', label: 'Tare Weight', value: '-' },
    { id: 'line.product.hazmatClass', label: 'Hazmat Class', value: '-' },
  ],
  [
    { id: 'line.product.hazmatPackagingGroup', label: 'Hazmat Packaging Group', value: '-' },
    { id: 'line.product.hazmatDescription', label: 'Hazmat Description', value: '-' },
    { id: 'line.product.hazardId', label: 'Hazard ID', value: '-' },
    { id: 'line.product.productClass', label: 'Product Class', value: '-' },
  ],
  [
    { id: 'line.product.flashPoint', label: 'Flash Point', value: '-' },
    { id: 'line.product.boilingPoint', label: 'Boiling Point', value: '-' },
    { id: 'line.product.marinePollutant', label: 'Marine Pollutant', value: '-' },
    { id: 'line.product.wgkClass', label: 'WGK Class', value: '-' },
  ],
  [
    { id: 'line.product.netValue', label: 'Net Value', value: '-' },
    // A SECOND, separate "Shipment Weight" field from the Header section's —
    // the mock shows both, same error copy (screenshot-confirmed).
    { id: 'line.product.shipmentWeight', label: 'Shipment Weight', value: '-', dropdown: true, error: 'Enter an option' },
  ],
]

/** Flattens every field row group into one initial `{ id: value }` map for local state. */
export function initialFieldValues() {
  const groups = [
    SHIPMENT_INFO_ROWS, HEADER_ROWS, [SHIPPER.address, SHIPPER.contact, DESTINATION.address, DESTINATION.contact],
    [REFERENCE_ROW], LINE_GENERAL_ROWS, LINE_PACKAGING_ROWS, LINE_PRODUCT_ROWS,
  ]
  const values = {}
  for (const rows of groups) for (const row of rows) for (const f of row) values[f.id] = f.value
  return values
}
