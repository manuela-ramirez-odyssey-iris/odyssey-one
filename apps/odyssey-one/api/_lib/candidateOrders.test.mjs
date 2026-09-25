import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCandidateRows, filterCandidates, EMPTY_FILTERS } from './candidateOrders.mjs'

const ship = (o) => ({ sellShipment: '1', buyShipment: '900', customerId: 'ERCO', customerName: 'Erco', orders: ['A'], shipmentStatus: 'Review', tenderStatus: 'Sent', shipmentType: 'Direct', ...o })
const ord = (o) => ({ orderNumber: 'A', customer: 'ERCO', consignor: { locationId: 'ATL-1', city: 'Atlanta', state: 'GA', country: 'US', earliestPickupDateTime: '2026-06-04T08:00:00' }, consignee: { locationId: 'MSP-1', city: 'Minneapolis', state: 'MN', country: 'US', earliestDeliveryDateTime: '2026-06-06T10:00:00' }, grossWeight: { value: 500, uom: 'lbs' }, volume: { value: 40, uom: 'cbf' }, ...o })

const shipments = [
  ship({ sellShipment: '1', buyShipment: '900', orders: ['A', 'B'], shipmentType: 'Consolidation' }),
  ship({ sellShipment: '2', buyShipment: '300', orders: ['C'], tenderStatus: 'Cancelled' }),
  ship({ sellShipment: '3', buyShipment: '100', orders: ['D'], customerId: 'OTHER' }),
  ship({ sellShipment: '9', buyShipment: '950', orders: ['X'] }),           // the current shipment
]
const orders = [ord({ orderNumber: 'A' }), ord({ orderNumber: 'B' }), ord({ orderNumber: 'C', consignor: { ...ord().consignor, city: 'Boston', state: 'MA' } }), ord({ orderNumber: 'D', customer: 'OTHER' }), ord({ orderNumber: 'X' })]

// OC-open-11's 2026-09-09 grey-at-add ruling was REVERSED 2026-09-25 per
// LINX-15870/15872 + Jana — candidate rows carry no blocked/blockReason;
// every row (including a status-blocked or single-order source) is a
// normal, selectable candidate. The block happens only at Save.
test('same customer, other shipments, excludes current + excluded ids, sorted by buy shipment asc', () => {
  const rows = buildCandidateRows({ shipments, orders, customerId: 'ERCO', sellShipment: '9', excludeOrderIds: ['B'] })
  assert.deepEqual(rows.map((r) => r.orderNumber), ['C', 'A'])                     // 300 < 900
  assert.deepEqual(rows[1], {
    orderNumber: 'A', sourceSellShipment: '1', customer: 'Erco',
    origin: 'Atlanta, GA US', destination: 'Minneapolis, MN US',
    weight: '500 lbs', volume: '40 cbf', buyShipment: '900', shipmentStatus: 'Review', tenderStatus: 'Sent',
    shipmentType: 'Consolidation', ordersInShipment: ['A', 'B'], shipDate: '2026-06-04', deliveryDate: '2026-06-06',
  })
  assert.ok(!('blocked' in rows[0]))
  assert.ok(!('blockReason' in rows[0]))
})

test('a status that would fail the 15872 Save check is still returned as a normal row', () => {
  const mk = (shipmentStatus, tenderStatus) => buildCandidateRows({ shipments: [ship({ orders: ['A', 'Z'], shipmentStatus, tenderStatus })], orders: [ord()], customerId: 'ERCO', sellShipment: '9' })[0]
  assert.equal(mk('Done', 'Cancelled').shipmentStatus, 'Done')
  assert.equal(mk('Review', 'Accepted').tenderStatus, 'Accepted')
  assert.equal(mk('Review', 'To Be Tendered').tenderStatus, 'To Be Tendered')
})

// OC-open-23 — a single-order source is a normal, selectable row (reversed
// 2026-09-25); moving it is only checked at Save.
test('a single-order source is a normal row, not blocked', () => {
  const row = buildCandidateRows({
    shipments: [ship({ orders: ['A'], shipmentStatus: 'Review', tenderStatus: 'Cancelled' })],
    orders: [ord()], customerId: 'ERCO', sellShipment: '9',
  })[0]
  assert.ok(!('blocked' in row))
  assert.deepEqual(row.ordersInShipment, ['A'])
})

test('filterCandidates: free text, exact-ish fields, date ranges, statuses', () => {
  const rows = buildCandidateRows({ shipments, orders, customerId: 'ERCO', sellShipment: '9', excludeOrderIds: [] })
  assert.equal(filterCandidates(rows, { q: 'bost', filters: EMPTY_FILTERS }).length, 1)
  assert.equal(filterCandidates(rows, { q: '', filters: { ...EMPTY_FILTERS, orderNumber: 'b' } })[0].orderNumber, 'B')
  assert.equal(filterCandidates(rows, { q: '', filters: { ...EMPTY_FILTERS, buyShipment: '300' } }).length, 1)
  assert.equal(filterCandidates(rows, { q: '', filters: { ...EMPTY_FILTERS, origin: 'MA' } }).length, 1)
  assert.equal(filterCandidates(rows, { q: '', filters: { ...EMPTY_FILTERS, shipDate: { from: '2026-06-05', to: '' } } }).length, 0)
  assert.equal(filterCandidates(rows, { q: '', filters: { ...EMPTY_FILTERS, deliveryDate: { from: '', to: '2026-06-06' } } }).length, 3)
  assert.equal(filterCandidates(rows, { q: '', filters: { ...EMPTY_FILTERS, tenderStatus: 'Accepted' } }).length, 0)
})
