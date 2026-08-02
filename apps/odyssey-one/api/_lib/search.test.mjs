import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSearchQuery, buildSuggestQuery, MIN_TRGM } from './search.mjs'
import { SHIPMENTS_ATTRS } from './search-registry.mjs'

test('exact + prefix tiers only for a short needle (trgm cannot serve <3 chars)', () => {
  const { text } = buildSearchQuery({ domain: 'shipments', needles: ['AB'], limit: 15 })
  assert.ok(text.includes('value = '))
  assert.ok(text.includes("|| '%'"))
  assert.ok(!text.includes("'%' ||"), 'no contains branch below the trigram floor')
})

test('all three tiers for a needle at or above the trigram floor', () => {
  assert.equal(MIN_TRGM, 3)
  const { text } = buildSearchQuery({ domain: 'shipments', needles: ['ABC'], limit: 15 })
  assert.ok(text.includes("'%' ||"))
})

test('multi-code needles UNION (GS-20), deduped to each entity best tier', () => {
  const { text, values } = buildSearchQuery({ domain: 'shipments', needles: ['A1', 'B2'], limit: 15 })
  assert.ok(values.includes('A1'))
  assert.ok(values.includes('B2'))
  assert.ok(text.includes('DISTINCT ON (entity_id)'))
  assert.ok(!text.includes('INTERSECT'), 'union, never intersect')
})

test('order is TOTAL so LIMIT 15 is provably rows 1-15 of the table (GS-16)', () => {
  const { text } = buildSearchQuery({ domain: 'shipments', needles: ['A1'], limit: 15 })
  assert.match(text, /ORDER BY\s+tier,\s*priority,\s*display,\s*entity_id/)
})

test('customer scope is applied as a subquery, never string-interpolated', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: ['A1'], limit: 15, customerIds: ['VALTRIS_01'],
  })
  assert.ok(text.includes('customer_id = ANY('))
  assert.ok(values.some((v) => Array.isArray(v) && v[0] === 'VALTRIS_01'))
})

// Every user-supplied string must arrive as a bound parameter. A needle carrying
// a quote is the cheapest possible injection probe.
test('needles are parameterized, never inlined into the SQL text', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: ["O'BRIEN'; DROP TABLE shipments--"], limit: 15,
  })
  assert.ok(!text.includes('DROP TABLE'))
  assert.ok(values.includes("O'BRIEN'; DROP TABLE SHIPMENTS--"))
})

// The priority CASE is built from registry KEYS (ours, not the user's), but it is
// the one place a string reaches the SQL text — so it must still be escaped.
test('the priority CASE covers every registry attribute', () => {
  const { text } = buildSearchQuery({ domain: 'shipments', needles: ['A1'], limit: 15 })
  // Derived, not hardcoded: inserting an attribute shifts every priority after
  // it, and a hardcoded list just rots into a false failure (it did, on Pickup #).
  for (const [key, cfg] of Object.entries(SHIPMENTS_ATTRS)) {
    assert.ok(text.includes(`WHEN '${key}' THEN ${cfg.priority}`), `missing CASE arm for ${key}`)
  }
})

test('needles are upper-cased to match the normalized projection values', () => {
  const { values } = buildSearchQuery({ domain: 'shipments', needles: ['weyerhaeuser'], limit: 15 })
  assert.ok(values.includes('WEYERHAEUSER'))
})

test('the suggest query groups the same hits by attribute, best tier first', () => {
  const { text, values } = buildSuggestQuery({ domain: 'shipments', needles: ['A1'] })
  assert.ok(text.includes('GROUP BY attr'))
  assert.ok(text.includes('min(tier)'))
  assert.ok(values.includes('A1'))
})

test('multi-code gating counts DISTINCT NEEDLES, not entities (GS-20)', () => {
  // One code matching five entities must NOT satisfy a two-code gate.
  const two = buildSuggestQuery({ domain: 'shipments', needles: ['A1', 'B2'] })
  assert.ok(two.text.includes('HAVING count(DISTINCT needle_ix) = 2'))
  const one = buildSuggestQuery({ domain: 'shipments', needles: ['A1'] })
  assert.ok(!one.text.includes('HAVING'), 'single code needs no gate')
})

test('suggest keeps every matched attribute, not one row per entity', () => {
  // buildSearchQuery collapses to one row per entity; suggest must not, or an
  // entity matching both `pro` and `load` hides `load` from the panel.
  const { text } = buildSuggestQuery({ domain: 'shipments', needles: ['A1'] })
  assert.ok(!text.includes('DISTINCT ON (entity_id)'))
  assert.ok(text.includes('count(DISTINCT entity_id)'))
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
})

test('multi-value chip (comma list) ORs its tokens within ONE subquery', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: ['442376'],
    chips: [{ key: 'order', queryValue: '091000, 091001' }],
  })
  assert.match(text, /value LIKE '%' \|\| \$\d+ \|\| '%' OR value LIKE '%' \|\| \$\d+ \|\| '%'/)
  assert.ok(values.includes('091000'))
  assert.ok(values.includes('091001'))
})

test('unknown chip keys are dropped, not trusted as attr names', () => {
  const { text } = buildSearchQuery({
    domain: 'shipments', needles: [],
    chips: [{ key: 'not-a-real-attr; DROP TABLE shipments--', queryValue: 'x' }],
  })
  // No valid chips, no needles → empty hit set (no branch selects anything),
  // and critically the bogus key never reaches the SQL text at all.
  assert.ok(text.includes('WITH hits AS ()'))
  assert.ok(!text.includes('DROP TABLE'))
  assert.ok(!text.includes('not-a-real-attr'))
})

test('suggest SQL carries the chip restriction', () => {
  const { text, values } = buildSuggestQuery({
    domain: 'shipments', needles: ['A1'], chips: [{ key: 'pro', queryValue: 'PRO-1' }],
  })
  assert.ok(text.includes('entity_id IN (SELECT entity_id FROM search_index'))
  assert.ok(values.includes('PRO1'))
})

test('GS-20 HAVING still gates on TEXT needles only — chips never change the count', () => {
  const oneNeedle = buildSuggestQuery({
    domain: 'shipments', needles: ['A1'],
    chips: [{ key: 'pro', queryValue: 'X' }, { key: 'scac', queryValue: 'Y' }],
  })
  assert.ok(!oneNeedle.text.includes('HAVING'), 'one text needle needs no gate regardless of chip count')
  const twoNeedles = buildSuggestQuery({
    domain: 'shipments', needles: ['A1', 'B2'], chips: [{ key: 'pro', queryValue: 'X' }],
  })
  assert.ok(twoNeedles.text.includes('HAVING count(DISTINCT needle_ix) = 2'))
})
