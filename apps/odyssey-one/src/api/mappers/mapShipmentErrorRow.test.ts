import { describe, expect, it } from 'vitest'
import { mapShipmentErrorRow } from './mapShipmentErrorRow'
import type { ShipmentErrorRow } from '../types/shipmentErrorList'

const row: ShipmentErrorRow = {
  buyShipment: '43708610',
  sellShipment: '25690001',
  orders: ['JAN6ERCO6'],
  pro: '12345678',
  customerId: 'ERCO_SYS_01',
  customerName: 'ERCO Systems Inc',
  consignor: 'ERCO WORLDWIDE',
  consignee: 'EASTMAN CHEMICAL RECV',
  origin: 'Houston TX US 77001',
  destination: 'Kingsport TN US 37660',
  pickupDate: '01/20/2026 14:00 CST',
  deliveryDate: '01/23/2026 09:00 CST',
  mode: 'TL',
  equipmentCode: 'VAN',
  scac: 'ABFS',
  tenderStatus: 'Accepted',
  shipmentStatus: 'Done',
  panel: 'monitoring',
  category: 'approved',
  validationMessage: null,
  grossWeight: '18207',
  loadCount: '3',
  orderCount: '1',
  apFreightCost: '2,231.18',
}

describe('mapShipmentErrorRow', () => {
  it('sets id to sellShipment (the detail-link key)', () => {
    expect(mapShipmentErrorRow(row).id).toBe('25690001')
  })

  it('passes through the display fields the table reads', () => {
    const vm = mapShipmentErrorRow(row)
    expect(vm.buyShipment).toBe('43708610')
    expect(vm.orders).toEqual(['JAN6ERCO6'])
    expect(vm.customerName).toBe('ERCO Systems Inc')
    expect(vm.origin).toBe('Houston TX US 77001')
    expect(vm.tenderStatus).toBe('Accepted')
    expect(vm.apFreightCost).toBe('2,231.18')
  })

  it('preserves null validationMessage', () => {
    expect(mapShipmentErrorRow(row).validationMessage).toBeNull()
  })

  it('degrades missing optional string fields to empty/safe defaults', () => {
    const sparse = { buyShipment: 'B', sellShipment: 'S' } as ShipmentErrorRow
    const vm = mapShipmentErrorRow(sparse)
    expect(vm.id).toBe('S')
    expect(vm.orders).toEqual([])
    expect(vm.customerName).toBe('')
  })
})
