import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildOrderListQuery, buildTabCountsQuery, buildOrderViewQuery, orderView } from './orders.mjs'

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
