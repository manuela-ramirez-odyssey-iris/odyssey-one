import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCountsQuery, buildListQuery, buildDetailQuery, sellShipmentDetail, saveTender, categoryCounts } from './shipments.mjs'

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

test('detail: tenders table overrides the frozen shippingOptionList', async () => {
  const db = {
    query: async (q) => (q.text.includes('FROM shipments')
      ? { rows: [{ detail: { sellShipment: '1', shippingOptionList: [{ rank: 1, scac: 'OLD' }] } }] }
      : { rows: [{ option: { rank: 1, scac: 'NEW' } }, { option: { rank: 2, scac: 'ADDED' } }] }),
  }
  const detail = await sellShipmentDetail({ params: ['1'], db })
  assert.deepEqual(detail.shippingOptionList.map(o => o.scac), ['NEW', 'ADDED'])
})

test('detail: empty tenders table falls back to the detail blob', async () => {
  const db = {
    query: async (q) => (q.text.includes('FROM shipments')
      ? { rows: [{ detail: { shippingOptionList: [{ rank: 1, scac: 'SEED' }] } }] }
      : { rows: [] }),
  }
  const detail = await sellShipmentDetail({ params: ['1'], db })
  assert.deepEqual(detail.shippingOptionList.map(o => o.scac), ['SEED'])
})

test('saveTender: updates in place, inserts only when no row matched', async () => {
  const seen = []
  const dbHit = { query: async (q) => { seen.push(q.text); return { rows: [{ id: 7 }] } } }
  assert.deepEqual(await saveTender({ params: ['1'], body: { option: { rank: 2, scac: 'JBHT' } }, db: dbHit }),
    { success: true, rank: 2 })
  assert.equal(seen.length, 1)
  assert.match(seen[0], /UPDATE tenders/)

  const inserted = []
  const dbMiss = { query: async (q) => { inserted.push(q.text); return { rows: [] } } }
  await saveTender({ params: ['1'], body: { option: { rank: 9, scac: 'ABFS' } }, db: dbMiss })
  assert.equal(inserted.length, 2)
  assert.match(inserted[1], /INSERT INTO tenders/)
})

test('saveTender: rejects a missing option or rank', async () => {
  await assert.rejects(() => saveTender({ params: ['1'], body: {}, db: null }), (e) => e.status === 400)
  await assert.rejects(() => saveTender({ params: ['1'], body: { option: { scac: 'X' } }, db: null }), (e) => e.status === 400)
})

// ── S104: the gap that produced "search keeps showing me all results" ──
// buildListQuery never read filter.searchCriteria, buildCountsQuery took no
// criteria at all, and SORT_MAP had no relevance entry. Every reported symptom
// — full table, unfiltered tab counts, first rows matching nothing — was this.

test('searchCriteria reaches the SQL (it was silently dropped before)', () => {
  const { text } = buildListQuery({
    filter: { panel: 'monitoring', searchCriteria: { chips: [], text: '442376' } },
  })
  assert.ok(text.includes('search_index'))
})

test('relevance sort orders by the ranked CTE, not by a column', () => {
  const { text } = buildListQuery({
    filter: { panel: 'monitoring', searchCriteria: { chips: [], text: '442376' } },
    sortBy: 'relevance',
  })
  assert.match(text, /ORDER BY\s+r\.tier/)
})

test('relevance order is TOTAL and matches the preview tiebreak exactly (GS-16)', () => {
  const { text } = buildListQuery({
    filter: { panel: 'monitoring', searchCriteria: { chips: [], text: '442376' } },
    sortBy: 'relevance',
  })
  assert.match(text, /ORDER BY\s+r\.tier,\s*r\.priority,\s*r\.display,\s*sell_shipment/)
})

test('an explicit column sort still wins over relevance', () => {
  const { text } = buildListQuery({
    filter: { panel: 'monitoring', searchCriteria: { chips: [], text: '442376' } },
    sortBy: 'customerName', orderBy: 'asc',
  })
  assert.ok(text.includes('customer_name ASC'))
  assert.ok(!/ORDER BY\s+r\.tier/.test(text))
  assert.ok(text.includes('search_index'), 'still RESTRICTED to the hit set')
})

test('relevance sort without criteria falls back to a real column, never r.tier', () => {
  // ShipmentsRoute can hold RELEVANCE_SORT while the bar is cleared.
  const { text } = buildListQuery({ filter: { panel: 'monitoring' }, sortBy: 'relevance' })
  assert.ok(!text.includes('r.tier'))
  assert.ok(!text.includes('search_index'))
  assert.ok(text.includes('pickup_ts'))
})

test('blank / whitespace criteria text does not restrict the list', () => {
  for (const t of ['', '   ', null, undefined]) {
    const { text } = buildListQuery({ filter: { panel: 'monitoring', searchCriteria: { chips: [], text: t } } })
    assert.ok(!text.includes('search_index'), `"${t}" should not filter`)
  }
})

test('counts accept criteria so tab badges narrow with the search', () => {
  const { text } = buildCountsQuery({
    panel: 'monitoring', searchCriteria: { chips: [], text: '442376' },
  })
  assert.ok(text.includes('search_index'))
})

test('counts without criteria stay the plain grouped count', () => {
  const { text } = buildCountsQuery({ panel: 'monitoring' })
  assert.ok(!text.includes('search_index'))
  assert.ok(text.includes('GROUP BY category'))
})

test('criteria text is parameterized in both list and counts', () => {
  const inject = "x'; DROP TABLE shipments--"
  for (const q of [
    buildListQuery({ filter: { panel: 'm', searchCriteria: { chips: [], text: inject } } }),
    buildCountsQuery({ panel: 'm', searchCriteria: { chips: [], text: inject } }),
  ]) {
    assert.ok(!q.text.includes('DROP TABLE'))
    assert.ok(q.values.includes(inject.toUpperCase()))
  }
})

// ── Committed chips reach list + counts (GS-12 follow-up) ──────────────────
// relevanceJoin only ever read searchCriteria.text; a chips-only criteria
// (the committed-suggestion flow, text cleared on commit) produced NO join at
// all, so the grid showed the whole panel while the glimpse showed a filtered
// preview — the same blank/wrong-total bug as the search-panel glimpse.

test('list: chips-only searchCriteria (no text) still restricts — this was the blank-glimpse bug', () => {
  const q = buildListQuery({
    filter: { panel: 'monitoring', searchCriteria: { chips: [{ key: 'order', queryValue: '44237' }], text: '' } },
  })
  assert.ok(q.text.includes('search_index'), 'chips alone must still JOIN the ranked hit set')
  assert.ok(q.values.includes('44237'))
})

test('list: chips AND text both restrict the ranked join', () => {
  const q = buildListQuery(
    {
      filter: {
        panel: 'monitoring',
        searchCriteria: { chips: [{ key: 'pro', queryValue: 'PRO-1' }], text: '442376' },
      },
    },
    ['442376'],
  )
  assert.ok(q.text.includes('search_index'))
  assert.ok(q.values.includes('PRO1')) // upperStrip normalized
  assert.ok(q.values.includes('442376'))
})

test('list: no chips + no text → no join (unchanged)', () => {
  const q = buildListQuery({ filter: { panel: 'monitoring', searchCriteria: { chips: [], text: '' } } })
  assert.ok(!q.text.includes('search_index'))
})

// Reachable 500 (re-review finding): a chip on a real progression attribute
// that is NOT in the server registry (e.g. "Mode: TL") used to make
// buildHits return `sql: ''`, which relevanceJoin/buildRankedSubquery embed
// into `WITH hits AS ()` / `FROM () h` — a Postgres syntax error, not an empty
// result — on the list AND the counts query (both route through buildHits).
test('list: chips-only with ONLY a non-registry chip → honest-empty JOIN, no syntax error', () => {
  const q = buildListQuery({
    filter: { panel: 'monitoring', searchCriteria: { chips: [{ key: 'mode', queryValue: 'TL' }], text: '' } },
  })
  assert.match(q.text, /WHERE FALSE/)
  assert.equal((q.text.match(/\(/g) || []).length, (q.text.match(/\)/g) || []).length)
})

test('counts: chips-only with ONLY a non-registry chip → honest-empty JOIN, no syntax error', () => {
  const q = buildCountsQuery({
    panel: 'monitoring', searchCriteria: { chips: [{ key: 'tender-status', queryValue: 'Accepted' }], text: '' },
  })
  assert.match(q.text, /WHERE FALSE/)
  assert.equal((q.text.match(/\(/g) || []).length, (q.text.match(/\)/g) || []).length)
})

test('counts: chips-only searchCriteria still restricts the tab badges', () => {
  const q = buildCountsQuery({
    panel: 'monitoring', searchCriteria: { chips: [{ key: 'customer-name', queryValue: 'Acme Co' }], text: '' },
  })
  assert.ok(q.text.includes('search_index'))
  assert.ok(q.values.includes('ACME CO'))
})

test('categoryCounts handler: parses searchChips off the query string and restricts the counts', async () => {
  let seenQuery
  const db = {
    query: async (q) => { seenQuery = q; return { rows: [{ category: 'date-issues', count: 3 }] } },
  }
  const query = new URLSearchParams({
    panel: 'monitoring',
    searchChips: JSON.stringify([{ key: 'order', queryValue: '44237' }]),
  })
  const result = await categoryCounts({ query, db })
  assert.deepEqual(result, { errorOverview: [{ category: 'date-issues', count: 3 }] })
  assert.ok(seenQuery.text.includes('search_index'))
  assert.ok(seenQuery.values.includes('44237'))
})

test('categoryCounts handler: malformed searchChips JSON is ignored, not a 500', async () => {
  let seenQuery
  const db = { query: async (q) => { seenQuery = q; return { rows: [] } } }
  const query = new URLSearchParams({ panel: 'monitoring', searchChips: '{not json' })
  await categoryCounts({ query, db })
  assert.ok(!seenQuery.text.includes('search_index'), 'bad JSON falls back to no chip restriction')
})

test('categoryCounts handler: valid-but-non-array searchChips is ignored, not a 500', async () => {
  // JSON.parse('{"a":1}') succeeds — a bare object would reach validChips'
  // `.filter(...)` and throw "chips.filter is not a function" without the
  // Array.isArray guard.
  let seenQuery
  const db = { query: async (q) => { seenQuery = q; return { rows: [] } } }
  const query = new URLSearchParams({ panel: 'monitoring', searchChips: '{"a":1}' })
  await categoryCounts({ query, db })
  assert.ok(!seenQuery.text.includes('search_index'), 'non-array JSON falls back to no chip restriction')
})

test('explicit needles override the phrase (the handler resolves GS-20 code lists)', () => {
  const { values } = buildListQuery(
    { filter: { panel: 'm', searchCriteria: { chips: [], text: 'A1 B2' } } },
    ['A1', 'B2'],
  )
  assert.ok(values.includes('A1'))
  assert.ok(values.includes('B2'))
  assert.ok(!values.includes('A1 B2'))
})
