import { describe, it, expect, vi, beforeEach } from 'vitest'
import ordersFixture from '../../data/orders.json'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock'), getApiBaseUrl: () => '' }))
vi.mock('../client', () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPatch: vi.fn(), apiPut: vi.fn() }))

import { getApiMode } from '../config'
import { apiPost } from '../client'
import { getAuditTrail } from './orderService'

const numbered = (ordersFixture as any[]).find((r) => r.orderNumber && r.orderStatus === 'Planned Shipment')
const pending = (ordersFixture as any[]).find((r) => !r.orderNumber)

describe('getAuditTrail (mock)', () => {
  beforeEach(() => { (getApiMode as any).mockReturnValue('mock') })

  it('pages newest-first by default and reports the total + order meta', async () => {
    const page = await getAuditTrail({ orderNumber: numbered.orderNumber, pageNumber: 1, pageSize: 25, sortDirection: 'desc' })
    expect(page.order?.orderNumber).toBe(numbered.orderNumber)
    expect(page.order?.orderSource).toBe('Integrated')
    expect(page.totalCount).toBeGreaterThan(1)
    expect(page.rows.length).toBe(Math.min(25, page.totalCount))
    for (let k = 1; k < page.rows.length; k++) expect(page.rows[k].timestamp <= page.rows[k - 1].timestamp).toBe(true)
    // the creation row is the OLDEST — last in desc order
    const all = await getAuditTrail({ orderNumber: numbered.orderNumber, pageNumber: 1, pageSize: 40, sortDirection: 'desc' })
    expect(all.rows[all.rows.length - 1].changeCategory).toBe('Order Creation')
  })

  it('asc puts creation first; page 2 continues where page 1 stopped', async () => {
    const p1 = await getAuditTrail({ orderNumber: numbered.orderNumber, pageNumber: 1, pageSize: 2, sortDirection: 'asc' })
    const p2 = await getAuditTrail({ orderNumber: numbered.orderNumber, pageNumber: 2, pageSize: 2, sortDirection: 'asc' })
    expect(p1.rows[0].changeCategory).toBe('Order Creation')
    expect(p1.rows.map((r) => r.id)).not.toContain(p2.rows[0]?.id)
    expect(p1.totalCount).toBe(p2.totalCount)
  })

  it('unknown order → empty page with order: null', async () => {
    const page = await getAuditTrail({ orderNumber: 'NOPE', pageNumber: 1, pageSize: 25, sortDirection: 'desc' })
    expect(page).toEqual({ rows: [], totalCount: 0, order: null })
  })

  it('resolves a pending-<orderId> key (async create in flight) like getOrderView does', async () => {
    const key = `pending-${pending.orderId}`
    const page = await getAuditTrail({ orderNumber: key, pageNumber: 1, pageSize: 25, sortDirection: 'desc' })
    expect(page.order?.orderNumber).toBe(key)
    expect(page.rows.length).toBeGreaterThan(0)
    expect(page.rows[page.rows.length - 1].changeCategory).toBe('Order Creation')
  })
})

describe('getAuditTrail (live)', () => {
  it('POSTs /order-service/v3/audit-report with the paging + sort and maps the rows', async () => {
    ;(getApiMode as any).mockReturnValue('live')
    ;(apiPost as any).mockResolvedValueOnce({
      order: { orderNumber: '0000000091000', orderSource: 'INTEGRATED', createdAt: '2026-05-29T04:45:00', createdTimeZoneCode: 'CDT', createdBy: 'ERP' },
      pagination: { pageNumber: 1, pageSize: 25, totalCount: 1 },
      data: [{
        auditId: 7, changeTimestamp: '2026-05-29T04:45:00', timeZoneCode: 'CDT', changeMadeBy: 'SYSTEM', source: 'ERP',
        changeType: 'ORDER_ACTION', changeCategory: 'ORDER_CREATION', lineItemId: null, changes: [],
      }],
    })
    const page = await getAuditTrail({ orderNumber: '0000000091000', pageNumber: 1, pageSize: 25, sortDirection: 'desc' })
    expect(apiPost).toHaveBeenCalledWith('/order-service/v3/audit-report', {
      orderNumber: '0000000091000',
      pagination: { pageNumber: 1, pageSize: 25 },
      sort: { field: 'changeTimestamp', direction: 'desc' },
    })
    expect(page.totalCount).toBe(1)
    expect(page.order?.orderSource).toBe('Integrated')
    expect(page.rows[0]).toMatchObject({ id: '7', changedBy: 'System', changeType: 'Order Action', changeCategory: 'Order Creation', lineItemId: null })
  })

  it('empty result (order: null, no data) → empty page', async () => {
    ;(getApiMode as any).mockReturnValue('live')
    ;(apiPost as any).mockResolvedValueOnce({
      order: null,
      pagination: { pageNumber: 1, pageSize: 25, totalCount: 0 },
      data: [],
    })
    const page = await getAuditTrail({ orderNumber: 'NOPE', pageNumber: 1, pageSize: 25, sortDirection: 'desc' })
    expect(page).toEqual({ rows: [], totalCount: 0, order: null })
  })
})
