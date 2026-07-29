import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))
// Live-branch tests stub the HTTP layer; mock tests never reach it.
vi.mock('../client', () => ({ apiGet: vi.fn(), apiPost: vi.fn() }))

function mk(orderNumber: string, extra: Record<string, unknown> = {}) {
  return {
    orderNumber,
    orderSource: 'INTEGRATED',
    customer: 'ERCO_SYS_01',
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
    ...extra,
  }
}

const STORE = [
  mk('CCC100005'),
  mk('AAA100001'),
  mk('AAA100002', { customer: 'BASF_CHM_01', orderStatus: 'Cancelled' }),
  mk('BBB100004', { customer: 'BASF_CHM_01' }),
  mk('BBB100003', {
    consignor: {
      locationId: 'EW-TX-001', city: 'Freeport', state: 'TX', country: 'US',
      earliestPickupDateTime: '2026-07-01T08:00:00.000Z',
      latestPickupDateTime: '2026-07-01T16:00:00.000Z',
    },
  }),
]

vi.mock('../../data/orders', () => ({ getAllOrders: () => STORE, getOrderEnrichment: () => null }))

import { getApiMode } from '../config'
import { apiGet } from '../client'
import {
  getOrderList, getOrderTabCounts, saveDraft, submitDraftOrder, cancelOrder, __resetOrderWriteState,
} from './orderService'
import { orderFormValuesSample } from '../fixtures/orderFormValues.sample'

const page = (pageNumber = 1, pageSize = 20) => ({ pagination: { pageNumber, pageSize } })

describe('orderService.getOrderList (mock)', () => {
  it('returns the LLD envelope with default orderNumber asc sort', async () => {
    const res = await getOrderList(page())
    expect(res.success).toBe(true)
    expect(res.error).toBeNull()
    expect(res.pagination).toEqual({ pageNumber: 1, pageSize: 20, totalCount: 5 })
    expect(res.orders.map(o => o.orderNumber)).toEqual(
      ['AAA100001', 'AAA100002', 'BBB100003', 'BBB100004', 'CCC100005'])
  })

  it('sorts descending when asked (the newest-first proxy)', async () => {
    const res = await getOrderList({ ...page(), sort: { field: 'orderNumber', direction: 'desc' } })
    expect(res.orders[0].orderNumber).toBe('CCC100005')
    expect(res.orders[4].orderNumber).toBe('AAA100001')
  })

  it('paginates 1-based and reports unsliced totalCount', async () => {
    const p1 = await getOrderList(page(1, 2))
    const p2 = await getOrderList(page(2, 2))
    const p3 = await getOrderList(page(3, 2))
    expect(p1.orders.map(o => o.orderNumber)).toEqual(['AAA100001', 'AAA100002'])
    expect(p2.orders.map(o => o.orderNumber)).toEqual(['BBB100003', 'BBB100004'])
    expect(p3.orders.map(o => o.orderNumber)).toEqual(['CCC100005'])
    expect(p1.pagination.totalCount).toBe(5)
    expect(p3.pagination.totalCount).toBe(5)
  })

  it('ANDs across filter fields, ORs within an array', async () => {
    // single-value array narrows…
    const basf = await getOrderList({ ...page(), filters: { customers: ['BASF_CHM_01'] } })
    expect(basf.pagination.totalCount).toBe(2)
    // …two values widen back to all 5 (OR within the array)
    const or = await getOrderList({ ...page(), filters: { customers: ['ERCO_SYS_01', 'BASF_CHM_01'] } })
    expect(or.pagination.totalCount).toBe(5)
    // AND across: BASF + Cancelled narrows to one
    const and = await getOrderList({ ...page(), filters: { customers: ['BASF_CHM_01'], orderStatuses: ['Cancelled'] } })
    expect(and.orders.map(o => o.orderNumber)).toEqual(['AAA100002'])
  })

  it('filters origin city and earliest-pickup date range', async () => {
    const city = await getOrderList({ ...page(), filters: { originCities: ['Freeport'] } })
    expect(city.orders.map(o => o.orderNumber)).toEqual(['BBB100003'])
    const range = await getOrderList({
      ...page(),
      filters: { earliestPickupDateFrom: '2026-06-30', earliestPickupDateTo: '2026-07-02' },
    })
    expect(range.orders.map(o => o.orderNumber)).toEqual(['BBB100003'])
  })

  // Navbar customer scope — gridService semantics (S79c decision 10)
  it('scopes to the selected customers before everything else', async () => {
    const scoped = await getOrderList(page(), ['BASF_CHM_01'])
    expect(scoped.pagination.totalCount).toBe(2)
    expect(scoped.orders.every(o => o.customer === 'BASF_CHM_01')).toBe(true)
  })

  it('yields an honestly empty page for an empty customer scope, everything when unscoped', async () => {
    const none = await getOrderList(page(), [])
    expect(none.pagination.totalCount).toBe(0)
    expect(none.orders).toEqual([])
    const all = await getOrderList(page(), undefined)
    expect(all.pagination.totalCount).toBe(5)
  })

  it('sorts number-less pending rows as the NEWEST under the desc newest-first proxy', async () => {
    STORE.push(mk('', { orderId: 91001 }))
    try {
      const desc = await getOrderList({ ...page(), sort: { field: 'orderNumber', direction: 'desc' } })
      expect(desc.orders[0].orderNumber).toBe('') // pending first — newest
      const asc = await getOrderList({ ...page(), sort: { field: 'orderNumber', direction: 'asc' } })
      expect(asc.orders[asc.orders.length - 1].orderNumber).toBe('') // pending last
    } finally {
      STORE.pop()
    }
  })

  // Overlay rows SHADOW base rows sharing an orderNumber — a session draft
  // saved over a generated row must replace it in the grid, never duplicate it
  // (duplicate ids would collide as TanStack row keys).
  it('overlay rows shadow same-numbered base rows — no duplicates', async () => {
    __resetOrderWriteState()
    try {
      const v = structuredClone(orderFormValuesSample)
      v.general.orderNumber = 'AAA100001' // same number as a base STORE row
      await saveDraft(v)

      const list = await getOrderList(page())
      const matches = list.orders.filter(o => o.orderNumber === 'AAA100001')
      expect(matches).toHaveLength(1)
      expect(matches[0].orderStatus).toBe('Draft') // the overlay version won
      expect(list.pagination.totalCount).toBe(5) // replaced, not appended
    } finally {
      __resetOrderWriteState()
    }
  })

  // LINX-11663: Submit copies a base Draft row into the overlay under 'Ready
  // For Plan' — it must vanish from the Draft-tab filter and reappear in All
  // with the new status, exactly how the route's tab filters read it.
  it('submitDraftOrder moves a Draft row out of the draft tab into All as Ready For Plan', async () => {
    __resetOrderWriteState()
    STORE.push(mk('GGG100009', { orderStatus: 'Draft' }))
    try {
      await submitDraftOrder('GGG100009')

      const draftTab = await getOrderList({ ...page(), filters: { orderStatuses: ['Draft'] } })
      expect(draftTab.orders.map(o => o.orderNumber)).not.toContain('GGG100009')

      const allTab = await getOrderList(page())
      const row = allTab.orders.find(o => o.orderNumber === 'GGG100009')
      expect(row?.orderStatus).toBe('Ready For Plan')
    } finally {
      STORE.pop()
      __resetOrderWriteState()
    }
  })

  // LINX-10258: Cancel is a soft delete — status flips to 'Cancelled', row stays.
  it('cancelOrder flips a row to Cancelled without removing it', async () => {
    __resetOrderWriteState()
    try {
      await cancelOrder('CCC100005')
      const list = await getOrderList(page())
      expect(list.pagination.totalCount).toBe(5) // still present, not deleted
      expect(list.orders.find(o => o.orderNumber === 'CCC100005')?.orderStatus).toBe('Cancelled')
    } finally {
      __resetOrderWriteState()
    }
  })
})

describe('orderService.getOrderTabCounts (mock)', () => {
  it('buckets All / Draft / Validation Errors, honors customer scope', async () => {
    STORE.push(
      mk('DDD100006', { orderStatus: 'Draft' }),
      mk('EEE100007', { orderStatus: 'Shipment Failed' }),
      mk('FFF100008', { customer: 'BASF_CHM_01', orderStatus: 'Planning Failed' }),
    )
    try {
      expect(await getOrderTabCounts()).toEqual({ all: 8, draft: 1, validationErrors: 2 })
      expect(await getOrderTabCounts(['ERCO_SYS_01'])).toEqual({ all: 5, draft: 1, validationErrors: 1 })
      expect(await getOrderTabCounts([])).toEqual({ all: 0, draft: 0, validationErrors: 0 })
    } finally {
      STORE.splice(-3)
    }
  })
})

describe('orderService.getOrderTabCounts (live)', () => {
  const mode = vi.mocked(getApiMode)
  const get = vi.mocked(apiGet)
  afterEach(() => { mode.mockReturnValue('mock'); get.mockReset() })

  it('calls the tab-counts endpoint scoped, passing the response through', async () => {
    mode.mockReturnValue('live')
    const counts = { all: 3, draft: 1, validationErrors: 0 }
    get.mockResolvedValue(counts)
    expect(await getOrderTabCounts(['A_01'])).toEqual(counts)
    expect(get).toHaveBeenCalledWith('/order-service/v3/order/tab-counts?customers=A_01')
  })

  it('short-circuits an empty scope to zeros without an HTTP call', async () => {
    mode.mockReturnValue('live')
    expect(await getOrderTabCounts([])).toEqual({ all: 0, draft: 0, validationErrors: 0 })
    expect(get).not.toHaveBeenCalled()
  })

  it('omits the customers param when the scope is undefined', async () => {
    mode.mockReturnValue('live')
    get.mockResolvedValue({ all: 5, draft: 0, validationErrors: 0 })
    await getOrderTabCounts()
    expect(get).toHaveBeenCalledWith('/order-service/v3/order/tab-counts')
  })
})
