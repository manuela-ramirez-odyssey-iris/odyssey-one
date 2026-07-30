import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildOrderListQuery, buildTabCountsQuery, buildOrderViewQuery, orderView, buildUpdateOrderStatusQuery, updateOrderStatus, buildUpdateOrderQuery, updateOrder } from './orders.mjs'

test('order list: 1-based pagination (page 1 = offset 0)', () => {
  const q = buildOrderListQuery({ pagination: { pageNumber: 1, pageSize: 20 } })
  assert.ok(q.values.includes(0))
  const q3 = buildOrderListQuery({ pagination: { pageNumber: 3, pageSize: 20 } })
  assert.ok(q3.values.includes(40))
})

test('order list: status + customer + origin filters', () => {
  const q = buildOrderListQuery({
    pagination: { pageNumber: 1, pageSize: 10 },
    filters: { customers: ['VALTRIS_01'], orderStatuses: ['Draft'], originCities: ['Phoenix'] },
  })
  assert.match(q.text, /customer = ANY/)
  assert.match(q.text, /order_status = ANY/)
  assert.match(q.text, /origin_city = ANY/)
})

test('tab counts: single grouped query, scoped', () => {
  const q = buildTabCountsQuery({ customerIds: ['VALTRIS_01'] })
  assert.match(q.text, /count\(\*\)/i)
  assert.deepEqual(q.values, [['VALTRIS_01']])
})

test('order list: date range filters (inclusive upper bound)', () => {
  const q = buildOrderListQuery({
    filters: { earliestPickupDateFrom: '2026-04-01', earliestPickupDateTo: '2026-04-30' },
  })
  assert.match(q.text, /earliest_pickup_ts >= \$\d+/)
  assert.match(q.text, /earliest_pickup_ts < \(\$\d+::date \+ 1\)/)
})

test('order list: unknown sort field falls back to order_number', () => {
  const q = buildOrderListQuery({ sort: { field: 'DROP TABLE', direction: 'asc' } })
  assert.match(q.text, /ORDER BY order_number/)
})

test('honest-empty: empty scope/filter yields FALSE, no values', () => {
  const counts = buildTabCountsQuery({ customerIds: [] })
  assert.match(counts.text, /WHERE FALSE/)
  assert.deepEqual(counts.values, [])
  const list = buildOrderListQuery({ filters: { customers: [] } })
  assert.match(list.text, /FALSE/)
})

test('order list sorts by new whitelisted fields', () => {
  const { text } = buildOrderListQuery({ sort: { field: 'lastEdit', direction: 'desc' } })
  assert.match(text, /ORDER BY last_edit_at DESC/)
})

test('unknown sort field falls back to order_number', () => {
  const { text } = buildOrderListQuery({ sort: { field: 'evil; DROP TABLE', direction: 'asc' } })
  assert.match(text, /ORDER BY order_number ASC/)
})

test('row projection includes per-tab fields', () => {
  const { text } = buildOrderListQuery({})
  assert.match(text, /"draftOrderStatus"/)
  assert.match(text, /"errorCount"/)
})

test('order view: by number, by pending id, missing key', async () => {
  const byNum = buildOrderViewQuery('ORD-123')
  assert.match(byNum.text, /order_number = \$1/)
  assert.deepEqual(byNum.values, ['ORD-123'])
  const byPending = buildOrderViewQuery('pending-42')
  assert.match(byPending.text, /order_number = '' AND order_id = \$1/)
  assert.deepEqual(byPending.values, [42])
  await assert.rejects(() => orderView({ body: {}, db: null }), (e) => e.status === 400)
  const dbMiss = { query: async () => ({ rows: [] }) }
  await assert.rejects(() => orderView({ body: { orderNumber: 'x' }, db: dbMiss }), (e) => e.status === 404)
  const dbHit = { query: async () => ({ rows: [{ orderNumber: 'x', manualOrder: null }] }) }
  assert.deepEqual(await orderView({ body: { orderNumber: 'x' }, db: dbHit }), { row: { orderNumber: 'x' }, manualOrder: null })
})

test('update status: builder by number and by pending id', () => {
  const q = buildUpdateOrderStatusQuery('ORD-123', 'Ready For Plan')
  assert.match(q.text, /UPDATE orders SET order_status = \$1 WHERE order_number = \$2/)
  assert.deepEqual(q.values, ['Ready For Plan', 'ORD-123'])
  const p = buildUpdateOrderStatusQuery('pending-42', 'Cancelled')
  assert.match(p.text, /order_number = '' AND order_id = \$2/)
  assert.deepEqual(p.values, ['Cancelled', 42])
})

test('update status: whitelist, missing key, missing row', async () => {
  await assert.rejects(() => updateOrderStatus({ body: { status: 'Ready For Plan' }, db: null }), (e) => e.status === 400)
  await assert.rejects(() => updateOrderStatus({ body: { orderNumber: 'x', status: 'Shipped; DROP TABLE' }, db: null }), (e) => e.status === 400)
  const dbMiss = { query: async () => ({ rows: [] }) }
  await assert.rejects(() => updateOrderStatus({ body: { orderNumber: 'x', status: 'Cancelled' }, db: dbMiss }), (e) => e.status === 404)
  const dbHit = { query: async () => ({ rows: [{ order_number: 'x' }] }) }
  assert.deepEqual(await updateOrderStatus({ body: { orderNumber: 'x', status: 'Ready For Plan' }, db: dbHit }), { success: true })
})

test('update order: manual_order stored whole, grid projection re-derived', () => {
  const mo = {
    orderNumber: 'ORD-123', customerId: 'ACME_LOG_01',
    shipDirectionCode: 'O', freightTermCode: 'P',
    orderCarrierEquipDetailList: [{ equipmentCode: 'VAN' }],
    originCity: 'Houston', originRegion: 'TX', originCountry: 'US',
    destinationCity: 'Bastrop', destinationRegion: 'LA', destinationCountry: 'US',
    requestedPickupDate: '2026-06-10T08:00:00', pickupAppointment: '',
    grossWeightValue: 4300, grossWeightUomCode: 'lbs',
    orderLines: [{ productDescription: 'Plastic', hazardous: true }],
  }
  const q = buildUpdateOrderQuery('ORD-123', mo)
  assert.match(q.text, /UPDATE orders SET/)
  assert.match(q.text, /last_edit_at = now\(\)/)
  // identity columns are never written (order_number appears only in WHERE)
  const setClause = q.text.split('WHERE')[0]
  assert.doesNotMatch(setClause, /order_number =/)
  assert.doesNotMatch(setClause, /\bcustomer =/)
  assert.equal(JSON.parse(q.values[0]).customerId, 'ACME_LOG_01') // manual_order whole
  assert.equal(q.values[3], 'VAN')                                 // equipment
  assert.equal(JSON.parse(q.values[4]).city, 'Houston')            // consignor jsonb
  assert.equal(q.values[8], 'Plastic')                             // commodity
  assert.equal(q.values[9], true)                                  // hazardous derived from lines
  assert.equal(q.values[q.values.length - 1], 'ORD-123')           // WHERE key
  // blank timestamps must land as NULL, not an invalid cast
  assert.match(q.text, /NULLIF\(\$18,''\)::timestamptz/)
})

test('update order: missing key / missing body / missing row', async () => {
  await assert.rejects(() => updateOrder({ body: { manualOrder: {} }, db: null }), (e) => e.status === 400)
  await assert.rejects(() => updateOrder({ body: { orderNumber: 'x' }, db: null }), (e) => e.status === 400)
  const dbMiss = { query: async () => ({ rows: [] }) }
  await assert.rejects(() => updateOrder({ body: { orderNumber: 'x', manualOrder: {} }, db: dbMiss }), (e) => e.status === 404)
  const dbHit = { query: async () => ({ rows: [{ order_number: 'x' }] }) }
  assert.deepEqual(await updateOrder({ body: { orderNumber: 'x', manualOrder: {} }, db: dbHit }), { success: true, orderNumber: 'x' })
})
