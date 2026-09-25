// legMiles.js — single source for stop-to-stop distance, shared by the
// generator (tools/generate.mjs seeds shipment/routing/summary distanceMiles
// from it) and the Edit Stops sandbox (stopsSandbox.js recomputes legs live
// as the planner reorders/moves stops). One function, so the seed and the
// live UI can never disagree about what a leg is worth (plan B2).
//
// ponytail: haversine great-circle distance × a fixed road-factor, not a real
// mileage source (PC*Miler etc). This is exactly what generate.mjs's own
// 'Distance Source' field already advertises as a limitation — the
// comparison row is seeded 'PCMILER PRACTICAL' as a label, not a live
// integration. Upgrade path: swap this function's body for a real
// distanceSource call; every caller already goes through here.
const ROAD_FACTOR = 1.2
const EARTH_RADIUS_MI = 3958.8

function toRad(deg) { return (deg * Math.PI) / 180 }

/**
 * Great-circle distance between two `{ lat, lng }` points, in road miles.
 * Returns null when either point is missing coordinates, so a caller can
 * choose to skip rather than silently treat a gap as zero.
 */
export function legMiles(a, b) {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null
  if (a.lat === b.lat && a.lng === b.lng) return 0
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  const straight = 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(s)))
  return Math.round(straight * ROAD_FACTOR * 100) / 100
}

/**
 * Sum of consecutive-stop legs over an ordered stop sequence (each stop
 * needs `{ lat, lng }`). Returns `null`, not a truncated sum, the moment any
 * leg can't be computed (missing coordinates) — a partial total silently
 * read as "0.00 mi" for a whole-shipment total is a wrong number, not a
 * best-effort one; the caller shows '--' for null (bug fix, S160 follow-up,
 * live 25390278: a fresh P?/D? stop with no coords made the All Stops total
 * read 0.00 instead of unknown).
 */
export function totalMiles(stops) {
  let total = 0
  for (let i = 1; i < stops.length; i++) {
    const m = legMiles(stops[i - 1], stops[i])
    if (m == null) return null
    total += m
  }
  return Math.round(total * 100) / 100
}
