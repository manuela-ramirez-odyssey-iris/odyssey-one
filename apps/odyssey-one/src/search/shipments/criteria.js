/**
 * Shipments search criteria — this domain's FREE_TEXT_KEYS bound to the shared
 * matcher in `search/criteria-core.js`.
 *
 * The semantics and every exported name are UNCHANGED (S79c decision 7: one
 * implementation of chip+text matching, used by BOTH the GlobalSearch glimpse
 * and the table pipeline, which is what guarantees the glimpse total equals the
 * sum of the criteria-filtered panel totals). S128 moved the domain-agnostic
 * half into the core so Orders could share it verbatim rather than grow a
 * second implementation that only "should" behave identically — the drift the
 * original extraction existed to prevent.
 *
 * Anything domain-agnostic belongs in the core, not here.
 */
import {
  matchesFreeText as coreMatchesFreeText,
  textNeedles as coreTextNeedles,
  matchesAnyNeedle as coreMatchesAnyNeedle,
  matchesCriteria as coreMatchesCriteria,
} from '../criteria-core'

// Re-exported unchanged — these carry no domain keys.
export {
  tokenizeText,
  tokenizeChipValue,
  parseSearchDate,
  matchesChip,
  scoreText,
  resolveBestMatch,
  resolveBestMatchNeedles,
  compareByCriteria,
  hasCriteria,
} from '../criteria-core'

// Fields the free-text query matches against (OR semantics). Single source of
// truth — the adapter and the grid service both import this list.
//
// Scope rule: IDENTIFIERS a user could paste from a document or an email, plus
// the parties and places they'd type by name. Deliberately NOT here: measures
// (grossWeight, apFreightCost, orderCount, loadCount) — a bare "2" would match
// half the DB — and enums (mode, equipmentCode, tenderStatus, shipmentStatus),
// which are reachable as chips. Both would drown the bare-code case.
export const FREE_TEXT_KEYS = [
  'buyShipment', 'sellShipment', 'customerId', 'customerName', 'origin', 'destination', 'scac', 'orders',
  // Added S104: a pasted Pro/BOL, load, trailer, or seal number found NOTHING
  // before this — the single most likely thing to paste into an empty bar.
  'pro', 'load', 'equipment', 'seal', 'consignor', 'consignee',
  // Added S104 (R2-2): the customer's own pickup reference is a prime paste.
  'pickupNumbers',
]

// ── FREE_TEXT_KEYS-bound wrappers ──────────────────────────────────────────
// Same signatures the Shipments call sites have always used.

export function matchesFreeText(row, text) {
  return coreMatchesFreeText(row, text, FREE_TEXT_KEYS)
}

export function textNeedles(rows, text) {
  return coreTextNeedles(rows, text, FREE_TEXT_KEYS)
}

export function matchesAnyNeedle(row, needles) {
  return coreMatchesAnyNeedle(row, needles, FREE_TEXT_KEYS)
}

export function matchesCriteria(row, criteria, needles) {
  return coreMatchesCriteria(row, criteria, needles, FREE_TEXT_KEYS)
}
