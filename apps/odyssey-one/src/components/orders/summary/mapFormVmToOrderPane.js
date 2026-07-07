import { computeProductRollups, convertMeasureDisplay } from '../create/productMath'
import { SPECIAL_SERVICES } from '../../../data/master-data'
import { DASH } from './OrderPaneSections'

// OrderFormValues (the getOrderView seam / mapOrderViewToFormVm output) → the
// prop shapes the shared OrderPaneSections cards consume (the shipment-detail
// order-VM conventions: formatted strings, "postal, city, region, country"
// location, {code, desc} services). Fields with no VM source render '--' per
// convention — gaps catalogued inline.

const triadLabel = (t) => (t?.date ? `${t.date} at ${t.time} ${t.timezone}`.trim() : '')

// PartyValues (structured) → the party shape PartyColumn re-parses via
// parseLocation ("postal, city, region, country" — the detail-mapper's
// fmtLocation format).
const toParty = (p) => ({
  siteId: p?.idOrgName,
  company: p?.longName,
  address1: p?.address1,
  address2: p?.address2,
  location: [p?.postal ?? '', p?.city ?? '', p?.state ?? '', p?.country ?? ''].join(', '),
})

// Special-service descriptions are lossy on the view DTO (LINX-11163 deferred
// — mapOrderViewToFormVm leaves ''), so enrich by code from the same catalog
// the create-flow picker uses; unknown codes fall back to '--'.
const serviceDesc = (code, description) =>
  description || SPECIAL_SERVICES.find((s) => s.code === code)?.description || DASH

export default function mapFormVmToOrderPane(values) {
  const { general, pickupDelivery, products, specialServices } = values
  const rollups = computeProductRollups(products, 'us')

  const d = {
    // prefer the display name; only the id round-trips through the DTO
    owningOrganization: general.owningOrganizationName || general.owningOrganization,
    paymentTerms: general.freightTerm, // detail-VM label drift: Freight Term
    shipDirection: general.shipDirection,
    consolidatable: general.consolidatable ? 'Yes' : 'No',
    equipment: general.equipment,
    equipmentReferenceNumber: general.equipmentReferenceNumber,
    carrier: general.carrierScac,
    shipFrom: toParty(pickupDelivery.consignor),
    shipTo: toParty(pickupDelivery.consignee),
    contactName: pickupDelivery.consignor.contactName,
    contactPhone: pickupDelivery.consignor.contactPhone,
    contactEmail: pickupDelivery.consignor.contactEmail,
    destContactName: pickupDelivery.consignee.contactName,
    destContactPhone: pickupDelivery.consignee.contactPhone,
    destContactEmail: pickupDelivery.consignee.contactEmail,
    earliestPickup: triadLabel(pickupDelivery.earlyPickup),
    latestPickup: triadLabel(pickupDelivery.latePickup),
    numProducts: products.length ? String(products.length) : '',
    totalWeight: products.length ? rollups.totalWeight : '',
    totalVolume: products.length ? rollups.totalVolume : '',
    hazmat: products.length ? rollups.hazmat : '',
  }

  const references = general.references
    .filter((r) => r.value.trim() !== '' || (!r.guided && r.type.trim() !== ''))
    .map((r) => [r.type, r.value || DASH])

  const instructions = general.instructions
    .filter((i) => i.description.trim() !== '')
    .map((ins, i) => ({ seq: i + 1, text: ins.description }))

  const productLines = products.map((p, i) => ({
    lineNumber: i + 1,
    shipItem: p.productId,
    description: p.description,
    grossWeight: convertMeasureDisplay(p.grossWeight, 'us'),
    volume: convertMeasureDisplay(p.volume, 'us'),
    productClass: p.shipClass,
    shippingClass: '', // gap — not on OrderFormValues (create flow captures shipClass only)
  }))

  const services = specialServices.map((s) => ({
    code: s.code,
    desc: serviceDesc(s.code, s.description),
  }))

  // Info-band strip (Figma 4317:20487) — Order Date + Shipment Mode exist only
  // on the create RESPONSE (orderService.createOrder data{}), not on the view
  // VM → '--' until the view DTO grows them (gap, owed to Ramesh with spec §7).
  const strip = {
    orderNumber: general.orderNumber,
    orderDate: '',
    shipmentMode: '',
    paymentTerms: general.freightTerm,
  }

  return { d, references, instructions, productLines, services, strip }
}
