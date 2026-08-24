/**
 * Orders' binding of the shared search index (`../searchIndex-core.js`).
 *
 * Unlike a shipment row, an order row is NOT indexable as-is: locations are
 * objects, dates are ISO, measures are `{ value, uom }`, and three enums are
 * stored as codes. Every progression `dataKey` therefore reads off the PROJECTED
 * row (`orderSearchRow`), which is also what the criteria matcher compares
 * against — index and matcher must see the same values or a suggestion could
 * offer an attribute the search then fails to match.
 */
import { getAllOrders } from '../../data/orders'
import { createSearchIndex } from '../searchIndex-core'
import { orderSearchRow } from './progression'

// The projection is memoized on the source LENGTH rather than built once: a
// mock-created order appends a row, and an index that never noticed would make
// the new order unsuggestable. Cheap check, no invalidation hook to remember.
let cached = { len: -1, rows: [] }
function projectedOrders() {
  const all = getAllOrders()
  if (cached.len !== all.length) {
    cached = { len: all.length, rows: all.map(orderSearchRow) }
    index.clear() // distinct sets were built from the previous rows
  }
  return cached.rows
}

const index = createSearchIndex(projectedOrders)

export const distinctMatches = index.distinctMatches
export const valueMatchScore = index.valueMatchScore
export const valueMatchDetail = index.valueMatchDetail
