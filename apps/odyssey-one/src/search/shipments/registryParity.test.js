// The server registry (api/_lib/search-registry.mjs) is a hand-maintained TWIN of
// the client progression — it cannot import progression.js, which pulls in the
// browser data layer. This test is the seam that keeps them equal.
//
// It exists because the S104 plan transcribed three priorities off by one
// (equipment/seal/scac), which would have made the server rank a row differently
// from the client for the same query — a bug invisible to every other test.
import { test, expect } from 'vitest'
import { SHIPMENTS_ATTRS } from '../../../api/_lib/search-registry.mjs'
import { SHIPMENTS_ATTRIBUTES } from './progression'
import { FREE_TEXT_KEYS } from './criteria'

test('every registry priority equals the client flattened index (GS-15 tiebreak)', () => {
  const clientIndex = Object.fromEntries(SHIPMENTS_ATTRIBUTES.map((a, i) => [a.key, i]))
  for (const [key, cfg] of Object.entries(SHIPMENTS_ATTRS)) {
    expect(clientIndex[key], `registry key "${key}" is not a client attribute`).toBeDefined()
    expect(cfg.priority, `priority drift on "${key}"`).toBe(clientIndex[key])
  }
})

test('registry covers exactly the free-text searchable attributes, plus deliberate exact-enum chip attrs', () => {
  const byKey = Object.fromEntries(SHIPMENTS_ATTRIBUTES.map((a) => [a.key, a]))
  const freeTextKeys = SHIPMENTS_ATTRIBUTES
    .filter((a) => FREE_TEXT_KEYS.includes(a.dataKey))
    .map((a) => a.key)
  // shipment-type / planning-type (S108 DB motion): 2-value enums, deliberately
  // excluded from FREE_TEXT_KEYS (criteria.js — enums would drown the bare-code
  // case) but projected into search_index so their CHIPS can filter (trgm:
  // false, exact match only — see search-registry.mjs).
  const ENUM_CHIP_ONLY_KEYS = ['shipment-type', 'planning-type']
  expect(Object.keys(SHIPMENTS_ATTRS).sort()).toEqual([...freeTextKeys, ...ENUM_CHIP_ONLY_KEYS].sort())
  // Labels drive the GS-15 row label — a mismatch relabels rows in live mode only.
  for (const [key, cfg] of Object.entries(SHIPMENTS_ATTRS)) {
    expect(cfg.label, `label drift on "${key}"`).toBe(byKey[key].label)
  }
})
