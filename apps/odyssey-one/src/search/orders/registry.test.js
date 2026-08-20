import { describe, expect, it, vi } from 'vitest'

// 60 distinct customers + one location pool, so paging is exercised past the
// 25-row page size rather than fitting in a single page.
const ROWS = Array.from({ length: 60 }, (_, i) => ({
  orderNumber: `ORD${i}`,
  customer: `CUST_${String(i).padStart(2, '0')}`,
  createdBy: i % 2 ? 'amy.cook' : 'zoe.admin',
  consignor: i < 3
    ? [
        { city: 'Miami', state: 'Florida', country: 'US' },
        { city: 'Detroit', state: 'Michigan', country: 'US' },
        { city: 'Birmingham', state: '', country: 'United Kingdom' },
      ][i]
    : { city: `City${i}`, state: 'ZZ', country: 'US' },
}))

vi.mock('../../data/orders', () => ({ getAllOrders: () => ROWS }))

import { ORDERS_FILTER_ATTRS, allAttributeValues, getOrdersAttributeValues } from './registry'

const attr = (key) => ORDERS_FILTER_ATTRS.find((a) => a.key === key)

describe('lazy paged value loading', () => {
  it('returns one page plus the full total, not the whole list', async () => {
    const page0 = await getOrdersAttributeValues(attr('customer'), '')
    expect(page0.total).toBe(60)
    expect(page0.options).toHaveLength(25)
    expect(page0.options[0]).toEqual({ value: 'CUST_00', label: 'CUST_00' })
  })

  it('pages forward by skip and stops at the end', async () => {
    const a = attr('customer')
    const p1 = await getOrdersAttributeValues(a, '', 25)
    const p2 = await getOrdersAttributeValues(a, '', 50)
    expect(p1.options).toHaveLength(25)
    expect(p2.options).toHaveLength(10) // 60 - 50
    // Pages are disjoint and in order — what ComboBox accumulates.
    const all = [...(await getOrdersAttributeValues(a, '')).options, ...p1.options, ...p2.options]
    expect(new Set(all.map((o) => o.value)).size).toBe(60)
    expect(all[0].value).toBe('CUST_00')
    expect(all[59].value).toBe('CUST_59')
  })

  it('filters by query BEFORE paging, so total reflects the query', async () => {
    const res = await getOrdersAttributeValues(attr('customer'), 'CUST_1')
    // Values are zero-padded (CUST_00…CUST_59), so "CUST_1" matches
    // CUST_10..CUST_19 only — there is no bare CUST_1.
    expect(res.total).toBe(10)
    expect(res.options).toHaveLength(10)
  })

  it('is case-insensitive', async () => {
    const res = await getOrdersAttributeValues(attr('createdBy'), 'AMY')
    expect(res.options.map((o) => o.value)).toEqual(['amy.cook'])
  })
})

describe('location triples (LINX-10285 matching rule)', () => {
  const origin = attr('origin')

  it('matches City OR State OR Country, per the ticket examples', async () => {
    const labels = (await getOrdersAttributeValues(origin, 'MI')).options.map((o) => o.label)
    expect(labels).toContain('Miami, Florida, US')        // city begins with MI
    expect(labels).toContain('Detroit, Michigan, US')     // state begins with MI
    expect(labels).toContain('Birmingham, United Kingdom') // city CONTAINS mi
  })

  it('carries the triple in the value so it round-trips as one selection', async () => {
    const opt = (await getOrdersAttributeValues(origin, 'Detroit')).options[0]
    expect(opt.value).toBe('Detroit|Michigan|US')
    expect(opt.label).toBe('Detroit, Michigan, US')
  })

  it('omits a blank part from the label but keeps its slot in the value', async () => {
    const opt = (await getOrdersAttributeValues(origin, 'Birmingham')).options[0]
    expect(opt.value).toBe('Birmingham||United Kingdom')
    expect(opt.label).toBe('Birmingham, United Kingdom')
  })

  it('de-duplicates repeated triples', async () => {
    expect(allAttributeValues(origin, '').filter((o) => o.value === 'Miami|Florida|US')).toHaveLength(1)
  })
})

describe('live mode', () => {
  it('still serves options — the loader is deliberately local in both modes', async () => {
    // Regression for the `live → null` branch that left every dropdown empty
    // (same shape as the S95 customer-search bug lookupService records).
    const res = await getOrdersAttributeValues(attr('customer'), '')
    expect(res.options.length).toBeGreaterThan(0)
  })
})
