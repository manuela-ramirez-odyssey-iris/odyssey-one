import { describe, expect, it } from 'vitest'
import { mapSellShipmentOutToDetail, routingOptionVmToDto } from './mapSellShipmentOutToDetail'
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
    expect(o.shipDirection).toBe('Outbound') // 'O' → label
    expect(o.paymentTerms).toBe('Pre-Paid')  // 'P' → label
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
    expect(o.shipFrom.address).toBe('100 Refinery Rd, Suite 200') // fixture now has address2
    expect(o.shipTo.location).toBe('60601, Chicago, IL, US')
  })

  // R2/F (orders-fix-round, 2026-08-07): this mapper used to emit raw
  // booleans while the consumer (OrderPaneSections.jsx) renders
  // `{d.pickupAppointment || DASH}` — JSX renders boolean `true` as nothing,
  // so a checked appointment showed BLANK and unchecked showed '--'. Emit
  // 'Yes'/'No' strings instead, matching mapFormVmToOrderPane.js:90-91's
  // convention for the same field pair.
  it('derives appointment Yes/No strings from presence', () => {
    expect(vm.orderDetails[0].pickupAppointment).toBe('Yes')
    expect(vm.orderDetails[0].deliveryAppointment).toBe('No')
  })

  it('derives hazmat from order lines', () => {
    expect(vm.orderDetails[0].hazmat).toBe('No')
    expect(vm.orderDetails[1].hazmat).toBe('Yes')
  })

  it('defaults unmapped fields to "--" (graceful degradation)', () => {
    expect(vm.orderDetails[0].salesOrder).toBe('--')
    expect(vm.orderDetails[0].customField1).toBe('--')
  })

  describe('W1-B new order fields', () => {
    it('maps owningOrganization from order', () => {
      expect(vm.orderDetails[0].owningOrganization).toBe('Acme Chemicals')
    })

    it('maps consolidatable boolean to Yes/No', () => {
      expect(vm.orderDetails[0].consolidatable).toBe('Yes')
      expect(vm.orderDetails[1].consolidatable).toBe('No')
    })

    it('maps equipmentCode to equipment', () => {
      expect(vm.orderDetails[0].equipment).toBe('VAN')
      expect(vm.orderDetails[1].equipment).toBe('REEFER')
    })

    it('maps equipmentReferenceNumber, falls back to "--" when null', () => {
      expect(vm.orderDetails[0].equipmentReferenceNumber).toBe('TANK-4321')
      expect(vm.orderDetails[1].equipmentReferenceNumber).toBe('--')
    })

    it('maps customerRequiredCarrier to carrier, falls back to "--" when null', () => {
      expect(vm.orderDetails[0].carrier).toBe('ABFS')
      expect(vm.orderDetails[1].carrier).toBe('--')
    })

    it('maps pickupNumber, falls back to "--" when null', () => {
      expect(vm.orderDetails[0].pickupNumber).toBe('PU-820622')
      expect(vm.orderDetails[1].pickupNumber).toBe('--')
    })

    it('maps specialServices as [{code, desc}] array', () => {
      expect(vm.orderDetails[0].specialServices).toEqual([
        { code: 'LFT', desc: 'Lift gate' },
        { code: 'APPT', desc: 'Appointment Required' },
      ])
    })

    it('returns empty specialServices array when none present', () => {
      expect(vm.orderDetails[1].specialServices).toEqual([])
    })

    it('maps destination contact trio (name/phone/email)', () => {
      expect(vm.orderDetails[0].destContactName).toBe('Sam Ortiz')
      expect(vm.orderDetails[0].destContactPhone).toBe('+1-312-555-0199')
      expect(vm.orderDetails[0].destContactEmail).toBe('sam.ortiz@example.com')
    })

    it('destination contact falls back to "--" when absent', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        orderList: [{ orderId: 'ORD-X', destination: { address1: '1 Main St' } }],
      }
      const o = mapSellShipmentOutToDetail(dto).orderDetails[0]
      expect(o.destContactName).toBe('--')
      expect(o.destContactPhone).toBe('--')
      expect(o.destContactEmail).toBe('--')
    })

    it('folds address2 into fmtAddress when present', () => {
      expect(vm.orderDetails[0].shipFrom.address).toBe('100 Refinery Rd, Suite 200')
    })

    it('owningOrganization falls back to "--" when absent', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        orderList: [{ orderId: 'ORD-X' }],
      }
      expect(mapSellShipmentOutToDetail(dto).orderDetails[0].owningOrganization).toBe('--')
    })

    it('consolidatable falls back to "--" when absent', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        orderList: [{ orderId: 'ORD-X' }],
      }
      expect(mapSellShipmentOutToDetail(dto).orderDetails[0].consolidatable).toBe('--')
    })
  })

  it('emits empty docs/notes/history sections', () => {
    expect(vm.documentsData).toEqual({ documents: [] })
    expect(vm.notesData).toEqual({ notes: [] })
    expect(vm.historyData).toEqual({ entries: [] })
  })

  it('stops degrade gracefully when shipmentStopList absent', () => {
    const dto: SellShipmentOut = { ...sellShipmentOutSample, shipmentStopList: undefined, distanceMiles: undefined }
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

  describe('costData', () => {
    it('builds summary from costSummary header', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        orderList: [],
        costSummary: {
          apBaseAmount: 1384.16,
          apFuelAmount: 553.66,
          apDiscountAmount: 0,
          apAccessorialsAmount: 293.36,
          apTotalAmount: 2231.18,
          arTotalAmount: 2922.84,
          marginAmount: 691.66,
          marginPercent: 31.0,
        },
      }
      const summary = mapSellShipmentOutToDetail(dto).costData.planned.summary
      expect(summary.base).toBe('$1,384.16')
      expect(summary.discount).toBe('$0.00')
      expect(summary.fuel).toBe('$553.66')
      expect(summary.accessorials).toBe('$293.36')
      expect(summary.apTotal).toBe('$2,231.18')
      expect(summary.arTotal).toBe('$2,922.84')
      expect(summary.margin).toBe('$691.66 (31.0%)')
    })

    it('maps one CostOrderVM per order', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        orderList: [
          {
            orderId: 'ORD-1001',
            cost: {
              apBaseAmount: 1384.16,
              apFuelAmount: 553.66,
              apDiscountAmount: 0,
              apHzcAmount: 0,
              apSocAmount: 293.36,
              apTotalAmount: 2231.18,
              arBaseAmount: 1813.25,
              arFuelAmount: 725.29,
              arDiscountAmount: 0,
              arHzcAmount: 0,
              arSocAmount: 0,
              arTotalAmount: 2922.84,
              directCostAmount: 2565.86,
            },
          },
        ],
      }
      const order = mapSellShipmentOutToDetail(dto).costData.planned.orders[0]
      expect(order.orderId).toBe('ORD-1001')
      expect(order.apCost).toBe('$2,231.18 USD')
      expect(order.arCost).toBe('$2,922.84 USD')
      expect(order.margin).toBe('$691.66') // arTotal - apTotal = 2922.84 - 2231.18
      expect(order.apBase).toBe('$1,384.16')
      expect(order.apFuel).toBe('$553.66')
      expect(order.apSoc).toBe('$293.36')
      // conditional accessorials degrade to '--' when zero/absent (consistent with hzc/soc)
      expect(order.apDiscount).toBe('--')
      expect(order.apHzc).toBe('--')
    })

    it('degrades missing cost fields to "--"', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        orderList: [{ orderId: 'ORD-X' }],
      }
      const order = mapSellShipmentOutToDetail(dto).costData.planned.orders[0]
      expect(order.apCost).toBe('--')
      expect(order.apBase).toBe('--')
    })

    // Jana, 2026-07-30: "Shipment direct cost comes from orders' direct costs —
    // it is the sum of all orders' direct cost." Direct cost is the cost of one
    // order travelling point A → point B, so the shipment has no direct cost of
    // its own; the wire carries no shipment-level field either.
    it('sums order direct costs into the shipment-level rollup', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        orderList: [
          { orderId: 'ORD-1', cost: { directCostAmount: 1483.5 } },
          { orderId: 'ORD-2', cost: { directCostAmount: 1082.36 } },
        ],
      }
      expect(mapSellShipmentOutToDetail(dto).costData.planned.summary.directCost)
        .toBe('$2,565.86')
    })

    it('leaves direct cost as "--" when no order carries one', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        orderList: [{ orderId: 'ORD-1' }, { orderId: 'ORD-2' }],
      }
      expect(mapSellShipmentOutToDetail(dto).costData.planned.summary.directCost).toBe('--')
    })
  })

  describe('instructionsData', () => {
    it('maps instructionList per order to InstructionOrderVM', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        orderList: [
          {
            orderId: 'ORD-1001',
            instructionList: [
              { sequenceNumber: 1, text: 'Drivers must wear face coverings.' },
              { sequenceNumber: 2, text: 'Deliver to dock 26B only.' },
            ],
          },
        ],
      }
      const orders = mapSellShipmentOutToDetail(dto).instructionsData.orders
      expect(orders).toHaveLength(1)
      expect(orders[0].orderId).toBe('ORD-1001')
      expect(orders[0].instructions).toHaveLength(2)
      expect(orders[0].instructions[0].seq).toBe(1)
      expect(orders[0].instructions[0].text).toBe('Drivers must wear face coverings.')
    })

    it('emits empty instructions array for orders with no instructionList', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        orderList: [{ orderId: 'ORD-X' }],
      }
      const orders = mapSellShipmentOutToDetail(dto).instructionsData.orders
      expect(orders[0].instructions).toHaveLength(0)
    })
  })

  describe('routingData', () => {
    it('maps one RoutingOptionVM per shippingOptionList entry', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        shippingOptionList: [
          {
            rank: 1,
            routeRank: 2,
            scac: 'ABFS',
            carrierName: 'ABF FREIGHT SYSTEM',
            equipmentCode: 'VAN',
            rateAmount: 395.33,
            rateCurrency: 'USD',
            totalCostAmount: 2162.72,
            totalCostCurrency: 'USD',
            rateDetails: {
              baseRate: 916.96,
              currency: 'USD',
              markup: 165.19,
              additionalCharges: [{ code: 'SOC', description: 'Stop-Off Charge', amount: 494.06, currency: 'USD' }],
              apTotal: 2162.72,
              arTotal: 2327.91,
            },
            status: 'Accepted',
            pickupDateTime: '01/20/2026 14:30 CST',
            pickupTZ: 'CST',
            pickupOrgHours: '12:00 - 18:30',
            pickupOrgDay: 'No',
            deliveryDateTime: '01/24/2026 14:30 CST',
            deliveryTZ: 'CST',
            deliveryOrgHours: '08:00 - 14:59',
            transitDays: 5,
            distanceMiles: 1337.39,
            serviceLevel: '97%',
            routeGroup: 'Primary',
            apiSource: 'API',
            linehaul: 'Completed',
          },
        ],
      }
      const options = mapSellShipmentOutToDetail(dto).routingData.options
      expect(options).toHaveLength(1)
      expect(options[0].rank).toBe(1)
      expect(options[0].carrierName).toBe('ABF FREIGHT SYSTEM')
      expect(options[0].rate).toBe('$395.33')
      expect(options[0].cost).toBe('$2,162.72 USD')
      expect(options[0].transit).toBe('5 Days')
      expect(options[0].distance).toBe('1,337.39 mi')
      expect(options[0].status).toBe('Accepted')
      expect(options[0].rateDetails.baseRate).toBe(916.96)
    })

    it('degrades absent numeric fields to "--"', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        shippingOptionList: [{ rank: 1, status: null }],
      }
      const opt = mapSellShipmentOutToDetail(dto).routingData.options[0]
      expect(opt.rate).toBe('--')
      expect(opt.cost).toBe('--')
      expect(opt.transit).toBe('--')
      expect(opt.distance).toBe('--')
    })

    it('passes string fields through unchanged', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        shippingOptionList: [{ rank: 1, routeGroup: 'Backup', apiSource: 'EDI', linehaul: 'Pending', sl: '92%' }],
      }
      const opt = mapSellShipmentOutToDetail(dto).routingData.options[0]
      expect(opt.routeGroup).toBe('Backup')
      expect(opt.api).toBe('EDI')
      expect(opt.linehaul).toBe('Pending')
      expect(opt.sl).toBe('92%')
    })
  })

  // 2026-08-10 — the tender-save choke point (RoutingGuideTab.jsx's
  // persistTender) used to serialize the VM's own key names verbatim; the
  // reader above expects DTO names, so equipment/rate/cost/transit/distance/
  // api silently degraded to '--' on the NEXT load after any Add/Edit Quote,
  // Accept, Decline, or Cancel. routingOptionVmToDto is the fix — this proves
  // a save-then-reload round-trips, not just that the forward mapper works.
  describe('routingOptionVmToDto — persist round-trip', () => {
    it('carries equipment, rate, cost, transit, distance, and api through a save+reload, not dashes', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        shippingOptionList: [{
          rank: 1,
          equipmentCode: 'TT',
          rateAmount: 395.33,
          totalCostAmount: 2162.72,
          transitDays: 5,
          distanceMiles: 1337.39,
          apiSource: 'API',
          rateDetails: { baseRate: 916.96, currency: 'USD', markup: 165.19, additionalCharges: [], apTotal: 2162.72, arTotal: 2327.91 },
        }],
      }
      const vm = mapSellShipmentOutToDetail(dto).routingData.options[0]
      // Sanity: the VM really is formatted-string-shaped (this is what a save
      // would serialize verbatim without the fix), not the DTO's numbers.
      expect(vm.equipment).toBe('TT')
      expect(vm.cost).toBe('$2,162.72 USD')
      expect(vm.transit).toBe('5 Days')
      expect(vm.distance).toBe('1,337.39 mi')

      // Simulate persistTender's write, then a fresh GET re-reading it.
      const reloaded = mapSellShipmentOutToDetail({
        ...sellShipmentOutSample,
        shippingOptionList: [routingOptionVmToDto(vm)],
      }).routingData.options[0]

      expect(reloaded.equipment).toBe('TT')
      expect(reloaded.rate).toBe('$395.33')
      expect(reloaded.cost).toBe('$2,162.72 USD')
      expect(reloaded.transit).toBe('5 Days')
      expect(reloaded.distance).toBe('1,337.39 mi')
      expect(reloaded.api).toBe('API')
    })

    it('round-trips string passthrough fields and the DASH placeholder unchanged', () => {
      const dto: SellShipmentOut = {
        ...sellShipmentOutSample,
        shippingOptionList: [{ rank: 1, scac: 'ABFS', sl: '92%' }], // no equipmentCode/rateAmount etc — DASH cases
      }
      const vm = mapSellShipmentOutToDetail(dto).routingData.options[0]
      expect(vm.equipment).toBe('--')

      const reloaded = mapSellShipmentOutToDetail({
        ...sellShipmentOutSample,
        shippingOptionList: [routingOptionVmToDto(vm)],
      }).routingData.options[0]
      expect(reloaded.scac).toBe('ABFS')
      expect(reloaded.sl).toBe('92%')
      expect(reloaded.equipment).toBe('--') // DASH round-trips, doesn't become a literal "--" that then breaks
    })
  })
})
