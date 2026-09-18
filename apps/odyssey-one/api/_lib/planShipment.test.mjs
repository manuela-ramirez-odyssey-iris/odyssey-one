// apps/odyssey-one/api/_lib/planShipment.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDirectShipment, consolidatableOf, buildInsertShipmentQuery, buildLinkOrderQuery, buildSearchIndexQuery } from './planShipment.mjs'

// Mirrors mapFormToOrderInterface's output for orderFormValues.sample.ts
const mo = () => ({
  orderNumber: 'ORD-1001',
  customerId: 'ERCO_SYS_01',
  freightTermCode: 'P',
  shipDirectionCode: 'O',
  pickupNumber: '41197',
  poNumber: 'I567649422',
  requestedDateType: 'SHIP',
  requestedPickupDate: '2026-06-15T08:00:00', requestedPickupTimeZoneCode: 'CST',
  pickupAppointment: '2026-06-15T16:00:00', pickupAppointmentTimeZoneCode: 'CST',
  requestedDeliveryDate: undefined, requestedDeliveryTimeZoneCode: undefined,
  deliveryAppointment: '2026-06-18T12:00:00', deliveryAppointmentTimeZoneCode: 'CST',
  originPartnerId: 'EW-TX-001', originFullName: 'ERCO WORLDWIDE', originAddress1: '100 Industrial Blvd',
  originCity: 'Houston', originRegion: 'TX', originCountry: 'United States', originPostal: '77001',
  destinationPartnerId: 'GCR-TX-015', destinationFullName: 'GULF COAST RECEIVING', destinationAddress1: '114 Industrial Blvd',
  destinationCity: 'San Antonio', destinationRegion: 'TX', destinationCountry: 'United States', destinationPostal: '78201',
  grossWeightValue: 4300, grossWeightUomCode: 'lb', volumeValue: 730, volumeUomCode: 'cuft',
  orderCarrierEquipDetailList: [{ equipmentCode: 'VAN' }],
  orderLines: [
    { lineIdentifier: 1, shipItemIdentifier: '0000000100037', productDescription: 'Polyethylene Resin HD', grossWeightValue: 100, grossWeightUomCode: 'lb', volumeValue: 79, volumeUomCode: 'cuft', handlingUnitCount: 4 },
    { lineIdentifier: 2, shipItemIdentifier: '0000000100038', productDescription: 'Caustic Soda', grossWeightValue: 4200, grossWeightUomCode: 'lb', volumeValue: 651, volumeUomCode: 'cuft', hazardous: true },
  ],
  userFieldList: [{ userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: 'Y' }],
})
const args = () => ({ mo: mo(), orderNumber: 'ORD-1001', orderId: 90001, customerName: 'ERCO Systems Inc', now: new Date('2026-09-17T14:00:00Z'), userName: 'amy.cook' })

test('consolidatableOf: FLAG Y/absent → true, N → false', () => {
  assert.equal(consolidatableOf(mo()), true)
  assert.equal(consolidatableOf({ ...mo(), userFieldList: [{ userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: 'N' }] }), false)
  assert.equal(consolidatableOf({ ...mo(), userFieldList: undefined }), true)
})

test('ids: O prefix in the 60M band, sell/buy derived from orderId, load = order↔load 1:1', () => {
  const { row, detail } = buildDirectShipment(args())
  assert.equal(row.odysseyShipmentIdentifier, 'O60090001')
  assert.equal(row.sellShipment, '26090001')
  assert.equal(row.buyShipment, '900090001')
  assert.equal(row.load, '90001')
  assert.equal(detail.shipmentId, row.sellShipment)
  assert.equal(detail.odysseyShipmentIdentifier, 'O60090001')
})

test('a consolidatable order lands in the pool: monitoring/consolidation, Direct, no tender', () => {
  const { row } = buildDirectShipment(args())
  assert.equal(row.panel, 'monitoring')
  assert.equal(row.category, 'consolidation')
  assert.equal(row.shipmentType, 'Direct')
  assert.equal(row.tenderStatus, '')
  assert.equal(row.shipmentStatus, '')
  assert.equal(row.scac, null)
  assert.deepEqual(row.orders, ['ORD-1001'])
  assert.equal(row.orderCount, '1')
})

test('a non-consolidatable order lands on Hold', () => {
  const a = args(); a.mo.userFieldList = [{ userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: 'N' }]
  const { row, detail } = buildDirectShipment(a)
  assert.equal(row.category, 'hold')
  assert.match(detail.historyList[1].details, /moved to Hold/)
  assert.equal(detail.historyList[1].outcome, 'neutral')
})

test('row facts come from the order: customer, lane strings, dates, weight, refs, planning type', () => {
  const { row } = buildDirectShipment(args())
  assert.equal(row.customerId, 'ERCO_SYS_01')
  assert.equal(row.customerName, 'ERCO Systems Inc')
  assert.equal(row.consignor, 'ERCO WORLDWIDE')
  assert.equal(row.consignee, 'GULF COAST RECEIVING')
  assert.equal(row.origin, 'Houston TX US 77001')
  assert.equal(row.destination, 'San Antonio TX US 78201')
  assert.equal(row.pickupDate, '06/15/2026 08:00 CST')
  assert.equal(row.deliveryDate, '06/18/2026 12:00 CST')
  assert.equal(row.grossWeight, '4300')
  assert.equal(row.equipmentCode, 'VAN')
  assert.deepEqual(row.pickupNumbers, ['41197'])
  assert.deepEqual(row.poNumbers, ['I567649422'])
  assert.equal(row.planningType, 'SSD')
  assert.equal(row.loadCount, '2')
  assert.equal(row.legType, null)
})

test('timestamps for the DB follow the abbreviation, not a hardcoded zone', () => {
  const { pickupTs, deliveryTs } = buildDirectShipment(args())
  assert.equal(pickupTs, '2026-06-15T08:00:00-06:00')
  assert.equal(deliveryTs, '2026-06-18T12:00:00-06:00')
})

test('detail: one order, two stops carrying it, no routing, two history rows, pool state', () => {
  const { detail } = buildDirectShipment(args())
  assert.equal(detail.shipmentType, 'Direct')
  assert.equal(detail.customerName, 'ERCO Systems Inc')
  assert.equal(detail.numberOfStops, 2)
  assert.equal(detail.ratingStatus, 'Not Rated')
  assert.equal(detail.trackingUrl, null)
  assert.deepEqual(detail.shippingOptionList, [])
  assert.deepEqual(detail.droppedCarrierList, [])
  assert.equal(detail.orderList.length, 1)
  const o = detail.orderList[0]
  assert.equal(o.orderId, 'ORD-1001')
  assert.equal(o.consolidatable, true)
  assert.equal(o.origin.city, 'Houston')
  assert.equal(o.origin.country, 'US')
  assert.equal(o.grossWeightValue, 4300)
  assert.equal(o.orderLines.length, 2)
  assert.equal(o.orderLines[1].hazmatCode, 'HZ')
  assert.equal(o.orderLines[0].hazmatCode, null)
  const [pu, dl] = detail.shipmentStopList
  assert.equal(pu.stopType, 'pickup'); assert.equal(pu.stopSequence, 1)
  assert.deepEqual(pu.orderIds, ['ORD-1001'])
  assert.equal(pu.facilityName, 'ERCO WORLDWIDE')
  assert.equal(pu.scheduledDateTime, '06/15/2026 08:00 CST')
  assert.equal(pu.grossWeightValue, 4300)
  assert.equal(pu.packageCount, 4)
  assert.equal(pu.pickupNumber, '41197')
  assert.equal(dl.stopType, 'delivery'); assert.equal(dl.stopSequence, 2)
  assert.equal(dl.scheduledDateTime, '06/18/2026 12:00 CST')
  assert.equal(dl.pickupNumber, null)
  assert.equal(detail.historyList[0].action, 'Shipment Created')
  assert.match(detail.historyList[0].details, /Buy Shipment 900090001 and Sell Shipment 26090001 created successfully for Order ORD-1001/)
  assert.equal(detail.historyList[1].action, 'Optimization Evaluation')
  assert.match(detail.historyList[1].details, /moved to Consolidation/)
  assert.equal(detail.historyList[1].outcome, 'update')
  assert.deepEqual(detail.historyList[0].author, { name: 'OdysseyONE', kind: 'system' })
  assert.ok(detail.historyList[1].timestamp > detail.historyList[0].timestamp)
})

test('a blank delivery date yields empty display + null ts, never a crash', () => {
  const a = args(); a.mo.deliveryAppointment = undefined; a.mo.requestedDeliveryDate = undefined
  const { row, deliveryTs } = buildDirectShipment(a)
  assert.equal(row.deliveryDate, '')
  assert.equal(deliveryTs, null)
})

test('mode follows the weight threshold: LTL under 10,000 lb, TL at and above', () => {
  const at = (w) => { const a = args(); a.mo.grossWeightValue = w; return buildDirectShipment(a).row.mode }
  assert.equal(at(9_999), 'LTL')
  assert.equal(at(10_000), 'TL')
  assert.equal(at(10_001), 'TL')
})

test('stop packageCount is null — not 0 — when no line carries a handling-unit count', () => {
  const a = args()
  a.mo.orderLines = a.mo.orderLines.map(({ handlingUnitCount, ...rest }) => rest)
  const { detail } = buildDirectShipment(a)
  assert.equal(detail.shipmentStopList[0].packageCount, null)
  // and it still sums when counts ARE present
  assert.equal(buildDirectShipment(args()).detail.shipmentStopList[0].packageCount, 4)
})

test('insert query: seed.mjs column order, detail as JSON, ts columns from the builder', () => {
  const built = buildDirectShipment(args())
  const q = buildInsertShipmentQuery(built)
  assert.match(q.text, /INSERT INTO shipments \(/)
  assert.match(q.text, /sell_shipment, buy_shipment, orders, pro, customer_id, customer_name, consignor, consignee/)
  assert.match(q.text, /odyssey_shipment_id/)
  assert.equal(q.values[0], '26090001')
  assert.equal(q.values[1], '900090001')
  assert.deepEqual(q.values[2], ['ORD-1001'])
  assert.equal(q.values[12], '2026-06-15T08:00:00-06:00') // pickup_ts
  assert.equal(q.values[13], '2026-06-18T12:00:00-06:00') // delivery_ts
  assert.equal(typeof q.values[30], 'string')              // detail (JSON string)
  assert.equal(JSON.parse(q.values[30]).shipmentId, '26090001')
  assert.equal(q.values.at(-1), 'O60090001')               // odyssey_shipment_id
  assert.equal(q.values.length, 38)
})

test('link query: the order points at its shipment and reads Planned Shipment', () => {
  const q = buildLinkOrderQuery('ORD-1001', '26090001')
  assert.match(q.text, /UPDATE orders SET shipment_sell_id = \$1, order_status = 'Planned Shipment' WHERE order_number = \$2/)
  assert.deepEqual(q.values, ['26090001', 'ORD-1001'])
})

test('search-index query: one row per projected attribute, keyed by sell_shipment', () => {
  const { row } = buildDirectShipment(args())
  const q = buildSearchIndexQuery(row)
  assert.match(q.text, /INSERT INTO search_index \(domain, entity_id, attr, value, display\) VALUES/)
  assert.match(q.text, /ON CONFLICT DO NOTHING/)
  // 5 columns per row; values include the odyssey id and the order number
  assert.equal(q.values.length % 5, 0)
  assert.ok(q.values.includes('O60090001'))
  assert.ok(q.values.includes('ORD-1001'))
  assert.ok(q.values.every((v, i) => i % 5 !== 1 || v === '26090001'))
})
