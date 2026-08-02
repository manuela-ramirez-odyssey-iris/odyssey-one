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
