import { describe, expect, it } from 'vitest'
import { mapSellShipmentOutToDetail } from './mapSellShipmentOutToDetail'
import { sellShipmentOutSample } from '../fixtures/sellShipmentOut.sample'
import type { SellShipmentOut } from '../types/sellShipmentOut'

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

  it('emits empty routing/cost/instructions/docs/notes/history sections', () => {
    expect(vm.routingData).toEqual({ options: [] })
    expect(vm.instructionsData).toEqual({ orders: [] })
    expect(vm.documentsData).toEqual({ documents: [] })
    expect(vm.notesData).toEqual({ notes: [] })
    expect(vm.historyData).toEqual({ entries: [] })
  })

  it('stops degrade gracefully when shipmentStopList absent', () => {
    const dto: SellShipmentOut = { ...sellShipmentOutSample, shipmentStopList: undefined }
    const result = mapSellShipmentOutToDetail(dto)
    expect(result.stopsData.stops).toHaveLength(0)
    expect(result.stopsData.summary.distance).toBe('--')
  })

  it('returns empty orderDetails for an empty orderList', () => {
    const empty = mapSellShipmentOutToDetail({ ...sellShipmentOutSample, orderList: [] })
    expect(empty.orderDetails).toHaveLength(0)
  })

  it('falls back to orderId when orderNumber is absent', () => {
    const dto = { ...sellShipmentOutSample, orderList: [{ orderId: 'ORD-X' }] }
    expect(mapSellShipmentOutToDetail(dto).orderDetails[0].orderNumber).toBe('ORD-X')
  })

  describe('stopsData', () => {
    it('maps one stop per shipmentStopList entry', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        shipmentStopList: [
          {
            stopSequence: 1,
            stopType: 'pickup',
            orderIds: ['ORD-1001'],
            facilityName: 'Acme Houston Plant',
            address1: '100 Refinery Rd',
            city: 'Houston',
            region: 'TX',
            postal: '77001',
            country: 'US',
            scheduledDateTime: '06/10/2026 08:00 CST',
            appointmentTime: '08:00 CST',
            grossWeightValue: 18207,
            grossWeightUomCode: 'LB',
            volumeValue: 420,
            volumeUomCode: 'cuft',
            packageCount: 12,
            pickupNumber: 'PU-820622',
          },
          {
            stopSequence: 2,
            stopType: 'delivery',
            orderIds: ['ORD-1001'],
            facilityName: 'Midwest Distribution Center',
            address1: '8800 Industrial Ave',
            city: 'Chicago',
            region: 'IL',
            postal: '60601',
            country: 'US',
            scheduledDateTime: '06/13/2026 09:00 CST',
            appointmentTime: null,
            grossWeightValue: 18207,
            grossWeightUomCode: 'LB',
            volumeValue: 420,
            volumeUomCode: 'cuft',
            packageCount: null,
            pickupNumber: null,
          },
        ],
      }
      const result = mapSellShipmentOutToDetail(dto)
      expect(result.stopsData.stops).toHaveLength(2)
    })

    it('formats stop fields into view-model strings', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        shipmentStopList: [
          {
            stopSequence: 1,
            stopType: 'pickup',
            orderIds: ['ORD-1001'],
            facilityName: 'Acme Houston Plant',
            address1: '100 Refinery Rd',
            city: 'Houston',
            region: 'TX',
            postal: '77001',
            country: 'US',
            scheduledDateTime: '06/10/2026 08:00 CST',
            appointmentTime: '08:00 CST',
            grossWeightValue: 18207,
            grossWeightUomCode: 'LB',
            volumeValue: 420,
            volumeUomCode: 'cuft',
            packageCount: 12,
            pickupNumber: 'PU-820622',
          },
        ],
      }
      const stop = mapSellShipmentOutToDetail(dto).stopsData.stops[0]
      expect(stop.type).toBe('pickup')
      expect(stop.stopNumber).toBe(1)
      expect(stop.order).toBe('ORD-1001')
      expect(stop.location).toBe('Acme Houston Plant, Houston, TX 77001 US')
      expect(stop.address).toBe('100 Refinery Rd')
      expect(stop.date).toBe('06/10/2026 08:00 CST')
      expect(stop.appointment).toBe('08:00 CST')
      expect(stop.weight).toBe('18,207 LB')
      expect(stop.volume).toBe('420 cuft')
      expect(stop.packageCount).toBe('12')
      expect(stop.pickupNo).toBe('PU-820622')
    })

    it('degrades null appointment and pickupNumber to "--"', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        shipmentStopList: [
          {
            stopSequence: 1,
            stopType: 'delivery',
            appointmentTime: null,
            pickupNumber: null,
          },
        ],
      }
      const stop = mapSellShipmentOutToDetail(dto).stopsData.stops[0]
      expect(stop.appointment).toBe('--')
      expect(stop.pickupNo).toBe('--')
    })

    it('builds summary from shipment header fields', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        distanceMiles: 367.52,
        totalVolumeValue: 600,
        totalVolumeUomCode: 'cuft',
        acceptedCarrierLabel: 'ABFS - TL',
        seedEquipment: 'VAN',
        utilizationPercent: 74,
        orderList: [
          { ...sellShipmentOutSample.orderList[0], grossWeightValue: 18207 },
          { ...sellShipmentOutSample.orderList[1], grossWeightValue: 9050 },
        ],
      }
      const summary = mapSellShipmentOutToDetail(dto).stopsData.summary
      expect(summary.distance).toBe('367.52 mi')
      expect(summary.grossWeight).toBe('27,257 LB')
      expect(summary.volume).toBe('600 cuft')
      expect(summary.acceptedCarrier).toBe('ABFS - TL')
      expect(summary.seedEquipment).toBe('VAN')
      expect(summary.utilization).toBe('74%')
    })

    it('degrades summary to "--" fields when header data absent', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        orderList: [],
        distanceMiles: undefined,
        totalVolumeValue: undefined,
        acceptedCarrierLabel: undefined,
        seedEquipment: undefined,
        utilizationPercent: undefined,
      }
      const summary = mapSellShipmentOutToDetail(dto).stopsData.summary
      expect(summary.distance).toBe('--')
      expect(summary.grossWeight).toBe('--')
    })
  })

  describe('productData', () => {
    it('maps one ProductOrderVM per order in orderList', () => {
      expect(vm.productData.orders).toHaveLength(2)
    })

    it('maps line count and lines array', () => {
      expect(vm.productData.orders[0].lineCount).toBe(1)
      expect(vm.productData.orders[0].lines).toHaveLength(1)
      expect(vm.productData.orders[1].lineCount).toBe(2)
    })

    it('formats line weight and volume as strings', () => {
      const line = vm.productData.orders[0].lines[0]
      expect(line.grossWeight).toBe('5,000 LB')
      expect(line.volume).toBe('100 cuft')
      expect(line.tareWeight).toBe('1,000 LB')
      expect(line.netWeight).toBe('4,000 LB')
    })

    it('formats package count as "N type"', () => {
      const line = vm.productData.orders[0].lines[0]
      expect(line.packageCount).toBe('10 Drums')
    })

    it('sets hazmat boolean from hazmatCode presence', () => {
      expect(vm.productData.orders[0].lines[0].hazmat).toBe(false)
      expect(vm.productData.orders[1].lines[1].hazmat).toBe(true)
    })

    it('formats declaredValue as "$X.XX USD"', () => {
      const line = vm.productData.orders[0].lines[0]
      expect(line.declaredValue).toBe('$25,000.00 USD')
    })

    it('degrades absent line fields to "--"', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        orderList: [{ orderId: 'ORD-X', orderLines: [{ orderLineId: 'L1' }] }],
      }
      const line = mapSellShipmentOutToDetail(dto).productData.orders[0].lines[0]
      expect(line.shipItem).toBe('--')
      expect(line.description).toBe('--')
      expect(line.packageCount).toBe('--')
      expect(line.hazmat).toBe(false)
      expect(line.declaredValue).toBe('--')
    })
  })
})
