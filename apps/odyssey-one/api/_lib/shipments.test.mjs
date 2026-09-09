import { test, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildCountsQuery, buildListQuery, buildDetailQuery, sellShipmentDetail, saveTender, categoryCounts, buildOverridesQuery, saveShipmentOverrides, resolveOrderChange, buildOrderChangeCostQuery, mergeStops, buildSaveStopsQuery, buildCandidateOrdersQuery, candidateOrders } from './shipments.mjs'

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
  it('retender moves the shipment to monitoring/sent and stamps the resolution', async () => {
    let seen = []
    const db = { query: async (q) => { seen.push(q); return { rowCount: 1, rows: [{}] } } }
    const res = await resolveOrderChange({
      params: ['S260000010'],
      body: { action: 'retender', cost: { choice: 'prior', amount: 1901.56 } },
      db,
    })
    assert.deepEqual(res, { success: true })
    const text = seen.map(q => q.text).join('\n')
    assert.match(text, /tender_status/)
    const values = seen.flatMap(q => q.values)
    assert.ok(values.includes('Sent') && values.includes('monitoring') && values.includes('sent'))
    assert.ok(values.some(v => typeof v === 'string' && v.includes('"action":"retender"')))
    assert.ok(values.includes(null), 'retender clears validation_message')
  })

  it('retender with priorTenderStatus Accepted still becomes Sent (re-soliciting acceptance)', async () => {
    const db = { query: async () => ({ rowCount: 1, rows: [{}] }) }
    const seen = []
    db.query = async (q) => { seen.push(q); return { rowCount: 1, rows: [{}] } }
    await resolveOrderChange({ params: ['S1'], body: { action: 'retender', priorTenderStatus: 'Accepted' }, db })
    const values = seen.flatMap(q => q.values)
    assert.ok(values.includes('Sent'))
    assert.ok(!values.includes('Accepted'))
  })

  it('bypass retains Accepted → monitoring/approved', async () => {
    const seen = []
    const db = { query: async (q) => { seen.push(q); return { rowCount: 1, rows: [{}] } } }
    await resolveOrderChange({ params: ['S1'], body: { action: 'bypass', priorTenderStatus: 'Accepted' }, db })
    const values = seen.flatMap(q => q.values)
    assert.ok(values.includes('Accepted') && values.includes('monitoring') && values.includes('approved'))
    assert.ok(!values.includes('sent'))
    assert.ok(values.includes(null), 'bypass clears validation_message')
  })

  it('bypass retains Sent → monitoring/sent', async () => {
    const seen = []
    const db = { query: async (q) => { seen.push(q); return { rowCount: 1, rows: [{}] } } }
    await resolveOrderChange({ params: ['S1'], body: { action: 'bypass', priorTenderStatus: 'Sent' }, db })
    const values = seen.flatMap(q => q.values)
    assert.ok(values.includes('Sent') && values.includes('monitoring') && values.includes('sent'))
    assert.ok(!values.includes('approved'))
    assert.ok(values.includes(null), 'bypass clears validation_message')
  })

  it('cancel stays in exceptions / tender-review with status Cancelled and the AC message', async () => {
    const seen = []
    const db = { query: async (q) => { seen.push(q); return { rowCount: 1, rows: [{}] } } }
    await resolveOrderChange({ params: ['S1'], body: { action: 'cancel' }, db })
    const values = seen.flatMap(q => q.values)
    assert.ok(values.includes('Cancelled') && values.includes('exceptions') && values.includes('tender-review'))
    // Verbatim LINX-14514 Cancel Tender AC text — cancel is the one action that
    // carries a real validation_message (the panel it lands on always has one).
    assert.ok(values.includes('User to review the current tender options and take appropriate action.'))
  })

  it('rejects unknown action with 400', async () => {
    await assert.rejects(
      () => resolveOrderChange({ params: ['S1'], body: { action: 'nuke' }, db: { query: async () => ({ rowCount: 1 }) } }),
      (e) => /action/.test(e.message) && e.status === 400,
    )
  })

  it('404s on unknown shipment', async () => {
    await assert.rejects(
      () => resolveOrderChange({ params: ['NOPE'], body: { action: 'cancel' }, db: { query: async () => ({ rowCount: 0 }) } }),
      (e) => /No shipment/.test(e.message) && e.status === 404,
    )
  })

  // ── S137: cost selected on Review Order Change lands on the carrier's tender ──
  it('retender with a cost + priorScac also updates that carrier\'s tender row', async () => {
    const seen = []
    const db = { query: async (q) => { seen.push(q); return { rowCount: 1, rows: [{}] } } }
    await resolveOrderChange({
      params: ['S1'],
      body: { action: 'retender', cost: { choice: 'new', amount: 2100.5 }, priorScac: 'ABCD' },
      db,
    })
    assert.equal(seen.length, 2)
    assert.match(seen[1].text, /UPDATE tenders SET rate_amount/)
    assert.match(seen[1].text, /jsonb_set/)
    assert.deepEqual(seen[1].values, [2100.5, '2100.5', 'S1', 'ABCD'])
  })

  it('bypass with a cost + priorScac also updates that carrier\'s tender row', async () => {
    const seen = []
    const db = { query: async (q) => { seen.push(q); return { rowCount: 1, rows: [{}] } } }
    await resolveOrderChange({
      params: ['S1'],
      body: { action: 'bypass', priorTenderStatus: 'Sent', cost: { choice: 'prior', amount: 900 }, priorScac: 'WXYZ' },
      db,
    })
    assert.equal(seen.length, 2)
    assert.deepEqual(seen[1].values, [900, '900', 'S1', 'WXYZ'])
  })

  it('cancel does not touch the tender row even with a cost + priorScac present', async () => {
    const seen = []
    const db = { query: async (q) => { seen.push(q); return { rowCount: 1, rows: [{}] } } }
    await resolveOrderChange({
      params: ['S1'],
      body: { action: 'cancel', cost: { choice: 'new', amount: 500 }, priorScac: 'ABCD' },
      db,
    })
    assert.equal(seen.length, 1, 'cancel drops the tender — no carrier row left to cost')
  })

  it('retender with a cost but no priorScac skips the tender update', async () => {
    const seen = []
    const db = { query: async (q) => { seen.push(q); return { rowCount: 1, rows: [{}] } } }
    await resolveOrderChange({
      params: ['S1'],
      body: { action: 'retender', cost: { choice: 'new', amount: 500 } },
      db,
    })
    assert.equal(seen.length, 1)
  })

  it('retender with priorScac but no cost skips the tender update', async () => {
    const seen = []
    const db = { query: async (q) => { seen.push(q); return { rowCount: 1, rows: [{}] } } }
    await resolveOrderChange({
      params: ['S1'],
      body: { action: 'retender', priorScac: 'ABCD' },
      db,
    })
    assert.equal(seen.length, 1)
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
    assert.deepEqual(q.values, [JSON.stringify([{ stopSequence: 1 }]), JSON.stringify([{ orderNumber: 'A' }]), ['A'], '1', 'S1'])
  })

  it('save-stops with resetChanges:false skips the consolidation-badge reset (source shipment in the 15872 move)', () => {
    const q = buildSaveStopsQuery('S1', [{ stopSequence: 1 }], [{ orderNumber: 'A' }], { resetChanges: false })
    assert.ok(!/stopChanges/.test(q.text))
    assert.ok(!/locationChange/.test(q.text))
  })

  it('save-stops with no active prior tender status (Cancelled) resolves like bypass, stamping a resolution', async () => {
    const seen = []
    let released = false
    const detail = { orderList: [], shipmentStopList: [] }
    const query = async (q) => { seen.push(q); return { rows: [{ detail }] } }
    const db = { query, connect: async () => ({ query, release: () => { released = true } }) }
    const stops = [{ stopSequence: 1, stopType: 'pickup', orderIds: [], sourceStopSequence: null }]
    const res = await resolveOrderChange({
      params: ['S1'], body: { action: 'save-stops', priorTenderStatus: 'Cancelled', stops }, db,
    })
    assert.deepEqual(res, { success: true })
    assert.equal(seen.length, 5, 'detail read, BEGIN, stop write, resolve write, COMMIT')
    assert.equal(seen[1], 'BEGIN')
    assert.match(seen[3].text, /detail = jsonb_set\(detail, '\{orderChange,resolution\}'/)
    const values = seen[3].values
    assert.ok(values.includes('Cancelled') && values.includes('monitoring') && values.includes('sent'))
    assert.ok(values.some((v) => typeof v === 'string' && v.includes('"action":"save-stops"')))
    assert.equal(seen[4], 'COMMIT')
    assert.ok(released, 'client released back to the pool')
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
    assert.ok(state.released, 'client released back to the pool')
  })

  it('a failing write rolls back and writes nothing further', async () => {
    const src = { orderList: [{ orderNumber: 'E', grossWeightValue: 7 }], shipmentStopList: [] }
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

describe('buildOrderChangeCostQuery', () => {
  it('addresses the tender row by (shipment_sell_id, scac) and syncs rate_amount + the option blob', () => {
    const q = buildOrderChangeCostQuery('S1', 'ABCD', 1234.56)
    assert.match(q.text, /UPDATE tenders SET rate_amount = \$1/)
    assert.match(q.text, /jsonb_set\(option, '\{rateAmount\}', \$2::jsonb\)/)
    assert.match(q.text, /WHERE shipment_sell_id = \$3 AND scac = \$4/)
    assert.deepEqual(q.values, [1234.56, '1234.56', 'S1', 'ABCD'])
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
