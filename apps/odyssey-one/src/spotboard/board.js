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
// Shipment ids from the retired invented-fixture era — see scanRealQuotes.
const RETIRED_DEMO_ID = /^DEMO-/
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
    // A quote saved against a shipment that CANNOT EXIST must not produce a
    // row. The demo fixtures used to carry invented ids ('DEMO-70001'…), so
    // anyone who opened an RFQ on one before they were re-anchored to real
    // shipments still has `spotboard:DEMO-7000N` in localStorage — and it
    // renders as a REAL (non-demo) row whose every action 404s with
    // "No shipment: DEMO-70001", forever, because localStorage outlives the
    // code change that fixed the fixtures. Skipping them is the cleanup.
    if (RETIRED_DEMO_ID.test(quote.shipmentId)) continue

    map.set(quote.shipmentId, quote)
  }
  return map
}

// One per-carrier row — the grain the legacy cross-bid screen ("Quote Viewer")
// actually uses: one row per CARRIER RESPONSE, grouped by quote, with the
// carrier's own cost, response time and awarded flag side by side. Our board
// showed only the per-quote aggregate (Resp./Invited + Leading Bid), so the
// comparison the screen exists for was only reachable by drilling in. SPB-30.
//
// `quotedCost` carries the literal string 'Declined' for a declined carrier —
// that is legacy's own rendering (image 4 puts "Declined" in the cost cell),
// not a placeholder we invented.
function mapCarrierRow(c, quote) {
  const declined = c.bid?.status === 'declined'
  const openAt = typeof quote.openAt === 'number' ? quote.openAt : null
  const respondedAt = typeof c.bid?.respondedAt === 'number' ? c.bid.respondedAt : null

  return {
    scac: c.scac,
    name: c.name ?? '--',
    // Legacy renders elapsed-since-open ("3 minutes"), not a wall clock.
    responseTime:
      respondedAt != null && openAt != null
        ? `${Math.max(0, Math.round((respondedAt - openAt) / 60_000))} min`
        : '--',
    // Real responder identity — CarrierBid stamps `submittedBy` at submit
    // time. Never fabricated: a decline carries no name, so it stays '--'.
    responseUser: c.bid?.submittedBy ?? '--',
    quotedCost: declined ? 'Declined' : (c.bid?.total ?? null),
    awarded: quote.awardedScac != null && quote.awardedScac === c.scac,
  }
}

function mapRealQuote(quote, now) {
  const rawStatus = REAL_STATUS_MAP[quote.status]
  if (!rawStatus) return null // draft, or an unrecognized status — no row

  const carriers = Array.isArray(quote.carriers) ? quote.carriers : []
  const invited = carriers.filter((c) => c.incl)
  // A DECLINE IS A RESPONSE — legacy stamps Response Time on a declined
  // carrier too (image 4: CTNS, "3 minutes", cost "Declined"). So this counts
  // any carrier that came back at all, which is why it reads `c.bid` rather
  // than `c.bid.status === 'bid'`.
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
    carriers: invited.map((c) => mapCarrierRow(c, quote)),
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
//
// EVERY shipmentId BELOW IS A REAL SEEDED SHIPMENT, and that is load-bearing,
// not cosmetic. The row action navigates to /shipments with this id, which is
// fetched as `sellShipment`; the invented ids these replaced ('DEMO-70001'…)
// 404'd with "No shipment: DEMO-70001" on every single click, because no such
// shipment exists. Anchoring to real rows also means client / lane / load /
// equipment are the shipment's OWN values rather than plausible-looking
// inventions that contradict the shipment the row opens.
//
// Selected from shipments in 'Review' status (the state a spot quote actually
// starts from). The generator is seeded (seed 42, reproducible), so these ids
// survive a reseed — but if the generator's id allocation ever changes, these
// go stale together and every row action 404s again. That is the tripwire:
// `demoFixtureShipmentIds` is exported so a test can assert they resolve.
const DEMO_FIXTURES = [
  {
    shipmentId: '25000029',
    load: '38986',
    client: 'Huntsman Refining LLC',
    lane: 'Phoenix, AZ → San Diego, CA',
    equipment: 'TT',
    invitedCount: 6,
    respondedCount: 3,
    status: 'Open',
    closeOffsetMin: 150,
    leadingBid: 2140.0,
  },
  {
    shipmentId: '25000645',
    load: '69980',
    client: 'INEOS Styrolution America',
    lane: 'Freeport, TX → Kingsport, TN',
    equipment: 'LCL',
    invitedCount: 5,
    respondedCount: 1,
    status: 'Open',
    closeOffsetMin: 45,
    leadingBid: 1875.5,
  },
  {
    shipmentId: '25000856',
    load: '65366',
    client: 'G2O Technologies LLC',
    lane: 'Baton Rouge, LA → Atlanta, GA',
    equipment: 'LCL',
    invitedCount: 7,
    respondedCount: 6,
    status: 'Open', // withCountdown flips this to 'Closing soon' — offset < 15min
    closeOffsetMin: 8,
    leadingBid: 2310.25,
  },
  {
    shipmentId: '25001268',
    load: '24234',
    client: 'ERCO Systems Inc',
    lane: 'Columbus, GA → Atlanta, GA',
    equipment: 'FCL',
    invitedCount: 6,
    respondedCount: 5,
    status: 'In review',
    closeOffsetMin: -20,
    leadingBid: 1650.0,
  },
  {
    shipmentId: '25002141',
    load: '79345',
    client: 'DuBois Chemicals',
    lane: 'Odessa, TX → Green River, WY',
    equipment: 'TLR',
    invitedCount: 5,
    respondedCount: 4,
    status: 'Awarded',
    closeOffsetMin: -180,
    leadingBid: 2975.0,
  },
  {
    shipmentId: '25002538',
    load: '79237',
    client: 'Kemira North America',
    lane: 'Baton Rouge, LA → Baytown, TX',
    equipment: 'TL',
    invitedCount: 7,
    respondedCount: 5,
    status: 'Awarded',
    closeOffsetMin: -60,
    leadingBid: 3520.75,
  },
  {
    shipmentId: '25002628',
    load: '98756',
    client: 'Kemira Europe',
    lane: 'Dallas, TX → McIntosh, AL',
    equipment: 'TLH',
    invitedCount: 6,
    respondedCount: 2,
    status: 'Unawarded',
    closeOffsetMin: -90,
    leadingBid: null, // Unawarded never carries a leading bid
  },
  {
    shipmentId: '25002687',
    load: '85723',
    client: 'INEOS Styrolution America',
    lane: 'Neenah, WI → Freeport, TX',
    equipment: 'TLH',
    invitedCount: 4,
    respondedCount: 0,
    status: 'Invalidated',
    closeOffsetMin: -30,
    leadingBid: null, // Invalidated never carries a leading bid
  },
]

/** The seeded shipments the demo rows point at — exported so a test can prove
 *  they still resolve rather than silently 404ing on click. */
export const demoFixtureShipmentIds = DEMO_FIXTURES.map((f) => f.shipmentId)

// Demo carrier pool — SCAC + name pairs only, used to give demo quotes a
// believable roster. Deliberately overlaps the real carrier catalog's SCACs.
const DEMO_CARRIER_POOL = [
  { scac: 'KNGT', name: 'Knight Transportation' },
  { scac: 'JBHT', name: 'J.B. Hunt' },
  { scac: 'WERN', name: 'Werner Enterprises' },
  { scac: 'SWFT', name: 'Swift Transportation' },
  { scac: 'ODFL', name: 'Old Dominion' },
  { scac: 'SAIA', name: 'Saia LTL Freight' },
  { scac: 'CRST', name: 'CRST International' },
  { scac: 'PRIJ', name: 'Prime Inc.' },
  { scac: 'EXLA', name: 'Estes Express' },
]

/**
 * Derives a demo quote's per-carrier rows FROM the fixture's own aggregates,
 * rather than hand-writing ~50 carrier rows that would drift out of agreement
 * with them. Coherence is guaranteed by construction, not by proofreading:
 *
 *   • exactly `invitedCount` carriers
 *   • exactly `respondedCount` of them responded
 *   • when `leadingBid` is set, the cheapest responder bids EXACTLY that, and
 *     everyone else bids above it — so the outer Leading Bid cell always
 *     equals the minimum of the rows underneath it
 *   • when `leadingBid` is null (Unawarded / Invalidated), every responder
 *     DECLINED — which is what makes "responded, but no leading bid" coherent
 *     instead of contradictory
 *   • an Awarded quote stamps the awarded flag on that cheapest responder
 *
 * `offset` rotates the pool per fixture so different quotes show different
 * carriers; it is derived from the fixture, never random (reproducibility).
 */
function buildDemoCarriers(fixture, offset) {
  const { invitedCount, respondedCount, leadingBid, status } = fixture

  return Array.from({ length: invitedCount }, (_, i) => {
    const pick = DEMO_CARRIER_POOL[(offset + i) % DEMO_CARRIER_POOL.length]
    const responded = i < respondedCount
    const isLeader = responded && leadingBid != null && i === 0
    // Stepped upward from the leader so the minimum is unambiguous.
    const amount = leadingBid == null ? null : leadingBid + i * 125

    return {
      scac: pick.scac,
      name: pick.name,
      responseTime: responded ? `${(i + 1) * 7} min` : '--',
      responseUser: responded && amount != null ? `dispatch@${pick.scac.toLowerCase()}.com` : '--',
      quotedCost: responded ? (amount == null ? 'Declined' : amount) : null,
      awarded: isLeader && status === 'Awarded',
    }
  })
}

function buildDemoRow(fixture, now, index) {
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
    carriers: buildDemoCarriers(fixture, index * 2),
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

  // Indexed BEFORE filtering, so a demo quote's carrier roster stays the same
  // whether or not an unrelated fixture is shadowed by a real quote.
  const demoRows = DEMO_FIXTURES
    .map((f, i) => (realQuotes.has(f.shipmentId) ? null : buildDemoRow(f, now, i)))
    .filter(Boolean)

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
    // `all` and `invalidated` exist because the board's category row REPLACED
    // the Status dropdown (2026-08-11, user ruling): the row now has to be able
    // to express every selection the dropdown could, including "no filter" and
    // Invalidated. `invalidated` carries no same-day constraint — only the two
    // tiles whose labels say "today" do.
    all: rows.length,
    openBids: rows.filter((r) => r.status === 'Open').length,
    closingSoon: rows.filter((r) => r.status === 'Closing soon').length,
    awaitingReview: rows.filter((r) => r.status === 'In review').length,
    unawardedToday: rows.filter((r) => r.status === 'Unawarded' && isToday(r.closeAt)).length,
    awardedToday: rows.filter((r) => r.status === 'Awarded' && isToday(r.closeAt)).length,
    invalidated: rows.filter((r) => r.status === 'Invalidated').length,
  }
}

export function filterRows(rows, { client, status, org, search, intervalDays, today, now } = {}) {
  const q = (search ?? '').trim().toLowerCase()
  const since =
    typeof intervalDays === 'number' && intervalDays > 0
      ? (now ?? Date.now()) - intervalDays * 24 * 60 * 60_000
      : null

  return rows.filter((r) => {
    if (client && r.client !== client) return false
    if (status && r.status !== status) return false
    // ponytail: BoardRow has no dedicated `org` field (dropped along with
    // shipments-derivation) — org filters against `client` until a real
    // org/customer split lands on the row.
    if (org && r.client !== org) return false
    // Legacy's `Interval` control (image 4: "6 days"), which we had no
    // equivalent for. A row with no createdAt is KEPT rather than hidden —
    // an unknown open date is not evidence the quote is old.
    if (since != null && typeof r.createdAt === 'number' && r.createdAt < since) return false
    // Same calendar-day test boardKpis uses for its two "…today" tiles, so a
    // tile's count and the rows you get when you click it are produced by the
    // SAME predicate. Without this, "Awarded today: 2" would filter to every
    // Awarded quote ever — a tile whose number contradicts its own result set.
    if (today && !isSameLocalDay(r.closeAt, now ?? Date.now())) return false
    if (q) {
      // quoteId was missing from this haystack while the field's own label
      // read "Search (Quote ID / Load)" — searching a quote ID matched nothing.
      const haystack = `${r.quoteId} ${r.client} ${r.lane} ${r.load} ${r.shipmentId}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}
