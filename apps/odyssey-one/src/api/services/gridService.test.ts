import { describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))

const STORE = [
  { panel: 'exceptions', category: 'date-issues', buyShipment: 'A', sellShipment: 'SA', orders: [], pro: '', customerId: '', customerName: '', consignor: '', consignee: '', origin: '', destination: '', pickupDate: '', deliveryDate: '', mode: '', equipmentCode: '', scac: '', tenderStatus: '', shipmentStatus: '', validationMessage: null, grossWeight: '', loadCount: '', orderCount: '', apFreightCost: '' },
  { panel: 'exceptions', category: 'date-issues', buyShipment: 'B', sellShipment: 'SB', orders: [], pro: '', customerId: '', customerName: '', consignor: '', consignee: '', origin: '', destination: '', pickupDate: '', deliveryDate: '', mode: '', equipmentCode: '', scac: '', tenderStatus: '', shipmentStatus: '', validationMessage: null, grossWeight: '', loadCount: '', orderCount: '', apFreightCost: '' },
  { panel: 'exceptions', category: 'routing-review', buyShipment: 'C', sellShipment: 'SC', orders: [], pro: '', customerId: 'CID', customerName: 'ERCO', consignor: '', consignee: '', origin: 'Houston TX US 77001', destination: '', pickupDate: '06/10/2026 08:00 CST', deliveryDate: '06/13/2026 09:00 CST', mode: '', equipmentCode: '', scac: 'ABFS', tenderStatus: '', shipmentStatus: '', validationMessage: null, grossWeight: '', loadCount: '', orderCount: '', apFreightCost: '' },
  { panel: 'monitoring', category: 'hold', buyShipment: 'D', sellShipment: 'SD', orders: [], pro: '', customerId: '', customerName: '', consignor: '', consignee: '', origin: '', destination: '', pickupDate: '', deliveryDate: '', mode: '', equipmentCode: '', scac: '', tenderStatus: '', shipmentStatus: '', validationMessage: null, grossWeight: '', loadCount: '', orderCount: '', apFreightCost: '' },
]

vi.mock('../../data', () => ({ getAllShipments: () => STORE }))

import { getCategoryCounts } from './gridService'

describe('gridService.getCategoryCounts (mock)', () => {
  it('returns counts per category for a panel', async () => {
    const counts = await getCategoryCounts({ panel: 'exceptions' })
    const byCat = Object.fromEntries(counts.map(c => [c.category, c.count]))
    expect(byCat['date-issues']).toBe(2)
    expect(byCat['routing-review']).toBe(1)
    expect(byCat['hold']).toBeUndefined() // wrong panel excluded
  })

  it('returns empty array for a panel with no rows', async () => {
    expect(await getCategoryCounts({ panel: 'nonexistent' })).toEqual([])
  })
})
