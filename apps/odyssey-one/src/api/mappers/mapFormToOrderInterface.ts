import type {
  CreateOrderRequest,
  ManualOrder,
  ManualOrderLine,
  UserField,
} from '../types/createOrder'
import type { OrderFormValues, DateTimeTriad, PartyValues } from '../types/orderFormVm'
import { normalizePhone, isBlankProductRow } from '../../components/orders/create/schema'

// OrderFormValues → POST /order-service/v3/manual-order request. The single
// reconciliation point for the create contract (plan decisions 1/8/9):
//  - root key is "manualOrder" (LLD-verbatim; spec said orderInterface{})
//  - early/late dates ride requested*/appointment fields (PROVISIONAL — Ramesh)
//  - consolidatable + free-form references ride userFieldList (no LLD home)
// Sends entered values verbatim — the US|Metric toggle is display-only.

const trimmedOrUndefined = (v: string): string | undefined => {
  const t = v.trim()
  return t === '' ? undefined : t
}

// "06/15/2026" + "16:00" → "2026-06-15T16:00:00" (wall time; TZ rides the
// sibling *TimeZoneCode field — no Z suffix, no timezone shifting)
function toIsoTimestamp(triad: DateTimeTriad): string | undefined {
  if (triad.date === '') return undefined
  const [m, d, y] = triad.date.split('/')
  return `${y}-${m}-${d}T${triad.time || '00:00'}:00`
}

const tzOf = (triad: DateTimeTriad): string | undefined =>
  triad.date === '' ? undefined : trimmedOrUndefined(triad.timezone)

type PartyPrefix = 'origin' | 'destination'

function mapParty(prefix: PartyPrefix, p: PartyValues): Partial<ManualOrder> {
  const out: Record<string, string | undefined> = {
    [`${prefix}PartnerId`]: trimmedOrUndefined(p.locationId) ?? trimmedOrUndefined(p.idOrgName),
    [`${prefix}FullName`]: trimmedOrUndefined(p.longName),
    [`${prefix}Address1`]: trimmedOrUndefined(p.address1),
    [`${prefix}Address2`]: trimmedOrUndefined(p.address2),
    [`${prefix}City`]: trimmedOrUndefined(p.city),
    [`${prefix}Region`]: trimmedOrUndefined(p.state),
    [`${prefix}Country`]: trimmedOrUndefined(p.country),
    [`${prefix}Postal`]: trimmedOrUndefined(p.postal),
    [`${prefix}ContactName`]: trimmedOrUndefined(p.contactName),
    [`${prefix}Phone`]: p.contactPhone.trim() === '' ? undefined : normalizePhone(p.contactPhone),
    [`${prefix}Email`]: trimmedOrUndefined(p.contactEmail),
  }
  return out as Partial<ManualOrder>
}

export function mapFormToOrderInterface(
  values: OrderFormValues,
  { draft = false }: { draft?: boolean } = {},
): CreateOrderRequest {
  const { general, pickupDelivery, products, specialServices } = values

  // Q21: Pickup/PO rows → dedicated header fields; other rows → userFieldList.
  // Routing is by TYPE — since the dropdown model (S95) any row can carry
  // Pickup Number / PO Number, not just pre-seeded guided rows.
  const HEADER_REF_TYPES = ['Pickup Number', 'PO Number']
  const guided = (type: string): string | undefined =>
    trimmedOrUndefined(general.references.find(r => r.type === type)?.value ?? '')
  const userFieldList: UserField[] = [
    // Q15 residual: no LLD home for the consolidatable header flag
    { userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: general.consolidatable ? 'Y' : 'N' },
    // LINX-12095/13845 appointment flags — PROVISIONAL wire home (no LLD field
    // stated; the per-leg "Appointment" tag surfaces on Shipments)
    { userfieldType: 'FLAG', name: 'PICKUP_APPOINTMENT', value: pickupDelivery.pickupAppointment ? 'Y' : 'N' },
    { userfieldType: 'FLAG', name: 'DELIVERY_APPOINTMENT', value: pickupDelivery.deliveryAppointment ? 'Y' : 'N' },
    ...general.references
      .filter(r => !HEADER_REF_TYPES.includes(r.type.trim()) && (r.type.trim() !== '' || r.value.trim() !== ''))
      .map(r => ({ userfieldType: 'REFERENCE', name: r.type.trim(), value: r.value.trim() })),
  ]

  // The grid keeps a pending (blank) row — never a wire line (2026-07-28 rebuild)
  const orderLines: ManualOrderLine[] = products
    .filter(p => !isBlankProductRow(p))
    .map((p, i) => ({
      lineIdentifier: i + 1,
      shipItemIdentifier: p.productId,
      productDescription: p.description,
      grossWeightValue: Number(p.grossWeight.value),
      grossWeightUomCode: p.grossWeight.uom,
      volumeValue: Number(p.volume.value),
      volumeUomCode: p.volume.uom,
      shipClass: p.shipClass,
      // LINX-13893 per-equipment fields (optional; provisional wire keys — no
      // LLD home confirmed for the manual-order line shape)
      hazardous: p.hazardous || undefined,
      handlingUnit: trimmedOrUndefined(p.handlingUnit ?? ''),
      handlingUnitCount: p.handlingCount?.trim() ? Number(p.handlingCount) : undefined,
      lengthValue: p.length?.value?.trim() ? Number(p.length.value) : undefined,
      widthValue: p.width?.value?.trim() ? Number(p.width.value) : undefined,
      heightValue: p.height?.value?.trim() ? Number(p.height.value) : undefined,
      dimensionUomCode: p.length?.value?.trim() ? p.length.uom : undefined,
      harmonizedCode: trimmedOrUndefined(p.harmonizedCode ?? ''),
      declaredValue: p.declaredValue?.trim() ? Number(p.declaredValue) : undefined,
      declaredValueCurrency: trimmedOrUndefined(p.declaredValueCurrency ?? ''),
      manufacturingCountryCode: trimmedOrUndefined(p.manufacturingCountry ?? ''),
      stccCode: trimmedOrUndefined(p.stccCode ?? ''),
    }))

  // Header roll-ups: raw sum, first line's UoM (mock-grade; mixed-UoM totals
  // are a live-flip reconciliation item)
  const sum = (pick: (l: ManualOrderLine) => number) =>
    orderLines.reduce((acc, l) => acc + pick(l), 0)

  const manualOrder: ManualOrder = {
    orderNumber: trimmedOrUndefined(general.orderNumber),
    customerId: trimmedOrUndefined(general.owningOrganization),
    freightTermCode: trimmedOrUndefined(general.freightTerm),
    shipDirectionCode: trimmedOrUndefined(general.shipDirection),
    pickupNumber: guided('Pickup Number'),
    poNumber: guided('PO Number'),
    requestedDateType: pickupDelivery.planningDateType,
    requestedPickupDate: toIsoTimestamp(pickupDelivery.earlyPickup),
    requestedPickupTimeZoneCode: tzOf(pickupDelivery.earlyPickup),
    pickupAppointment: toIsoTimestamp(pickupDelivery.latePickup),
    pickupAppointmentTimeZoneCode: tzOf(pickupDelivery.latePickup),
    requestedDeliveryDate: toIsoTimestamp(pickupDelivery.earlyDelivery),
    requestedDeliveryTimeZoneCode: tzOf(pickupDelivery.earlyDelivery),
    deliveryAppointment: toIsoTimestamp(pickupDelivery.lateDelivery),
    deliveryAppointmentTimeZoneCode: tzOf(pickupDelivery.lateDelivery),
    equipmentNumber: trimmedOrUndefined(general.equipmentReferenceNumber),
    ...mapParty('origin', pickupDelivery.consignor),
    ...mapParty('destination', pickupDelivery.consignee),
    grossWeightValue: orderLines.length ? sum(l => l.grossWeightValue) : undefined,
    grossWeightUomCode: orderLines[0]?.grossWeightUomCode,
    volumeValue: orderLines.length ? sum(l => l.volumeValue) : undefined,
    volumeUomCode: orderLines[0]?.volumeUomCode,
    orderStatus: draft
      ? { orderStatusCode: 'DRAFT', orderStatusName: 'Draft' }
      : { orderStatusCode: 'RD_4_PLNNG', orderStatusName: 'Ready for Planning' },
    sourceApplication: { sourceApplicationCode: 'ODYSSEY_ONE', sourceApplicationName: 'OdysseyOne' },
    orderInstructionList: general.instructions
      .filter(i => i.description.trim() !== '')
      .map((i, idx) => ({
        instructionNumber: idx + 1,
        instructionType: '0012', // Q19: type removed from UI; backend default
        instructionDetail: i.description,
      })),
    orderCarrierEquipDetailList: (general.equipment || general.carrierScac)
      ? [{
          carrierSequence: 1,
          scacCode: trimmedOrUndefined(general.carrierScac),
          equipmentCode: trimmedOrUndefined(general.equipment),
        }]
      : [],
    orderLines,
    orderAccessorialDetails: specialServices.map((s, i) => ({
      accessorialCode: s.code,
      orderAccessorialDetailSequence: i + 1,
    })),
    userFieldList,
  }

  return { manualOrder }
}
