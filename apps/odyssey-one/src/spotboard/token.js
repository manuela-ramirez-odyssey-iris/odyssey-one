// Self-contained token: base64url-encoded JSON { s: shipmentId, c: scac,
// n: nonce }. decodeToken needs no lookup table (no localStorage, no
// server round-trip) — a carrier opening the link in a browser that never
// minted it (the normal case: the planner mints it, the carrier receives
// it) still resolves shipmentId/scac. Previously the mapping lived in
// localStorage keyed by the token, which only ever worked in the SAME
// browser that minted it — every carrier on a different machine got
// decodeToken -> null -> "This link is invalid." with zero network
// requests ever firing.
//
// This IS reversible: the shipmentId/scac are visible to anyone who
// base64-decodes the token. That's fine — the link already scopes access to
// exactly that shipment/carrier, nothing new is exposed by making it
// legible. The nonce (crypto.randomUUID()) makes a minted token
// unguessable, but decodeToken alone can't verify a token was the ONE
// actually minted — anyone who knows a shipmentId/scac pair can construct a
// well-shaped token with a different nonce and it will still decode
// successfully (see token.test.js). The real forgery guard is in
// CarrierBid.jsx: it requires the raw URL token to string-match
// quote.carriers[].token (minted once at draft->open, spotStore.sendRFQ) —
// a mismatch takes the same "This link is invalid." path.
//
// Still UNAUTHENTICATED beyond that: anyone holding the real link can bid,
// no login. Expiry is enforced by the quote's closeAt (see spotStore),
// never by the token itself.

function toBase64Url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  return atob(padded + pad)
}

export function mintToken(shipmentId, scac) {
  return toBase64Url(JSON.stringify({ s: shipmentId, c: scac, n: crypto.randomUUID() }))
}

export function decodeToken(token) {
  if (!token) return null
  try {
    const parsed = JSON.parse(fromBase64Url(token))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    if (!parsed.s || !parsed.c) return null
    return { shipmentId: parsed.s, scac: parsed.c }
  } catch {
    return null
  }
}
