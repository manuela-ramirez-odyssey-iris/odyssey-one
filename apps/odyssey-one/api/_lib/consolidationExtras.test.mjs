// Ramesh #4/#5/#6 (LINX-15786 BR II, S165) — the consolidation workbench's
// extra row fields: Total Volume + the origin/destination location ids. Own file
// so the S165 hunks stay out of shipments.test.mjs (another session edits it).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildListQuery, CONSOLIDATION_EXTRAS, shipmentErrorList } from './shipments.mjs'

const body = { pageSize: 50, filter: { panel: 'monitoring', category: 'consolidation' }, sortBy: 'origin', orderBy: 'desc' }
const squash = (s) => s.replace(/\s+/g, ' ')

test('without the flag the list SQL carries no extras (other tabs pay nothing)', () => {
  const { text } = buildListQuery(body)
  assert.doesNotMatch(text, /LATERAL|totalVolume|LocationId|__pos|FROM orders|FROM stops/)
  assert.doesNotMatch(buildListQuery({ ...body, extras: 'something-else' }).text, /LATERAL/)
})

test('with the flag the extras join over the PAGED rows, not every matching row', () => {
  const { text, values } = buildListQuery({ ...body, extras: CONSOLIDATION_EXTRAS })
  const sql = squash(text)
  // The paged SELECT (count(*) OVER, ORDER BY, LIMIT/OFFSET) is the inner subquery…
  const inner = sql.match(/FROM \((SELECT .*?LIMIT \$\d+ OFFSET \$\d+)\) p /)
  assert.ok(inner, 'paged SELECT is wrapped as subquery p')
  assert.match(inner[1], /count\(\*\) OVER\(\)::int AS "__total"/)
  // …and none of the extras live in it, so they never run beside count(*) OVER().
  assert.doesNotMatch(inner[1], /orders\.shipment_sell_id|FROM stops|LATERAL/)
  assert.match(sql, /^SELECT p\.\*, .* FROM \(SELECT /)
  assert.equal((sql.match(/LEFT JOIN LATERAL/g) ?? []).length, 3)
  // The page order survives the join: positioned inside, re-sorted outside.
  assert.match(inner[1], /row_number\(\) OVER \(ORDER BY origin DESC NULLS LAST\) AS "__pos"/)
  assert.match(sql, /ORDER BY p\."__pos"$/)
  // Same parameters as the plain list — the wrapper adds no binds.
  assert.deepEqual(values, buildListQuery(body).values)
})

test('volume is summed over the shipment\'s orders; first pickup / last delivery pick the location', () => {
  const sql = squash(buildListQuery({ ...body, extras: CONSOLIDATION_EXTRAS }).text)
  assert.match(sql, /SELECT sum\(NULLIF\(regexp_replace\(volume->>'value', '\[\^0-9\.\]', '', 'g'\), ''\)::numeric\)::float8 AS total FROM orders WHERE orders\.shipment_sell_id = p\."sellShipment"\) v ON TRUE/)
  assert.match(sql, /v\.total AS "totalVolume"/)
  assert.match(sql, /stop_type = 'pickup' ORDER BY \(data->>'facilityName' IS NOT DISTINCT FROM p\.consignor\) DESC, sequence ASC LIMIT 1\) o ON TRUE/)
  assert.match(sql, /stop_type = 'delivery' ORDER BY \(data->>'facilityName' IS NOT DISTINCT FROM p\.consignee\) DESC, sequence DESC LIMIT 1\) d ON TRUE/)
  assert.match(sql, /o\.location_id AS "originLocationId", d\.location_id AS "destinationLocationId"/)
})

test('the relevance sort positions rows by the same tiebreak chain', () => {
  const { text } = buildListQuery({ ...body, sortBy: 'relevance', extras: CONSOLIDATION_EXTRAS, filter: { ...body.filter, searchCriteria: { text: 'dallas', chips: [] } } }, ['dallas'])
  assert.match(squash(text), /row_number\(\) OVER \(ORDER BY r\.tier, r\.priority, r\.display, sell_shipment\) AS "__pos"/)
})

test('the handler strips the page position like the total', async () => {
  const db = { query: async () => ({ rows: [{ sellShipment: 'S1', __total: 1, __pos: '1', totalVolume: 12.5, originLocationId: 'A', destinationLocationId: null }] }) }
  const res = await shipmentErrorList({ body: { ...body, extras: CONSOLIDATION_EXTRAS }, db })
  assert.deepEqual(res.rows, [{ sellShipment: 'S1', totalVolume: 12.5, originLocationId: 'A', destinationLocationId: null }])
})
