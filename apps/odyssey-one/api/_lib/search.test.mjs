import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSearchQuery, buildSuggestQuery, buildValuesQuery, valuesHandler, MIN_TRGM } from './search.mjs'
import { SHIPMENTS_ATTRS } from './search-registry.mjs'

// 42P18 guard: every bound $N must be referenced in the SQL text, or Postgres
// can't determine that parameter's type ("could not determine data type of
// parameter $1") — reachable whenever an early-out returns SQL that ignores
// params bound before the early-out ran (exactly the honest-empty regression:
// `dom`/`scope` used to bind $1/$2 even when the returned SQL never mentioned
// them). Call this on every builder-output pair in this file.
function assertAllParamsReferenced(text, values) {
  values.forEach((_, i) => assert.ok(text.includes(`$${i + 1}`), `param $${i + 1} bound but unreferenced`))
}

test('exact + prefix tiers only for a short needle (trgm cannot serve <3 chars)', () => {
  const { text, values } = buildSearchQuery({ domain: 'shipments', needles: ['AB'], limit: 15 })
  assert.ok(text.includes('value = '))
  assert.ok(text.includes("|| '%'"))
  assert.ok(!text.includes("'%' ||"), 'no contains branch below the trigram floor')
  assertAllParamsReferenced(text, values)
})

test('all three tiers for a needle at or above the trigram floor', () => {
  assert.equal(MIN_TRGM, 3)
  const { text, values } = buildSearchQuery({ domain: 'shipments', needles: ['ABC'], limit: 15 })
  assert.ok(text.includes("'%' ||"))
  assertAllParamsReferenced(text, values)
})

test('multi-code needles UNION (GS-20), deduped to each entity best tier', () => {
  const { text, values } = buildSearchQuery({ domain: 'shipments', needles: ['A1', 'B2'], limit: 15 })
  assert.ok(values.includes('A1'))
  assert.ok(values.includes('B2'))
  assert.ok(text.includes('DISTINCT ON (entity_id)'))
  assert.ok(!text.includes('INTERSECT'), 'union, never intersect')
  assertAllParamsReferenced(text, values)
})

test('order is TOTAL so LIMIT 15 is provably rows 1-15 of the table (GS-16)', () => {
  const { text, values } = buildSearchQuery({ domain: 'shipments', needles: ['A1'], limit: 15 })
  assert.match(text, /ORDER BY\s+tier,\s*priority,\s*display,\s*entity_id/)
  assertAllParamsReferenced(text, values)
})

test('customer scope is applied as a subquery, never string-interpolated', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: ['A1'], limit: 15, customerIds: ['VALTRIS_01'],
  })
  assert.ok(text.includes('customer_id = ANY('))
  assert.ok(values.some((v) => Array.isArray(v) && v[0] === 'VALTRIS_01'))
  assertAllParamsReferenced(text, values)
})

// Every user-supplied string must arrive as a bound parameter. A needle carrying
// a quote is the cheapest possible injection probe.
test('needles are parameterized, never inlined into the SQL text', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: ["O'BRIEN'; DROP TABLE shipments--"], limit: 15,
  })
  assert.ok(!text.includes('DROP TABLE'))
  assert.ok(values.includes("O'BRIEN'; DROP TABLE SHIPMENTS--"))
  assertAllParamsReferenced(text, values)
})

// The priority CASE is built from registry KEYS (ours, not the user's), but it is
// the one place a string reaches the SQL text — so it must still be escaped.
test('the priority CASE covers every registry attribute', () => {
  const { text, values } = buildSearchQuery({ domain: 'shipments', needles: ['A1'], limit: 15 })
  // Derived, not hardcoded: inserting an attribute shifts every priority after
  // it, and a hardcoded list just rots into a false failure (it did, on Pickup #).
  for (const [key, cfg] of Object.entries(SHIPMENTS_ATTRS)) {
    assert.ok(text.includes(`WHEN '${key}' THEN ${cfg.priority}`), `missing CASE arm for ${key}`)
  }
  assertAllParamsReferenced(text, values)
})

test('needles are upper-cased to match the normalized projection values', () => {
  const { text, values } = buildSearchQuery({ domain: 'shipments', needles: ['weyerhaeuser'], limit: 15 })
  assert.ok(values.includes('WEYERHAEUSER'))
  assertAllParamsReferenced(text, values)
})

test('the suggest query groups the same hits by attribute, best tier first', () => {
  const { text, values } = buildSuggestQuery({ domain: 'shipments', needles: ['A1'] })
  assert.ok(text.includes('GROUP BY attr'))
  assert.ok(text.includes('min(tier)'))
  assert.ok(values.includes('A1'))
  assertAllParamsReferenced(text, values)
})

test('multi-code gating counts DISTINCT NEEDLES, not entities (GS-20)', () => {
  // One code matching five entities must NOT satisfy a two-code gate.
  const two = buildSuggestQuery({ domain: 'shipments', needles: ['A1', 'B2'] })
  assert.ok(two.text.includes('HAVING count(DISTINCT needle_ix) = 2'))
  assertAllParamsReferenced(two.text, two.values)
  const one = buildSuggestQuery({ domain: 'shipments', needles: ['A1'] })
  assert.ok(!one.text.includes('HAVING'), 'single code needs no gate')
  assertAllParamsReferenced(one.text, one.values)
})

test('suggest keeps every matched attribute, not one row per entity', () => {
  // buildSearchQuery collapses to one row per entity; suggest must not, or an
  // entity matching both `pro` and `load` hides `load` from the panel.
  const { text, values } = buildSuggestQuery({ domain: 'shipments', needles: ['A1'] })
  assert.ok(!text.includes('DISTINCT ON (entity_id)'))
  assert.ok(text.includes('count(DISTINCT entity_id)'))
  assertAllParamsReferenced(text, values)
})

// ── Committed chips reach live search (GS-12 follow-up) ─────────────────────
// The gap: searchHandler/suggestHandler destructured criteria but only ever
// read criteria.text — a committed chip with no text (the "click a suggestion,
// input clears" flow) resolved needles to [] and short-circuited to empty.

test('chips AND text: each chip restricts every needle-tier branch, not a union', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: ['442376'],
    chips: [{ key: 'pro', queryValue: 'PRO-123' }, { key: 'customer-name', queryValue: 'Acme Co' }],
  })
  // Both chips ride as their OWN entity_id IN (...) restriction, ANDed onto
  // every needle branch (exact/prefix/contains) — never a UNION/OR across chips.
  const inSubqueries = (text.match(/entity_id IN \(SELECT entity_id FROM search_index/g) || []).length
  assert.equal(inSubqueries, 6) // 2 chips × 3 needle-tier branches
  assert.ok(text.includes('UNION ALL'), 'still UNION ALL across tiers')
  assert.ok(!text.includes('INTERSECT'), 'chips restrict via AND/IN, never a SQL INTERSECT')
  assert.ok(values.includes('PRO123'))   // upperStrip: dash stripped
  assert.ok(values.includes('ACME CO'))  // upper: spaces kept, case folded
  assertAllParamsReferenced(text, values)
})

test('chips-only (no text): a committed chip alone still produces a real hit set', () => {
  // This is the exact blank-glimpse bug: committing "Order #: 44237" clears the
  // input, so needles=[] — the old code returned nothing. Chips-only must not.
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: [], chips: [{ key: 'order', queryValue: '44237' }],
  })
  assert.ok(text.includes("attr = "))
  assert.ok(text.includes("value LIKE '%' ||"))
  assert.ok(values.includes('44237'))
  assert.ok(!text.includes('UNDEFINED'))
  assertAllParamsReferenced(text, values)
})

test('chips-only, multiple chips: the leading chip drives the hit rows; the rest restrict via their own IN-subquery', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: [],
    chips: [
      { key: 'pro', queryValue: 'PRO-123' },
      { key: 'customer-name', queryValue: 'Acme Co' },
      { key: 'scac', queryValue: 'FXFE' },
    ],
  })
  // Lead chip (pro) is inlined directly (its row IS the hit, so attr/display
  // are selectable) — the two TRAILING chips each get their own IN-subquery.
  const inSubqueries = (text.match(/entity_id IN \(SELECT entity_id FROM search_index/g) || []).length
  assert.equal(inSubqueries, 2)
  assert.ok(values.includes('PRO123'))    // upperStrip on the lead (pro)
  assert.ok(values.includes('ACME CO'))   // upper on customer-name
  assert.ok(values.includes('FXFE'))      // upper on scac
  assertAllParamsReferenced(text, values)
})

test('multi-value chip (comma list) ORs its tokens within ONE subquery', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: ['442376'],
    chips: [{ key: 'order', queryValue: '091000, 091001' }],
  })
  assert.match(text, /value LIKE '%' \|\| \$\d+ \|\| '%' OR value LIKE '%' \|\| \$\d+ \|\| '%'/)
  assert.ok(values.includes('091000'))
  assert.ok(values.includes('091001'))
  assertAllParamsReferenced(text, values)
})

// Balanced parens is enough of a well-formedness check at this pure layer
// (no DB available to actually EXPLAIN the SQL).
function balancedParens(sql) {
  return (sql.match(/\(/g) || []).length === (sql.match(/\)/g) || []).length
}

test('unknown chip keys are dropped, not trusted as attr names — honest-empty, not a syntax error', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: [],
    chips: [{ key: 'not-a-real-attr; DROP TABLE shipments--', queryValue: 'x' }],
  })
  // No valid chips, no needles → `WITH hits AS ()` is a Postgres SYNTAX ERROR,
  // not an empty result (this was the reachable-500 bug). The honest-empty
  // shape is a real zero-row SELECT ... WHERE FALSE.
  assert.ok(!text.includes('WITH hits AS ()'), 'must not produce an empty CTE body')
  assert.match(text, /WHERE FALSE/)
  assert.ok(balancedParens(text))
  assert.ok(!text.includes('DROP TABLE'))
  assert.ok(!text.includes('not-a-real-attr'))
  // 42P18 regression: dom/scope used to bind $1(/$2) BEFORE this early-out,
  // even though the returned SQL never mentions them — Postgres then rejects
  // the query ("could not determine data type of parameter $1").
  assertAllParamsReferenced(text, values)
})

test('a chip with no recognizable key AND no column → honest-empty, for search AND suggest', () => {
  // No registry attr, no COLUMN_CHIP_COLS dataKey: nothing left to restrict on.
  const nothing = [{ key: 'not-an-attr', dataKey: 'notAField', queryValue: 'Accepted' }]
  const search = buildSearchQuery({ domain: 'shipments', needles: [], chips: nothing })
  assert.match(search.text, /WHERE FALSE/)
  assert.ok(balancedParens(search.text))
  assertAllParamsReferenced(search.text, search.values)
  const suggest = buildSuggestQuery({ domain: 'shipments', needles: [], chips: nothing })
  assert.match(suggest.text, /WHERE FALSE/)
  assert.ok(balancedParens(suggest.text))
  assertAllParamsReferenced(suggest.text, suggest.values)
})

test('honest-empty carries no unreferenced params — the exact 42P18 shape', () => {
  // No needles, no chips at all (not even an invalid one) is the plainest
  // route to the honest-empty branch. The hits CTE itself binds NOTHING
  // (domain/scope are never reached) — the only param present is the
  // caller's own LIMIT, which the wrapping SQL text does reference.
  const { text, values } = buildSearchQuery({ domain: 'shipments', needles: [], chips: [] })
  assert.match(text, /WHERE FALSE/)
  assert.deepEqual(values, [15]) // default limit — bound AFTER buildHits, and referenced
  assertAllParamsReferenced(text, values)
})

test('suggest SQL carries the chip restriction', () => {
  const { text, values } = buildSuggestQuery({
    domain: 'shipments', needles: ['A1'], chips: [{ key: 'pro', queryValue: 'PRO-1' }],
  })
  assert.ok(text.includes('entity_id IN (SELECT entity_id FROM search_index'))
  assert.ok(values.includes('PRO1'))
  assertAllParamsReferenced(text, values)
})

test('GS-20 HAVING still gates on TEXT needles only — chips never change the count', () => {
  const oneNeedle = buildSuggestQuery({
    domain: 'shipments', needles: ['A1'],
    chips: [{ key: 'pro', queryValue: 'X' }, { key: 'scac', queryValue: 'Y' }],
  })
  assert.ok(!oneNeedle.text.includes('HAVING'), 'one text needle needs no gate regardless of chip count')
  assertAllParamsReferenced(oneNeedle.text, oneNeedle.values)
  const twoNeedles = buildSuggestQuery({
    domain: 'shipments', needles: ['A1', 'B2'], chips: [{ key: 'pro', queryValue: 'X' }],
  })
  assert.ok(twoNeedles.text.includes('HAVING count(DISTINCT needle_ix) = 2'))
  assertAllParamsReferenced(twoNeedles.text, twoNeedles.values)
})

// ── Date-range chips (Case 12, GS-22) ───────────────────────────────────────

const dateChip = (dataKey, from, to = null) => ({
  key: `date-${dataKey === 'pickupDate' ? 'pickup-date' : 'delivery-date'}`,
  kind: 'date-range', dataKey, from, to,
})

test('date chip ALONE drives a shipments-table hit set (not honest-empty)', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: [], chips: [dateChip('pickupDate', '4/3/2026', '4/3/2026')],
  })
  assert.ok(text.includes('FROM shipments'), 'hits come from the shipments table')
  assert.ok(text.includes('pickup_ts >= '))
  assert.ok(text.includes("pickup_ts < ("), 'inclusive to-bound via to+1day')
  assert.ok(values.includes('2026-04-03'), 'M/D/YYYY converted to ISO for binding')
  assert.ok(!text.includes('WHERE FALSE'), 'must not fall to the honest-empty set')
  assertAllParamsReferenced(text, values)
})

test('date chip with TEXT restricts every needle branch; open-ended from-only bound', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: ['ABC'], chips: [dateChip('deliveryDate', '5/1/2026')],
  })
  assert.ok(text.includes('delivery_ts >= '))
  assert.ok(!text.includes('delivery_ts < ('), 'missing to leaves that side open')
  assert.ok(text.includes('entity_id IN (SELECT sell_shipment FROM shipments'))
  assertAllParamsReferenced(text, values)
})

test('date chip alongside an indexed chip rides the chips-only rest set', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: [],
    chips: [{ key: 'pro', queryValue: 'PRO-1' }, dateChip('pickupDate', '4/3/2026', '4/9/2026')],
  })
  assert.ok(text.includes('attr = '), 'indexed chip still leads')
  assert.ok(text.includes('pickup_ts >= '))
  assertAllParamsReferenced(text, values)
})

test('a boundless or unknown date chip restricts nothing (and stays honest-empty alone)', () => {
  const { text } = buildSearchQuery({
    domain: 'shipments', needles: [], chips: [{ kind: 'date-range', dataKey: 'pickupDate', from: null, to: null }],
  })
  assert.ok(text.includes('WHERE FALSE'), 'no parseable bound → no hit set')
})

// ── Column chips: the non-projected progression attrs (S130) ────────────────
// Before this these were dropped exactly like an unknown key, so the Filters
// panel's enum chips returned zero rows live while filtering in the mock.

test('an enum chip ALONE drives a shipments-table hit set (not honest-empty)', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: [],
    chips: [{ key: 'mode', dataKey: 'mode', queryValue: 'TL', exact: true }],
  })
  assert.ok(text.includes('FROM shipments'), 'hits come from the shipments table')
  assert.ok(text.includes('upper(mode) = upper('), 'exact chip compares whole values')
  assert.ok(!text.includes('WHERE FALSE'))
  assert.ok(values.includes('TL'))
  assert.ok(balancedParens(text))
  assertAllParamsReferenced(text, values)
})

test('exact keeps "Mode: TL" from matching every LTL shipment', () => {
  const { text } = buildSearchQuery({
    domain: 'shipments', needles: [],
    chips: [{ key: 'mode', dataKey: 'mode', queryValue: 'TL', exact: true }],
  })
  assert.ok(!text.includes("mode ILIKE '%'"), 'no substring branch for an exact chip')
})

test('a multi-value enum chip ORs its tokens (GS-12 IN-list)', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: [],
    chips: [{ key: 'mode', dataKey: 'mode', queryValue: 'TL,LTL', exact: true }],
  })
  assert.ok(text.includes(' OR '))
  assert.ok(values.includes('TL') && values.includes('LTL'))
  assertAllParamsReferenced(text, values)
})

test('a measure chip (not exact) substring-matches, mirroring the mock', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: [], chips: [{ key: 'gross-weight', dataKey: 'grossWeight', queryValue: '4200' }],
  })
  assert.ok(text.includes("gross_weight ILIKE '%' || "))
  assert.ok(values.includes('4200'))
  assertAllParamsReferenced(text, values)
})

test('an enum chip riding alongside TEXT restricts every needle branch', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: ['ABC'],
    chips: [{ key: 'tender-status', dataKey: 'tenderStatus', queryValue: 'Accepted', exact: true }],
  })
  assert.ok(text.includes('entity_id IN (SELECT sell_shipment FROM shipments WHERE'))
  assert.ok(text.includes('upper(tender_status) = upper('))
  assertAllParamsReferenced(text, values)
})

test('an enum chip alongside an indexed chip rides the chips-only rest set', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: [],
    chips: [
      { key: 'customer-name', dataKey: 'customerName', queryValue: 'ACME' },
      { key: 'mode', dataKey: 'mode', queryValue: 'TL', exact: true },
    ],
  })
  assert.ok(text.includes('attr = '), 'the indexed chip still leads')
  assert.ok(text.includes('upper(mode) = upper('))
  assertAllParamsReferenced(text, values)
})

test('enum values are parameterized, never inlined', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: [],
    chips: [{ key: 'mode', dataKey: 'mode', queryValue: "TL'; DROP TABLE shipments--", exact: true }],
  })
  assert.ok(!text.includes('DROP TABLE'))
  assert.ok(values.some((v) => String(v).includes('DROP TABLE')))
})

test('an INDEXED chip marked exact compares the whole normalized value', () => {
  const { text } = buildSearchQuery({
    domain: 'shipments', needles: [],
    chips: [{ key: 'shipment-type', dataKey: 'shipmentType', queryValue: 'Direct', exact: true }],
  })
  assert.ok(text.includes('value = '))
  assert.ok(!text.includes("value LIKE '%' || "), 'exact never falls back to contains')
})

// ── /v1/search/values — the Filters ComboBox source (S130) ──────────────────

test('values query is DISTINCT, prefix-matched on the normalized value, and paged', () => {
  const { text, values } = buildValuesQuery({
    domain: 'shipments', attr: 'customer-name', query: 'we', limit: 50, skip: 100,
  })
  assert.ok(text.includes('SELECT DISTINCT display FROM search_index'))
  assert.ok(text.includes("|| '%'"), 'prefix match')
  assert.ok(text.includes('count(*) OVER()::int AS __total'), 'total drives the lazy next page')
  assert.ok(values.includes('WE'), 'query normalized the same way the projection was')
  assert.ok(values.includes(50) && values.includes(100))
  assertAllParamsReferenced(text, values)
})

test('an empty values query degrades to the full catalog, first page', () => {
  const { text, values } = buildValuesQuery({ domain: 'shipments', attr: 'scac', query: '' })
  assert.ok(values.includes(''), 'empty needle → LIKE %, no branch')
  assertAllParamsReferenced(text, values)
})

test('an unknown attr never reaches SQL — the handler answers honest-empty', async () => {
  const db = { query: () => { throw new Error('must not query') } }
  assert.deepEqual(await valuesHandler({ body: { attr: 'not-an-attr' }, db }), { values: [], total: 0 })
})

test('the values handler caps the page size a client can ask for', async () => {
  let bound = null
  const db = { query: (q) => { bound = q.values; return { rows: [] } } }
  await valuesHandler({ body: { attr: 'scac', page: { limit: 100000 } }, db })
  assert.ok(bound.includes(200), 'clamped to 200')
})
