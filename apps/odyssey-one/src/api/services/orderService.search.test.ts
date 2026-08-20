/**
 * GlobalSearch free text over the Orders list (S128).
 *
 * The semantics under test are Shipments' own, shared verbatim via
 * `search/criteria-core` — so these tests are really asserting that Orders did
 * not accidentally grow a SECOND, divergent interpretation of a query.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))
vi.mock('../client', () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPatch: vi.fn() }))

function mk(orderNumber: string, customer = 'ERCO_SYS_01') {
  return {
    orderNumber,
    customer,
    orderSource: 'INTEGRATED',
    shipDirection: 'O',
    freightTerms: 'P',
    equipment: 'VAN',
    consignor: {
      locationId: 'EW-TX-001', city: 'Houston', state: 'TX', country: 'US',
      earliestPickupDateTime: '2026-06-10T08:00:00.000Z',
      latestPickupDateTime: '2026-06-10T16:00:00.000Z',
    },
    consignee: {
      locationId: 'GT-LA-002', city: 'Bastrop', state: 'LA', country: 'US',
      earliestDeliveryDateTime: '2026-06-12T08:00:00.000Z',
      latestDeliveryDateTime: '2026-06-12T16:00:00.000Z',
    },
    grossWeight: { value: 4300, uom: 'lbs' },
    volume: { value: 730, uom: 'cbf' },
    commodity: 'Plastic',
    orderStatus: 'Ready For Plan',
  }
}

const STORE = [
  mk('USA-95780'),
  mk('USA-95781'),
  mk('ERC-112330'),
  mk('0000000113049'),
  // Carries "USA-9578" in the MIDDLE — proves matching is substring, while the
  // rows that START with it still outrank this one.
  mk('Z-USA-9578-Q'),
  mk('KEM-40001', 'KEMIRA_EU_01'),
  // Two-word customer: the phrase must survive as ONE value, not be tokenized.
  mk('WEY-1', 'Weyerhaeuser Company'),
  mk('OTH-1', 'Other Company'),
]

vi.mock('../../data/orders', () => ({ getAllOrders: () => STORE, getOrderEnrichment: () => null }))

import { getOrderList } from './orderService'

const search = async (searchText: string) =>
  (await getOrderList({ pagination: { pageNumber: 1, pageSize: 50 }, filters: { searchText } } as never))
    .orders.map(o => o.orderNumber)

describe('free-text matching', () => {
  it('finds an order by its first characters', async () => {
    expect(await search('USA-9578')).toEqual(expect.arrayContaining(['USA-95780', 'USA-95781']))
  })

  it('ranks the exact match above the merely-prefixed one', async () => {
    expect((await search('USA-95780'))[0]).toBe('USA-95780')
  })

  it('is case-insensitive', async () => {
    expect(await search('erc-112330')).toEqual(['ERC-112330'])
  })

  it('searches the customer as well as the order number', async () => {
    expect(await search('KEMIRA')).toEqual(['KEM-40001'])
  })

  it('matches interior substrings too, but ranks prefix hits FIRST', async () => {
    const res = await search('USA-9578')
    // All three match — matching is substring, exactly as in Shipments…
    expect(res).toEqual(expect.arrayContaining(['USA-95780', 'USA-95781', 'Z-USA-9578-Q']))
    // …but starts-with (2) outranks contains (1), so the interior hit sinks to
    // the bottom. This is what "matches the first characters" delivers: the
    // orders whose number BEGINS with what you typed lead the list.
    expect(res[res.length - 1]).toBe('Z-USA-9578-Q')
    expect(res.slice(0, 2)).toEqual(expect.arrayContaining(['USA-95780', 'USA-95781']))
  })

  it('matches nothing for a query no row carries', async () => {
    expect(await search('ZZZ-NOPE')).toEqual([])
  })
})

describe('multi-code union (the Shipments GS-20 rule, verbatim)', () => {
  it('returns BOTH orders for a two-code query', async () => {
    const res = await search('ERC-112330 0000000113049')
    expect(res).toHaveLength(2)
    expect(res).toEqual(expect.arrayContaining(['ERC-112330', '0000000113049']))
  })

  it('accepts commas as well as spaces between codes', async () => {
    expect(await search('ERC-112330, 0000000113049')).toHaveLength(2)
  })

  it('unions three codes', async () => {
    expect(await search('USA-95780 ERC-112330 KEM-40001')).toHaveLength(3)
  })

  it('does NOT tokenize a phrase that matches as a whole', async () => {
    // "Weyerhaeuser Company" matches one row intact. Tokenizing would union
    // "weyerhaeuser" with "company" and drag in "Other Company".
    const res = await search('Weyerhaeuser Company')
    expect(res).toEqual(['WEY-1'])
    expect(res).not.toContain('OTH-1')
  })

  it('falls back to tokenizing only when the whole phrase matches nothing', async () => {
    const res = await search('Weyerhaeuser KEMIRA')
    expect(res).toEqual(expect.arrayContaining(['WEY-1', 'KEM-40001']))
  })
})

describe('interaction with the rest of the request', () => {
  it('ANDs with the tab status filter', async () => {
    const res = await getOrderList({
      pagination: { pageNumber: 1, pageSize: 50 },
      filters: { searchText: 'USA-9578', orderStatuses: ['Cancelled'] },
    } as never)
    expect(res.orders).toEqual([])
  })

  it('ANDs with the navbar customer scope', async () => {
    const res = await getOrderList(
      { pagination: { pageNumber: 1, pageSize: 50 }, filters: { searchText: 'KEMIRA' } } as never,
      ['ERCO_SYS_01'],
    )
    expect(res.orders).toEqual([])
  })

  it('reports the unsliced total and pages the ranked list', async () => {
    const p1 = await getOrderList({
      pagination: { pageNumber: 1, pageSize: 1 }, filters: { searchText: 'USA-9578' },
    } as never)
    // USA-95780, USA-95781 and the interior hit Z-USA-9578-Q.
    expect(p1.pagination.totalCount).toBe(3)
    expect(p1.orders).toHaveLength(1)
  })

  it('no search text = no narrowing and the normal column sort', async () => {
    const res = await getOrderList({
      pagination: { pageNumber: 1, pageSize: 50 },
      sort: { field: 'orderNumber', direction: 'asc' },
    } as never)
    expect(res.orders).toHaveLength(STORE.length)
    expect(res.orders[0].orderNumber).toBe('0000000113049')
  })
})

describe('live branch: the server-side phrase-then-tokenize twin', () => {
  it('runs the phrase, and only re-runs as a code list when it matched nothing', async () => {
    const { getApiMode } = await import('../config')
    const { apiPost } = await import('../client')
    vi.mocked(getApiMode).mockReturnValue('live')

    // Phrase hits → exactly one round trip, and `searchText` never goes on the wire.
    vi.mocked(apiPost).mockResolvedValue(
      { success: true, orders: [], pagination: { pageNumber: 1, pageSize: 25, totalCount: 3 }, error: null } as never,
    )
    await getOrderList({ pagination: { pageNumber: 1, pageSize: 25 }, filters: { searchText: 'ERC-112330 KEM-40001' } } as never)
    expect(vi.mocked(apiPost)).toHaveBeenCalledTimes(1)
    const first = vi.mocked(apiPost).mock.calls[0][1] as never as { filters: Record<string, unknown> }
    expect(first.filters.searchTerms).toEqual(['erc-112330 kem-40001'])
    expect(first.filters.searchText).toBeUndefined()

    // Phrase misses AND tokenizes into ≥2 → a second call with the codes.
    vi.mocked(apiPost).mockClear()
    vi.mocked(apiPost).mockResolvedValue(
      { success: true, orders: [], pagination: { pageNumber: 1, pageSize: 25, totalCount: 0 }, error: null } as never,
    )
    await getOrderList({ pagination: { pageNumber: 1, pageSize: 25 }, filters: { searchText: 'ERC-112330 KEM-40001' } } as never)
    expect(vi.mocked(apiPost)).toHaveBeenCalledTimes(2)
    const second = vi.mocked(apiPost).mock.calls[1][1] as never as { filters: Record<string, unknown> }
    expect(second.filters.searchTerms).toEqual(['erc-112330', 'kem-40001'])

    // A single-token miss is NOT retried — there is nothing to split.
    vi.mocked(apiPost).mockClear()
    await getOrderList({ pagination: { pageNumber: 1, pageSize: 25 }, filters: { searchText: 'NOPE' } } as never)
    expect(vi.mocked(apiPost)).toHaveBeenCalledTimes(1)

    vi.mocked(getApiMode).mockReturnValue('mock')
  })
})
