// localStorage-backed SpotBoard quote store + state machine, write-through
// to spot-service (Neon) in live mode. State machine: draft -> open -> closed
// -> awarded. Any mutator called outside its allowed source status (or, for
// submitBid, past closeAt) is a no-op that returns the current quote
// unchanged.
//
// Write-through: every write() also fires a fire-and-forget PUT of the whole
// quote blob; clearQuote fires a DELETE. Last-write-wins.
// ponytail: no concurrent-writer merge — fine for one planner + N carriers
// hitting different scacs, add server-side merge if a real collision (two
// writers, same field, same moment) ever surfaces.
//
// The DB is authoritative on read: subscribe() hydrates from the API on
// mount and every ~4s poll thereafter (live mode only — mock mode is
// unchanged, storage-event-only, so the jsdom suite behaves exactly as
// before). A null API response CLEARS the local cache (this is how "reset
// all bids" reaches an already-open browser tab); a non-null response
// overwrites it. Hydration writes go through writeLocal (no PUT) so a
// DB->local sync never echoes straight back to the DB.
import { mintToken } from './token.js'
import { getApiMode } from '../api/config'
import { fetchSpotState, putSpotState, deleteSpotState } from './spotApi.js'

const KIND = 'quote'
const POLL_MS = 4000
const storeKey = (shipmentId) => `spotboard:${shipmentId}`

function read(shipmentId) {
  const raw = localStorage.getItem(storeKey(shipmentId))
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// Local-only write — no PUT. Used by hydration paths (see subscribe/hydrateQuote).
function writeLocal(quote) {
  localStorage.setItem(storeKey(quote.shipmentId), JSON.stringify(quote))
  return quote
}

function write(quote) {
  writeLocal(quote)
  putSpotState(quote.shipmentId, KIND, quote).catch(() => {})
  return quote
}

export function getQuote(shipmentId) {
  return read(shipmentId)
}

export function saveDraft(shipmentId, { listId, listName, durationMin, carriers, flexiblePickup }) {
  const existing = read(shipmentId)
  if (existing && existing.status !== 'draft') return existing

  return write({
    quoteId: existing?.quoteId ?? crypto.randomUUID(),
    shipmentId,
    listId,
    listName,
    durationMin,
    openAt: null,
    closeAt: null,
    status: 'draft',
    awardType: null,
    awardedScac: null,
    carriers,
    flexiblePickup: flexiblePickup ?? false,
  })
}

export function sendRFQ(shipmentId, nowMs) {
  const quote = read(shipmentId)
  if (!quote || quote.status !== 'draft') return quote ?? null

  return write({
    ...quote,
    status: 'open',
    openAt: nowMs,
    closeAt: nowMs + quote.durationMin * 60_000,
    // Mint once, here, at the draft->open transition — the single mint
    // point. Never mint in a render path (RfqLinksPanel renders repeatedly);
    // that would orphan already-sent links with a fresh token each render.
    carriers: quote.carriers.map((c) => ({ ...c, token: mintToken(shipmentId, c.scac) })),
  })
}

export function submitBid(shipmentId, scac, bid, nowMs) {
  const quote = read(shipmentId)
  if (!quote || quote.status !== 'open' || nowMs > quote.closeAt) return quote ?? null

  return write({
    ...quote,
    carriers: quote.carriers.map((c) =>
      c.scac === scac ? { ...c, bid: { ...bid, status: 'bid', respondedAt: nowMs } } : c
    ),
  })
}

export function declineBid(shipmentId, scac, nowMs) {
  const quote = read(shipmentId)
  if (!quote || quote.status !== 'open' || nowMs > quote.closeAt) return quote ?? null

  return write({
    ...quote,
    carriers: quote.carriers.map((c) =>
      c.scac === scac ? { ...c, bid: { status: 'declined', respondedAt: nowMs } } : c
    ),
  })
}

// Closing does not fabricate a bid for silent carriers — they simply keep
// no `bid` field, and the UI renders "No Bid Submitted" for that absence.
// nowMs isn't used yet (no time-based gating on close) but is kept in the
// signature for interface parity with the other nowMs-driven mutators.
export function closeQuote(shipmentId, nowMs) {
  const quote = read(shipmentId)
  if (!quote || quote.status !== 'open') return quote ?? null
  void nowMs

  return write({ ...quote, status: 'closed' })
}

export function award(shipmentId, scac, awardType) {
  const quote = read(shipmentId)
  if (!quote || quote.status !== 'closed') return quote ?? null

  return write({ ...quote, status: 'awarded', awardedScac: scac, awardType })
}

export function clearQuote(shipmentId) {
  localStorage.removeItem(storeKey(shipmentId))
  deleteSpotState(shipmentId, KIND).catch(() => {})
}

export function lowestBid(quote) {
  const bidding = quote.carriers.filter((c) => c.bid?.status === 'bid')
  if (bidding.length === 0) return null
  return bidding.reduce((lowest, c) => (c.bid.total < lowest.bid.total ? c : lowest))
}

// DB fetch -> reconcile local cache. Returns the (possibly updated) local
// quote. Shared by subscribe's poll and the one-shot hydrateQuote below.
async function hydrateFromApi(shipmentId) {
  const value = await fetchSpotState(shipmentId, KIND)
  if (value === undefined) return read(shipmentId) // mock mode: didn't check, leave cache alone
  if (JSON.stringify(value) === JSON.stringify(read(shipmentId))) return read(shipmentId)
  if (value === null) localStorage.removeItem(storeKey(shipmentId))
  else writeLocal(value)
  return read(shipmentId)
}

export function subscribe(shipmentId, cb) {
  if (typeof window === 'undefined') return () => {}

  const handler = () => cb(read(shipmentId))
  window.addEventListener('storage', handler)

  let intervalId = null
  if (getApiMode() === 'live') {
    let loggedPollError = false
    const poll = () => {
      hydrateFromApi(shipmentId).then(cb).catch((err) => {
        // ponytail: swallow — spot-service being unreachable must not spam
        // the console every 4s; log once per subscription, not per tick. No
        // retry machinery: the next scheduled poll IS the retry.
        if (!loggedPollError) {
          loggedPollError = true
          console.debug('spot poll failed (will keep retrying every 4s):', err)
        }
      })
    }
    poll() // immediate hydrate on subscribe
    intervalId = setInterval(poll, POLL_MS)
  }

  return () => {
    window.removeEventListener('storage', handler)
    if (intervalId) clearInterval(intervalId)
  }
}

// One-shot hydrate for consumers that read the store once at mount without
// subscribing (CarrierBid: a carrier opening the token link in a fresh
// browser has empty localStorage and must not fall back to "quote no longer
// available"). No-op in mock mode (returns the local read unchanged).
export async function hydrateQuote(shipmentId) {
  if (getApiMode() !== 'live') return read(shipmentId)
  return hydrateFromApi(shipmentId)
}
