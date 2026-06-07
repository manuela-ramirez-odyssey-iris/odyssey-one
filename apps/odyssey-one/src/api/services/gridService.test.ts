import { describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))

function mk(sell: string, panel: string, category: string, extra: Partial<Record<string, unknown>> = {}) {
  return {
    buyShipment: 'BUY' + sell, sellShipment: sell, orders: ['O' + sell], pro: '',
    customerId: 'CID', customerName: '', consignor: '', consignee: '',
    origin: '', destination: '',
    pickupDate: '06/10/2026 08:00 CST', deliveryDate: '06/13/2026 09:00 CST',
    mode: 'TL', equipmentCode: 'VAN', scac: '', tenderStatus: '', shipmentStatus: '',
    panel, category, validationMessage: null,
    grossWeight: '0', loadCount: '0', orderCount: '1', apFreightCost: '0', ...extra,
  }
}

const STORE = [
  mk('A', 'exceptions', 'date-issues', { customerName: 'ERCO Systems Inc', origin: 'Houston TX US 77001', scac: 'ABFS' }),
  mk('B', 'exceptions', 'date-issues', { customerName: 'BASF Chemical Corp', origin: 'Dallas TX US 75201', scac: 'ODFL' }),
  mk('C', 'exceptions', 'routing-review', { customerName: 'ERCO Systems Inc', origin: 'Houston TX US 77001', scac: 'XPOL' }),
  mk('D', 'monitoring', 'hold', { customerName: 'DOW Industrial', origin: 'Freeport TX US 77541', scac: 'SAIA' }),
]

vi.mock('../../data', () => ({ getAllShipments: () => STORE }))

import { getCategoryCounts, getShipmentErrorList } from './gridService'

describe('gridService.getCategoryCounts (mock)', () => {
  it('returns counts per category for a panel', async () => {
    const counts = await getCategoryCounts({ panel: 'exceptions' })
    const byCat = Object.fromEntries(counts.map(c => [c.category, c.count]))
    expect(byCat['date-issues']).toBe(2)
    expect(byCat['routing-review']).toBe(1)
    expect(byCat['hold']).toBeUndefined()
  })

  it('returns empty array for a panel with no rows', async () => {
    expect(await getCategoryCounts({ panel: 'nonexistent' })).toEqual([])
  })
})

describe('gridService.getShipmentErrorList (mock)', () => {
  it('filters by panel and returns the paginated envelope', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25 })
    expect(res.totalCount).toBe(3)
    expect(res.rows).toHaveLength(3)
    expect(res.pageNumber).toBe(0)
  })

  it('filters by category within a panel', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', category: 'date-issues', pageNumber: 0, pageSize: 25 })
    expect(res.totalCount).toBe(2)
  })

  it("treats category 'all' as the whole panel", async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', category: 'all', pageNumber: 0, pageSize: 25 })
    expect(res.totalCount).toBe(3)
  })

  it('slices the requested page and reports true totalCount', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 1, pageSize: 2 })
    expect(res.totalCount).toBe(3)
    expect(res.rows).toHaveLength(1) // page 1 (0-based) of size 2 → 1 leftover
  })

  it('applies a field-equality filter', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25, filter: { scac: 'ABFS' } })
    expect(res.totalCount).toBe(1)
    expect(res.rows[0].scac).toBe('ABFS')
  })

  it('applies searchFilters as per-field substring matches (saved-query semantics)', async () => {
    // customerName 'ERCO Systems Inc' must match the substring 'ERCO'
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25, searchFilters: { customerName: 'ERCO' } })
    expect(res.totalCount).toBe(2) // A + C
    // an exact-equality filter would NOT match the substring
    const exact = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25, filter: { customerName: 'ERCO' } })
    expect(exact.totalCount).toBe(0)
  })

  it('applies a free-text searchTerm across the default field set', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25, searchTerm: 'erco' })
    expect(res.totalCount).toBe(2) // A + C both have ERCO in customerName
  })

  it('scopes searchTerm to a single attribute when searchAttributeKey is set', async () => {
    const res = await getShipmentErrorList({
      panel: 'exceptions', pageNumber: 0, pageSize: 25,
      searchTerm: 'houston', searchAttributeKey: 'origin',
    })
    expect(res.totalCount).toBe(2) // A + C have Houston in origin
  })

  it('sorts ascending by a field when sortBy is given', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25, sortBy: 'scac', orderBy: 'asc' })
    expect(res.rows.map(r => r.scac)).toEqual(['ABFS', 'ODFL', 'XPOL'])
  })
})
