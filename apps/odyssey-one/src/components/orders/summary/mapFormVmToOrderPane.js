import { computeProductRollups, convertMeasureDisplay } from '../create/productMath'
import { HANDLING_UNITS, SPECIAL_SERVICES, freightTermLabel, shipDirectionLabel, shipClassLabel } from '../../../data/master-data'
import { DASH } from './OrderPaneSections'

// OrderFormValues (the getOrderView seam / mapOrderViewToFormVm output) → the
// prop shapes the shared OrderPaneSections cards consume (the shipment-detail
// order-VM conventions: formatted strings, "postal, city, region, country"
// location, {code, desc} services). Fields with no VM source render '--' per
// convention — gaps catalogued inline.

const triadLabel = (t) => (t?.date ? `${t.date} at ${t.time} ${t.timezone}`.trim() : '')

// ── Confirmation-mock product rollups (Figma 4139:11389 §Product Information) ──
// Package Count "15 Boxes": sum of handlingCount; unit label appended only when
// every counted row uses the same handling unit. Pluralizer covers the 5-code
// catalog (Pallets/Boxes/Drums/Bulks/Crates).
const packageCount = (products) => {
  const counted = products.filter((p) => Number(p.handlingCount) > 0)
  if (!counted.length) return ''
  const total = counted.reduce((s, p) => s + Number(p.handlingCount), 0)
  const units = new Set(counted.map((p) => p.handlingUnit).filter(Boolean))
  if (units.size !== 1) return String(total)
  const label = HANDLING_UNITS.find((u) => u.code === [...units][0])?.label
  if (!label) return String(total)
  const plural = label.endsWith('x') ? `${label}es` : `${label}s`
  return `${total} ${total === 1 ? label : plural}`
}

// Declared Value "$48,944.00 USD": sum where every valued row shares one
// currency; mixed currencies don't sum → dash.
const declaredValueTotal = (products) => {
  const valued = products.filter((p) => p.declaredValue?.trim())
  if (!valued.length) return ''
  const currencies = new Set(valued.map((p) => p.declaredValueCurrency).filter(Boolean))
  if (currencies.size !== 1) return ''
  const total = valued.reduce((s, p) => s + Number(p.declaredValue), 0)
  const cur = [...currencies][0]
  return `${cur === 'USD' ? '$' : ''}${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`
}

// Country of Origin: shown only when uniform across rows that set it.
const countryOfOrigin = (products) => {
  const set = new Set(products.map((p) => p.manufacturingCountry).filter(Boolean))
  return set.size === 1 ? [...set][0] : ''
}

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
    paymentTerms: freightTermLabel(general.freightTerm), // detail-VM label drift: Freight Term
    shipDirection: shipDirectionLabel(general.shipDirection),
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
    // Confirmation-mock rollup strip (Figma 4139:11389). Net product weight and
    // tare weight are NOT captured by the create form — '--' gap, owed to Ramesh.
    totalProductWeight: '',
    totalTareWeight: '',
    totalGrossWeight: products.length ? rollups.totalWeight : '',
    packageCount: packageCount(products),
    declaredValue: declaredValueTotal(products),
    countryOfOrigin: countryOfOrigin(products),
    // hazmat from the form's own per-row checkboxes (S95 hazmat chain), not the
    // catalog lookup — the checkbox is what the user actually asserted.
    hazmat: products.some((p) => p.hazardous) ? 'Yes' : 'No',
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
    productClass: p.shipClass ? shipClassLabel(p.shipClass) : '', // wire code H/C/P/N → label
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
    paymentTerms: freightTermLabel(general.freightTerm),
  }

  return { d, references, instructions, productLines, services, strip }
}
