import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildOrderListQuery, buildTabCountsQuery } from './orders.mjs'

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
