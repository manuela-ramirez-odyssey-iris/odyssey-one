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
 * A delivery can't come before its own pickup (user, 2026-09-25). Stop keys
 * are `pickup-<sellShipment>` / `delivery-<sellShipment>` (proposal.js), so
 * each source shipment's P/D pair is linked by the key's suffix.
 * @param {string[]} order stop keys in the candidate order
 * @returns {Set<string>} keys of BOTH stops of every out-of-order pair (empty = valid)
 */
export function invalidStopKeys(order) {
  const bad = new Set()
  order.forEach((key, i) => {
    if (!key.startsWith('delivery-')) return
    const pickup = `pickup-${key.slice('delivery-'.length)}`
    const p = order.indexOf(pickup)
    if (p > i) { bad.add(key); bad.add(pickup) }
  })
  return bad
}
