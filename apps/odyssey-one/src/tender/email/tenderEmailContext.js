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

// ponytail: NO tender expiry exists in the stories or on the VM (DEC-178);
// Papu's 2026-10-01 VD fixes ask for "Tender Expires <date>". Placeholder =
// notify + 24h until Dave/Jana give the TMS response window. Display only —
// nothing enforces it (Adam: prototype links never expire).
export const TENDER_EXPIRY_HOURS = 24
export function tenderExpiry(notify) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})(.*)$/.exec(String(notify ?? '').trim())
  if (!m) return ''
  const t = new Date(Date.UTC(+m[3], +m[1] - 1, +m[2], +m[4] + TENDER_EXPIRY_HOURS, +m[5]))
  const p = (n) => String(n).padStart(2, '0')
  return `${p(t.getUTCMonth() + 1)}/${p(t.getUTCDate())}/${t.getUTCFullYear()} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}${m[6]}`
}

// The issuing office's footer details, keyed by the planning group that sends
// the tender (Papu 2026-10-01: footer address/contact "dynamic based on the
// office from which the tender is issued").
// ponytail: only the HQ office is known — the prototype has one planning
// mailbox; add the real office list (Papu/Dave) and every tender picks it up.
export const OFFICES = {
  'planning-charlotte@odysseylogistics.com': {
    name: 'Odyssey Logistics & Technology Corporation',
    address: '3545 Whitehall Park Drive, Charlotte NC 28273',
    phone: '704-808-7400',
  },
}
export const officeFor = (mailbox) => OFFICES[mailbox] ?? OFFICES[PLANNING_GROUP_MAILBOX]

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
    expiresAt: tenderExpiry(option?.notifyDateTime),
    offeredRate: [option?.rate, option?.rateDetails?.currency].filter(Boolean).join(' '),
    stops: middle.map((s) => ({
      label: `Stop - ${s.location ?? ''}`,
      date: `${s.type === 'pickup' ? 'Pickup' : 'Drop-off'}: ${s.date ?? ''}`,
    })),
    api: option?.api ?? '',
    token: option?.tenderToken ?? '',
    sender: PLANNING_GROUP_MAILBOX,
    office: officeFor(PLANNING_GROUP_MAILBOX),
    // ponytail: BR-3's mf$get.load_tender_communication has no counterpart
    // here (no carrier contact model) — one synthesized address stands in,
    // same convention as spotboard/carrierList.js's buildRow.
    toEmail: toEmailFor(scac),
    appOrigin: APP_ORIGIN,
    // TE-3 only — Accept records responseDateTime; TE-1/TE-2 ignore it.
    acceptedAt: option?.responseDateTime ?? '',
    // TE-4 only — planner cancels the tender; stamped like Accept's responseDateTime.
    canceledAt: option?.cancelDateTime ?? '',
  }
}

// Shared with TenderReview.jsx's "A confirmation has been emailed to…" line
// (TE-3, user ruling 2026-09-24) so both stay in sync with the same guess.
export function toEmailFor(scac) {
  return `ops@${String(scac ?? '').toLowerCase()}.example.com`
}
