// One seeded shipment/option pair per scenario, VM-shaped so
// buildTenderEmailContext is exercised the same way live data would drive
// it (S156's gallery deliverable — no API, no store).
import { mintToken } from '../../spotboard/token.js'
import { buildTenderEmailContext } from '../../tender/email/tenderEmailContext.js'
import { tenderEmail, tenderAcceptedEmail } from '../../tender/email/tenderEmail.js'

const STOPS = [
  { type: 'pickup', location: 'Acme Chemical Plant 1, Charlotte, NC 28217 US', address: '12345 N. Tryon', date: '09/20/2026 08:00 EDT' },
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

// TE-3 (user ruling 2026-09-24, Adam's ask) — the accepted option carries a
// responseDateTime, same as a real Accept write on TenderReview.jsx.
const ACCEPTED_OPTION = { ...BASE_OPTION, status: 'Accepted', responseDateTime: '09/19/2026 09:41 EDT' }

// `note` explains why this email exists, mirroring spot-emails/fixture.js.
export const SCENARIOS = [
  { key: 'sent-email', label: 'Tender sent (Email)', kinds: ['TE-1'],
    note: 'A single-order tender notified by email only — the two response buttons render on the review page.' },
  { key: 'sent-email-edi', label: 'Tender sent (Email & EDI)', kinds: ['TE-2'],
    note: 'The same tender, also dispatched by EDI — this copy is informational, no accept/decline affordance.' },
  { key: 'consolidation', label: 'Consolidation tender', kinds: ['TE-1'],
    note: 'A consolidation shipment (multiple orders) — the subject reads "multiple deliveries" instead of a single Order#.' },
  { key: 'accepted', label: 'Tender accepted (confirmation)', kinds: ['TE-3'],
    note: 'Sent the moment the carrier presses Accept on the review page — user ruling 2026-09-24 (Adam Shingle), not in the three stories.' },
]

export function scenarioFor(key) {
  return SCENARIOS.find((s) => s.key === key) ?? SCENARIOS[0]
}

export function emailsForScenario(key) {
  if (key === 'sent-email-edi') return [{ ...emailFor(BASE_SHIPMENT, { ...BASE_OPTION, api: 'Email & EDI' }), recipientLabel: `${BASE_OPTION.scac} · ${BASE_OPTION.carrierName}` }]
  if (key === 'consolidation') return [{ ...emailFor(CONSOLIDATION_SHIPMENT, CONSOLIDATION_OPTION), recipientLabel: `${CONSOLIDATION_OPTION.scac} · ${CONSOLIDATION_OPTION.carrierName}` }]
  if (key === 'accepted') return [{ ...tenderAcceptedEmail(buildTenderEmailContext({ shipment: BASE_SHIPMENT, option: ACCEPTED_OPTION })), recipientLabel: `${ACCEPTED_OPTION.scac} · ${ACCEPTED_OPTION.carrierName}` }]
  return [{ ...emailFor(BASE_SHIPMENT, BASE_OPTION), recipientLabel: `${BASE_OPTION.scac} · ${BASE_OPTION.carrierName}` }]
}

// Each scenario has exactly one email — its own distinguishing kind.
export function defaultEmailIdFor(key, emails) {
  const kind = scenarioFor(key).kinds[0]
  return (emails.find((e) => e.kind === kind) ?? emails[0])?.id
}
