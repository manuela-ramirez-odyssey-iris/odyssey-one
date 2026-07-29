import { describe, expect, it } from 'vitest'
import { mapOrderViewToFormVm, fromIsoTimestamp } from './mapOrderViewToFormVm'
import { mapFormToOrderInterface } from './mapFormToOrderInterface'
import { orderFormValuesSample } from '../fixtures/orderFormValues.sample'
import type { ManualOrder } from '../types/createOrder'

// Compare references / instructions by content (ids are regenerated on reverse).
const refContent = (rs: { guided: boolean; type: string; value: string }[]) =>
  rs.map(r => ({ guided: r.guided, type: r.type, value: r.value }))

describe('fromIsoTimestamp', () => {
  it('splits a wall-time ISO into MM/DD/YYYY + HH:MM, timezone from the tz arg', () => {
    expect(fromIsoTimestamp('2026-06-15T08:00:00', 'CST')).toEqual({
      date: '06/15/2026', time: '08:00', timezone: 'CST',
    })
  })

  it('drops millis and the Z suffix from a seeded timestamp (no Date, no TZ shift)', () => {
    expect(fromIsoTimestamp('2026-06-10T16:00:00.000Z', 'EST')).toEqual({
      date: '06/10/2026', time: '16:00', timezone: 'EST',
    })
  })

  it('returns an empty triad for empty/undefined input', () => {
    expect(fromIsoTimestamp(undefined, 'CST')).toEqual({ date: '', time: '', timezone: '' })
    expect(fromIsoTimestamp('', 'CST')).toEqual({ date: '', time: '', timezone: '' })
  })

  it('defaults timezone to empty when none is supplied', () => {
    expect(fromIsoTimestamp('2026-06-15T08:00:00').timezone).toBe('')
  })
})

describe('mapOrderViewToFormVm (DTO → form VM)', () => {
  const dto: ManualOrder = {
    orderNumber: 'S260004NGW',
    customerId: 'ERCO_SYS_01',
    freightTermCode: 'P',
    shipDirectionCode: 'O',
    pickupNumber: '41197',
    poNumber: 'PO-9',
    requestedDateType: 'DELIVERY',
    requestedPickupDate: '2026-06-15T08:00:00',
    requestedPickupTimeZoneCode: 'CST',
    pickupAppointment: '2026-06-15T16:00:00',
    pickupAppointmentTimeZoneCode: 'CST',
    requestedDeliveryDate: '2026-06-18T09:00:00.000Z',
    requestedDeliveryTimeZoneCode: 'EST',
    deliveryAppointment: '2026-06-18T17:00:00.000Z',
    deliveryAppointmentTimeZoneCode: 'EST',
    equipmentNumber: 'EQ-REF-9',
    originPartnerId: 'EW-TX-001',
    originFullName: 'ERCO WORLDWIDE',
    originAddress1: '100 Industrial Blvd',
    originCity: 'Houston',
    originRegion: 'TX',
    originCountry: 'United States',
    originPostal: '77001',
    originContactName: 'Nick Strauss',
    originPhone: '+17656704444',
    originEmail: 'nick@krm.com',
    destinationPartnerId: 'GCR-TX-015',
    destinationCity: 'San Antonio',
    destinationRegion: 'TX',
    destinationCountry: 'United States',
    grossWeightValue: 4300,
    grossWeightUomCode: 'lb',
    volumeValue: 730,
    volumeUomCode: 'cuft',
    orderStatus: { orderStatusCode: 'RD_4_PLNNG', orderStatusName: 'Ready for Planning' },
    orderInstructionList: [{ instructionNumber: 1, instructionType: '0012', instructionDetail: 'Call ahead' }],
    orderCarrierEquipDetailList: [{ carrierSequence: 1, scacCode: 'KNGT', equipmentCode: 'VAN' }],
    orderLines: [{
      lineIdentifier: 1, shipItemIdentifier: '39011E6K', productDescription: 'Polyethylene Resin HD',
      grossWeightValue: 100, grossWeightUomCode: 'lb', volumeValue: 79, volumeUomCode: 'cuft', shipClass: 'Commodity',
    }],
    orderAccessorialDetails: [{ accessorialCode: 'LFT', orderAccessorialDetailSequence: 1 }],
    userFieldList: [
      { userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: 'N' },
      { userfieldType: 'REFERENCE', name: 'Dock Code', value: 'D-12' },
    ],
  }

  const vm = mapOrderViewToFormVm(dto)

  it('maps the general header fields', () => {
    expect(vm.general.orderNumber).toBe('S260004NGW')
    expect(vm.general.owningOrganization).toBe('ERCO_SYS_01')
    expect(vm.general.freightTerm).toBe('P')
    expect(vm.general.shipDirection).toBe('O')
    expect(vm.general.equipment).toBe('VAN')
    expect(vm.general.carrierScac).toBe('KNGT')
    expect(vm.general.equipmentReferenceNumber).toBe('EQ-REF-9')
  })

  it('reads consolidatable from the CONSOLIDATABLE user-field flag', () => {
    expect(vm.general.consolidatable).toBe(false)
  })

  it('reconstructs the two guided reference rows + free-form rows from user-fields', () => {
    expect(refContent(vm.general.references)).toEqual([
      { guided: true, type: 'Pickup Number', value: '41197' },
      { guided: true, type: 'PO Number', value: 'PO-9' },
      { guided: false, type: 'Dock Code', value: 'D-12' },
    ])
  })

  it('maps instructions', () => {
    expect(vm.general.instructions.map(i => i.description)).toEqual(['Call ahead'])
  })

  it('splits the four date triads, timezone from the paired *TimeZoneCode', () => {
    expect(vm.pickupDelivery.planningDateType).toBe('DELIVERY')
    expect(vm.pickupDelivery.earlyPickup).toEqual({ date: '06/15/2026', time: '08:00', timezone: 'CST' })
    expect(vm.pickupDelivery.latePickup).toEqual({ date: '06/15/2026', time: '16:00', timezone: 'CST' })
    expect(vm.pickupDelivery.earlyDelivery).toEqual({ date: '06/18/2026', time: '09:00', timezone: 'EST' })
    expect(vm.pickupDelivery.lateDelivery).toEqual({ date: '06/18/2026', time: '17:00', timezone: 'EST' })
  })

  it('reverses origin/destination party fields (incl. Region → state)', () => {
    const { consignor, consignee } = vm.pickupDelivery
    expect(consignor.locationId).toBe('EW-TX-001')
    expect(consignor.idOrgName).toBe('EW-TX-001')
    expect(consignor.longName).toBe('ERCO WORLDWIDE')
    expect(consignor.address1).toBe('100 Industrial Blvd')
    expect(consignor.city).toBe('Houston')
    expect(consignor.state).toBe('TX')
    expect(consignor.postal).toBe('77001')
    expect(consignor.country).toBe('United States')
    expect(consignor.contactName).toBe('Nick Strauss')
    expect(consignor.contactPhone).toBe('+17656704444')
    expect(consignor.contactEmail).toBe('nick@krm.com')
    expect(consignee.locationId).toBe('GCR-TX-015')
    expect(consignee.city).toBe('San Antonio')
    expect(consignee.state).toBe('TX')
  })

  it('maps orderLines to products with string-typed measures', () => {
    expect(vm.products).toEqual([{
      id: expect.any(String),
      productId: '39011E6K',
      description: 'Polyethylene Resin HD',
      grossWeight: { value: '100', uom: 'lb' },
      volume: { value: '79', uom: 'cuft' },
      shipClass: 'Commodity',
    }])
  })

  it('maps accessorials to special services (description is lossy → empty)', () => {
    expect(vm.specialServices).toEqual([{ code: 'LFT', description: '' }])
  })
})

describe('mapOrderViewToFormVm — form → DTO → form round-trip', () => {
  const dto = mapFormToOrderInterface(orderFormValuesSample).manualOrder
  const back = mapOrderViewToFormVm(dto)
  const s = orderFormValuesSample

  it('recovers the general header on the reversible subset', () => {
    expect(back.general.orderNumber).toBe(s.general.orderNumber)
    expect(back.general.owningOrganization).toBe(s.general.owningOrganization)
    expect(back.general.freightTerm).toBe(s.general.freightTerm)
    expect(back.general.shipDirection).toBe(s.general.shipDirection)
    expect(back.general.equipment).toBe(s.general.equipment)
    expect(back.general.carrierScac).toBe(s.general.carrierScac)
    expect(back.general.equipmentReferenceNumber).toBe(s.general.equipmentReferenceNumber)
    expect(back.general.consolidatable).toBe(s.general.consolidatable)
  })

  it('recovers references + instructions by content', () => {
    expect(refContent(back.general.references)).toEqual(refContent(s.general.references))
    expect(back.general.instructions.map(i => i.description)).toEqual(s.general.instructions.map(i => i.description))
  })

  it('recovers the present date triads (empty stays empty)', () => {
    expect(back.pickupDelivery.planningDateType).toBe('SHIP')
    expect(back.pickupDelivery.earlyPickup).toEqual(s.pickupDelivery.earlyPickup)
    expect(back.pickupDelivery.latePickup).toEqual(s.pickupDelivery.latePickup)
    expect(back.pickupDelivery.lateDelivery).toEqual(s.pickupDelivery.lateDelivery)
    expect(back.pickupDelivery.earlyDelivery).toEqual({ date: '', time: '', timezone: '' })
  })

  it('recovers consignor party fields (phone = what forward stored)', () => {
    const c = back.pickupDelivery.consignor
    expect(c.locationId).toBe(s.pickupDelivery.consignor.locationId)
    expect(c.longName).toBe(s.pickupDelivery.consignor.longName)
    expect(c.address1).toBe(s.pickupDelivery.consignor.address1)
    expect(c.city).toBe(s.pickupDelivery.consignor.city)
    expect(c.state).toBe(s.pickupDelivery.consignor.state)
    expect(c.postal).toBe(s.pickupDelivery.consignor.postal)
    expect(c.country).toBe(s.pickupDelivery.consignor.country)
    expect(c.contactName).toBe(s.pickupDelivery.consignor.contactName)
    expect(c.contactEmail).toBe(s.pickupDelivery.consignor.contactEmail)
    expect(c.contactPhone).toBe(dto.originPhone) // normalized form is what survives
  })

  it('recovers products with their string measures', () => {
    expect(back.products.map(p => ({
      productId: p.productId, description: p.description,
      grossWeight: p.grossWeight, volume: p.volume, shipClass: p.shipClass,
    }))).toEqual([
      { productId: '0000000100037', description: 'Polyethylene Resin HD', grossWeight: { value: '100', uom: 'lb' }, volume: { value: '79', uom: 'cuft' }, shipClass: 'Commodity' },
      { productId: '0000000100034', description: 'Sulfuric Acid 93%', grossWeight: { value: '4200', uom: 'lb' }, volume: { value: '651', uom: 'cuft' }, shipClass: 'Product Class' },
    ])
  })

  it('documents the lossy fields: owningOrganizationName + special-service description are dropped', () => {
    expect(back.general.owningOrganizationName).toBe('')
    expect(back.specialServices).toEqual([{ code: 'LFT', description: '' }])
  })
})
