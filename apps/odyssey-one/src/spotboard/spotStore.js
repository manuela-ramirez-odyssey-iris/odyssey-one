// localStorage-backed SpotBoard quote store + state machine.
// State machine: draft -> open -> closed -> awarded. Any mutator called
// outside its allowed source status (or, for submitBid, past closeAt) is a
// no-op that returns the current quote unchanged.

import { mintToken } from './token.js'

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

function write(quote) {
  localStorage.setItem(storeKey(quote.shipmentId), JSON.stringify(quote))
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
}

export function lowestBid(quote) {
  const bidding = quote.carriers.filter((c) => c.bid?.status === 'bid')
  if (bidding.length === 0) return null
  return bidding.reduce((lowest, c) => (c.bid.total < lowest.bid.total ? c : lowest))
}

export function subscribe(shipmentId, cb) {
  if (typeof window === 'undefined') return () => {}

  const handler = () => cb(read(shipmentId))
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
