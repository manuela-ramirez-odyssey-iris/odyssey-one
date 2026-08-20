/**
 * Orders search criteria — this domain's free-text keys bound to the SAME
 * matcher Shipments uses (`search/criteria-core.js`).
 *
 * Shared on purpose (user ruling, 2026-08-20: "the criteria is the same as in
 * shipments"). Nothing here re-implements matching, tokenizing, or ranking —
 * a second implementation would be free to drift, and the point of the core is
 * that both domains behave identically by construction.
 *
 * ── What "matches the first characters" means, precisely ───────────────────
 * Shipments MATCHES on substring (`fieldIncludes` → `String.includes`) and
 * RANKS prefix hits above interior ones (`scoreText`: exact 3 · starts-with 2 ·
 * contains 1). So typing the first characters of an order number surfaces it
 * at the top, which is the behaviour being asked for — but a query that appears
 * mid-value still matches, ranked lower. Ported verbatim rather than tightened
 * to a strict prefix, because "the criteria is the same as in shipments" is the
 * instruction. Making it prefix-only is a one-line change in the core's
 * `fieldIncludes` if that turns out to be the intent.
 *
 * ── Multi-code ─────────────────────────────────────────────────────────────
 * `textNeedles` gives the union behaviour verbatim: the phrase is tried whole
 * first, and only if it matches NOTHING is it split into codes (on whitespace
 * or commas) and ORed. So "0000000113049 ERC-112330" returns both orders, while
 * a customer name with a space in it is still treated as one value.
 */
import {
  matchesFreeText as coreMatchesFreeText,
  textNeedles as coreTextNeedles,
  matchesAnyNeedle as coreMatchesAnyNeedle,
  matchesCriteria as coreMatchesCriteria,
} from '../criteria-core'

export {
  tokenizeText,
  scoreText,
  resolveBestMatch,
  resolveBestMatchNeedles,
  compareByCriteria,
  hasCriteria,
} from '../criteria-core'

/**
 * Row fields the Orders free-text query searches, in relevance-tiebreak order.
 *
 * Same scope rule Shipments applies: IDENTIFIERS a user could paste from a
 * document or an email, plus the party they'd type by name. Deliberately NOT
 * here — measures (grossWeight, volume) where a bare "2" would match half the
 * table, and enums (orderStatus, equipment, freightTerms, shipDirection) which
 * are reachable as filter fields. Both would drown the bare-code case, which is
 * the one this bar exists to serve.
 *
 * `consignor`/`consignee` are OBJECTS on an order row, not strings, so they are
 * not searchable as free text the way Shipments' flat origin/destination are —
 * locations are reachable through the panel's Origin/Destination pickers.
 *
 * `poNumber` is a tempting third key — it exists on the MOCK row and is exactly
 * the sort of reference a customer pastes — but the live schema has no
 * `po_number` column (nothing in `api/_lib/` references one), so adding it here
 * alone would make mock and live disagree. Add it to the keys and the SQL
 * together, or not at all.
 */
export const ORDERS_FREE_TEXT_KEYS = ['orderNumber', 'customer']

/**
 * The attribute pool relevance ranking resolves against. Order IS the tiebreak
 * (`resolveBestMatch` iterates it), so the identifier the user most likely
 * typed comes first.
 */
export const ORDERS_FREE_TEXT_ATTRS = [
  { key: 'order-number', label: 'Order #', dataKey: 'orderNumber' },
  { key: 'customer', label: 'Customer', dataKey: 'customer' },
]

export function matchesFreeText(row, text) {
  return coreMatchesFreeText(row, text, ORDERS_FREE_TEXT_KEYS)
}

export function textNeedles(rows, text) {
  return coreTextNeedles(rows, text, ORDERS_FREE_TEXT_KEYS)
}

export function matchesAnyNeedle(row, needles) {
  return coreMatchesAnyNeedle(row, needles, ORDERS_FREE_TEXT_KEYS)
}

export function matchesCriteria(row, criteria, needles) {
  return coreMatchesCriteria(row, criteria, needles, ORDERS_FREE_TEXT_KEYS)
}
