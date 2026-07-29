import type { ManualOrder } from '../types/createOrder'
import type {
  DateTimeTriad,
  GeneralInfoValues,
  OrderFormValues,
  PartyValues,
  ReferenceRowValues,
} from '../types/orderFormVm'
import { makeEmptyParty, makeEmptyTriad } from '../types/orderFormVm'

// manualOrder{} (the /order-service/v3/order/view DTO) → OrderFormValues — the
// INVERSE of mapFormToOrderInterface, feeding the read-only OrderReadView.
//
// Lossy/ambiguous reversals (catalogued in spec §7, owed to Ramesh):
//  - owningOrganizationName: no DTO home → '' (only the id round-trips)
//  - special-service descriptions: not on the DTO (LINX-11163 enrichment
//    deferred) → '' ; only the code survives
//  - consolidatable absent: collapses to false (boolean can't be indeterminate)
//  - contact phone: recovers the normalized form, not the typed format
//  - row ids / manualMode / showContact: regenerated for display, not recovered

// "2026-06-15T08:00:00" or "2026-06-10T16:00:00.000Z" → triad. Pure string
// slice, never a Date — no timezone shifting. Timezone comes from the paired
// *TimeZoneCode sibling (the tz arg).
export function fromIsoTimestamp(iso?: string, tz?: string): DateTimeTriad {
  if (!iso) return makeEmptyTriad()
  const [datePart = '', timePart = ''] = iso.split('T')
  const [y, m, d] = datePart.split('-')
  return {
    date: y && m && d ? `${m}/${d}/${y}` : '',
    time: timePart.slice(0, 5),
    timezone: tz ?? '',
  }
}

function reverseParty(prefix: 'origin' | 'destination', mo: ManualOrder): PartyValues {
  const g = (suffix: string): string =>
    (mo as unknown as Record<string, string | undefined>)[`${prefix}${suffix}`] ?? ''
  const contactName = g('ContactName')
  const contactPhone = g('Phone')
  const contactEmail = g('Email')
  return {
    ...makeEmptyParty(),
    locationId: g('PartnerId'),
    idOrgName: g('PartnerId'),
    longName: g('FullName'),
    address1: g('Address1'),
    address2: g('Address2'),
    city: g('City'),
    state: g('Region'),
    postal: g('Postal'),
    country: g('Country'),
    showContact: !!(contactName || contactPhone || contactEmail),
    contactName,
    contactPhone,
    contactEmail,
  }
}

function reverseReferences(mo: ManualOrder): ReferenceRowValues[] {
  const guided: ReferenceRowValues[] = [
    { id: 'ref-pickup', guided: true, type: 'Pickup Number', value: mo.pickupNumber ?? '' },
    { id: 'ref-po', guided: true, type: 'PO Number', value: mo.poNumber ?? '' },
  ]
  const freeForm = (mo.userFieldList ?? [])
    .filter(u => u.userfieldType === 'REFERENCE')
    .map((u, i): ReferenceRowValues => ({ id: `ref-ff-${i + 1}`, guided: false, type: u.name, value: u.value }))
  return [...guided, ...freeForm]
}

export function mapOrderViewToFormVm(mo: ManualOrder): OrderFormValues {
  const consolidatableFlag = (mo.userFieldList ?? []).find(
    u => u.userfieldType === 'FLAG' && u.name === 'CONSOLIDATABLE',
  )
  const carrierEquip = mo.orderCarrierEquipDetailList?.[0]

  const general: GeneralInfoValues = {
    orderNumber: mo.orderNumber ?? '',
    owningOrganization: mo.customerId ?? '',
    owningOrganizationName: '', // lossy — no DTO home
    equipment: carrierEquip?.equipmentCode ?? '',
    freightTerm: mo.freightTermCode ?? '',
    shipDirection: mo.shipDirectionCode ?? '',
    hazardous: false, // lossy — DTO carries no order-level hazmat flag; re-derives from lines (LINX-12102)
    consolidatable: consolidatableFlag?.value === 'Y',
    carrierScac: carrierEquip?.scacCode ?? '',
    equipmentReferenceNumber: mo.equipmentNumber ?? '',
    instructions: (mo.orderInstructionList ?? []).map((ins, i) => ({
      id: `ins-${i + 1}`,
      description: ins.instructionDetail,
    })),
    references: reverseReferences(mo),
  }

  return {
    general,
    pickupDelivery: {
      consignor: reverseParty('origin', mo),
      consignee: reverseParty('destination', mo),
      planningDateType: mo.requestedDateType === 'DELIVERY' ? 'DELIVERY' : 'SHIP',
      // LINX-12095/13845 flags ride userFieldList (provisional wire home)
      pickupAppointment: (mo.userFieldList ?? []).find(f => f.name === 'PICKUP_APPOINTMENT')?.value === 'Y',
      deliveryAppointment: (mo.userFieldList ?? []).find(f => f.name === 'DELIVERY_APPOINTMENT')?.value === 'Y',
      earlyPickup: fromIsoTimestamp(mo.requestedPickupDate, mo.requestedPickupTimeZoneCode),
      latePickup: fromIsoTimestamp(mo.pickupAppointment, mo.pickupAppointmentTimeZoneCode),
      earlyDelivery: fromIsoTimestamp(mo.requestedDeliveryDate, mo.requestedDeliveryTimeZoneCode),
      lateDelivery: fromIsoTimestamp(mo.deliveryAppointment, mo.deliveryAppointmentTimeZoneCode),
    },
    products: (mo.orderLines ?? []).map((l, i) => ({
      id: `prod-${i + 1}`,
      hazardous: l.hazardous ?? false,
      productId: l.shipItemIdentifier,
      description: l.productDescription,
      grossWeight: { value: String(l.grossWeightValue), uom: l.grossWeightUomCode },
      volume: { value: String(l.volumeValue), uom: l.volumeUomCode },
      shipClass: l.shipClass,
      handlingUnit: l.handlingUnit ?? '',
      handlingCount: l.handlingUnitCount != null ? String(l.handlingUnitCount) : '',
      length: { value: l.lengthValue != null ? String(l.lengthValue) : '', uom: l.dimensionUomCode ?? 'ft' },
      width: { value: l.widthValue != null ? String(l.widthValue) : '', uom: l.dimensionUomCode ?? 'ft' },
      height: { value: l.heightValue != null ? String(l.heightValue) : '', uom: l.dimensionUomCode ?? 'ft' },
      harmonizedCode: l.harmonizedCode ?? '',
      declaredValue: l.declaredValue != null ? String(l.declaredValue) : '',
      declaredValueCurrency: l.declaredValueCurrency ?? '',
      manufacturingCountry: l.manufacturingCountryCode ?? '',
      stccCode: l.stccCode ?? '',
    })),
    specialServices: (mo.orderAccessorialDetails ?? []).map(a => ({
      code: a.accessorialCode,
      description: '', // lossy — description not on the DTO (LINX-11163 deferred)
    })),
  }
}
