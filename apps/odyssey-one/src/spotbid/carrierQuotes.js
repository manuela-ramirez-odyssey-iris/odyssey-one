// Carrier-facing SpotBid seed + in-memory bid store.
//
// Self-contained: this is a redesign of the legacy TMS carrier portal (Oracle
// APEX app `200`, quote-model.md §9), a different system from the planner-side
// spotboard/ machinery next door — no shipment ids or fixtures are borrowed
// from there (project rule: seeded ids from another system are load-bearing
// and die at the next unrelated reseed; this module has no such dependency).
//
// Windows are computed as OFFSETS against the `now` passed to listQuotes(),
// mirroring spotboard/board.js's DEMO_FIXTURES technique — so "5 minutes
// remaining" stays true no matter when the app is actually opened, instead of
// going stale relative to a hardcoded date.
//
// Scoped to a single carrier session (quote-model.md §9: "Scoped to one
// carrier per session/SCAC") — SCAC is intentionally not exported; it never
// renders in the UI (plan §1, "not shown in UI").

import { CHARGE_CODES } from '../data/master-data.js'

const DAY_MS = 24 * 60 * 60_000

// Fixed prototype charge-code list (quote-model.md §5.6 label column) —
// derived from the shared CHARGE_CODES catalog (data/master-data.js) rather
// than a second hardcoded list, so this and the carrier-facing Additional
// Charges grid (routes/CarrierBid.jsx) can't drift apart. Truth is
// per-OCM-profile configurable (§5.5 `COFL Charges`); this fixed set stands
// in for the prototype per the plan.
export const CHARGE_NAMES = CHARGE_CODES.map((c) => c.label)

function hazItem(weightLb, packageCount) {
  return {
    description: 'Bulk Chemical Tote',
    weightLb,
    packageCount,
    hazmatCode: 'UN3082',
    hazmatPackingGroup: 'III',
    hazmatClass: '8',
    hazmatDescription: 'HAZ PACL 18 LQ 9,0%AL MB BULK',
    sdsUrl: 'https://sds.example.com/UN3082.pdf',
  }
}

function plainItem(description, weightLb, packageCount) {
  return {
    description,
    weightLb,
    packageCount,
    hazmatCode: null,
    hazmatPackingGroup: null,
    hazmatClass: null,
    hazmatDescription: null,
    sdsUrl: null,
  }
}

// Raw seed fixtures. `items` is the source of truth for `weightLb` — it is
// summed in toQuote() rather than hand-entered twice, so the two can never
// drift out of coherence. 7 currently-open (remaining 5min–~2.7h), 5 already
// closed (2 Expired, 2 Awarded, 1 Cancelled) for history.
const RAW_QUOTES = [
  {
    quoteId: '222610',
    shipper: 'Vantage Chemical Solutions',
    equipment: 'Flat Bed',
    shipFrom: { company: 'Vantage Chemical Solutions', street: '4820 Riverside Industrial Pkwy', city: 'Chattanooga', state: 'TN', zip: '37406' },
    shipTo: { company: 'Lexington Distribution Center', street: '115 Old Cherokee Rd', city: 'Lexington', state: 'SC', zip: '29072' },
    stopOffs: 0,
    hazmat: true,
    items: [hazItem(25000, 15), plainItem('Packaging Overrun', 500, 4)],
    distanceMi: 325,
    fuelRatePerMile: 0.68,
    pickupOffsetDays: 2,
    instructions: 'Driver must call ahead 30 min prior to arrival; hazmat placards required.',
    openedOffsetMin: -55,
    durationMin: 60, // remaining ~5 min
    closedOutcome: null,
    bestSeed: 1450.0,
  },
  {
    quoteId: '222617',
    shipper: 'Meridian Polymer Group',
    equipment: 'Van',
    shipFrom: { company: 'Meridian Polymer Group', street: '2200 Pinemont Dr', city: 'Houston', state: 'TX', zip: '77018' },
    shipTo: { company: 'Dallas Regional Terminal', street: '900 Sylvan Ave', city: 'Dallas', state: 'TX', zip: '75207' },
    stopOffs: 0,
    hazmat: false,
    items: [plainItem('Palletized Consumer Goods', 8200, 22), plainItem('Corrugated Packaging Rolls', 3400, 10)],
    distanceMi: 240,
    fuelRatePerMile: 0.65,
    pickupOffsetDays: 3,
    instructions: null,
    openedOffsetMin: -30,
    durationMin: 60, // remaining ~30 min
    closedOutcome: null,
    bestSeed: null,
  },
  {
    quoteId: '222624',
    shipper: 'Ashcroft Industrial Coatings',
    equipment: 'Reefer',
    shipFrom: { company: 'Ashcroft Industrial Coatings', street: '3311 Southside Industrial Pkwy', city: 'Atlanta', state: 'GA', zip: '30354' },
    shipTo: { company: 'Charlotte Freight Center', street: '4801 Nations Ford Rd', street2: 'Dock 12', city: 'Charlotte', state: 'NC', zip: '28217' },
    stopOffs: 1,
    hazmat: false,
    items: [plainItem('Bagged Resin Pellets', 18500, 40)],
    distanceMi: 245,
    fuelRatePerMile: 0.7,
    pickupOffsetDays: 4,
    instructions: 'Liftgate required at delivery.',
    openedOffsetMin: -100,
    durationMin: 180, // remaining ~80 min
    closedOutcome: null,
    bestSeed: 980.5,
  },
  {
    quoteId: '222631',
    shipper: 'Cobalt Fine Chemicals',
    equipment: 'Step Deck',
    shipFrom: { company: 'Cobalt Fine Chemicals', street: '1010 Chemical Row', city: 'Memphis', state: 'TN', zip: '38109' },
    shipTo: { company: 'Nashville Industrial Park', street: '640 Massman Dr', city: 'Nashville', state: 'TN', zip: '37210' },
    stopOffs: 0,
    hazmat: true,
    items: [hazItem(12000, 10), plainItem('Machinery Parts', 900, 3)],
    distanceMi: 210,
    fuelRatePerMile: 0.68,
    pickupOffsetDays: 2,
    instructions: null,
    openedOffsetMin: -20,
    durationMin: 240, // remaining ~3h40m
    closedOutcome: null,
    bestSeed: null,
  },
  {
    quoteId: '222638',
    shipper: 'Harrow Bulk Logistics',
    equipment: 'Van',
    shipFrom: { company: 'Harrow Bulk Logistics', street: '7700 Choctaw Dr', city: 'Baton Rouge', state: 'LA', zip: '70805' },
    shipTo: { company: 'Houston Bulk Terminal', street: '11200 Clay Rd', city: 'Houston', state: 'TX', zip: '77041' },
    stopOffs: 0,
    hazmat: false,
    items: [plainItem('Bulk Totes - Adhesive', 14000, 20), plainItem('Lumber Bundles', 6000, 8)],
    distanceMi: 270,
    fuelRatePerMile: 0.66,
    pickupOffsetDays: 5,
    instructions: 'Appointment required for delivery — schedule with consignee 24h ahead.',
    openedOffsetMin: -200,
    durationMin: 360, // remaining ~2h40m
    closedOutcome: null,
    bestSeed: 1120.0,
  },
  {
    quoteId: '222645',
    shipper: 'Silverline Resin Co',
    equipment: 'Flat Bed',
    shipFrom: { company: 'Silverline Resin Co', street: '5100 Westinghouse Blvd', city: 'Charlotte', state: 'NC', zip: '28273' },
    shipTo: { company: 'Richmond Cross-Dock', street: '2100 Ruffin Mill Rd', city: 'Richmond', state: 'VA', zip: '23834' },
    stopOffs: 2,
    hazmat: false,
    items: [plainItem('Palletized Steel Coil', 22000, 12)],
    distanceMi: 290,
    fuelRatePerMile: 0.72,
    pickupOffsetDays: 3,
    instructions: null,
    openedOffsetMin: -10,
    durationMin: 45, // remaining ~35 min
    closedOutcome: null,
    bestSeed: null,
  },
  {
    quoteId: '222652',
    shipper: 'Northgate Adhesives',
    equipment: 'Van',
    shipFrom: { company: 'Northgate Adhesives', street: '880 Groveport Rd', city: 'Columbus', state: 'OH', zip: '43125' },
    shipTo: { company: 'Indianapolis Fulfillment Center', street: '6400 Hillsdale Ct', city: 'Indianapolis', state: 'IN', zip: '46250' },
    stopOffs: 0,
    hazmat: true,
    items: [hazItem(9500, 8), plainItem('Packaging Overrun', 300, 2)],
    distanceMi: 175,
    fuelRatePerMile: 0.68,
    pickupOffsetDays: 2,
    instructions: null,
    openedOffsetMin: -150,
    durationMin: 200, // remaining ~50 min
    closedOutcome: null,
    bestSeed: 705.25,
  },
  // --- closed (history) ---
  {
    quoteId: '222659',
    shipper: 'Pinehollow Packaging',
    equipment: 'Van',
    shipFrom: { company: 'Pinehollow Packaging', street: '1500 Iron St', city: 'Kansas City', state: 'MO', zip: '64116' },
    shipTo: { company: 'St. Louis Logistics Park', street: '4100 Rider Trail S', city: 'St. Louis', state: 'MO', zip: '63045' },
    stopOffs: 0,
    hazmat: false,
    items: [plainItem('Packaged Consumer Goods', 7600, 18), plainItem('Corrugated Packaging Rolls', 2200, 6)],
    distanceMi: 250,
    fuelRatePerMile: 0.65,
    pickupOffsetDays: 4,
    instructions: 'No weekend deliveries.',
    openedOffsetMin: -500,
    durationMin: 60,
    closedOutcome: 'Expired',
    bestSeed: null,
  },
  {
    quoteId: '222666',
    shipper: 'Redstone Metal Works',
    equipment: 'Flat Bed',
    shipFrom: { company: 'Redstone Metal Works', street: '2450 W Buckeye Rd', city: 'Phoenix', state: 'AZ', zip: '85009' },
    shipTo: { company: 'Las Vegas Distribution Hub', street: '5300 Cameron St', city: 'Las Vegas', state: 'NV', zip: '89118' },
    stopOffs: 0,
    hazmat: false,
    items: [plainItem('Palletized Steel Coil', 26000, 14)],
    distanceMi: 295,
    fuelRatePerMile: 0.7,
    pickupOffsetDays: 6,
    instructions: null,
    openedOffsetMin: -1440,
    durationMin: 120,
    closedOutcome: 'Awarded',
    bestSeed: null,
  },
  {
    quoteId: '222673',
    shipper: 'Vantage Chemical Solutions',
    equipment: 'Reefer',
    shipFrom: { company: 'Vantage Chemical Solutions', street: '900 Chemical Way', city: 'Denver', state: 'CO', zip: '80216' },
    shipTo: { company: 'Salt Lake Industrial Center', street: '1800 S Depot St', city: 'Salt Lake City', state: 'UT', zip: '84104' },
    stopOffs: 1,
    hazmat: true,
    items: [hazItem(16000, 12), plainItem('Machinery Parts', 1100, 3)],
    distanceMi: 525,
    fuelRatePerMile: 0.68,
    pickupOffsetDays: 5,
    instructions: 'Tanker endorsement required for driver.',
    openedOffsetMin: -2880,
    durationMin: 90,
    closedOutcome: 'Cancelled',
    bestSeed: null,
  },
  {
    quoteId: '222680',
    shipper: 'Meridian Polymer Group',
    equipment: 'Step Deck',
    shipFrom: { company: 'Meridian Polymer Group', street: '6200 Imeson Rd', city: 'Jacksonville', state: 'FL', zip: '32219' },
    shipTo: { company: 'Atlanta Consolidation Hub', street: '4200 Fulton Industrial Blvd', city: 'Atlanta', state: 'GA', zip: '30336' },
    stopOffs: 0,
    hazmat: false,
    items: [plainItem('Bagged Resin Pellets', 15000, 30), plainItem('Lumber Bundles', 4000, 5)],
    distanceMi: 345,
    fuelRatePerMile: 0.66,
    pickupOffsetDays: 3,
    instructions: null,
    openedOffsetMin: -720,
    durationMin: 60,
    closedOutcome: 'Expired',
    bestSeed: null,
  },
  {
    quoteId: '222687',
    shipper: 'Cobalt Fine Chemicals',
    equipment: 'Van',
    shipFrom: { company: 'Cobalt Fine Chemicals', street: '4500 W Fullerton Ave', city: 'Chicago', state: 'IL', zip: '60639' },
    shipTo: { company: 'Detroit Freight Terminal', street: '17800 Rotunda Dr', city: 'Detroit', state: 'MI', zip: '48239' },
    stopOffs: 0,
    hazmat: false,
    items: [plainItem('Bulk Totes - Adhesive', 13500, 18)],
    distanceMi: 280,
    fuelRatePerMile: 0.65,
    pickupOffsetDays: 4,
    instructions: null,
    openedOffsetMin: -4320,
    durationMin: 180,
    closedOutcome: 'Awarded',
    bestSeed: null,
  },
]

function formatDate(ms) {
  const d = new Date(ms)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}/${d.getFullYear()}`
}

function toQuote(raw, now) {
  const openedAt = now + raw.openedOffsetMin * 60_000
  const closesAt = openedAt + raw.durationMin * 60_000
  const travelDays = Math.max(1, Math.round(raw.distanceMi / 500))
  const pickupAt = now + raw.pickupOffsetDays * DAY_MS
  const deliverAt = pickupAt + travelDays * DAY_MS

  return {
    quoteId: raw.quoteId,
    shipper: raw.shipper,
    equipment: raw.equipment,
    shipFrom: raw.shipFrom,
    shipTo: raw.shipTo,
    stopOffs: raw.stopOffs,
    hazmat: raw.hazmat,
    pickupDate: formatDate(pickupAt),
    deliverDate: formatDate(deliverAt),
    openedOffsetMin: raw.openedOffsetMin,
    durationMin: raw.durationMin,
    openedAt,
    closesAt,
    distanceMi: raw.distanceMi,
    // Never hand-entered — always the sum of `items`, so the two can't drift.
    weightLb: raw.items.reduce((sum, item) => sum + item.weightLb, 0),
    fuelRatePerMile: raw.fuelRatePerMile,
    items: raw.items,
    instructions: raw.instructions,
    charges: CHARGE_NAMES,
    currency: 'USD',
    closedOutcome: raw.closedOutcome,
    bestSeed: raw.bestSeed,
  }
}

/** ~12 quote requests for the current carrier session. `now` drives every
 *  window so a row's "open" / "closed" state and remaining-time never go
 *  stale relative to a hardcoded date. */
export function listQuotes(now = Date.now()) {
  return RAW_QUOTES.map((raw) => toQuote(raw, now))
}

/** Fuel charge — rate × distance, rounded to cents. Computed, never stored. */
export function fuelFor(quote) {
  return Math.round(quote.fuelRatePerMile * quote.distanceMi * 100) / 100
}

/** Derived status (never stored): Open while `now` is before closesAt;
 *  otherwise the seeded closed outcome, defaulting to Expired when a quote
 *  crosses closesAt with no seeded outcome (e.g. one of the currently-open
 *  fixtures, once a test or a long-open tab fast-forwards `now` past it). */
export function statusFor(quote, bidState, now) {
  if (now < quote.closesAt) return 'Open'
  // bidState kept for interface parity — not read today. The closed outcome
  // is quote-level (who won/expired/was cancelled), independent of whether
  // THIS carrier bid, declined, or stayed silent.
  void bidState
  return quote.closedOutcome ?? 'Expired'
}

// --- In-memory bid store (module Map; refresh clears, same prototype bar as
// spotStore.js) ---

const bids = new Map() // quoteId -> bid record
const subscribers = new Map() // quoteId -> Set<cb>

function notify(quoteId) {
  const subs = subscribers.get(quoteId)
  if (!subs) return
  const bid = getBid(quoteId)
  for (const cb of subs) cb(bid)
}

export function getBid(quoteId) {
  return (
    bids.get(quoteId) ?? {
      state: 'none',
      linehaul: null,
      currency: null,
      chargeAmounts: {},
      submittedAt: null,
    }
  )
}

/** Validates linehaul > 0; anything else is a no-op that returns the current
 *  bid unchanged (mirrors spotStore's no-op-on-invalid-transition convention).
 *  Re-submitting (including out of a prior decline) overwrites the record —
 *  PRD Feature 3 permits re-bid, and a later submit moving a quote OUT of
 *  Declined is Feature 3's own requirement. Window-open gating (closesAt) is
 *  the caller's job — this store only owns bid state, not quote timing. */
export function submitBid(quoteId, { linehaul, currency, chargeAmounts }, nowMs) {
  if (!(linehaul > 0)) return getBid(quoteId)
  bids.set(quoteId, {
    state: 'submitted',
    linehaul,
    currency,
    chargeAmounts: chargeAmounts ?? {},
    submittedAt: nowMs,
  })
  notify(quoteId)
  return getBid(quoteId)
}

export function declineBid(quoteId, nowMs) {
  bids.set(quoteId, { state: 'declined', linehaul: null, currency: null, chargeAmounts: {}, submittedAt: nowMs })
  notify(quoteId)
  return getBid(quoteId)
}

/** linehaul + fuel + sum of charge amounts, rounded to cents. */
export function totalFor(quote, bid) {
  const chargeTotal = Object.values(bid?.chargeAmounts ?? {}).reduce((sum, v) => sum + (v || 0), 0)
  return Math.round(((bid?.linehaul ?? 0) + fuelFor(quote) + chargeTotal) * 100) / 100
}

/** List-column value: the submitted total, the literal 'Declined' marker, or
 *  null pre-response. */
export function yourQuoteFor(quote, bid) {
  if (bid.state === 'submitted') return totalFor(quote, bid)
  if (bid.state === 'declined') return 'Declined'
  return null
}

/** Seeded competing best (quote-model.md §5.7 SHOW_BEST — amount only, never
 *  identity). When this carrier's own submitted total undercuts the seed,
 *  the bid becomes the best (a carrier's own bid CAN be the leading one). */
export function bestFor(quote, now) {
  void now // kept for interface parity — best-so-far has no time decay today
  const seeded = quote.bestSeed ?? null
  const bid = getBid(quote.quoteId)
  if (bid.state === 'submitted') {
    const total = totalFor(quote, bid)
    if (seeded == null || total < seeded) return total
  }
  return seeded
}

export function subscribe(quoteId, cb) {
  if (!subscribers.has(quoteId)) subscribers.set(quoteId, new Set())
  subscribers.get(quoteId).add(cb)
  return () => subscribers.get(quoteId)?.delete(cb)
}

/** Test helper — clears all bid state between tests. */
export function resetAllBids() {
  bids.clear()
}
