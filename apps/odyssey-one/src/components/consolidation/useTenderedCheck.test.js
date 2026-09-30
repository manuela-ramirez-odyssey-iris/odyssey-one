import { describe, it, expect } from 'vitest'
import { externalCheckRows, isTendered, tenderedErrorMessage } from './useTenderedCheck.js'

describe('externalCheckRows (S6.2)', () => {
  const ext = [
    { orderNumber: 'E1', sourceSellShipment: '77', sourceTenderStatus: 'Accepted', sourceIdentifier: 'O77', sourceOrders: ['E1', 'E2'], sourceCustomerId: 'V', sourcePickupDate: '06/04/2026' },
    { orderNumber: 'E2', sourceSellShipment: '77', sourceTenderStatus: 'Accepted', sourceIdentifier: 'O77', sourceOrders: ['E1', 'E2'] },
    { orderNumber: 'F1', sourceSellShipment: '88', sourceTenderStatus: '' },
  ]
  it('folds external orders into one row per source shipment, keeping only the pulled orders as removeIds', () => {
    const rows = externalCheckRows(ext)
    expect(rows.map((r) => r.sellShipment)).toEqual(['77', '88'])
    expect(rows[0]).toMatchObject({ odysseyShipmentIdentifier: 'O77', orders: ['E1', 'E2'], removeIds: ['E1', 'E2'], external: true })
    expect(rows[1]).toMatchObject({ odysseyShipmentIdentifier: '88', removeIds: ['F1'] })
  })
  it('a row counts as tendered on the active tender statuses only', () => {
    const [a, b] = externalCheckRows(ext)
    expect(isTendered(a)).toBe(true)
    expect(isTendered(b)).toBe(false)
    expect(tenderedErrorMessage([a])).toBe('Shipment O77 has been tendered and cannot be consolidated.')
  })
})
