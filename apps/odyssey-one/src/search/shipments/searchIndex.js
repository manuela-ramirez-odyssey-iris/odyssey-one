/**
 * Shipments' binding of the shared search index (`../searchIndex-core.js`).
 *
 * The implementation moved there when Orders needed the identical ranking
 * (S130) — same one-core-many-bindings shape as `criteria-core.js`. Exports are
 * unchanged, so every existing call site is untouched; only where the code lives
 * changed. Shipment rows are already flat, so they are indexed as-is (Orders has
 * to project first — see `orders/searchIndex.js`).
 */
import { getAllShipments } from '../../data'
import { createSearchIndex } from '../searchIndex-core'

const index = createSearchIndex(getAllShipments)

export const distinctMatches = index.distinctMatches
export const valueMatchScore = index.valueMatchScore
export const valueMatchDetail = index.valueMatchDetail
