import { test, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildCountsQuery, buildListQuery, buildDetailQuery, sellShipmentDetail, saveTender, buildTenderUpdateQuery, categoryCounts, buildOverridesQuery, saveShipmentOverrides, resolveOrderChange, adoptNewTenderList, buildTenderDeleteQuery, buildShippingOptionListQuery, mergeStops, buildSaveStopsQuery, computeListAggregates, buildCandidateOrdersQuery, candidateOrders } from './shipments.mjs'

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

// S148: odyssey_shipment_id must be sortable (SORT_MAP), filterable (FIELD_MAP)
// and searchable (FREE_TEXT_COLUMNS) — a field added to some but not all of
// these whitelists looks present but sorts dead or filters silently inert.
test('list: odysseyShipmentIdentifier sorts and filters via the whitelist maps', () => {
  const sorted = buildListQuery({
    pageNumber: 0, pageSize: 10, filter: { panel: 'exceptions' },
    sortBy: 'odysseyShipmentIdentifier', orderBy: 'asc',
  })
  // Prefix-blind: sorts on the SEQUENCE, not the raw text. Alphabetical order would
  // block every C… ahead of every O…, faking a consolidation grouping the grid does
  // not mean (user ruling, 2026-09-15), and would misorder once the sequence outgrows
  // 8 digits. The cast is the guard for both.
  assert.match(sorted.text, /ORDER BY substr\(odyssey_shipment_id, 2\)::bigint ASC/)
  assert.doesNotMatch(sorted.text, /ORDER BY odyssey_shipment_id\b/)

  const filtered = buildListQuery({
    pageNumber: 0, pageSize: 10,
    filter: { panel: 'exceptions', odysseyShipmentIdentifier: 'C50000123' },
  })
  assert.match(filtered.text, /odyssey_shipment_id = \$\d+/)
  assert.ok(filtered.values.includes('C50000123'))

  const freeText = buildListQuery({
    pageNumber: 0, pageSize: 10, filter: { panel: 'exceptions', searchTerm: 'O50000000' },
  })
  assert.match(freeText.text, /odyssey_shipment_id ILIKE \$\d+/)
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
  assert.match(q.text, /odyssey_shipment_id ILIKE .* OR .*customer_name ILIKE/s)
  assert.equal(q.values.filter((v) => v === '%acme%').length, 7)   // S148: +odyssey_shipment_id
})

test('list: empty customerIds → FALSE (honest empty on the list path)', () => {
  const q = buildListQuery({ filter: { customerIds: [] } })
  assert.match(q.text, /FALSE/)
})

// Part 3 (S158, user 2026-09-23): consolidate mode floats the selection to the
// top of page 1 client-side, so the server list must exclude those ids or
// they'd come back a second time on their own sorted page.
test('list: excludeIds parameterizes a NOT-IN and never leaks unfiltered', () => {
  const q = buildListQuery({
    pageNumber: 0, pageSize: 25,
    filter: { panel: 'exceptions', excludeIds: ['25004876', '25004877'] },
  })
  assert.match(q.text, /sell_shipment <> ALL\(\$\d+\)/)
  assert.ok(q.values.some((v) => Array.isArray(v) && v.includes('25004876') && v.includes('25004877')))

  const empty = buildListQuery({ pageNumber: 0, pageSize: 25, filter: { panel: 'exceptions', excludeIds: [] } })
  assert.doesNotMatch(empty.text, /sell_shipment <>/)
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

// Only an ACCEPTED tender puts a carrier on the freight, so only that shipment
// has anything to track (user, 2026-09-16). Enforced on READ because
// tender_status moves after the blob is written (resolveOrderChange).
const trackedDb = (tenderStatus) => ({
  query: async (q) => (q.text.includes('FROM shipments')
    ? { rows: [{ detail: { sellShipment: '1', trackingUrl: 'https://tracking.oneodyssey.com/t/441813' }, tender_status: tenderStatus }] }
    : { rows: [] }),
})

test('detail: an ACCEPTED tender keeps its tracking link', async () => {
  const detail = await sellShipmentDetail({ params: ['1'], db: trackedDb('Accepted') })
  assert.equal(detail.trackingUrl, 'https://tracking.oneodyssey.com/t/441813')
})

test('detail: every non-accepted tender status loses the tracking link', async () => {
  for (const status of ['Sent', 'Declined', 'Cancelled', null]) {
    const detail = await sellShipmentDetail({ params: ['1'], db: trackedDb(status) })
    assert.equal('trackingUrl' in detail, false, `trackingUrl survived tender status "${status}"`)
  }
})

test('detail: the query fetches tender_status — without it every link is stripped', async () => {
  assert.match(buildDetailQuery('1').text, /tender_status/)
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

// LINX-15796 BR-07/AC-06 (S156) — the once-only guard: an expectStatus makes
// the UPDATE conditional on the row's current status.
test('buildTenderUpdateQuery: appends AND status = $9 only when expectStatus is set', () => {
  const q = buildTenderUpdateQuery('1', { rank: 2, scac: 'JBHT' })
  assert.doesNotMatch(q.text, /status = \$9/)
  assert.equal(q.values.length, 8)

  const guarded = buildTenderUpdateQuery('1', { rank: 2, scac: 'JBHT' }, 'Sent')
  assert.match(guarded.text, /AND status = \$9/)
  assert.deepEqual(guarded.values, ['JBHT', null, null, null, null, JSON.stringify({ rank: 2, scac: 'JBHT' }), '1', 2, 'Sent'])
})

test('saveTender: expectStatus set + zero rows updated -> 409 already-processed, no insert fallback', async () => {
  const calls = []
  const db = { query: async (q) => { calls.push(q.text); return { rows: [] } } }
  await assert.rejects(
    () => saveTender({ params: ['1'], body: { option: { rank: 2, scac: 'JBHT' }, expectStatus: 'Sent' }, db }),
    (e) => e.status === 409 && e.message === 'already-processed',
  )
  assert.equal(calls.length, 1)              // no INSERT attempted
  assert.match(calls[0], /AND status = \$9/)
})

test('saveTender: expectStatus set + row updated -> succeeds normally', async () => {
  const db = { query: async () => ({ rows: [{ id: 7 }] }) }
  assert.deepEqual(
    await saveTender({ params: ['1'], body: { option: { rank: 2, scac: 'JBHT' }, expectStatus: 'Sent' }, db }),
    { success: true, rank: 2 },
  )
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

// Minimal db double, dispatched by query text (not call order — the overrides
// write is a single query, so a call-count check would mistake it for the
// detail SELECT and always hand back the hardcoded rowCount instead of the
// one the test configured). The detail SELECT and tenders lookup answer with
// `detailRow`/empty; anything else (the overrides UPDATE) answers with
// whatever `rowCount` the caller configured.
function fakeDb({ detailRow = { detail: {}, overrides: null }, rowCount = 1 } = {}) {
  return {
    query: async (q) => {
      if (q.text.includes('FROM shipments')) return { rows: [detailRow], rowCount: 1 }
      if (q.text.includes('FROM tenders')) return { rows: [], rowCount: 0 }
      return { rows: [], rowCount }
    },
  }
}

test('the list query prefers an override for mode and gross weight', () => {
  const q = buildListQuery({ filter: {} }, null)
  assert.match(q.text, /COALESCE\(overrides->>'mode', mode\) AS mode/)
  assert.match(q.text, /COALESCE\(overrides->>'grossWeight', gross_weight\) AS "grossWeight"/)
})

describe('shipment overrides', () => {
  it('buildOverridesQuery writes the whole object as one jsonb value', () => {
    const q = buildOverridesQuery('25068206', { mode: 'TL' })
    assert.match(q.text, /UPDATE shipments SET overrides = \$1/)
    assert.equal(q.values[0], JSON.stringify({ mode: 'TL' }))
    assert.equal(q.values[1], '25068206')
  })

  it('saveShipmentOverrides rejects a non-object body with 400', async () => {
    await assert.rejects(
      () => saveShipmentOverrides({ params: ['25068206'], body: { overrides: 'nope' }, db: fakeDb() }),
      (e) => e.status === 400,
    )
  })

  it('saveShipmentOverrides 404s when the shipment does not exist', async () => {
    const db = fakeDb({ rowCount: 0 })
    await assert.rejects(
      () => saveShipmentOverrides({ params: ['nope'], body: { overrides: {} }, db }),
      (e) => e.status === 404,
    )
  })

  it('sellShipmentDetail attaches overrides to the returned detail blob', async () => {
    const db = fakeDb({
      detailRow: { detail: { sellShipment: '25068206' }, overrides: { mode: 'TL' } },
    })
    const detail = await sellShipmentDetail({ params: ['25068206'], db })
    assert.deepEqual(detail.overrides, { mode: 'TL' })
  })

  it('sellShipmentDetail omits overrides entirely when the column is NULL', async () => {
    const db = fakeDb({ detailRow: { detail: { sellShipment: '25068206' }, overrides: null } })
    const detail = await sellShipmentDetail({ params: ['25068206'], db })
    assert.equal('overrides' in detail, false)
  })
})

// ── LINX-14514: order-change resolution (retender / bypass / cancel) ──────
describe('resolveOrderChange', () => {
  // Minimal db double for the non-save-stops actions (retender/bypass/cancel/
  // approve-plan): T4 opens ONE transaction for these too, so — same as the
  // save-stops fakes below — `query` is shared between the plain detail SELECT
  // and every write on the checked-out client, and calls land in one ordered
  // array. `detail` is the row `orderChange` lives under (defaults to `{}`,
  // i.e. no seeded order-change payload — every T4 write still runs, just
  // over an empty tender list).
  function mkOc(detail = {}, { failOn } = {}) {
    const calls = []
    const state = { released: false }
    const query = async (q) => {
      calls.push(q)
      const text = typeof q === 'string' ? q : q.text
      if (failOn && failOn.test(text)) throw new Error('write failed')
      if (/SELECT detail FROM shipments WHERE sell_shipment = \$1/.test(text)) return { rows: [{ detail }] }
      return { rows: [], rowCount: 1 }
    }
    const db = { query, connect: async () => ({ query, release: () => { state.released = true } }) }
    return { db, calls, state }
  }
  const textOf = (q) => (typeof q === 'string' ? q : q.text)
  const valuesOf = (calls) => calls.flatMap((q) => (typeof q === 'string' ? [] : q.values ?? []))

  it('retender moves the shipment to monitoring/sent and stamps the resolution, inside a transaction', async () => {
    const { db, calls } = mkOc()
    const res = await resolveOrderChange({
      params: ['S260000010'],
      body: { action: 'retender', cost: { choice: 'prior', amount: 1901.56 } },
      db,
    })
    assert.deepEqual(res, { success: true })
    const values = valuesOf(calls)
    assert.ok(values.includes('Sent') && values.includes('monitoring') && values.includes('sent'))
    assert.ok(values.some((v) => typeof v === 'string' && v.includes('"action":"retender"')))
    assert.ok(values.includes(null), 'retender clears validation_message')
    assert.ok(calls.some((q) => textOf(q) === 'BEGIN'))
    assert.equal(textOf(calls[calls.length - 1]), 'COMMIT')
  })

  it('retender with priorTenderStatus Accepted still becomes Sent (re-soliciting acceptance)', async () => {
    const { db, calls } = mkOc()
    await resolveOrderChange({ params: ['S1'], body: { action: 'retender', priorTenderStatus: 'Accepted' }, db })
    const values = valuesOf(calls)
    assert.ok(values.includes('Sent'))
    assert.ok(!values.includes('Accepted'))
  })

  it('bypass retains Accepted → monitoring/approved', async () => {
    const { db, calls } = mkOc()
    await resolveOrderChange({ params: ['S1'], body: { action: 'bypass', priorTenderStatus: 'Accepted' }, db })
    const values = valuesOf(calls)
    assert.ok(values.includes('Accepted') && values.includes('monitoring') && values.includes('approved'))
    assert.ok(!values.includes('sent'))
    assert.ok(values.includes(null), 'bypass clears validation_message')
  })

  it('bypass retains Sent → monitoring/sent', async () => {
    const { db, calls } = mkOc()
    await resolveOrderChange({ params: ['S1'], body: { action: 'bypass', priorTenderStatus: 'Sent' }, db })
    const values = valuesOf(calls)
    assert.ok(values.includes('Sent') && values.includes('monitoring') && values.includes('sent'))
    assert.ok(!values.includes('approved'))
    assert.ok(values.includes(null), 'bypass clears validation_message')
  })

  it('cancel stays in exceptions / tender-review with status Cancelled and the AC message', async () => {
    const { db, calls } = mkOc()
    await resolveOrderChange({ params: ['S1'], body: { action: 'cancel' }, db })
    const values = valuesOf(calls)
    assert.ok(values.includes('Cancelled') && values.includes('exceptions') && values.includes('tender-review'))
    // Verbatim LINX-14514 Cancel Tender AC text — cancel is the one action that
    // carries a real validation_message (the panel it lands on always has one).
    assert.ok(values.includes('User to review the current tender options and take appropriate action.'))
  })

  // ── T3 (S160): StopsTab's Approve Plan — Scenario B only (the client
  // gates Scenario A to no server call at all). No stops written; same
  // shape as bypass's non-active outcome. ──────────────────────────────
  it('approve-plan (non-active prior) behaves like bypass and writes the approve-plan resolution', async () => {
    const { db, calls } = mkOc()
    const res = await resolveOrderChange({ params: ['S1'], body: { action: 'approve-plan', priorTenderStatus: 'Sent' }, db })
    assert.deepEqual(res, { success: true })
    const values = valuesOf(calls)
    assert.ok(values.includes('Sent') && values.includes('monitoring') && values.includes('sent'))
    assert.ok(values.some((v) => typeof v === 'string' && v.includes('"action":"approve-plan"')))
    // No stops write — approve-plan never touches shipmentStopList.
    assert.ok(!calls.some((q) => /shipmentStopList/.test(textOf(q))))
  })

  it('approve-plan writes no stops even with a null priorTenderStatus (still non-active)', async () => {
    const { db, calls } = mkOc()
    await resolveOrderChange({ params: ['S1'], body: { action: 'approve-plan' }, db })
    const values = valuesOf(calls)
    assert.ok(values.includes('Sent') && values.includes('monitoring'))
  })

  it('rejects unknown action with 400', async () => {
    await assert.rejects(
      () => resolveOrderChange({ params: ['S1'], body: { action: 'nuke' }, db: { query: async () => ({ rowCount: 1 }) } }),
      (e) => /action/.test(e.message) && e.status === 400,
    )
  })

  it('404s on unknown shipment (detail read finds nothing, no transaction opened)', async () => {
    let connected = false
    const db = {
      query: async () => ({ rows: [] }),
      connect: async () => { connected = true; return { query: async () => ({}), release: () => {} } },
    }
    await assert.rejects(
      () => resolveOrderChange({ params: ['NOPE'], body: { action: 'cancel' }, db }),
      (e) => /No shipment/.test(e.message) && e.status === 404,
    )
    assert.ok(!connected, 'no client checked out for a 404')
  })

  // ── T4 (S160): the new tender list becomes current ──────────────────────
  describe('adoptNewTenderList', () => {
    // AAAA/BBBB are what routing returned this time (the new list); PRIOR is
    // the carrier the review screen is actually about, dropped by this
    // re-route (a 'not-returned' orderChange scenario, generate.mjs) — the
    // exact case the seed's `newOption.rank` (here: 2) exists to answer.
    const orderChange = {
      prior: { scac: 'PRIOR', tenderStatus: 'Sent' },
      newOption: { rank: 2 },
      priorTenderList: [
        { scac: 'PRIOR', carrierName: 'Prior Co', rank: 1, status: 'Sent', rateAmount: 900, equipmentCode: 'V' },
        { scac: 'BBBB', carrierName: 'B Co', rank: 2, status: '', rateAmount: 800, equipmentCode: 'V' },
      ],
      newTenderList: [
        { scac: 'AAAA', carrierName: 'A Co', rank: 1, status: '', rateAmount: 700, equipmentCode: 'V' },
        { scac: 'BBBB', carrierName: 'B Co', rank: 2, status: '', rateAmount: 810, equipmentCode: 'V' },
      ],
    }

    it('retender inserts the dropped prior carrier at its seeded rank, shifts later ranks, applies the chosen cost, and blanks everyone else', () => {
      const outcome = { tenderStatus: 'Sent' }
      const rows = adoptNewTenderList('retender', orderChange, { amount: 1234.56 }, outcome)
      assert.deepEqual(rows.map((o) => [o.scac, o.rank, o.status, o.rateAmount]), [
        ['AAAA', 1, '', 700],
        ['PRIOR', 2, 'Sent', 1234.56],
        ['BBBB', 3, '', 810],
      ])
    })

    it('bypass inserts the dropped prior using the OC_OUTCOMES bypass status (Accepted stays Accepted)', () => {
      const outcome = { tenderStatus: 'Accepted' } // OC_OUTCOMES.bypass('Accepted')
      const rows = adoptNewTenderList('bypass', orderChange, { amount: 950 }, outcome)
      const prior = rows.find((o) => o.scac === 'PRIOR')
      assert.equal(prior.status, 'Accepted')
      assert.equal(prior.rateAmount, 950)
      assert.equal(prior.rank, 2)
      assert.deepEqual(rows.filter((o) => o.scac !== 'PRIOR').map((o) => o.status), ['', ''])
    })

    it('retender/bypass skip insertion and cost when the prior carrier is missing a cost pick', () => {
      const rows = adoptNewTenderList('retender', orderChange, null, { tenderStatus: 'Sent' })
      const prior = rows.find((o) => o.scac === 'PRIOR')
      assert.equal(prior.status, 'Sent', 'still inserted and marked — only the COST application is gated on cost.amount')
      assert.equal(prior.rateAmount, 900, 'no numeric cost.amount ⇒ the priorTenderList row\'s own rate stands')
    })

    it('cancel marks the prior Cancelled only when routing actually returned it — never inserts it', () => {
      const returned = { ...orderChange, newTenderList: [{ ...orderChange.newTenderList[0] }, { scac: 'PRIOR', carrierName: 'Prior Co', rank: 2, status: '', rateAmount: 905, equipmentCode: 'V' }] }
      const rows = adoptNewTenderList('cancel', returned, null, { tenderStatus: 'Cancelled' })
      assert.equal(rows.length, 2)
      assert.equal(rows.find((o) => o.scac === 'PRIOR').status, 'Cancelled')

      const dropped = adoptNewTenderList('cancel', orderChange, null, { tenderStatus: 'Cancelled' })
      assert.equal(dropped.length, 2, 'PRIOR not returned — nothing inserted for it')
      assert.ok(!dropped.some((o) => o.scac === 'PRIOR'))
      assert.deepEqual(dropped.map((o) => o.status), ['', ''])
    })

    it('approve-plan / save-stops Scenario B: the new list stands untendered — every status blank, no insertion, no cost', () => {
      const rows = adoptNewTenderList('approve-plan', orderChange, { amount: 1234.56 }, { tenderStatus: 'Sent' })
      assert.equal(rows.length, 2, 'PRIOR never inserted for this outcome')
      assert.deepEqual(rows.map((o) => o.status), ['', ''])
      assert.deepEqual(rows.map((o) => o.rateAmount), [700, 810], 'cost.amount is ignored — 15671: no automatic tender action')
    })
  })

  it('retender/bypass/cancel replace the tenders table and detail.shippingOptionList in the SAME transaction', async () => {
    const detail = {
      orderChange: {
        prior: { scac: 'PRIOR', tenderStatus: 'Sent' },
        newOption: { rank: 2 },
        priorTenderList: [{ scac: 'PRIOR', carrierName: 'Prior Co', rank: 1, status: 'Sent', rateAmount: 900 }],
        newTenderList: [{ scac: 'AAAA', carrierName: 'A Co', rank: 1, status: '', rateAmount: 700 }],
      },
    }
    const { db, calls } = mkOc(detail)
    await resolveOrderChange({
      params: ['S1'], body: { action: 'retender', cost: { choice: 'new', amount: 1234.56 } }, db,
    })
    const texts = calls.map(textOf)
    const beginIdx = texts.indexOf('BEGIN')
    const commitIdx = texts.lastIndexOf('COMMIT')
    assert.ok(beginIdx > -1 && commitIdx > beginIdx)
    const deleteIdx = texts.findIndex((t) => /^DELETE FROM tenders/.test(t))
    assert.ok(deleteIdx > beginIdx && deleteIdx < commitIdx)
    const inserts = calls.filter((q, i) => i > deleteIdx && i < commitIdx && /^INSERT INTO tenders/.test(textOf(q)))
    assert.equal(inserts.length, 2, 'AAAA (untouched) + the inserted PRIOR row')
    assert.ok(inserts.some((q) => q.values[1] === 'PRIOR' && q.values[6] === 1234.56))
    const optionListWrite = calls.find((q) => /shippingOptionList/.test(textOf(q)))
    assert.ok(optionListWrite)
    const written = JSON.parse(optionListWrite.values[0])
    assert.deepEqual(written.map((o) => o.scac), ['AAAA', 'PRIOR'])
    // OC-open-22, same spirit: the grid's scac/ap_freight_cost columns follow
    // the carrier this resolution acted on — the prior carrier, re-costed.
    const resolveWrite = calls.find((q) => /orderChange,resolution/.test(textOf(q)))
    assert.ok(/scac = \$7, ap_freight_cost = \$8/.test(resolveWrite.text))
    assert.deepEqual(resolveWrite.values.slice(6), ['PRIOR', '1,234.56'])
  })

  it('cancel with a dropped prior falls the list-row scac/ap_freight_cost back to the new list\'s rank 1', async () => {
    const detail = {
      orderChange: {
        prior: { scac: 'PRIOR', tenderStatus: 'Sent' },
        newOption: { rank: 2 },
        priorTenderList: [{ scac: 'PRIOR', carrierName: 'Prior Co', rank: 1, status: 'Sent', rateAmount: 900 }],
        newTenderList: [{ scac: 'AAAA', carrierName: 'A Co', rank: 1, status: '', rateAmount: 700 }],
      },
    }
    const { db, calls } = mkOc(detail)
    await resolveOrderChange({ params: ['S1'], body: { action: 'cancel' }, db })
    const resolveWrite = calls.find((q) => /orderChange,resolution/.test(textOf(q)))
    assert.deepEqual(resolveWrite.values.slice(6), ['AAAA', '700.00'])
    const optionListWrite = calls.find((q) => /shippingOptionList/.test(textOf(q)))
    const written = JSON.parse(optionListWrite.values[0])
    assert.equal(written.length, 1, 'PRIOR was dropped by routing — never inserted for cancel')
  })

  it('a failing tender write rolls back the whole resolution — nothing left half-written', async () => {
    const { db, calls, state } = mkOc({ orderChange: { newTenderList: [] } }, { failOn: /^DELETE FROM tenders/ })
    await assert.rejects(() => resolveOrderChange({ params: ['S1'], body: { action: 'retender' }, db }))
    const texts = calls.map(textOf)
    assert.equal(texts[texts.length - 1], 'ROLLBACK')
    assert.ok(state.released, 'client released back to the pool even on the throwing path')
  })

  describe('buildTenderDeleteQuery / buildShippingOptionListQuery', () => {
    it('deletes every tender row for the shipment', () => {
      const q = buildTenderDeleteQuery('S1')
      assert.equal(q.text, 'DELETE FROM tenders WHERE shipment_sell_id = $1')
      assert.deepEqual(q.values, ['S1'])
    })

    it('writes the adopted rows into detail.shippingOptionList as one jsonb array', () => {
      const q = buildShippingOptionListQuery('S1', [{ scac: 'A' }])
      assert.match(q.text, /jsonb_set\(detail, '\{shippingOptionList\}', \$1::jsonb\)/)
      assert.deepEqual(q.values, [JSON.stringify([{ scac: 'A' }]), 'S1'])
    })
  })

  // ── S143 Task 3: save-stops (Edit Shipment Stops → Approve Changes) ──────
  it('save-stops rejects an empty stops array with 400', async () => {
    await assert.rejects(
      () => resolveOrderChange({ params: ['S1'], body: { action: 'save-stops', stops: [] }, db: { query: async () => ({ rows: [] }) } }),
      (e) => /stops/.test(e.message) && e.status === 400,
    )
  })

  it('save-stops with an active prior tender status writes only the stop merge — no refile, no resolution', async () => {
    const seen = []
    let released = false
    const detail = { orderList: [], shipmentStopList: [] }
    const query = async (q) => { seen.push(q); return { rows: [{ detail }] } }
    const db = { query, connect: async () => ({ query, release: () => { released = true } }) }
    const stops = [{ stopSequence: 1, stopType: 'pickup', orderIds: [], sourceStopSequence: null }]
    const res = await resolveOrderChange({
      params: ['S1'], body: { action: 'save-stops', priorTenderStatus: 'Sent', stops }, db,
    })
    assert.deepEqual(res, { success: true })
    assert.equal(seen.length, 4, 'detail read, BEGIN, stop write, COMMIT — no refile query, no resolution write')
    assert.match(seen[0].text, /SELECT detail FROM shipments/)
    assert.equal(seen[1], 'BEGIN')
    assert.match(seen[2].text, /jsonb_set\(detail, '\{shipmentStopList\}'/)
    assert.ok(!/resolution/.test(seen[2].text))
    assert.equal(seen[3], 'COMMIT')
    assert.ok(released, 'client released back to the pool')
  })

  it('save-stops resets orderChange.consolidation.stopChanges/locationChange in the same write', () => {
    const q = buildSaveStopsQuery('S1', [{ stopSequence: 1 }], [{ orderNumber: 'A' }])
    assert.match(q.text, /'\{orderChange,consolidation,stopChanges\}', '\{\}'::jsonb/)
    assert.match(q.text, /'\{orderChange,consolidation,locationChange\}', 'false'::jsonb/)
    assert.deepEqual(q.values, [
      JSON.stringify([{ stopSequence: 1 }]), JSON.stringify([{ orderNumber: 'A' }]), ['A'], '1', 'S1',
      '0', '0', [], [], 'Direct',
    ])
  })

  it('save-stops with resetChanges:false skips the consolidation-badge reset (source shipment in the 15872 move)', () => {
    const q = buildSaveStopsQuery('S1', [{ stopSequence: 1 }], [{ orderNumber: 'A' }], { resetChanges: false })
    assert.ok(!/stopChanges/.test(q.text))
    assert.ok(!/locationChange/.test(q.text))
  })

  // ── OC-open-22: list columns follow the roster in the same write ────────
  describe('computeListAggregates', () => {
    it('sums weight/lines, dedupes po/pickup numbers, and picks Direct/Consolidation, matching generate.mjs', () => {
      const orderList = [
        { orderNumber: 'A', grossWeightValue: 500, orderLines: [{}, {}], poNumber: 'PO-1', pickupNumber: 'PU-1' },
        { orderNumber: 'B', grossWeightValue: 250, orderLines: [{}], poNumber: 'PO-1', pickupNumber: 'PU-2' },
        { orderNumber: 'C', grossWeightValue: 100, orderLines: [{}, {}, {}], poNumber: null, pickupNumber: null },
      ]
      assert.deepEqual(computeListAggregates(orderList), {
        grossWeight: '850', loadCount: '6', poNumbers: ['PO-1'], pickupNumbers: ['PU-1', 'PU-2'], shipmentType: 'Consolidation',
      })
    })

    it('a single order is Direct, not Consolidation', () => {
      const agg = computeListAggregates([{ orderNumber: 'A', grossWeightValue: 500, orderLines: [{}], poNumber: 'PO-1', pickupNumber: 'PU-1' }])
      assert.equal(agg.shipmentType, 'Direct')
    })

    it('an empty orderList sums to zero, not NaN or a blocked shipmentType', () => {
      assert.deepEqual(computeListAggregates([]), { grossWeight: '0', loadCount: '0', poNumbers: [], pickupNumbers: [], shipmentType: 'Direct' })
    })
  })

  it('buildSaveStopsQuery carries the recomputed list columns for a target that gained an order', () => {
    const orderList = [
      { orderNumber: 'A', grossWeightValue: 500, orderLines: [{}], poNumber: 'PO-1', pickupNumber: 'PU-1' },
      { orderNumber: 'E', grossWeightValue: 700, orderLines: [{}, {}], poNumber: 'PO-9', pickupNumber: 'PU-9' },   // copied in from a source
    ]
    const q = buildSaveStopsQuery('9', [{ stopSequence: 1 }], orderList)
    assert.match(q.text, /gross_weight = \$6, load_count = \$7, po_numbers = \$8, pickup_numbers = \$9, shipment_type = \$10/)
    assert.deepEqual(q.values.slice(5), ['1200', '3', ['PO-1', 'PO-9'], ['PU-1', 'PU-9'], 'Consolidation'])
  })

  it('buildSaveStopsQuery carries the recomputed list columns for a source that lost an order down to Direct', () => {
    const orderList = [{ orderNumber: 'F', grossWeightValue: 300, orderLines: [{}], poNumber: 'PO-2', pickupNumber: 'PU-2' }]
    const q = buildSaveStopsQuery('77', [{ stopSequence: 1 }], orderList, { resetChanges: false })
    assert.deepEqual(q.values.slice(5), ['300', '1', ['PO-2'], ['PU-2'], 'Direct'])
  })

  it('save-stops with no active prior tender status (Cancelled) resolves like bypass, stamping a resolution, and adopts an empty tender list (T4)', async () => {
    const seen = []
    let released = false
    const detail = { orderList: [], shipmentStopList: [] } // no seeded orderChange — T4 still runs, over an empty list
    const query = async (q) => { seen.push(q); return { rows: [{ detail }] } }
    const db = { query, connect: async () => ({ query, release: () => { released = true } }) }
    const stops = [{ stopSequence: 1, stopType: 'pickup', orderIds: [], sourceStopSequence: null }]
    const res = await resolveOrderChange({
      params: ['S1'], body: { action: 'save-stops', priorTenderStatus: 'Cancelled', stops }, db,
    })
    assert.deepEqual(res, { success: true })
    assert.equal(seen.length, 7, 'detail read, BEGIN, stop write, resolve write, tender DELETE, shippingOptionList write, COMMIT')
    assert.equal(seen[1], 'BEGIN')
    assert.match(seen[3].text, /detail = jsonb_set\(detail, '\{orderChange,resolution\}'/)
    const values = seen[3].values
    assert.ok(values.includes('Cancelled') && values.includes('monitoring') && values.includes('sent'))
    assert.ok(values.some((v) => typeof v === 'string' && v.includes('"action":"save-stops"')))
    assert.match(seen[4].text, /^DELETE FROM tenders/)
    assert.match(seen[5].text, /shippingOptionList/)
    assert.deepEqual(JSON.parse(seen[5].values[0]), [])
    assert.equal(seen[6], 'COMMIT')
    assert.ok(released, 'client released back to the pool')
  })

  it('save-stops Scenario B adopts the seeded newTenderList the same way approve-plan does — untendered, no insertion', async () => {
    const seen = []
    const orderChange = {
      prior: { scac: 'PRIOR', tenderStatus: 'Sent' },
      newOption: { rank: 2 },
      priorTenderList: [{ scac: 'PRIOR', carrierName: 'Prior Co', rank: 1, status: 'Sent', rateAmount: 900 }],
      newTenderList: [{ scac: 'AAAA', carrierName: 'A Co', rank: 1, status: '', rateAmount: 700 }],
    }
    const detail = { orderList: [], shipmentStopList: [], orderChange }
    const query = async (q) => { seen.push(q); return { rows: [{ detail }] } }
    const db = { query, connect: async () => ({ query, release: () => {} }) }
    const stops = [{ stopSequence: 1, stopType: 'pickup', orderIds: [], sourceStopSequence: null }]
    await resolveOrderChange({ params: ['S1'], body: { action: 'save-stops', priorTenderStatus: 'Declined', stops }, db })
    const optionListWrite = seen.find((q) => /shippingOptionList/.test(q.text ?? ''))
    const written = JSON.parse(optionListWrite.values[0])
    assert.deepEqual(written.map((o) => [o.scac, o.status]), [['AAAA', '']], 'PRIOR (dropped by routing) is never inserted for a save')
    const inserts = seen.filter((q) => /^INSERT INTO tenders/.test(q.text ?? ''))
    assert.equal(inserts.length, 1)
  })
})

describe('save-stops with externalOrders (LINX-15872 slice)', () => {
  const target = { orderList: [{ orderNumber: 'A', grossWeightValue: 5 }, { orderNumber: 'B', grossWeightValue: 5 }], shipmentStopList: [] }
  const source = { orderList: [{ orderNumber: 'E', grossWeightValue: 7 }] }
  // failWrite lets a test make the FIRST shipmentStopList write throw, so the
  // ROLLBACK path is exercised without relying on the (pre-transaction)
  // validation failure — that path never opens a transaction to roll back.
  const mk = (srcRow, { failWrite = false } = {}) => {
    const calls = []
    const state = { released: false }
    const query = async (q) => {
      calls.push(q)
      const text = typeof q === 'string' ? q : q.text
      if (/SELECT detail FROM shipments WHERE sell_shipment = \$1/.test(text)) return { rows: [{ detail: target }] }
      if (/sell_shipment = ANY/.test(text)) return { rows: [srcRow] }
      if (failWrite && /shipmentStopList/.test(text)) throw new Error('write failed')
      return { rows: [], rowCount: 1 }
    }
    // db is a pg.Pool stand-in: plain queries (detail read, source
    // revalidation) go through db.query; the transaction checks out ONE
    // client via connect() and runs every write on it, same as the real code.
    const db = { query, connect: async () => ({ query, release: () => { state.released = true } }) }
    return { db, calls, state }
  }
  const body = {
    action: 'save-stops', priorTenderStatus: 'Sent',
    stops: [{ stopSequence: 1, stopType: 'pickup', orderIds: ['A', 'E'], sourceStopSequence: null }],
    externalOrders: [{ orderNumber: 'E', sourceSellShipment: '77' }],
  }

  it('copies the external record in, drops pending B, writes orderList + orders + order_count, and removes E from its source — one transaction', async () => {
    const src = {
      orderList: [{ orderNumber: 'E', grossWeightValue: 7 }, { orderNumber: 'F', grossWeightValue: 1 }],
      shipmentStopList: [
        { stopSequence: 1, stopType: 'pickup', orderIds: ['E'], facilityName: 'X', grossWeightValue: 7 },
        { stopSequence: 2, stopType: 'pickup', orderIds: ['F'], facilityName: 'Y', grossWeightValue: 1 },
        { stopSequence: 3, stopType: 'delivery', orderIds: ['E', 'F'], facilityName: 'Z', grossWeightValue: 8 },
      ],
    }
    const { db, calls, state } = mk({ sellShipment: '77', shipmentStatus: 'Review', tenderStatus: 'Cancelled', detail: src })
    await resolveOrderChange({ params: ['9'], body, db })
    const texts = calls.map((q) => (typeof q === 'string' ? q : q.text))
    // Deviation from the plan draft: the detail read + source revalidation
    // query both run BEFORE BEGIN (by design — a validation failure must
    // never open a transaction), so BEGIN is not texts[0]. Assert instead
    // that BEGIN opens once, COMMIT closes, and every stop write sits
    // between them — the "one transaction" guarantee the AC asks for.
    const beginIdx = texts.indexOf('BEGIN')
    assert.ok(beginIdx > -1, 'BEGIN issued')
    assert.equal(texts[texts.length - 1], 'COMMIT')
    const saves = calls.filter((q) => /shipmentStopList/.test(q.text))
    assert.equal(saves.length, 2) // target + source
    assert.ok(calls.every((q, i) => !/shipmentStopList/.test(q.text ?? '') || (i > beginIdx && i < calls.length - 1)))
    const [targetSave, sourceSave] = saves.map((q) => ({ q, stops: JSON.parse(q.values[0]), orderList: JSON.parse(q.values[1]), ids: q.values[2], sell: q.values[4] }))
    assert.equal(targetSave.sell, '9')
    assert.equal(targetSave.stops[0].grossWeightValue, 12) // A(5) + E(7): the copied record counted
    assert.deepEqual(targetSave.orderList.map((o) => o.orderNumber), ['A', 'E']) // B was pending → dropped
    assert.deepEqual(targetSave.ids, ['A', 'E'])
    assert.equal(sourceSave.sell, '77')
    assert.deepEqual(sourceSave.orderList.map((o) => o.orderNumber), ['F']) // E left its source (LINX-15872 "Source Shipment Update")
    assert.deepEqual(sourceSave.stops.map((s) => [s.stopSequence, s.orderIds]), [[1, ['F']], [2, ['F']]]) // emptied P1 dropped, renumbered
    assert.equal(sourceSave.stops[1].grossWeightValue, 1) // recomputed from its remaining order
    assert.deepEqual(sourceSave.ids, ['F'])
    // LINX-15872 "Remove the order from its source shipment" / OC-open-22 —
    // the `orders` table row (the system of record for who owns an order,
    // not just the two JSONB detail blobs above) gets repointed in the SAME
    // transaction: between BEGIN and COMMIT, not before/after it.
    const orderMove = calls.find((q) => /UPDATE orders SET shipment_sell_id/.test(q.text))
    assert.ok(orderMove, 'orders.shipment_sell_id repointed')
    assert.deepEqual(orderMove.values, ['9', ['E']])
    const moveIdx = calls.indexOf(orderMove)
    assert.ok(moveIdx > beginIdx && moveIdx < calls.length - 1)
    assert.ok(state.released, 'client released back to the pool')
  })

  it('does not touch orders.shipment_sell_id when externalOrders is empty', async () => {
    const plainBody = {
      action: 'save-stops', priorTenderStatus: 'Sent',
      stops: [{ stopSequence: 1, stopType: 'pickup', orderIds: ['A'], sourceStopSequence: null }],
      externalOrders: [],
    }
    const { db, calls } = mk({ sellShipment: '77', shipmentStatus: 'Review', tenderStatus: 'Cancelled', detail: source })
    await resolveOrderChange({ params: ['9'], body: plainBody, db })
    assert.ok(!calls.some((q) => /UPDATE orders SET shipment_sell_id/.test(q.text ?? '')))
  })

  it('a failing write rolls back and writes nothing further', async () => {
    // Two orders on the source (only E moves) — OC-open-23's backstop would
    // otherwise block this pick before BEGIN, and this test is about the
    // ROLLBACK path, not that check.
    const src = { orderList: [{ orderNumber: 'E', grossWeightValue: 7 }, { orderNumber: 'G', grossWeightValue: 3 }], shipmentStopList: [] }
    const { db, calls, state } = mk({ sellShipment: '77', shipmentStatus: 'Review', tenderStatus: 'Cancelled', detail: src }, { failWrite: true })
    await assert.rejects(() => resolveOrderChange({ params: ['9'], body, db }))
    const texts = calls.map((q) => (typeof q === 'string' ? q : q.text))
    assert.equal(texts[texts.length - 1], 'ROLLBACK')
    assert.ok(state.released, 'client released back to the pool even on the throwing path')
  })

  it('refuses when the source shipment is Done or has an active tender, naming the order — nothing written, no transaction opened', async () => {
    const { db, calls } = mk({ sellShipment: '77', shipmentStatus: 'Done', tenderStatus: 'Cancelled', detail: source })
    await assert.rejects(
      () => resolveOrderChange({ params: ['9'], body, db }),
      (e) => e.status === 400 && /cannot be moved/.test(e.message) && /Order impacted: E/.test(e.message),
    )
    assert.ok(!calls.some((q) => (typeof q === 'string' ? q : q.text) === 'BEGIN'))
    assert.ok(!calls.some((q) => /shipmentStopList/.test(q.text ?? '')))
  })

  // OC-open-23 (reversed 2026-09-25 per Jana, transcript @00:06:06 — "it's
  // definitely going to turn into consolidation"): moving every order of a
  // source in one pick, emptying it, is ALLOWED — no server backstop.
  it('allows a multi-pick that covers every order of a source, emptying it', async () => {
    const src = {
      orderList: [{ orderNumber: 'E', grossWeightValue: 7 }, { orderNumber: 'F', grossWeightValue: 3 }],
      shipmentStopList: [{ stopSequence: 1, stopType: 'pickup', orderIds: ['E', 'F'], grossWeightValue: 10 }],
    }
    const { db, calls } = mk({ sellShipment: '77', shipmentStatus: 'Review', tenderStatus: 'Cancelled', detail: src })
    const emptyingBody = {
      action: 'save-stops', priorTenderStatus: 'Sent',
      stops: [{ stopSequence: 1, stopType: 'pickup', orderIds: ['A', 'E', 'F'], sourceStopSequence: null }],
      externalOrders: [{ orderNumber: 'E', sourceSellShipment: '77' }, { orderNumber: 'F', sourceSellShipment: '77' }],
    }
    await resolveOrderChange({ params: ['9'], body: emptyingBody, db })
    const texts = calls.map((q) => (typeof q === 'string' ? q : q.text))
    assert.ok(texts.includes('BEGIN'))
    assert.equal(texts[texts.length - 1], 'COMMIT')
    // The emptied source is left as-is (empty orderList, no stops) — OC-open-23
    // remains open on what, if anything, happens to that empty shell.
    const sourceSave = calls.find((q) => /shipmentStopList/.test(q.text ?? '') && q.values[4] === '77')
    assert.deepEqual(JSON.parse(sourceSave.values[1]), [])
  })

  it('a partial pick that leaves at least one order on a multi-order source is not blocked', async () => {
    const src = {
      orderList: [{ orderNumber: 'E', grossWeightValue: 7 }, { orderNumber: 'F', grossWeightValue: 1 }],
      shipmentStopList: [{ stopSequence: 1, stopType: 'pickup', orderIds: ['F'] }],
    }
    const { db, calls } = mk({ sellShipment: '77', shipmentStatus: 'Review', tenderStatus: 'Cancelled', detail: src })
    await resolveOrderChange({ params: ['9'], body, db })   // body only moves E, leaves F
    assert.ok(calls.some((q) => (typeof q === 'string' ? q : q.text) === 'BEGIN'))
  })
})

describe('mergeStops', () => {
  const detail = {
    shipmentStopList: [
      { stopSequence: 1, stopType: 'pickup', orderIds: ['A'], facilityName: 'Old Whse', city: 'Chicago', address1: '1 St', region: 'IL', postal: '60601', timeZone: 'America/Chicago', scheduledDateTime: '2026-06-01', appointmentTime: '08:00 CDT', country: 'US', pickupNumber: 'PU-1' },
    ],
    orderList: [
      { orderId: 'A', grossWeightValue: 500, volumeValue: 10, orderLines: [{ packageCount: 3 }], pickupNumber: 'PU-1' },
      { orderId: 'B', grossWeightValue: 700, volumeValue: 20, orderLines: [{ packageCount: 4 }, { packageCount: 1 }], pickupNumber: 'PU-2' },
    ],
  }

  it('an existing stop keeps region/postal/timezone from the base row and gets recomputed totals', () => {
    const [merged] = mergeStops(detail, [
      { stopSequence: 1, stopType: 'pickup', orderIds: ['A', 'B'], sourceStopSequence: 1 },
    ])
    assert.equal(merged.region, 'IL')
    assert.equal(merged.postal, '60601')
    assert.equal(merged.timeZone, 'America/Chicago')
    assert.equal(merged.grossWeightValue, 1200)
    assert.equal(merged.volumeValue, 30)
    assert.equal(merged.packageCount, 8)
    assert.equal(merged.grossWeightUomCode, 'LB')
    assert.equal(merged.volumeUomCode, 'cuft')
    assert.equal(merged.pickupNumber, 'PU-1')
  })

  it('a created stop (sourceStopSequence null) takes the submitted location and recomputed totals', () => {
    const [merged] = mergeStops(detail, [
      { stopSequence: 2, stopType: 'delivery', orderIds: ['B'], facilityName: 'New Whse', city: 'Denver', address1: '2 Ave', scheduledDateTime: '2026-06-02', sourceStopSequence: null },
    ])
    assert.equal(merged.facilityName, 'New Whse')
    assert.equal(merged.city, 'Denver')
    assert.equal(merged.address1, '2 Ave')
    assert.equal(merged.scheduledDateTime, '2026-06-02')
    assert.equal(merged.appointmentTime, null)
    assert.equal(merged.country, 'US')
    assert.equal(merged.grossWeightValue, 700)
    assert.equal(merged.volumeValue, 20)
    assert.equal(merged.packageCount, 5)
    assert.equal(merged.pickupNumber, null, 'delivery stops never carry a pickupNumber')
  })

  it('pickupNumber scans every order on the stop, not just the first (generate.mjs R2-2 rule)', () => {
    const d = {
      ...detail,
      orderList: [
        { orderId: 'A', grossWeightValue: 500, volumeValue: 10, orderLines: [], pickupNumber: null },
        { orderId: 'B', grossWeightValue: 700, volumeValue: 20, orderLines: [], pickupNumber: 'PU-2' },
      ],
    }
    const [merged] = mergeStops(d, [
      { stopSequence: 1, stopType: 'pickup', orderIds: ['A', 'B'], sourceStopSequence: 1 },
    ])
    assert.equal(merged.pickupNumber, 'PU-2')
  })

  it('UoM codes are base-wins, not hardcoded — the base stop keeps its own unit', () => {
    const d = {
      ...detail,
      shipmentStopList: [{ ...detail.shipmentStopList[0], grossWeightUomCode: 'KG', volumeUomCode: 'cbm' }],
    }
    const [merged] = mergeStops(d, [
      { stopSequence: 1, stopType: 'pickup', orderIds: ['A'], sourceStopSequence: 1 },
    ])
    assert.equal(merged.grossWeightUomCode, 'KG')
    assert.equal(merged.volumeUomCode, 'cbm')
  })

  it('a created stop with no base falls back to LB/cuft', () => {
    const [merged] = mergeStops(detail, [
      { stopSequence: 2, stopType: 'delivery', orderIds: ['B'], sourceStopSequence: null },
    ])
    assert.equal(merged.grossWeightUomCode, 'LB')
    assert.equal(merged.volumeUomCode, 'cuft')
  })

  it('guards a row with no orderIds instead of throwing', () => {
    const [merged] = mergeStops(detail, [
      { stopSequence: 1, stopType: 'pickup', sourceStopSequence: 1 },
    ])
    assert.deepEqual(merged.orderIds, [])
    assert.equal(merged.grossWeightValue, 0)
  })
})

test('candidate orders: one query joining orders to their shipment, scoped to the customer, excluding the current shipment', () => {
  const q = buildCandidateOrdersQuery('9')
  assert.match(q.text, /FROM orders o JOIN shipments s ON s\.sell_shipment = o\.shipment_sell_id/)
  assert.match(q.text, /s\.customer_id = \(SELECT customer_id FROM shipments WHERE sell_shipment = \$1\)/)
  assert.match(q.text, /s\.sell_shipment <> \$1/)
  assert.deepEqual(q.values, ['9'])
})

test('candidateOrders handler builds rows through buildCandidateRows', async () => {
  const db = { query: async () => ({ rows: [{
    orderNumber: 'A', customer: 'ERCO', consignor: { city: 'Atlanta', state: 'GA', country: 'US', earliestPickupDateTime: '2026-06-04T08:00:00' },
    consignee: { city: 'Minneapolis', state: 'MN', country: 'US', earliestDeliveryDateTime: '2026-06-06T10:00:00' },
    grossWeight: { value: 500, uom: 'lbs' }, volume: { value: 40, uom: 'cbf' },
    sellShipment: '1', buyShipment: '900', customerId: 'ERCO', customerName: 'Erco', orders: ['A', 'B'],
    shipmentStatus: 'Review', tenderStatus: 'Sent', shipmentType: 'Consolidation',
  }] }) }
  const rows = await candidateOrders({ params: ['9'], query: new URLSearchParams('exclude=B'), db })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].origin, 'Atlanta, GA US')
  assert.deepEqual(rows[0].ordersInShipment, ['A', 'B'])
})
