// One seeded shipment/option pair per scenario, VM-shaped so
// buildTenderEmailContext is exercised the same way live data would drive
// it (S156's gallery deliverable — no API, no store).
import { mintToken } from '../../spotboard/token.js'
import { buildTenderEmailContext } from '../../tender/email/tenderEmailContext.js'
import { tenderEmail, tenderCanceledEmail } from '../../tender/email/tenderEmail.js'

const STOPS = [
  { type: 'pickup', location: 'Acme Chemical Plant 1, Charlotte, NC 28217 US', address: '12345 N. Tryon', date: '09/20/2026 08:00 EDT' },
  // Two intermediate stops (user, 2026-09-24) so the gallery shows the stop list.
  { type: 'pickup', location: 'Acme Warehouse 3, Atlanta, GA 30336 US', address: '410 Fulton Industrial Blvd', date: '09/21/2026 10:00 EDT' },
  { type: 'delivery', location: 'Delta Coatings, Birmingham, AL 35207 US', address: '88 Vanderbilt Rd', date: '09/23/2026 13:00 CDT' },
  { type: 'delivery', location: 'Acme Client Plant2, New Orleans, LA 70114 US', address: '123 Main St', date: '09/25/2026 09:00 CDT' },
]

const BASE_SHIPMENT = {
  odysseyShipmentIdentifier: '50001096',
  customerName: 'Acme Chemical Company',
  shipmentType: 'L',
  orderDetails: [
    { orderNumber: '0000000091142', totalWeight: '10,500 lb', grossWeight: '10,500 lb', hazmat: 'No' },
  ],
  stopsData: { summary: { grossWeight: '10,500 lb' }, stops: STOPS },
  routingData: { options: [] },
}

const BASE_OPTION = {
  scac: 'CCNI',
  carrierName: 'Cardinal Freight',
  equipment: 'TL - Truck Load',
  rate: '2,925.05',
  rateDetails: { currency: 'CAD' },
  distance: '727 mi',
  transit: '2 days',
  pickupDateTime: '09/20/2026 08:00',
  pickupTZ: 'EDT',
  deliveryDateTime: '09/25/2026 09:00',
  deliveryTZ: 'CDT',
  notifyDateTime: '09/18/2026 14:12 EDT',
  api: 'Email',
  tenderToken: mintToken('50001096', 'CCNI'),
}

const CONSOLIDATION_SHIPMENT = {
  ...BASE_SHIPMENT,
  odysseyShipmentIdentifier: '50001204',
  shipmentType: 'C',
  orderDetails: [
    ...BASE_SHIPMENT.orderDetails,
    { orderNumber: '0000000091143', totalWeight: '4,200 lb', grossWeight: '4,200 lb', hazmat: 'No' },
  ],
}
const CONSOLIDATION_OPTION = { ...BASE_OPTION, tenderToken: mintToken('50001204', 'CCNI') }

function emailFor(shipment, option) {
  return tenderEmail(buildTenderEmailContext({ shipment, option }))
}

// TE-4 — the planner canceled the tender (user, 2026-09-24).
const CANCELED_OPTION = { ...BASE_OPTION, status: 'Canceled', cancelDateTime: '09/19/2026 11:05 EDT' }

// `note` explains why this email exists, mirroring spot-emails/fixture.js.
export const SCENARIOS = [
  { key: 'sent-email', label: 'Tender sent (Email)', kinds: ['TE-1'],
    note: 'A single-order tender notified by email only — the two response buttons render on the review page.' },
  { key: 'sent-email-edi', label: 'Tender sent (Email & EDI)', kinds: ['TE-2'],
    note: 'The same tender, also dispatched by EDI — this copy is informational, no accept/decline affordance.' },
  { key: 'consolidation', label: 'Consolidation tender', kinds: ['TE-1'],
    note: 'A consolidation shipment (multiple orders) — the subject reads "multiple deliveries" instead of a single Order#.' },
  // TE-3 (accepted) hidden — Papu 2026-10-01: carriers get immediate feedback
  // on the review page; no Accepted/Declined email is generated for now.
  { key: 'canceled', label: 'Tender canceled (by planner)', kinds: ['TE-4'],
    note: 'Sent when the planner cancels a tendered shipment — user ask 2026-09-24, not in the three stories. No link: nothing left to respond to.' },
]

export function scenarioFor(key) {
  return SCENARIOS.find((s) => s.key === key) ?? SCENARIOS[0]
}

// The scenarios whose email carries a Review button point at a REAL seeded
// shipment's Sent option (Adam: the button must open the actual landing page,
// not send people to the Tender tab's link column). Seeded tokens are
// deterministic (generate.mjs), so these resolve on /tender-review/:token.
// ponytail: hardcoded ids — a reseed that stops these being Sent-by-email
// leaves the stub email (dead link); re-pick from Neon if that happens.
export const LIVE_TENDERS = {
  'sent-email': { sellShipment: '25018281', scac: 'SNLU' },
  'sent-email-edi': { sellShipment: '25005961', scac: 'ABFS' },
  consolidation: { sellShipment: '25135734', scac: 'FXFE' },
}

// `live` = { [scenarioKey]: ShipmentDetailVM } once fetched; until then (or if
// the option is gone) the scenario falls back to its stub.
function liveEmail(key, live) {
  const shipment = live?.[key]
  const option = shipment?.routingData?.options?.find((o) => o.scac === LIVE_TENDERS[key].scac && o.tenderToken)
  if (!option) return null
  // ?demo=1 rides on the token so the template's link carries it untouched.
  const ctx = buildTenderEmailContext({ shipment, option })
  return [{ ...tenderEmail({ ...ctx, token: `${ctx.token}?demo=1` }), recipientLabel: `${option.scac} · ${option.carrierName}` }]
}

export function emailsForScenario(key, live) {
  if (LIVE_TENDERS[key]) {
    const real = liveEmail(key, live)
    if (real) return real
  }
  if (key === 'sent-email-edi') return [{ ...emailFor(BASE_SHIPMENT, { ...BASE_OPTION, api: 'Email & EDI' }), recipientLabel: `${BASE_OPTION.scac} · ${BASE_OPTION.carrierName}` }]
  if (key === 'consolidation') return [{ ...emailFor(CONSOLIDATION_SHIPMENT, CONSOLIDATION_OPTION), recipientLabel: `${CONSOLIDATION_OPTION.scac} · ${CONSOLIDATION_OPTION.carrierName}` }]
  if (key === 'canceled') return [{ ...tenderCanceledEmail(buildTenderEmailContext({ shipment: BASE_SHIPMENT, option: CANCELED_OPTION })), recipientLabel: `${CANCELED_OPTION.scac} · ${CANCELED_OPTION.carrierName}` }]
  return [{ ...emailFor(BASE_SHIPMENT, BASE_OPTION), recipientLabel: `${BASE_OPTION.scac} · ${BASE_OPTION.carrierName}` }]
}

// Each scenario has exactly one email — its own distinguishing kind.
export function defaultEmailIdFor(key, emails) {
  const kind = scenarioFor(key).kinds[0]
  return (emails.find((e) => e.kind === kind) ?? emails[0])?.id
}
