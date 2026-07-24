import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCountsQuery, buildListQuery, buildDetailQuery, sellShipmentDetail } from './shipments.mjs'

test('counts: panel only', () => {
  const q = buildCountsQuery({ panel: 'exceptions', customerIds: undefined })
  assert.match(q.text, /GROUP BY category/)
  assert.deepEqual(q.values, ['exceptions'])
})

test('counts: customer scope; empty array = impossible filter', () => {
  const scoped = buildCountsQuery({ panel: 'monitoring', customerIds: ['VALTRIS_01'] })
  assert.match(scoped.text, /customer_id = ANY\(\$2\)/)
  const empty = buildCountsQuery({ panel: 'monitoring', customerIds: [] })
  assert.match(empty.text, /FALSE/)
})

test('list: pagination is 0-based, filters compose', () => {
  const q = buildListQuery({
    pageNumber: 2, pageSize: 25,
    filter: { panel: 'exceptions', category: 'date-issues', customerIds: ['VALTRIS_01'],
              dateFilters: { pickupDateFrom: '2026-04-01', pickupDateTo: '2026-04-30' } },
    sortBy: 'pickupDate', orderBy: 'desc',
  })
  assert.match(q.text, /ORDER BY pickup_ts DESC NULLS LAST/)
  assert.match(q.text, /OFFSET \$\d+/)
  assert.ok(q.values.includes(50))          // 2 * 25
  assert.ok(q.values.includes('date-issues'))
})

test('list: category "all" is not filtered; unknown sortBy falls back', () => {
  const q = buildListQuery({ pageNumber: 0, pageSize: 10, filter: { panel: 'exceptions', category: 'all' }, sortBy: 'DROP TABLE', orderBy: 'asc' })
  assert.ok(!q.values.includes('all'))
  assert.match(q.text, /ORDER BY pickup_ts/)   // whitelist fallback, never raw user input
})

// The live POST body (gridService.ts) flattens dateFilters/searchFilters/exact
// filters INTO `filter`, rather than nesting them. The builder must read both.
test('list: flattened live payload — dates + exact + substring spread into filter', () => {
  const q = buildListQuery({
    pageNumber: 0, pageSize: 50,
    filter: {
      panel: 'monitoring', category: 'all', customerIds: ['VALTRIS_01'],
      mode: 'TL',                               // exact-equality field (FIELD_MAP)
      pickupDateFrom: '2026-04-01', pickupDateTo: '2026-04-30',
    },
  })
  assert.match(q.text, /pickup_ts >= \$\d+/)
  assert.match(q.text, /pickup_ts < \(\$\d+::date \+ 1\)/)
  assert.match(q.text, /mode = \$\d+/)
  assert.ok(q.values.includes('TL'))
  assert.ok(q.values.includes('2026-04-01'))
})

// Free-text helper: scoped (attributeKey present) = single ILIKE; unscoped =
// OR across the shared field list.
test('list: searchTerm scoped to one attribute → single ILIKE', () => {
  const q = buildListQuery({
    pageNumber: 0, pageSize: 50,
    filter: { panel: 'exceptions', searchTerm: 'dallas', searchAttributeKey: 'origin' },
  })
  assert.match(q.text, /origin ILIKE \$\d+/)
  assert.ok(q.values.includes('%dallas%'))
  // exactly one ILIKE clause (no OR spray)
  assert.equal((q.text.match(/ILIKE/g) || []).length, 1)
})

test('list: searchTerm unscoped → OR across shared fields', () => {
  const q = buildListQuery({
    pageNumber: 0, pageSize: 50,
    filter: { panel: 'exceptions', searchTerm: 'acme' },
  })
  assert.match(q.text, /sell_shipment ILIKE .* OR .*customer_name ILIKE/s)
  assert.equal(q.values.filter((v) => v === '%acme%').length, 6)
})

test('list: empty customerIds → FALSE (honest empty on the list path)', () => {
  const q = buildListQuery({ filter: { customerIds: [] } })
  assert.match(q.text, /FALSE/)
})

test('detail: parameterized single-row lookup', () => {
  const q = buildDetailQuery('25004876')
  assert.match(q.text, /WHERE sell_shipment = \$1/)
  assert.deepEqual(q.values, ['25004876'])
})

test('detail handler: 404s on missing shipment, returns detail verbatim on hit', async () => {
  const dbHit = { query: async () => ({ rows: [{ detail: { shipmentId: 'x' } }] }) }
  assert.deepEqual(await sellShipmentDetail({ params: ['1'], db: dbHit }), { shipmentId: 'x' })
  const dbMiss = { query: async () => ({ rows: [] }) }
  await assert.rejects(() => sellShipmentDetail({ params: ['1'], db: dbMiss }), (e) => e.status === 404)
})
