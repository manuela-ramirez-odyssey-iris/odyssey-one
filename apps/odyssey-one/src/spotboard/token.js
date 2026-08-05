// ponytail: token is a random opaque key (crypto.randomUUID()) mapped to
// {shipmentId, scac} via a localStorage lookup table — unguessable, and
// unlike the old base64 encoding, does not carry the shipmentId in the URL
// itself. Still UNAUTHENTICATED: anyone holding the link can bid, no login.
// Expiry is enforced by the quote's closeAt (see spotStore), never by the
// token itself.

const keyFor = (token) => `spotboard:token:${token}`

export function mintToken(shipmentId, scac) {
  const token = crypto.randomUUID()
  localStorage.setItem(keyFor(token), JSON.stringify({ shipmentId, scac }))
  return token
}

export function decodeToken(token) {
  if (!token) return null
  try {
    const raw = localStorage.getItem(keyFor(token))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    if (!parsed.shipmentId || !parsed.scac) return null
    return { shipmentId: parsed.shipmentId, scac: parsed.scac }
  } catch {
    return null
  }
}
