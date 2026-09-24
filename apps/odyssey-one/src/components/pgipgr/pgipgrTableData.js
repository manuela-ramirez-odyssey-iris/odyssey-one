/**
 * PGI/PGR table data — HARDCODED (S159 restyle), same rationale as
 * data/pgipgrWidgets.js: no seeded shipment carries `panel: 'pgipgr'`, so
 * there is nothing live to show and nothing these rows can contradict. Values
 * are varied on purpose so column sorting is visible in each table.
 *
 * Field set + column labels read verbatim off Figma nodes 2554:58830 /
 * 2651:8468 / 2561:62292 / 2561:63433 (x38TOJGsNryYl3LsKhCtSc). One row shape
 * (BASE_ROWS) covers all four cards; `odysseyShipmentIdentifier` is the link
 * target for /shipments/executed/:id.
 */

const BASE_ROWS = [
  { odysseyShipmentIdentifier: '879087901', sellShipmentNumber: '6117', mbolNumber: '01-410240', bolNumber: '755180', orderNumber: '01-410231991', customerName: 'ERCO', freightTerm: 'Pre-Paid', equipmentType: 'TT', scac: 'DSNT', shipDirection: 'Outbound', shipDateTime: '01/29/2026 09:00 CST', grossWeightUom: '166 Kg' },
  { odysseyShipmentIdentifier: '879087902', sellShipmentNumber: '6118', mbolNumber: '01-410241', bolNumber: '755181', orderNumber: '01-410231992', customerName: 'Kemira NA', freightTerm: 'Collect', equipmentType: 'DUM', scac: 'RLCA', shipDirection: 'Inbound', shipDateTime: '01/30/2026 06:15 EST', grossWeightUom: '2,410 Lb' },
  { odysseyShipmentIdentifier: '879087903', sellShipmentNumber: '6119', mbolNumber: '01-410242', bolNumber: '755182', orderNumber: '01-410231993', customerName: 'Kemira EU', freightTerm: 'Pre-Paid', equipmentType: 'TT', scac: 'SAIA', shipDirection: 'Outbound', shipDateTime: '02/02/2026 14:40 CST', grossWeightUom: '890 Kg' },
  { odysseyShipmentIdentifier: '879087904', sellShipmentNumber: '6120', mbolNumber: '01-410243', bolNumber: '755183', orderNumber: '01-410231994', customerName: 'ERCO', freightTerm: 'Third Party', equipmentType: 'FTL', scac: 'ODFL', shipDirection: 'Outbound', shipDateTime: '02/03/2026 11:05 MST', grossWeightUom: '5,960 Lb' },
  { odysseyShipmentIdentifier: '879087905', sellShipmentNumber: '6121', mbolNumber: '01-410244', bolNumber: '755184', orderNumber: '01-410231995', customerName: 'Kemira NA', freightTerm: 'Collect', equipmentType: 'DUM', scac: 'FXFE', shipDirection: 'Inbound', shipDateTime: '02/04/2026 08:30 CST', grossWeightUom: '312 Kg' },
  { odysseyShipmentIdentifier: '879087906', sellShipmentNumber: '6122', mbolNumber: '01-410245', bolNumber: '755185', orderNumber: '01-410231996', customerName: 'Kemira EU', freightTerm: 'Pre-Paid', equipmentType: 'TT', scac: 'RDWY', shipDirection: 'Outbound', shipDateTime: '02/05/2026 17:20 EST', grossWeightUom: '1,120 Lb' },
  { odysseyShipmentIdentifier: '879087907', sellShipmentNumber: '6123', mbolNumber: '01-410246', bolNumber: '755186', orderNumber: '01-410231997', customerName: 'ERCO', freightTerm: 'Pre-Paid', equipmentType: 'FTL', scac: 'DSNT', shipDirection: 'Outbound', shipDateTime: '02/06/2026 09:50 CST', grossWeightUom: '4,205 Kg' },
  { odysseyShipmentIdentifier: '879087908', sellShipmentNumber: '6124', mbolNumber: '01-410247', bolNumber: '755187', orderNumber: '01-410231998', customerName: 'Kemira NA', freightTerm: 'Third Party', equipmentType: 'DUM', scac: 'RLCA', shipDirection: 'Inbound', shipDateTime: '02/07/2026 12:10 MST', grossWeightUom: '640 Lb' },
  { odysseyShipmentIdentifier: '879087909', sellShipmentNumber: '6125', mbolNumber: '01-410248', bolNumber: '755188', orderNumber: '01-410231999', customerName: 'Kemira EU', freightTerm: 'Collect', equipmentType: 'TT', scac: 'SAIA', shipDirection: 'Outbound', shipDateTime: '02/08/2026 15:35 CST', grossWeightUom: '2,980 Kg' },
  { odysseyShipmentIdentifier: '879087910', sellShipmentNumber: '6126', mbolNumber: '01-410249', bolNumber: '755189', orderNumber: '01-410232000', customerName: 'ERCO', freightTerm: 'Pre-Paid', equipmentType: 'FTL', scac: 'ODFL', shipDirection: 'Outbound', shipDateTime: '02/09/2026 07:45 EST', grossWeightUom: '3,415 Lb' },
  { odysseyShipmentIdentifier: '879087911', sellShipmentNumber: '6127', mbolNumber: '01-410250', bolNumber: '755190', orderNumber: '01-410232001', customerName: 'Kemira NA', freightTerm: 'Collect', equipmentType: 'DUM', scac: 'FXFE', shipDirection: 'Inbound', shipDateTime: '02/10/2026 10:00 CST', grossWeightUom: '175 Kg' },
  { odysseyShipmentIdentifier: '879087912', sellShipmentNumber: '6128', mbolNumber: '01-410251', bolNumber: '755191', orderNumber: '01-410232002', customerName: 'Kemira EU', freightTerm: 'Pre-Paid', equipmentType: 'TT', scac: 'RDWY', shipDirection: 'Outbound', shipDateTime: '02/11/2026 13:25 MST', grossWeightUom: '5,020 Lb' },
]

// The full column set — Post PGI/PGR Errors / Rating Errors / Not Responsible
// (screenshot-identical header row across all three, per the Figma pass).
export const FULL_COLUMNS = [
  { key: 'odysseyShipmentIdentifier', label: 'Odyssey Shipment Identifier', link: true },
  { key: 'sellShipmentNumber', label: 'Sell Shipment Number' },
  { key: 'mbolNumber', label: 'MBOL Number' },
  { key: 'bolNumber', label: 'BOL Number' },
  { key: 'orderNumber', label: 'Order Number' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'freightTerm', label: 'Freight Term' },
  { key: 'equipmentType', label: 'Equipment Type' },
  { key: 'scac', label: 'SCAC' },
  { key: 'shipDirection', label: 'Ship Direction' },
  { key: 'shipDateTime', label: 'Ship Date and Time' },
  { key: 'grossWeightUom', label: 'Gross Weight / UOM' },
]

// All Sell Shipments — a narrower column set with abbreviated headers (mock's
// own inconsistency vs. the other three tables — read verbatim, not "fixed",
// since it's a genuinely different column set rather than a copy typo).
export const ALL_SELL_SHIPMENTS_COLUMNS = [
  { key: 'odysseyShipmentIdentifier', label: 'Odyssey Shipment Identifier', link: true },
  { key: 'sellShipmentNumber', label: 'Sell Shipment #' },
  { key: 'orderNumber', label: 'Order #' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'freightTerm', label: 'Freight Term' },
  { key: 'equipmentType', label: 'Equipment Type' },
  { key: 'scac', label: 'SCAC' },
  { key: 'shipDirection', label: 'Ship Direction' },
  { key: 'shipDateTime', label: 'Ship Date and Time' },
]

// Pill filter set — Post PGI/PGR Errors table only (spec #2 / Figma node
// 2554:58830, screenshot-confirmed exact labels + counts). The table itself
// carries no visible "Error Type" column — this row is the only place the
// error type appears — so `errorType` below is filter-only, internal data.
export const POST_ERRORS_PILLS = [
  { key: 'total', label: 'ES Er Total', count: 376 },
  { key: 'Shipment ID Not Found', label: 'Shipment ID not found', count: 315 },
  { key: 'Packaging Type', label: 'Packaging Type', count: 1 },
  { key: 'Ship Item', label: 'Ship Item', count: 1 },
  { key: 'Time Zone', label: 'Time Zone', count: 1 },
]

const ERROR_TYPES = ['Shipment ID Not Found', 'Packaging Type', 'Ship Item', 'Time Zone']

export const POST_ERRORS_ROWS = BASE_ROWS.map((r, i) => ({ ...r, errorType: ERROR_TYPES[i % ERROR_TYPES.length] }))
export const ALL_SELL_SHIPMENTS_ROWS = BASE_ROWS
export const RATING_ERRORS_ROWS = BASE_ROWS
export const NOT_RESPONSIBLE_ROWS = BASE_ROWS.slice(0, 9)
