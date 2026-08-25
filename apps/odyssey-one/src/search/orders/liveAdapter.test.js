// S131 — in live mode the preview used to count the SEEDED JSON while the grid
// counted Neon: searching "er" offered "Show all 56 results" and landed on a
// table reading 293 items. The preview now asks the order-list API — the same
// call the grid makes — so the two totals agree by construction.
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../api/services/orderService', () => ({ getOrderList: vi.fn() }))

import { getOrderList } from '../../api/services/orderService'
import { makeLiveAdapter } from './liveAdapter'
import { ordersSearchAdapter as mockAdapter } from './adapter'

const adapter = makeLiveAdapter(mockAdapter)
const apiRow = (orderNumber, extra = {}) => ({
  orderNumber, customer: 'VALTRIS_01', orderStatus: 'Shipment Failed', equipment: 'LTR',
  consignor: { name: 'Huntsman Odessa', city: 'Odessa', state: 'TX', country: 'US' },
  consignee: { name: 'Celanese Hub', city: 'Chicago', state: 'IL', country: 'US' },
  ...extra,
})
const reply = (rows, totalCount) => ({
  success: true, orders: rows, pagination: { pageNumber: 1, pageSize: 15, totalCount }, error: null,
})

beforeEach(() => vi.mocked(getOrderList).mockReset())

describe('orders live adapter — preview ≡ grid', () => {
  it('reports the API total, not a locally counted one', async () => {
    vi.mocked(getOrderList).mockResolvedValue(reply([apiRow('0000000092239')], 306))
    const { total, results } = await adapter.search(
      [{ key: 'order-number', dataKey: 'orderNumber', queryValue: 'er' }], '')
    expect(total).toBe(306)          // what the grid will show
    expect(results).toHaveLength(1)  // one page of it
  })

  it('sends the SAME criteria the grid commits — chips and text', async () => {
    vi.mocked(getOrderList).mockResolvedValue(reply([], 0))
    const chips = [{ key: 'customer', dataKey: 'customer', queryValue: 'VALTRIS' }]
    await adapter.search(chips, 'odessa')
    const [request] = vi.mocked(getOrderList).mock.calls[0]
    expect(request.filters.searchChips).toEqual(chips)
    expect(request.filters.searchText).toBe('odessa')
    expect(request.pagination).toEqual({ pageNumber: 1, pageSize: 15 })
  })

  it('renders API rows through the mock adapter\'s own row mapping', async () => {
    vi.mocked(getOrderList).mockResolvedValue(reply([apiRow('0000000092239')], 1))
    const { results } = await adapter.search(
      [{ key: 'order-number', dataKey: 'orderNumber', queryValue: '92239' }], '')
    expect(results[0]).toMatchObject({
      id: '0000000092239',
      matchId: 'Order Number 0000000092239',
      route: 'Odessa, TX → Chicago, IL',
      source: { label: 'Shipment Failed', variant: 'red' },
      'data-order-status': 'Shipment Failed',
    })
    // The meta line stays Orders' own (Customer | PO # | Equipment).
    expect(results[0].meta.map((m) => m.label)).toEqual(['Customer', 'PO #', 'Equipment'])
  })

  it('asks nothing when there is nothing to search', async () => {
    expect(await adapter.search([], '')).toEqual({ results: [], total: 0 })
    expect(getOrderList).not.toHaveBeenCalled()
  })

  it('keeps the mock suggestions — orders are not in the search index yet', async () => {
    expect(adapter.getSuggestions).toBe(mockAdapter.getSuggestions)
    expect(adapter.getAttributeValues).toBe(mockAdapter.getAttributeValues)
  })
})
