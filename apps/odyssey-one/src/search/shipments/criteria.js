/**
 * Shared search-criteria matcher — the ONE implementation of chip+text matching
 * used by BOTH the GlobalSearch glimpse (adapter.searchShipments) and the table
 * pipeline (gridService list + category counts). S79c decision 7: extracting it
 * here is what guarantees the glimpse total always equals the sum of the
 * criteria-filtered panel totals.
 *
 * Semantics (unchanged from the adapter's reference implementation):
 * - Chips are ANDed; each chip is a case-insensitive SUBSTRING match against its
 *   `dataKey` field (arrays joined with spaces; a null field never matches, even
 *   for an empty queryValue).
 * - Free text is ANDed with the chips and ORed across FREE_TEXT_KEYS.
 */

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

// Case-insensitive substring test against one field (arrays joined with spaces).
function fieldIncludes(field, needle) {
  if (field == null) return false
  const str = (Array.isArray(field) ? field.join(' ') : String(field)).toLowerCase()
  return str.includes(needle)
}

// ── Multi-code tokenization (Case 9, S104) ─────────────────────────────────
// Free TEXT splits on commas AND whitespace — "CODE123, CODE001" or
// "CODE123 CODE001" are both a list of codes. CHIP values split on commas
// ONLY: a committed value like "New York" is one value with a space in it,
// while "091000, 091001" is a two-value list (GS-12 multi-value precedent).
export function tokenizeText(text) {
  return (text || '').trim().toLowerCase().split(/[\s,]+/).filter(Boolean)
}
export function tokenizeChipValue(value) {
  return (value || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean)
}

// AND predicate for a single chip against a row (substring on chip.dataKey).
// A multi-value chip ("Order #: 091000, 091001") is an IN-list — the field
// matches ANY of its values (GS-12: multi-value within ONE attribute is OR;
// a scalar field can't equal two values at once). Chips flagged `exact`
// (count-like fields) require full equality per value — "2" must not match 12.
export function matchesChip(row, chip) {
  const needles = tokenizeChipValue(chip.queryValue)
  if (!needles.length) needles.push('') // empty chip: matches any non-null field
  if (chip.exact) {
    const field = row[chip.dataKey]
    return field != null && needles.some((n) => String(field).toLowerCase() === n)
  }
  return needles.some((n) => fieldIncludes(row[chip.dataKey], n))
}

// Free-text predicate for ONE needle (phrase semantics): OR across
// FREE_TEXT_KEYS. Multi-code queries go through textNeedles/matchesAnyNeedle.
export function matchesFreeText(row, text) {
  const q = (text || '').trim().toLowerCase()
  if (!q) return true
  return FREE_TEXT_KEYS.some((key) => fieldIncludes(row[key], q))
}

/**
 * Case 9 (GS-20, user-corrected 2026-08-01): how to interpret the typed text —
 * decided ONCE per query against the FULL dataset, then applied everywhere
 * (preview, table, counts) so all surfaces agree.
 *
 *   phrase mode — the whole string matches at least one row → ONE needle.
 *     Protects multi-word values ("Weyerhaeuser Company", spaced cities):
 *     under union semantics, tokenizing a name would flood results with every
 *     row containing "company" anywhere.
 *   code-list mode — the phrase matches NOTHING and tokenizes into ≥2 codes →
 *     one needle per code, rows matching ANY code (union: "show CODE123's
 *     results and CODE223's results", per-code rankings mixed).
 *
 * `rows` must be the FULL dataset (not panel/customer-scoped) so the mode is
 * identical for every consumer. Server-side twin: run the phrase, tokenize on
 * zero hits (spec §4a).
 */
export function textNeedles(rows, text) {
  const q = (text || '').trim().toLowerCase()
  if (!q) return []
  const tokens = tokenizeText(q)
  if (tokens.length < 2) return [q]
  if (rows.some((r) => FREE_TEXT_KEYS.some((k) => fieldIncludes(r[k], q)))) return [q]
  return tokens
}

// Union across needles: the row matches if ANY needle matches ANY free-text
// field. Empty needle list = no text criterion = matches everything.
export function matchesAnyNeedle(row, needles) {
  if (!needles || !needles.length) return true
  return needles.some((n) => FREE_TEXT_KEYS.some((key) => fieldIncludes(row[key], n)))
}

// ── Relevance ordering ─────────────────────────────────────────────────────
// The SAME ordering the results preview shows, so clicking "Show all results"
// lands on a table in the order the user was just looking at (S104). Same
// single-source reasoning as the matcher above: the glimpse and the grid must
// agree by construction, not by two implementations happening to coincide.

// 3 = exact · 2 = starts-with · 1 = contains · 0 = none. `query` must be lowercase.
export function scoreText(text, query) {
  const t = String(text).toLowerCase()
  if (t === query) return 3
  if (t.startsWith(query)) return 2
  if (t.includes(query)) return 1
  return 0
}

// Best score for one field, taking the best element of an array field.
function scoreField(value, query) {
  if (value == null) return 0
  const candidates = Array.isArray(value) ? value.map(String) : [String(value)]
  let best = 0
  for (const c of candidates) {
    best = Math.max(best, scoreText(c, query))
    if (best === 3) break
  }
  return best
}

// Which free-text attribute of THIS row the query matched best. Callers pass the
// attribute pool (progression order) so this module stays domain-agnostic.
// Iterating in progression order means the first exact hit is also the
// highest-priority one — hence the early return.
export function resolveBestMatch(row, query, attrs) {
  let best = null
  for (let order = 0; order < attrs.length; order++) {
    const attr = attrs[order]
    const val = row[attr.dataKey]
    if (val == null) continue
    const candidates = Array.isArray(val) ? val.map(String) : [String(val)]
    for (const c of candidates) {
      const score = scoreText(c, query)
      if (score > (best?.score ?? 0)) best = { attr, order, score, value: c }
      if (best?.score === 3) return best
    }
  }
  return best
}

/**
 * Multi-code resolution under UNION semantics (Case 9, GS-20 as corrected
 * 2026-08-01). Each row is resolved against EVERY needle and keeps its OWN best
 * match — so in a `CODE123 CODE223` search the CODE123 rows label themselves
 * `Order #CODE123` and the CODE223 rows label themselves `Buy Shipment #CODE223`,
 * and the two rankings interleave by match quality.
 *
 * This is the difference from the AND reading: there is no "leading code" that
 * every row must share, because a row need only match ONE of the codes.
 */
export function resolveBestMatchNeedles(row, needles, attrs) {
  let best = null
  for (const n of needles) {
    const m = resolveBestMatch(row, n, attrs)
    if (m && m.score > (best?.score ?? 0)) best = m
    if (best?.score === 3) break
  }
  return best
}

/**
 * Comparator ordering rows exactly as the results preview does, or null when the
 * criteria carry no relevance signal (chips with no value, or nothing typed) —
 * callers leave the natural order alone in that case.
 *
 * - Leading chip present → rank by how well its value matches that chip's field.
 * - Free text only       → rank by each row's OWN best-matching needle, so under
 *                          multi-code union the per-code rankings interleave by
 *                          quality (GS-20). Progression order breaks ties.
 *
 * `needles` comes from `textNeedles(fullDataset, text)` — pass the same array the
 * filter used, or omit it for phrase mode.
 */
export function compareByCriteria(criteria, attrs, needles) {
  const text = (criteria?.text || '').trim().toLowerCase()
  const lead = criteria?.chips?.[0]
  const leadValue = (lead?.queryValue || '').toLowerCase()

  if (lead && leadValue) {
    return (a, b) => scoreField(b[lead.dataKey], leadValue) - scoreField(a[lead.dataKey], leadValue)
  }
  if (!lead && text) {
    const ns = needles?.length ? needles : [text]
    return (a, b) => {
      const ma = resolveBestMatchNeedles(a, ns, attrs)
      const mb = resolveBestMatchNeedles(b, ns, attrs)
      return (mb?.score ?? 0) - (ma?.score ?? 0) || (ma?.order ?? 99) - (mb?.order ?? 99)
    }
  }
  return null
}

// True when a committed criteria object carries anything to match on.
export function hasCriteria(criteria) {
  if (!criteria) return false
  return (criteria.chips?.length ?? 0) > 0 || !!(criteria.text || '').trim()
}

/**
 * Full criteria predicate: every chip matches AND the text matches.
 * Empty criteria match everything (callers gate with hasCriteria for clarity).
 *
 * `needles` (optional) is the resolved text interpretation from
 * `textNeedles(fullDataset, text)`. Computed ONCE per query by the caller —
 * phrase-vs-code-list is a property of the QUERY against the whole dataset, not
 * of the row being tested, so it must not be re-derived per row. Omitted =
 * phrase mode (the pre-multi-code behavior).
 */
export function matchesCriteria(row, criteria, needles) {
  if (!hasCriteria(criteria)) return true
  const chips = criteria.chips || []
  const textOk = needles?.length
    ? matchesAnyNeedle(row, needles)
    : matchesFreeText(row, criteria.text)
  return textOk && chips.every((chip) => matchesChip(row, chip))
}
