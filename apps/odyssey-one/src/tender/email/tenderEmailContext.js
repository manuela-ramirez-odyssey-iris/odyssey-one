// Builds the tender email template context from a ShipmentDetailVM + the
// tendered RoutingOptionVM row. Mirrors spotboard/email/emailContext.js's
// buildEmailContext shape/conventions (the email layer is shared, not
// spot-specific — spotboard/email/* stays where it is).
//
// ponytail: emailContext.js's cityLine/stopAddress helpers shape RAW detail
// fields (facilityName/address1/city/region/postal/country) that SpotBoard
// reads off a pre-mapper object. The VM's StopVM (api/types/shipmentDetail.ts)
// already pre-joins those into `location`/`address` strings in the mapper
// (mapSellShipmentOutToDetail.ts's mapStop) — a different, incompatible
// shape — so this file shapes StopVM directly instead of reusing them.
import { PLANNING_GROUP_MAILBOX, APP_ORIGIN } from '../../spotboard/email/emailContext.js'

// Dave's own guess at the TMS rule (15795 BR-5) — one regex, tested against
// '*USALCO_SYS_01' -> 'USALCO' and a plain name (unchanged).
export function customerForSubject(name) {
  return String(name ?? '').replace(/^\*/, '').replace(/_SYS.*$/, '')
}

function stopAddress(s) {
  if (!s) return { name: '', lines: [] }
  return { name: s.location ?? '', lines: [s.address].filter((l) => l && l !== '--') }
}

function fmtTzLine(dt, tz) {
  if (!dt || dt === '--') return ''
  return tz ? `${dt} (${tz})` : dt
}

export function buildTenderEmailContext({ shipment, option }) {
  const stops = shipment?.stopsData?.stops ?? []
  const pickups = stops.filter((s) => s.type === 'pickup')
  const deliveries = stops.filter((s) => s.type === 'delivery')
  const first = pickups[0]
  const last = deliveries[deliveries.length - 1]
  const middle = stops.filter((s) => s !== first && s !== last)
  const orders = shipment?.orderDetails ?? []
  const firstOrder = orders[0]
  const consolidation = shipment?.shipmentType === 'C' || orders.length > 1
  const scac = option?.scac ?? ''

  // Weight/distance fallback chains, same shape as routes/CarrierBid.jsx.
  const rawWeight = shipment?.stopsData?.summary?.grossWeight
  const weight = (rawWeight && rawWeight !== '--')
    ? rawWeight
    : (firstOrder?.totalWeight && firstOrder.totalWeight !== '--' ? firstOrder.totalWeight : (firstOrder?.grossWeight ?? '--'))

  const rawDistance = option?.distance
  const fallbackDistance = shipment?.routingData?.options?.find((o) => o.distance && o.distance !== '--')?.distance
  const distance = (rawDistance && rawDistance !== '--') ? rawDistance : (fallbackDistance ?? '--')

  return {
    scac,
    carrierName: option?.carrierName ?? '',
    customerName: shipment?.customerName ?? '',
    customerForSubject: customerForSubject(shipment?.customerName),
    odysseyShipmentIdentifier: shipment?.odysseyShipmentIdentifier ?? '',
    orderNumber: consolidation ? null : (firstOrder?.orderNumber ?? null),
    consolidation,
    equipment: option?.equipment ?? '',
    weight,
    hazmat: orders.some((o) => o.hazmat === 'Yes') ? 'Yes' : 'No',
    distance,
    from: stopAddress(first),
    to: stopAddress(last),
    pickupLine: fmtTzLine(option?.pickupDateTime, option?.pickupTZ),
    deliverLine: fmtTzLine(option?.deliveryDateTime, option?.deliveryTZ),
    notifyDateTime: option?.notifyDateTime ?? '',
    offeredRate: [option?.rate, option?.rateDetails?.currency].filter(Boolean).join(' '),
    stops: middle.map((s) => ({
      label: `Stop - ${s.location ?? ''}`,
      date: `${s.type === 'pickup' ? 'Pickup' : 'Drop-off'}: ${s.date ?? ''}`,
    })),
    api: option?.api ?? '',
    token: option?.tenderToken ?? '',
    sender: PLANNING_GROUP_MAILBOX,
    // ponytail: BR-3's mf$get.load_tender_communication has no counterpart
    // here (no carrier contact model) — one synthesized address stands in,
    // same convention as spotboard/carrierList.js's buildRow.
    toEmail: toEmailFor(scac),
    appOrigin: APP_ORIGIN,
    // TE-3 only — Accept records responseDateTime; TE-1/TE-2 ignore it.
    acceptedAt: option?.responseDateTime ?? '',
  }
}

// Shared with TenderReview.jsx's "A confirmation has been emailed to…" line
// (TE-3, user ruling 2026-09-24) so both stay in sync with the same guess.
export function toEmailFor(scac) {
  return `ops@${String(scac ?? '').toLowerCase()}.example.com`
}
