/**
 * The Orders chip layer exists TWICE — `CHIP_COLS` in api/_lib/orders.mjs
 * (live, SQL) and `orderSearchRow` + matchesChip (mock, JS) — because a Vercel
 * function cannot import the browser data layer. Two implementations of one
 * behaviour drift; this file is what makes them fail loudly instead.
 *
 * Same arrangement, and the same reason, as registryParity.test.js has for the
 * Shipments search registry.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../api/config', () => ({ getApiMode: () => 'mock' }))
vi.mock('../../data/orders', () => ({ getAllOrders: () => [] }))

import { CHIP_COLS, chipClause } from '../../../api/_lib/orders.mjs'
import { ORDERS_ATTRIBUTES, orderSearchRow } from './progression'
import { SHIP_DIRECTIONS, FREIGHT_TERMS } from '../../data/master-data'

describe('every progression attribute is committable', () => {
  it('CHIP_COLS covers the progression exactly — no gaps, no strays', () => {
    const progressionKeys = ORDERS_ATTRIBUTES.map((a) => a.key).sort()
    expect(Object.keys(CHIP_COLS).sort()).toEqual(progressionKeys)
  })

  it('a date attribute maps to a timestamp column, never a text compare', () => {
    for (const attr of ORDERS_ATTRIBUTES.filter((a) => a.match === 'date')) {
      expect(CHIP_COLS[attr.key].date, attr.key).toBeTruthy()
    }
  })
})

// The three columns that store CODES while the bar shows LABELS are where a
// silent mismatch would hide: the chip would compare 'Outbound' against a
// column of 'O'/'I' and quietly return nothing.
describe('label → code maps match the catalogs the bar offers', () => {
  it('ship direction', () => {
    const { labels } = CHIP_COLS['ship-direction']
    expect(Object.keys(labels).sort()).toEqual(SHIP_DIRECTIONS.map((d) => d.label).sort())
    for (const d of SHIP_DIRECTIONS) expect(labels[d.label]).toBe(d.value)
  })

  it('freight terms', () => {
    const { labels } = CHIP_COLS['freight-terms']
    expect(Object.keys(labels).sort()).toEqual(FREIGHT_TERMS.map((t) => t.label).sort())
    for (const t of FREIGHT_TERMS) expect(labels[t.label]).toBe(t.value)
  })

  it('order source — the projection title-cases it, the column stores upper', () => {
    const { labels } = CHIP_COLS['order-source']
    expect(labels).toEqual({ Integrated: 'INTEGRATED', Manual: 'MANUAL' })
    // The projection is what produces the label the chip carries.
    expect(orderSearchRow({ orderSource: 'INTEGRATED' }).orderSource).toBe('Integrated')
    expect(orderSearchRow({ orderSource: 'MANUAL' }).orderSource).toBe('Manual')
  })

  it('hazardous — the boolean column vs the badge text the column renders', () => {
    expect(CHIP_COLS.hazardous.trueValue).toBe('Hazmat')
    expect(orderSearchRow({ hazardous: true }).hazardous).toBe('Hazmat')
  })
})

// SQL shape, asserted through the public builder rather than by reading the map:
// the comparison rules ARE the parity (matchesChip's exact/substring split).
describe('chipClause reproduces matchesChip semantics', () => {
  const build = (chip) => {
    const values = []
    const sql = chipClause(chip, (v) => { values.push(v); return `$${values.length}` })
    return { sql, values }
  }

  it('a non-exact chip is a case-insensitive substring', () => {
    const { sql, values } = build({ key: 'customer', queryValue: 'weyer' })
    expect(sql).toContain("customer ILIKE '%' || $1 || '%'")
    expect(values).toEqual(['weyer'])
  })

  it('an exact chip compares whole values', () => {
    const { sql } = build({ key: 'order-status', queryValue: 'Cancelled', exact: true })
    expect(sql).toContain('upper(order_status) = upper($1)')
    expect(sql).not.toContain('ILIKE')
  })

  it('a comma list ORs its tokens (GS-12 IN-list)', () => {
    const { sql, values } = build({ key: 'customer', queryValue: 'A, B' })
    expect(sql.match(/ILIKE/g)).toHaveLength(2)
    expect(sql).toContain(' OR ')
    expect(values).toEqual(['A', 'B'])
  })

  it('a label chip binds the CODE, never the label', () => {
    const { values } = build({ key: 'ship-direction', queryValue: 'Outbound', exact: true })
    expect(values).toEqual(['O'])
  })

  it('a label that is not in the catalog matches nothing, never falls through', () => {
    const { sql, values } = build({ key: 'freight-terms', queryValue: 'Not A Term', exact: true })
    expect(sql).toBe('FALSE')
    expect(values).toEqual([])
  })

  it('a date chip becomes a one-day range on the timestamp column', () => {
    const { sql, values } = build({ key: 'latest-pickup', queryValue: '5/29/2026' })
    expect(sql).toContain('latest_pickup_ts >=')
    expect(sql).toContain('latest_pickup_ts <')
    expect(values).toEqual(['2026-05-29', '2026-05-29'])
  })

  it('an unparseable date matches nothing rather than everything', () => {
    expect(build({ key: 'latest-pickup', queryValue: 'soon' }).sql).toBe('FALSE')
  })

  it('hazardous is the boolean column, driven by the badge text', () => {
    expect(build({ key: 'hazardous', queryValue: 'Hazmat', exact: true }).sql).toBe('hazardous IS TRUE')
    expect(build({ key: 'hazardous', queryValue: 'Yes', exact: true }).sql).toBe('FALSE')
  })

  it('a jsonb measure unwraps to its value, matching the projection', () => {
    const { sql } = build({ key: 'gross-weight', queryValue: '6129' })
    expect(sql).toContain("gross_weight->>'value'")
    expect(orderSearchRow({ grossWeight: { value: 6129, uom: 'lbs' } }).grossWeight).toBe('6129')
  })

  it('a location concatenates the same parts, in the same order, as the projection', () => {
    const { sql } = build({ key: 'shipper-location', queryValue: 'G2O' })
    expect(sql).toContain("concat_ws(', ', consignor->>'name', consignor->>'city', consignor->>'state', consignor->>'country')")
    expect(orderSearchRow({
      consignor: { name: 'G2O TECH', city: 'Bastrop', state: 'LA', country: 'US' },
    }).shipperLocation).toBe('G2O TECH, Bastrop, LA, US')
  })

  it('an unknown key and an empty value both restrict nothing', () => {
    expect(build({ key: 'not-an-attr', queryValue: 'x' }).sql).toBeNull()
    expect(build({ key: 'customer', queryValue: '' }).sql).toBeNull()
  })

  it('values are parameterized, never inlined', () => {
    const { sql, values } = build({ key: 'customer', queryValue: "x'; DROP TABLE orders--" })
    expect(sql).not.toContain('DROP TABLE')
    expect(values[0]).toContain('DROP TABLE')
  })
})
