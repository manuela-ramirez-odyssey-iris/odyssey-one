import { describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))

function mk(orderNumber: string, extra: Record<string, unknown> = {}) {
  return {
    orderNumber,
    orderSource: 'INTEGRATED',
    customer: 'ERCO_SYS_01',
    shipDirection: 'Outbound',
    freightTerms: 'Pre-Paid',
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

vi.mock('../../data/orders', () => ({ getAllOrders: () => STORE }))

import { getOrderList } from './orderService'

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
})
