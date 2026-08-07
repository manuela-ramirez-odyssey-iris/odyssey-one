// Cross-shipment read layer for the SpotBoard Dashboard monitoring board.
// spotStore.js only supports one-quote-at-a-time reads (getQuote(shipmentId));
// this file adds the first key scan across ALL `spotboard:*` entries, and
// merges that with a small static demo fixture set so the board looks alive
// before real spot activity exists.
//
// ponytail: the board originally called for demo rows *derived* from real
// shipment/eligibility/carrier-list data (see git history on this file for
// the earlier draft). Scope was cut back to "just needs to work for a demo"
// — the fixtures below are hand-written, not generated. Re-introduce
// derivation if/when the board needs to reflect the actual shipment pool.
import { lowestBid } from './spotStore.js'

const KEY_PREFIX = 'spotboard:'
const CLOSING_SOON_MS = 15 * 60_000
// Auction window used only to backfill a plausible createdAt for demo rows
// (closeAt minus a 2h window) — never used for real quotes, which carry
// their own openAt.
const DEMO_AUCTION_WINDOW_MS = 2 * 60 * 60_000

// spotStore's own state machine (draft -> open -> closed -> awarded) is
// deliberately NOT the same vocabulary as this board (canon: keep them
// separate). draft quotes aren't live auctions yet, so they produce no row.
// closed quotes have no persisted "why" (spotStore has no unaward/invalidate
// mutator), so they map to 'In review' — awaiting a planner's award call.
const REAL_STATUS_MAP = {
  open: 'Open',
  closed: 'In review',
  awarded: 'Awarded',
}

// Presentational-only: 'Closing soon' is never a stored status, just a
// countdown read on 'Open' at render/query time. Same closeAt, different
// `now` → different label, no mutation anywhere.
function withCountdown(rawStatus, closeAt, now) {
  if (rawStatus === 'Open' && typeof closeAt === 'number' && closeAt - now < CLOSING_SOON_MS) {
    return 'Closing soon'
  }
  return rawStatus
}

function getLocalStorage() {
  try {
    // eslint-disable-next-line no-undef
    if (typeof localStorage === 'undefined') return null
    // eslint-disable-next-line no-undef
    return localStorage
  } catch {
    // blocked (private mode / SSR) — treat as absent
    return null
  }
}

// Map<shipmentId, rawQuote> for every parseable spotboard:* entry. Corrupt
// JSON and entries missing the minimum shape (shipmentId + status) are
// skipped, never thrown.
function scanRealQuotes() {
  const map = new Map()
  const ls = getLocalStorage()
  if (!ls) return map

  let length
  try {
    length = ls.length
  } catch {
    return map
  }

  for (let i = 0; i < length; i++) {
    let key
    try {
      key = ls.key(i)
    } catch {
      continue
    }
    if (!key || !key.startsWith(KEY_PREFIX)) continue

    let raw
    try {
      raw = ls.getItem(key)
    } catch {
      continue
    }
    if (!raw) continue

    let quote
    try {
      quote = JSON.parse(raw)
    } catch {
      continue
    }
    if (!quote || typeof quote !== 'object') continue
    if (typeof quote.shipmentId !== 'string' || typeof quote.status !== 'string') continue

    map.set(quote.shipmentId, quote)
  }
  return map
}

function mapRealQuote(quote, now) {
  const rawStatus = REAL_STATUS_MAP[quote.status]
  if (!rawStatus) return null // draft, or an unrecognized status — no row

  const carriers = Array.isArray(quote.carriers) ? quote.carriers : []
  const invited = carriers.filter((c) => c.incl)
  const responded = invited.filter((c) => c.bid)

  const leadingCarrier =
    quote.status === 'awarded'
      ? carriers.find((c) => c.scac === quote.awardedScac)
      : lowestBid(quote)
  const leadingBid = leadingCarrier?.bid?.total ?? null

  return {
    quoteId: quote.quoteId,
    shipmentId: quote.shipmentId,
    // ponytail: spotStore's quote carries no shipment master data (no
    // client/lane join exists yet) — load falls back to the shipment id and
    // client/lane are honestly '--' rather than fabricated.
    load: quote.shipmentId,
    client: '--',
    lane: '--',
    equipment: invited[0]?.equipment ?? carriers[0]?.equipment ?? '--',
    respondedCount: responded.length,
    invitedCount: invited.length,
    leadingBid,
    status: withCountdown(rawStatus, quote.closeAt ?? null, now),
    closeAt: quote.closeAt ?? null,
    createdAt: quote.openAt ?? null,
    demo: false,
  }
}

// Static demo fixtures — enough to exercise every status in the vocabulary.
// closeOffsetMin is relative to the `now` passed to listAllQuotes at call
// time (never an absolute date), so a demo row is always genuinely "closing
// soon" or "just closed" relative to whenever the board is actually viewed,
// instead of going stale. Fixtures with status 'Open' let withCountdown
// derive 'Closing soon' the same way real rows do — the countdown offset
// alone decides it.
const DEMO_FIXTURES = [
  {
    shipmentId: 'DEMO-70001',
    load: 'L-48213',
    client: 'Foodstuffs Regional',
    lane: 'Dallas, TX → Memphis, TN',
    equipment: 'Van',
    invitedCount: 6,
    respondedCount: 3,
    status: 'Open',
    closeOffsetMin: 150,
    leadingBid: 2140.0,
  },
  {
    shipmentId: 'DEMO-70002',
    load: 'L-48307',
    client: 'Coastal Beverage Co.',
    lane: 'Savannah, GA → Charlotte, NC',
    equipment: 'Reefer',
    invitedCount: 5,
    respondedCount: 1,
    status: 'Open',
    closeOffsetMin: 45,
    leadingBid: 1875.5,
  },
  {
    shipmentId: 'DEMO-70003',
    load: 'L-48390',
    client: 'Prairie Ag Supply',
    lane: 'Wichita, KS → Denver, CO',
    equipment: 'Flatbed',
    invitedCount: 7,
    respondedCount: 6,
    status: 'Open', // withCountdown flips this to 'Closing soon' — offset < 15min
    closeOffsetMin: 8,
    leadingBid: 2310.25,
  },
  {
    shipmentId: 'DEMO-70004',
    load: 'L-48412',
    client: 'Northline Paper',
    lane: 'Green Bay, WI → Chicago, IL',
    equipment: 'Van',
    invitedCount: 6,
    respondedCount: 5,
    status: 'In review',
    closeOffsetMin: -20,
    leadingBid: 1650.0,
  },
  {
    shipmentId: 'DEMO-70005',
    load: 'L-48455',
    client: 'Summit Building Products',
    lane: 'Boise, ID → Salt Lake City, UT',
    equipment: 'Flatbed',
    invitedCount: 5,
    respondedCount: 4,
    status: 'Awarded',
    closeOffsetMin: -180,
    leadingBid: 2975.0,
  },
  {
    shipmentId: 'DEMO-70006',
    load: 'L-48470',
    client: 'Weyerhaeuser Company',
    lane: 'Bastrop, LA → Green River, WY',
    equipment: 'Van',
    invitedCount: 7,
    respondedCount: 5,
    status: 'Awarded',
    closeOffsetMin: -60,
    leadingBid: 3520.75,
  },
  {
    shipmentId: 'DEMO-70007',
    load: 'L-48501',
    client: 'Coastal Beverage Co.',
    lane: 'Tampa, FL → Atlanta, GA',
    equipment: 'Reefer',
    invitedCount: 6,
    respondedCount: 2,
    status: 'Unawarded',
    closeOffsetMin: -90,
    leadingBid: null, // Unawarded never carries a leading bid
  },
  {
    shipmentId: 'DEMO-70008',
    load: 'L-48522',
    client: 'Prairie Ag Supply',
    lane: 'Omaha, NE → Kansas City, MO',
    equipment: 'Van',
    invitedCount: 4,
    respondedCount: 0,
    status: 'Invalidated',
    closeOffsetMin: -30,
    leadingBid: null, // Invalidated never carries a leading bid
  },
]

function buildDemoRow(fixture, now) {
  const closeAt = now + fixture.closeOffsetMin * 60_000
  return {
    quoteId: `demo-${fixture.shipmentId}`,
    shipmentId: fixture.shipmentId,
    load: fixture.load,
    client: fixture.client,
    lane: fixture.lane,
    equipment: fixture.equipment,
    respondedCount: fixture.respondedCount,
    invitedCount: fixture.invitedCount,
    leadingBid: fixture.leadingBid,
    status: withCountdown(fixture.status, closeAt, now),
    closeAt,
    createdAt: closeAt - DEMO_AUCTION_WINDOW_MS,
    demo: true,
  }
}

// A single row of the monitoring board — see BoardRow shape in the module
// header. Real quotes (from localStorage) always shadow a demo fixture for
// the same shipmentId; the demo row is simply omitted in that case.
export function listAllQuotes({ now = Date.now() } = {}) {
  const realQuotes = scanRealQuotes()

  const realRows = []
  for (const quote of realQuotes.values()) {
    const row = mapRealQuote(quote, now)
    if (row) realRows.push(row)
  }

  const demoRows = DEMO_FIXTURES.filter((f) => !realQuotes.has(f.shipmentId)).map((f) =>
    buildDemoRow(f, now),
  )

  return [...realRows, ...demoRows]
}

function isSameLocalDay(ts, now) {
  if (typeof ts !== 'number') return false
  const a = new Date(ts)
  const b = new Date(now)
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function boardKpis(rows, now) {
  // ponytail: "today" boundary is unspecified by canon — picked calendar
  // day, local timezone, arbitrarily. Owing ratification (Jana/David) before
  // this feeds anything beyond a demo.
  const isToday = (ts) => isSameLocalDay(ts, now)
  return {
    openBids: rows.filter((r) => r.status === 'Open').length,
    closingSoon: rows.filter((r) => r.status === 'Closing soon').length,
    awaitingReview: rows.filter((r) => r.status === 'In review').length,
    unawardedToday: rows.filter((r) => r.status === 'Unawarded' && isToday(r.closeAt)).length,
    awardedToday: rows.filter((r) => r.status === 'Awarded' && isToday(r.closeAt)).length,
  }
}

export function filterRows(rows, { client, status, org, search } = {}) {
  const q = (search ?? '').trim().toLowerCase()
  return rows.filter((r) => {
    if (client && r.client !== client) return false
    if (status && r.status !== status) return false
    // ponytail: BoardRow has no dedicated `org` field (dropped along with
    // shipments-derivation) — org filters against `client` until a real
    // org/customer split lands on the row.
    if (org && r.client !== org) return false
    if (q) {
      const haystack = `${r.client} ${r.lane} ${r.load} ${r.shipmentId}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}
