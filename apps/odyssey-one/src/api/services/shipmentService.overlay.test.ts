import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))

import { getSellShipmentDetail } from './shipmentService'
import { addShipment, __resetShipmentWriteState } from '../../data'

beforeEach(() => __resetShipmentWriteState())

describe('getSellShipmentDetail (mock) with the overlay', () => {
  it('serves a session-created shipment without fetching /details', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    addShipment(
      { sellShipment: '26090001', buyShipment: '900090001', odysseyShipmentIdentifier: 'O60090001', orders: ['ORD-1'] },
      { shipmentId: '26090001', odysseyShipmentIdentifier: 'O60090001', shipmentType: 'Direct', customerId: 'ERCO_SYS_01', customerName: 'ERCO Systems Inc',
        orderList: [], shipmentStopList: [], shippingOptionList: [], droppedCarrierList: [], documentList: [], noteList: [], historyList: [] },
    )
    const vm = await getSellShipmentDetail('26090001')
    expect(vm.odysseyShipmentIdentifier).toBe('O60090001')
    expect(vm.shipmentType).toBe('Direct')
    expect(vm.routingData.options).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
