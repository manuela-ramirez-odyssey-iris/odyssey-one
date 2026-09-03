// One seeded quote, eight outcomes. The gallery is a design deliverable, so
// the data mirrors Doug's 2023 sample send (vault quote-model.md §7.1)
// rather than a live shipment — no API, no store, no shipment dependency.
import { emailsForQuote } from '../../spotboard/email/emailsForQuote.js'
import { PLANNING_GROUP_MAILBOX, APP_ORIGIN } from '../../spotboard/email/emailContext.js'

const CARRIERS = [
  { scac: 'CCNI', name: 'Cardinal Freight', email: 'dispatch@cardinalfreight.example.com', incl: true, token: 'demo-ccni',
    bid: { status: 'bid', total: 2925.05, currency: 'CAD' } },
  { scac: 'CNWY', name: 'Conway Transport', email: 'bids@conwaytransport.example.com', incl: true, token: 'demo-cnwy',
    bid: { status: 'bid', total: 3180.00, currency: 'CAD' } },
  { scac: 'SWFT', name: 'Swift Bulk Lines', email: 'quotes@swiftbulk.example.com', incl: true, token: 'demo-swft' },
]

const BASE_CTX = {
  quoteId: '14903',
  reference: 'C11562',
  orderNumber: null,
  shipper: 'Acme Chemical Company',
  from: { name: 'Acme Chemical Plant 1', lines: ['12345 N. Tryon', 'Charlotte NC 28217 US'] },
  to: { name: 'Acme Client Plant2', lines: ['123 Main St', 'New Orleans LA 70114 US'] },
  equipment: 'TL - Truck Load',
  weight: '10,500 lb',
  hazmat: 'No',
  distance: '727 mi',
  pickup: '09/20/2026',
  deliver: '09/25/2026',
  stops: [{ label: 'S1 - Spartanburg SC 29301 US', date: 'Drop-off: 09/22/2026' }],
  offerExpires: '09/08/2026 11:44 EST',
  sender: PLANNING_GROUP_MAILBOX,
  plannerGroup: PLANNING_GROUP_MAILBOX,
  appOrigin: APP_ORIGIN,
  lowest: {
    carrier: 'CCNI - TL',
    amount: '$2,925.05 CAD',
    shipDate: '09/20/2026',
    deliveryDate: '09/25/2026',
  },
}

// Each scenario says what the quote looks like and which alert it fires.
// `note` is shown in the gallery so a reader knows why this email exists.
export const SCENARIOS = [
  { key: 'sent', label: 'RFQ sent', kinds: ['CE-1'], alertKind: null, awardedScac: null,
    note: 'The planner pressed Send. One Request for Quote per included carrier, each with its own link.' },
  { key: 'no-bids', label: 'Closed — no bids', kinds: ['IE-1'], alertKind: 'IE-1', awardedScac: null, noBids: true,
    note: 'The window closed with nothing submitted. One of the two alerts planners say they see most.' },
  { key: 'out-of-tolerance', label: 'Closed — out of tolerance', kinds: ['IE-2'], alertKind: 'IE-2', awardedScac: null,
    note: 'Bids arrived but the lowest exceeds the ceiling. The other alert planners rely on.' },
  { key: 'manual-review', label: 'Closed — manual review', kinds: ['IE-3'], alertKind: 'IE-3', awardedScac: null,
    note: 'The client is configured to review every overflow quote, tolerant or not.' },
  { key: 'cancelled', label: 'Cancelled — order change', kinds: ['IE-4'], alertKind: 'IE-4', awardedScac: null, noLowest: true,
    note: 'An order change invalidated an open consolidation quote. Its bids must not be processed.' },
  { key: 'no-lce', label: 'Closed — no costed option', kinds: ['IE-5'], alertKind: 'IE-5', awardedScac: null,
    note: 'No routed cost and no fallback rule, so tolerance cannot be evaluated.' },
  { key: 'no-distance', label: 'Closed — no distance', kinds: ['IE-6'], alertKind: 'IE-6', awardedScac: null,
    note: 'No mileage, so even the estimated benchmark cannot be computed.' },
  { key: 'awarded', label: 'Awarded', kinds: ['CE-2'], alertKind: null, awardedScac: 'CCNI',
    note: 'The winner is told their rate was approved. The tender that follows is a separate message.' },
]

export function scenarioFor(key) {
  return SCENARIOS.find((s) => s.key === key) ?? SCENARIOS[0]
}

export function emailsForScenario(key) {
  const s = scenarioFor(key)
  const carriers = s.noBids ? CARRIERS.map(({ bid, ...c }) => c) : CARRIERS
  const ctx = { ...BASE_CTX, lowest: s.noBids || s.noLowest ? null : BASE_CTX.lowest }
  return emailsForQuote(ctx, { status: 'closed', carriers }, { alertKind: s.alertKind, awardedScac: s.awardedScac })
}
