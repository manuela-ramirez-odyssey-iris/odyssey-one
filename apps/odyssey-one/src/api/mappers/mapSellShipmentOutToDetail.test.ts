import { describe, expect, it } from 'vitest'
import { mapSellShipmentOutToDetail } from './mapSellShipmentOutToDetail'
import { sellShipmentOutSample } from '../fixtures/sellShipmentOut.sample'

describe('mapSellShipmentOutToDetail', () => {
  const vm = mapSellShipmentOutToDetail(sellShipmentOutSample)

  it('maps one orderDetails entry per order', () => {
    expect(vm.orderDetails).toHaveLength(2)
  })

  it('maps identity + reference fields from the order', () => {
    const o = vm.orderDetails[0]
    expect(o.orderNumber).toBe('SO-660001')
    expect(o.poNumber).toBe('PO-770001')
    expect(o.shipDirection).toBe('Outbound')
  })

  it('formats weights as "value UOM" strings', () => {
    expect(vm.orderDetails[0].grossWeight).toBe('18,207 LB')
    expect(vm.orderDetails[0].tareWeight).toBe('3,641 LB')
    expect(vm.orderDetails[0].totalVolume).toBe('420 cuft')
  })

  it('builds shipFrom/shipTo from the address blocks', () => {
    const o = vm.orderDetails[0]
    expect(o.shipFrom.company).toBe('Acme Houston Plant')
    expect(o.shipFrom.location).toBe('77001, Houston, TX, US')
    expect(o.shipFrom.address).toBe('100 Refinery Rd')
    expect(o.shipTo.location).toBe('60601, Chicago, IL, US')
  })

  it('derives appointment booleans from presence', () => {
    expect(vm.orderDetails[0].pickupAppointment).toBe(true)
    expect(vm.orderDetails[0].deliveryAppointment).toBe(false)
  })

  it('derives hazmat from order lines', () => {
    expect(vm.orderDetails[0].hazmat).toBe('No')
    expect(vm.orderDetails[1].hazmat).toBe('Yes')
  })

  it('defaults unmapped fields to "--" (graceful degradation)', () => {
    expect(vm.orderDetails[0].salesOrder).toBe('--')
    expect(vm.orderDetails[0].customField1).toBe('--')
  })

  it('emits empty sibling sections so other tabs degrade gracefully', () => {
    expect(vm.stopsData).toEqual({ summary: {}, stops: [] })
    expect(vm.productData).toEqual({ orders: [] })
    expect(vm.costData).toEqual({ planned: { summary: {}, orders: [] } })
    expect(vm.notesData).toEqual({ notes: [] })
  })
})
