import { describe, test, expect } from 'vitest'
import { getAllShipments } from '../../data'
import { shipmentsSearchAdapter as adapter } from './adapter'
import { SHIPMENTS_PROGRESSION, SHIPMENTS_ATTRIBUTES } from './progression'

// Regression guard for GlobalSearch composed-criteria behavior.
// Each case in vault/20-cross-cutting/global-search/composed-criteria.md gets a
// test here. Data-derived (seed-42 fixtures) — no magic IDs, survives regen.

const ALL = getAllShipments()

// A real shipment with >1 order, used to exercise the order-explosion path.
const MULTI = ALL.find((s) => Array.isArray(s.orders) && s.orders.length >= 2)

// Helper: build a chip the way useGlobalSearch commits them.
const chip = (key, dataKey, queryValue = '') => ({ key, dataKey, queryValue })

// Build a chip from a progression attribute (carries its group, like toItem does).
const groupChip = (groupIdx, attrIdx = 0, queryValue = '') => {
  const g = SHIPMENTS_PROGRESSION[groupIdx]
  const a = g.attributes[attrIdx]
  return { key: a.key, dataKey: a.dataKey, group: g.group, queryValue }
}

describe('searchShipments — invariants (must always hold)', () => {
  test('no chips + no query → empty results', async () => {
    expect(await adapter.searchShipments([])).toEqual({ results: [], total: 0 })
    expect(await adapter.searchShipments(null)).toEqual({ results: [], total: 0 })
    expect(await adapter.searchShipments([], '   ')).toEqual({ results: [], total: 0 })
  })

  test('leading shipment-scoped chip → one row per shipment (shipment entity)', async () => {
    const { results, total } = await adapter.searchShipments([
      chip('buy-shipment', 'buyShipment', MULTI.buyShipment),
    ])
    expect(total).toBe(1) // buyShipment is unique
    expect(results[0].matchId).toBe(MULTI.buyShipment) // bold = leading attr value
    expect(results[0].shipmentId).toBeUndefined() // shipment rows have no Shipment# meta cell
  })

  test('AND semantics — chips that cannot co-occur → no results', async () => {
    const other = ALL.find((s) => s.customerName !== MULTI.customerName)
    const { total } = await adapter.searchShipments([
      chip('buy-shipment', 'buyShipment', MULTI.buyShipment),
      chip('customer-name', 'customerName', other.customerName),
    ])
    expect(total).toBe(0)
  })

  test('results are capped at 15 but total reflects the full match count', async () => {
    // A bare letter as a customer-name fragment matches many shipments.
    const { results, total } = await adapter.searchShipments([
      chip('customer-name', 'customerName', 'a'),
    ])
    expect(results.length).toBeLessThanOrEqual(15)
    expect(total).toBeGreaterThanOrEqual(results.length)
  })
})

describe('free-text query — the S79b results-panel glimpse (decision 5)', () => {
  test('query alone (no chips) finds shipments across free-text fields', async () => {
    const { results, total } = await adapter.searchShipments([], MULTI.buyShipment)
    expect(total).toBeGreaterThanOrEqual(1)
    expect(results.some((r) => r.matchId === MULTI.buyShipment)).toBe(true)
  })

  test('every row carries the SELECTION key (sellShipment) as data-shipment-key', async () => {
    const byQuery = await adapter.searchShipments([], MULTI.buyShipment)
    const hit = byQuery.results.find((r) => r.matchId === MULTI.buyShipment)
    expect(hit['data-shipment-key']).toBe(MULTI.sellShipment)

    // Order rows carry it too (parent shipment's sellShipment).
    const byOrder = await adapter.searchShipments([
      chip('order', 'orders', ''),
      chip('buy-shipment', 'buyShipment', MULTI.buyShipment),
    ])
    expect(byOrder.results.every((r) => r['data-shipment-key'] === MULTI.sellShipment)).toBe(true)
  })

  test('query is ANDed with committed chips', async () => {
    const other = ALL.find((s) => s.customerName !== MULTI.customerName)
    const { total } = await adapter.searchShipments(
      [chip('customer-name', 'customerName', other.customerName)],
      MULTI.buyShipment, // unique to MULTI → cannot co-occur with other's customer
    )
    expect(total).toBe(0)
  })

  test('chips-only calls are unchanged (query param optional)', async () => {
    const withQ = await adapter.searchShipments([chip('buy-shipment', 'buyShipment', MULTI.buyShipment)], '')
    const withoutQ = await adapter.searchShipments([chip('buy-shipment', 'buyShipment', MULTI.buyShipment)])
    expect(withQ).toEqual(withoutQ)
  })
})

describe('Case 1 — Order# (empty) + Buy Shipment# = X → that shipment\'s orders', () => {
  test('explodes the qualifying shipment into one row per order', async () => {
    const chips = [
      chip('order', 'orders', ''), // leading order chip, empty → entity = order
      chip('buy-shipment', 'buyShipment', MULTI.buyShipment),
    ]
    const { results, total } = await adapter.searchShipments(chips)

    // One row per order on that shipment.
    expect(total).toBe(MULTI.orders.length)
    expect(results).toHaveLength(MULTI.orders.length)

    // Bold field is the order #, and the rows cover exactly that shipment's orders.
    expect(new Set(results.map((r) => r.matchId))).toEqual(
      new Set(MULTI.orders.map(String)),
    )

    // Every row carries the parent shipment + order conventions.
    expect(results.every((r) => r.shipmentId === MULTI.buyShipment)).toBe(true)
    expect(results.every((r) => r.iconType === 'package')).toBe(true)
  })
})

describe('Case 2 — empty-input suggestions advance by progression group', () => {
  test('no chips → entry points (top of progression), titled "Suggested Filters"', async () => {
    const sections = await adapter.getInitial([])
    expect(sections).toHaveLength(1)
    expect(sections[0].title).toBe('Suggested Filters')
    expect(sections[0].items.map((i) => i.key)).toEqual(
      SHIPMENTS_ATTRIBUTES.slice(0, 5).map((a) => a.key),
    )
  })

  test('one chip in group 0 → suggests the NEXT group, never repeats the entry set', async () => {
    const g1 = SHIPMENTS_PROGRESSION[1]
    const lead = groupChip(0) // Shipment Identifiers
    const sections = await adapter.getInitial([lead])
    expect(sections[0].title).toBe(g1.label) // "Who it belongs to"
    expect(sections[0].items.map((i) => i.key)).toEqual(g1.attributes.map((a) => a.key))
    expect(sections[0].items.some((i) => i.key === lead.key)).toBe(false)
  })

  test('drill advances by the furthest group reached', async () => {
    const g2 = SHIPMENTS_PROGRESSION[2] // Route & Geography
    const chips = [groupChip(0, 0, '25'), groupChip(1, 0, 'Erco')] // shipment id + customer id
    const sections = await adapter.getInitial(chips)
    expect(sections[0].title).toBe(g2.label) // "Where it goes"
    expect(sections[0].items.map((i) => i.key)).toEqual(g2.attributes.map((a) => a.key))
  })

  test('on the last group → stays on it, minus the committed attribute', async () => {
    const lastIdx = SHIPMENTS_PROGRESSION.length - 1
    const last = SHIPMENTS_PROGRESSION[lastIdx]
    const sections = await adapter.getInitial([groupChip(lastIdx, 0)])
    expect(sections[0].title).toBe(last.label)
    expect(sections[0].items.map((i) => i.key)).toEqual(
      last.attributes.slice(1).map((a) => a.key),
    )
  })
})
