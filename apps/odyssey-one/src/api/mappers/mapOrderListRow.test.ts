import { describe, expect, it } from 'vitest'
import { mapOrderListRow } from './mapOrderListRow'
import { orderListRowSample } from '../fixtures/orderListRow.sample'
import type { OrderListRow } from '../types/orderList'

describe('mapOrderListRow', () => {
  it('maps the LLD sample row to flat display strings', () => {
    const vm = mapOrderListRow(orderListRowSample)
    expect(vm).toEqual({
      id: 'SUT355123',
      idLabel: 'SUT355123',
      customer: 'SABIC_CLT',
      origin: 'RGC-STL-001: St Louis, MO',
      destination: 'SAB-CLT-001: Charlotte, NC',
      weight: '4300 lbs',
      volume: '730 cbf',
      commodity: 'Plastic',
      equipment: 'TL',
      earlyPickup: '06/15/2026 08:00',
      status: 'Ready For Plan',
    })
  })

  it('is null-safe on a fully sparse row', () => {
    const vm = mapOrderListRow({} as OrderListRow)
    expect(vm.id).toBe('')
    expect(vm.idLabel).toBe('')
    expect(vm.customer).toBe('')
    expect(vm.origin).toBe('')
    expect(vm.destination).toBe('')
    expect(vm.weight).toBe('')
    expect(vm.volume).toBe('')
    expect(vm.earlyPickup).toBe('')
    expect(vm.status).toBe('')
  })

  it('degrades the place format gracefully when parts are missing', () => {
    const partial = {
      ...orderListRowSample,
      consignor: { ...orderListRowSample.consignor, locationId: undefined as unknown as string },
      consignee: { ...orderListRowSample.consignee, city: undefined as unknown as string, state: undefined as unknown as string },
    }
    const vm = mapOrderListRow(partial)
    expect(vm.origin).toBe('St Louis, MO')          // no locationId → city/state only
    expect(vm.destination).toBe('SAB-CLT-001')      // no city/state → id only
  })
})
