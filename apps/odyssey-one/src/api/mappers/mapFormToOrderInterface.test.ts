import { describe, expect, it } from 'vitest'
import { mapFormToOrderInterface } from './mapFormToOrderInterface'
import { orderFormValuesSample } from '../fixtures/orderFormValues.sample'

const sample = () => structuredClone(orderFormValuesSample)

describe('mapFormToOrderInterface', () => {
  it('maps header identity + Q20/Q22 fields verbatim', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.orderNumber).toBe('ORD-1001')
    expect(mo.customerId).toBe('ERCO_SYS_01')
    expect(mo.freightTermCode).toBe('P')
    expect(mo.shipDirectionCode).toBe('O')
    expect(mo.requestedDateType).toBe('SHIP')
  })

  it('omits a blank order number (backend auto-generates, Q16)', () => {
    const v = sample()
    v.general.orderNumber = '   '
    expect(mapFormToOrderInterface(v).manualOrder.orderNumber).toBeUndefined()
  })

  it('splits guided references into dedicated header fields, free-form into userFieldList (Q21)', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.pickupNumber).toBe('41197')
    expect(mo.poNumber).toBe('I567649422')
    expect(mo.userFieldList).toContainEqual({ userfieldType: 'REFERENCE', name: 'Dock Code', value: 'D-12' })
    // guided rows must NOT leak into the generic list
    expect(mo.userFieldList!.filter(f => f.userfieldType === 'REFERENCE')).toHaveLength(1)
  })

  it('omits empty guided fields and skips blank free-form rows', () => {
    const v = sample()
    v.general.references = [
      { id: 'ref-pickup', guided: true, type: 'Pickup Number', value: '' },
      { id: 'ref-po', guided: true, type: 'PO Number', value: '' },
      { id: 'r3', guided: false, type: '', value: '' },
    ]
    const mo = mapFormToOrderInterface(v).manualOrder
    expect(mo.pickupNumber).toBeUndefined()
    expect(mo.poNumber).toBeUndefined()
    expect(mo.userFieldList!.filter(f => f.userfieldType === 'REFERENCE')).toHaveLength(0)
  })

  it('writes consolidatable as a FLAG user field (Q15; residual mapping)', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.userFieldList).toContainEqual({ userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: 'Y' })
    const v = sample()
    v.general.consolidatable = false
    expect(mapFormToOrderInterface(v).manualOrder.userFieldList)
      .toContainEqual({ userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: 'N' })
  })

  it('defaults instruction type to 0012 and numbers rows (Q19)', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.orderInstructionList).toEqual([
      { instructionNumber: 1, instructionType: '0012', instructionDetail: 'Call ahead before pickup' },
    ])
  })

  it('maps equipment + carrier SCAC to orderCarrierEquipDetailList, eq ref number to equipmentNumber', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.orderCarrierEquipDetailList).toEqual([
      { carrierSequence: 1, scacCode: 'KNGT', equipmentCode: 'VAN' },
    ])
    expect(mo.equipmentNumber).toBe('EQ-REF-9')
  })

  it('flattens the parties to origin*/destination* fields incl. contact', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.originPartnerId).toBe('EW-TX-001')
    expect(mo.originFullName).toBe('ERCO WORLDWIDE')
    expect(mo.originAddress1).toBe('100 Industrial Blvd')
    expect(mo.originCity).toBe('Houston')
    expect(mo.originRegion).toBe('TX')
    expect(mo.originPostal).toBe('77001')
    expect(mo.originCountry).toBe('United States')
    expect(mo.originContactName).toBe('Nick Strauss')
    expect(mo.originPhone).toBe('+17656704444') // normalized E.164 on the wire
    expect(mo.originEmail).toBe('nick.strauss@krm.com')
    expect(mo.destinationPartnerId).toBe('GCR-TX-015')
    expect(mo.destinationCity).toBe('San Antonio')
    expect(mo.destinationContactName).toBeUndefined() // consignee has no contact
  })

  it('maps the date triads per the provisional early/late convention (plan decision 8)', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.requestedPickupDate).toBe('2026-06-15T08:00:00')
    expect(mo.requestedPickupTimeZoneCode).toBe('CST')
    expect(mo.pickupAppointment).toBe('2026-06-15T16:00:00')
    expect(mo.pickupAppointmentTimeZoneCode).toBe('CST')
    expect(mo.requestedDeliveryDate).toBeUndefined() // early delivery left empty
    expect(mo.deliveryAppointment).toBe('2026-06-18T12:00:00')
    expect(mo.deliveryAppointmentTimeZoneCode).toBe('CST')
  })

  it('maps product rows to orderLines with numeric measures {value, uom} verbatim', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.orderLines).toHaveLength(2)
    expect(mo.orderLines![0]).toEqual({
      lineIdentifier: 1,
      shipItemIdentifier: '39011E6K',
      productDescription: 'Polyethylene Resin HD',
      grossWeightValue: 100,
      grossWeightUomCode: 'lb',
      volumeValue: 79,
      volumeUomCode: 'cuft',
      shipClass: 'Commodity',
    })
  })

  it('computes header roll-ups (sum of lines, first line UoM)', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.grossWeightValue).toBe(4300)
    expect(mo.grossWeightUomCode).toBe('lb')
    expect(mo.volumeValue).toBe(730)
    expect(mo.volumeUomCode).toBe('cuft')
  })

  it('maps special services to orderAccessorialDetails in order', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.orderAccessorialDetails).toEqual([
      { accessorialCode: 'LFT', orderAccessorialDetailSequence: 1 },
    ])
  })

  it('stamps status RD_4_PLNNG on create, DRAFT when draft (LLD remark)', () => {
    expect(mapFormToOrderInterface(sample()).manualOrder.orderStatus)
      .toEqual({ orderStatusCode: 'RD_4_PLNNG', orderStatusName: 'Ready for Planning' })
    expect(mapFormToOrderInterface(sample(), { draft: true }).manualOrder.orderStatus)
      .toEqual({ orderStatusCode: 'DRAFT', orderStatusName: 'Draft' })
  })

  it('stamps the source application', () => {
    expect(mapFormToOrderInterface(sample()).manualOrder.sourceApplication)
      .toEqual({ sourceApplicationCode: 'ODYSSEY_ONE', sourceApplicationName: 'OdysseyOne' })
  })
})
