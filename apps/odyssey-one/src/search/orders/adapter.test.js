import { beforeEach, describe, expect, it, vi } from 'vitest'

// A tiny, fully-known dataset — every assertion below is about adapter
// BEHAVIOUR, and a real 5,077-row seed would make "returns 2 results" a fact
// about the seed instead.
const ROWS = [
  {
    orderNumber: '0000000091000', customer: 'WEYERH_01', orderSource: 'INTEGRATED',
    shipDirection: 'O', freightTerms: 'A', equipment: 'LTR', orderStatus: 'Load Planned',
    draftOrderStatus: 'Ready', errorCount: 3, hazardous: false,
    grossWeight: { value: 42000, uom: 'LBS' }, volume: { value: 900, uom: 'CUFT' },
    consignor: { name: 'Longview Plant', city: 'Longview', state: 'WA', country: 'US', latestPickupDateTime: '2026-05-29T04:45:00' },
    consignee: { name: 'Freeport Terminal', city: 'Freeport', state: 'TX', country: 'US', latestDeliveryDateTime: '2026-06-02T11:00:00' },
    createdAt: '2026-05-20T08:00:00', createdBy: 'ben.planner',
    lastEditAt: '2026-05-21T09:30:00', lastEditedBy: 'amy.cook',
  },
  {
    orderNumber: '0000000091001', customer: 'BASF_CHM_01', orderSource: 'MANUAL',
    shipDirection: 'I', freightTerms: 'P', equipment: 'TT', orderStatus: 'Cancelled',
    draftOrderStatus: 'Purge', errorCount: 1, hazardous: true,
    grossWeight: { value: 1200, uom: 'LBS' }, volume: { value: 40, uom: 'CUFT' },
    consignor: { name: 'Geismar Works', city: 'Geismar', state: 'LA', country: 'US', latestPickupDateTime: '2026-05-30T06:00:00' },
    consignee: { name: 'Chicago DC', city: 'Chicago', state: 'IL', country: 'US', latestDeliveryDateTime: '2026-06-04T15:00:00' },
    createdAt: '2026-05-22T08:00:00', createdBy: 'zoe.admin',
    lastEditAt: '2026-05-23T09:30:00', lastEditedBy: 'ben.planner',
  },
]

vi.mock('../../api/config', () => ({ getApiMode: () => 'mock' }))
vi.mock('../../data/orders', () => ({ getAllOrders: () => ROWS }))

const { ordersSearchAdapter: adapter } = await import('./adapter')
const { ORDERS_PROGRESSION } = await import('./progression')

const items = (sections) => sections.flatMap((s) => s.items)
const chip = (key, dataKey, queryValue, group, exact) => ({ key, dataKey, queryValue, group, kind: 'attribute', ...(exact && { exact: true }) })

describe('getInitial — drill forward', () => {
  it('an untouched bar suggests NOTHING', async () => {
    expect(await adapter.getInitial([])).toEqual([])
  })

  it('one committed chip suggests the NEXT progression group', async () => {
    const [sections] = [await adapter.getInitial([chip('order-number', 'orderNumber', '91000', 'Order Identifiers')])]
    expect(sections).toHaveLength(1)
    expect(sections[0].title).toBe(ORDERS_PROGRESSION[1].label) // 'Who it belongs to'
    expect(items(sections).map((i) => i.key)).toEqual(['customer'])
  })

  it('never re-offers an attribute already committed', async () => {
    const sections = await adapter.getInitial([
      chip('customer', 'customer', 'WEYERH_01', 'Customers & Parties'),
      chip('shipper-location', 'shipperLocation', 'Longview', 'Route & Geography'),
    ])
    const keys = items(sections).map((i) => i.key)
    expect(keys).not.toContain('shipper-location')
    expect(keys.length).toBeGreaterThan(0)
  })

  it('past the last group it stays on a group that still has room', async () => {
    const sections = await adapter.getInitial([chip('last-edited-by', 'lastEditedBy', 'amy.cook', 'Created & Edited')])
    expect(sections[0].items.map((i) => i.key)).not.toContain('last-edited-by')
  })
})

describe('getSuggestions — "What is it?"', () => {
  it('ranks the attributes whose REAL values match the typed text', async () => {
    const sections = await adapter.getSuggestions('WEYERH')
    expect(sections[0].title).toBe('What is it?')
    expect(items(sections).map((i) => i.key)).toEqual(['customer'])
    expect(items(sections)[0].label).toBe('Customer: WEYERH')
  })

  it('a value nothing carries suggests nothing', async () => {
    expect(await adapter.getSuggestions('zzzz')).toEqual([])
  })

  it('finds an order by a location the projection flattened', async () => {
    const keys = items(await adapter.getSuggestions('Longview')).map((i) => i.key)
    expect(keys).toContain('shipper-location')
  })

  it('a typed date matches the date attributes with no special case', async () => {
    // The projection stores dates as M/D/YYYY, so this rides the ordinary
    // value-ranking path — no Case-12 carve-out needed for a COMPLETE date.
    const keys = items(await adapter.getSuggestions('5/29/2026')).map((i) => i.key)
    expect(keys).toContain('latest-pickup')
  })

  it('an enum reached by its DISPLAY label, never the stored code', async () => {
    const keys = items(await adapter.getSuggestions('Outbound')).map((i) => i.key)
    expect(keys).toContain('ship-direction')
    // The stored code is 'O'/'I'; nothing indexes it, so it cannot be typed.
    const byCode = items(await adapter.getSuggestions('Inbound')).map((i) => i.key)
    expect(byCode).toContain('ship-direction')
  })

  it('a PARTIAL enum commits the whole catalog value, not the partial', async () => {
    // 'O' prefixes exactly one Ship Direction value. Committing 'O' would make a
    // chip that matches nothing, because enums compare whole values.
    const item = items(await adapter.getSuggestions('O')).find((i) => i.key === 'ship-direction')
    expect(item.queryValue).toBe('Outbound')
    expect(item.label).toBe('Ship Direction: Outbound')
  })

  it('a multi-code list chips only when EVERY code matches the same attribute', async () => {
    const both = items(await adapter.getSuggestions('0000000091000, 0000000091001'))
    expect(both.map((i) => i.key)).toEqual(['order-number'])
    expect(both[0].queryValue).toBe('0000000091000, 0000000091001')
    // One code resolving elsewhere → no suggestion at all; it stays free text.
    expect(await adapter.getSuggestions('0000000091000, WEYERH_01')).toEqual([])
  })

  it('carries `exact` onto enum items so the chip never substring-matches', async () => {
    const item = items(await adapter.getSuggestions('Load Planned')).find((i) => i.key === 'order-status')
    expect(item.exact).toBe(true)
  })
})

describe('search', () => {
  it('nothing to search on is an honest empty, not everything', async () => {
    expect(await adapter.search([], '')).toEqual({ results: [], total: 0 })
  })

  it('free text alone labels each row by its OWN best-matching attribute', async () => {
    const { results, total } = await adapter.search([], 'WEYERH_01')
    expect(total).toBe(1)
    expect(results[0].matchId).toBe('Customer WEYERH_01')
    expect(results[0].id).toBe('0000000091000')
  })

  it('a chip filters, and the leading chip names the bold value', async () => {
    const { results, total } = await adapter.search([chip('order-status', 'orderStatus', 'Cancelled', 'Order Status & Source', true)])
    expect(total).toBe(1)
    expect(results[0].id).toBe('0000000091001')
    expect(results[0].matchId).toBe('Order Status Cancelled')
  })

  it('chips AND — they narrow, never union', async () => {
    const both = await adapter.search([
      chip('order-status', 'orderStatus', 'Cancelled', 'Order Status & Source', true),
      chip('customer', 'customer', 'WEYERH_01', 'Customers & Parties'),
    ])
    expect(both.total).toBe(0)
  })

  it('an exact enum chip does not substring-match a sibling value', async () => {
    // 'Load Planned' must not be reached by a chip for 'Planned'.
    const loose = await adapter.search([chip('order-status', 'orderStatus', 'Planned', 'Order Status & Source', true)])
    expect(loose.total).toBe(0)
  })

  it('rows carry the route, customer and a status badge for the preview', async () => {
    const { results } = await adapter.search([], 'WEYERH_01')
    expect(results[0].route).toBe('Longview, WA → Freeport, TX')
    expect(results[0].customer).toBe('WEYERH_01')
    expect(results[0].source).toEqual({ label: 'Load Planned', variant: 'blue' })
    expect(results[0].iconType).toBe('package')
  })

  it('chips + free text AND together', async () => {
    const narrowed = await adapter.search(
      [chip('order-source', 'orderSource', 'Manual', 'Order Status & Source', true)],
      'WEYERH_01',
    )
    expect(narrowed.total).toBe(0) // WEYERH_01's order is Integrated
  })
})

describe('getAttributeValues', () => {
  it('returns the distinct values of one attribute', async () => {
    expect(await adapter.getAttributeValues('customer', '')).toEqual(['WEYERH_01', 'BASF_CHM_01'])
    expect(await adapter.getAttributeValues('customer', 'BAS')).toEqual(['BASF_CHM_01'])
  })
})
