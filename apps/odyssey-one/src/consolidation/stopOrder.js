// Pure helpers for the Planned Stops drag-reorder (S161 / LINX-15787 B2).
// Kept separate from proposal.js: proposal.js computes the DEFAULT stop
// order, this module only rearranges/validates/labels whatever order the
// planner (or that default) hands it — operating on stop `key`s so the
// review route doesn't have to thread whole stop objects through drag state.

/** Move the key at `fromIndex` to `toIndex`. A no-op copy on an invalid move. */
export function reorderStops(order, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= order.length || toIndex < 0 || toIndex >= order.length) {
    return order
  }
  const next = [...order]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

/**
 * Every order's pickup stop should precede its delivery stop — but a stop
 * here only knows its own sellShipment, not the order numbers riding it, so
 * the order-level link is absent. Fallback (spec B2): no delivery stop may
 * sit above the very first pickup stop.
 * @param {string[]} order   stop keys in the candidate order
 * @param {Record<string, {type: string}>} byKey
 * @returns {string|null} null = valid
 */
export function validateStopOrder(order, byKey) {
  const firstPickup = order.findIndex((k) => byKey[k]?.type === 'pickup')
  if (firstPickup === -1) return null // no pickups at all — nothing to check
  const deliveryAboveFirstPickup = order.slice(0, firstPickup).some((k) => byKey[k]?.type === 'delivery')
  return deliveryAboveFirstPickup ? 'A delivery stop cannot come before the first pickup stop.' : null
}

/** Re-numbers P1…/D1… by type and POSITION within that type — live as the order changes. */
export function labelStops(order, byKey) {
  const counts = { pickup: 0, delivery: 0 }
  return order.map((k) => {
    const s = byKey[k]
    counts[s.type] += 1
    return { ...s, label: `${s.type === 'pickup' ? 'P' : 'D'}${counts[s.type]}` }
  })
}
