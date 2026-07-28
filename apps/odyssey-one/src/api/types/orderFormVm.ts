// OrderFormValues — the UI-friendly form shape react-hook-form holds.
// Everything is strings/booleans the inputs bind to directly; the mapper
// (mapFormToOrderInterface) owns the translation to the LLD wire shape.

export interface MeasureValue {
  value: string   // raw input text; validated numeric by productRowSchema
  uom: string     // stored code ('lb'|'kg'|'cuft'|'m3') — US|Metric toggle converts DISPLAY only
}

export interface ReferenceRowValues {
  id: string
  guided: boolean // guided rows (Pickup Number / PO Number) → dedicated header fields (Q21)
  type: string
  value: string
}

export interface InstructionRowValues {
  id: string
  description: string // ≤2,000 chars; instructionType defaults "0012" in the mapper (Q19)
}

export interface DateTimeTriad {
  date: string      // MM/DD/YYYY
  time: string      // HH:MM 24h, defaults 00:00
  timezone: string  // auto-derived from city when possible
}

export interface PartyValues {
  locationId: string   // lookup pick; empty when manual-only
  manualMode: boolean  // "+ Add Location Manually" toggled
  idOrgName: string
  longName: string
  address1: string
  address2: string
  city: string
  state: string
  postal: string
  country: string
  showContact: boolean
  contactName: string
  contactPhone: string // display format free; validated E.164 after normalization
  contactEmail: string
}

export interface GeneralInfoValues {
  orderNumber: string
  owningOrganization: string      // org id
  owningOrganizationName: string  // display label (confirmation page); not validated
  equipment: string
  freightTerm: string
  shipDirection: string
  hazardous: boolean              // LINX-12102: derives from product lines (≥1 hazmat line)
  consolidatable: boolean         // header checkbox, checked by default (Q15)
  carrierScac: string             // Customer Required Carrier (Long)
  equipmentReferenceNumber: string
  instructions: InstructionRowValues[]
  references: ReferenceRowValues[]
}

export interface ProductRowValues {
  id: string
  hazardous?: boolean
  productId: string
  description: string          // ≤75 chars (user ruling 2026-07-28)
  grossWeight: MeasureValue
  volume: MeasureValue
  shipClass: string            // label "Product Class" (wire key unchanged)
  // LINX-13893 per-equipment fields (2026-07-28 rebuild) — optional
  handlingUnit?: string
  handlingCount?: string
  length?: MeasureValue
  width?: MeasureValue
  height?: MeasureValue
  harmonizedCode?: string
  declaredValue?: string
  declaredValueCurrency?: string
  manufacturingCountry?: string
  stccCode?: string
}

export interface SpecialServiceValues {
  code: string
  description: string
}

export interface PickupDeliveryValues {
  consignor: PartyValues
  consignee: PartyValues
  planningDateType: 'SHIP' | 'DELIVERY' // Q22 two-way radio
  pickupAppointment: boolean   // LINX-12095: enabled only while latePickup date+time filled
  deliveryAppointment: boolean // LINX-13845: same, gated on lateDelivery
  earlyPickup: DateTimeTriad
  latePickup: DateTimeTriad
  earlyDelivery: DateTimeTriad
  lateDelivery: DateTimeTriad
}

export interface OrderFormValues {
  general: GeneralInfoValues
  pickupDelivery: PickupDeliveryValues
  products: ProductRowValues[]
  specialServices: SpecialServiceValues[]
}

export function makeEmptyTriad(): DateTimeTriad {
  // time starts empty so the "Select Time" placeholder shows (fix capture
  // 2026-06-12); the 00:00 default (LINX-7634) is applied at the wire by the
  // mapper (`triad.time || '00:00'`), not here.
  return { date: '', time: '', timezone: '' }
}

export function makeEmptyParty(): PartyValues {
  return {
    locationId: '', manualMode: false,
    idOrgName: '', longName: '', address1: '', address2: '',
    city: '', state: '', postal: '', country: 'United States', // Country defaults US (Figma 5921:16412)
    showContact: false, contactName: '', contactPhone: '', contactEmail: '',
  }
}

export function makeDefaultOrderFormValues(): OrderFormValues {
  return {
    general: {
      orderNumber: '',
      owningOrganization: '',
      owningOrganizationName: '',
      equipment: '',
      freightTerm: 'Pre-Paid',   // Q20: Outbound default → Pre-Paid
      shipDirection: 'Outbound', // default per Efrain §1
      hazardous: false,          // LINX-12102: unchecked by default, derives from lines
      consolidatable: true,      // Q15: checked by default
      carrierScac: '',
      equipmentReferenceNumber: '',
      instructions: [],
      // Guided rows pre-seeded (screen 1-Long); free-form rows added by the user
      // Pickup + PO pre-seeded (committed face) + ONE empty type-dropdown row
      // (user, 2026-07-27 / Figma 6238:24599); empty rows are filtered out of
      // the wire payload
      references: [
        { id: 'ref-pickup', guided: true, type: 'Pickup Number', value: '' },
        { id: 'ref-po', guided: true, type: 'PO Number', value: '' },
        { id: 'ref-1', guided: false, type: '', value: '' },
      ],
    },
    pickupDelivery: {
      consignor: makeEmptyParty(),
      consignee: makeEmptyParty(),
      planningDateType: 'SHIP', // screen 2 default selection
      pickupAppointment: false,   // LINX-12095: unchecked by default
      deliveryAppointment: false,
      earlyPickup: makeEmptyTriad(),
      latePickup: makeEmptyTriad(),
      earlyDelivery: makeEmptyTriad(),
      lateDelivery: makeEmptyTriad(),
    },
    products: [],
    specialServices: [],
  }
}
