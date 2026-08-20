/**
 * Domain-agnostic search-criteria core.
 *
 * Extracted from `search/shipments/criteria.js` (S79c → S128) when Orders
 * needed the SAME text semantics: identical matching, identical multi-code
 * union, identical relevance ordering. The alternative was a second
 * implementation that "should" behave the same — exactly the drift this module
 * exists to prevent, since the whole point of the original extraction was that
 * the glimpse total and the table total agree BY CONSTRUCTION.
 *
 * The only thing a domain supplies is `keys` — which row fields free text
 * searches. `search/shipments/criteria.js` re-exports every one of these with
 * its own FREE_TEXT_KEYS bound, so Shipments call sites are unchanged; Orders
 * binds its own list in `search/orders/criteria.js`.
 *
 * Semantics (unchanged from the Shipments original):
 * - Chips are ANDed; each chip is a case-insensitive SUBSTRING match against
 *   its `dataKey` field (arrays joined with spaces; a null field never matches,
 *   even for an empty queryValue).
 * - Free text is ANDed with the chips and ORed across `keys`.
 */

// Case-insensitive substring test against one field (arrays joined with spaces).
export function fieldIncludes(field, needle) {
  if (field == null) return false
  const str = (Array.isArray(field) ? field.join(' ') : String(field)).toLowerCase()
  return str.includes(needle)
}

// ── Multi-code tokenization ────────────────────────────────────────────────
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

// Parse "M/D/YYYY" (any padding; time/zone suffix like "05/08/2026 06:30 CDT"
// ignored). Returns a local-midnight Date, or null for anything incomplete —
// a partial "2/3" is a suggestion trigger, never a comparable value.
export function parseSearchDate(value) {
  const m = String(value ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return null
  const d = new Date(+m[3], +m[1] - 1, +m[2])
  return d.getMonth() === +m[1] - 1 && d.getDate() === +m[2] ? d : null
}

// AND predicate for a single chip against a row (substring on chip.dataKey).
// A multi-value chip ("Order #: 091000, 091001") is an IN-list — the field
// matches ANY of its values (GS-12: multi-value within ONE attribute is OR;
// a scalar field can't equal two values at once). Chips flagged `exact`
// (count-like fields) require full equality per value — "2" must not match 12.
// A `kind: 'date-range'` chip compares CALENDAR DAYS instead of substrings:
// inclusive between from/to; a missing bound leaves that side open; a single-date
// chip carries from === to. An unparseable/incomplete bound is treated as absent
// so a half-built range still previews.
export function matchesChip(row, chip) {
  if (chip.kind === 'date-range') {
    const d = parseSearchDate(row[chip.dataKey])
    if (!d) return false
    const from = parseSearchDate(chip.from)
    const to = parseSearchDate(chip.to)
    if (!from && !to) return true // nothing picked yet — no narrowing
    return (!from || d >= from) && (!to || d <= to)
  }
  const needles = tokenizeChipValue(chip.queryValue)
  if (!needles.length) needles.push('') // empty chip: matches any non-null field
  if (chip.exact) {
    const field = row[chip.dataKey]
    return field != null && needles.some((n) => String(field).toLowerCase() === n)
  }
  return needles.some((n) => fieldIncludes(row[chip.dataKey], n))
}

// Free-text predicate for ONE needle (phrase semantics): OR across `keys`.
// Multi-code queries go through textNeedles/matchesAnyNeedle.
export function matchesFreeText(row, text, keys) {
  const q = (text || '').trim().toLowerCase()
  if (!q) return true
  return keys.some((key) => fieldIncludes(row[key], q))
}

/**
 * How to interpret the typed text — decided ONCE per query against the FULL
 * dataset, then applied everywhere (preview, table, counts) so all surfaces
 * agree.
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
 * zero hits.
 */
export function textNeedles(rows, text, keys) {
  const q = (text || '').trim().toLowerCase()
  if (!q) return []
  const tokens = tokenizeText(q)
  if (tokens.length < 2) return [q]
  if (rows.some((r) => keys.some((k) => fieldIncludes(r[k], q)))) return [q]
  return tokens
}

// Union across needles: the row matches if ANY needle matches ANY free-text
// field. Empty needle list = no text criterion = matches everything.
export function matchesAnyNeedle(row, needles, keys) {
  if (!needles || !needles.length) return true
  return needles.some((n) => keys.some((key) => fieldIncludes(row[key], n)))
}

// ── Relevance ordering ─────────────────────────────────────────────────────
// The SAME ordering the results preview shows, so clicking "Show all results"
// lands on a table in the order the user was just looking at.

// 3 = exact · 2 = starts-with · 1 = contains · 0 = none. `query` must be lowercase.
export function scoreText(text, query) {
  const t = String(text).toLowerCase()
  if (t === query) return 3
  if (t.startsWith(query)) return 2
  if (t.includes(query)) return 1
  return 0
}

// Best score for one field, taking the best element of an array field.
export function scoreField(value, query) {
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
 * Multi-code resolution under UNION semantics. Each row is resolved against
 * EVERY needle and keeps its OWN best match — so in a `CODE123 CODE223` search
 * the CODE123 rows label themselves `Order #CODE123` and the CODE223 rows label
 * themselves `Buy Shipment #CODE223`, and the two rankings interleave by match
 * quality. This is the difference from the AND reading: there is no "leading
 * code" every row must share, because a row need only match ONE of the codes.
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
 *                          quality. Progression order breaks ties.
 *
 * `needles` comes from `textNeedles(fullDataset, text, keys)` — pass the same
 * array the filter used, or omit it for phrase mode.
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
 * `textNeedles(fullDataset, text, keys)`. Computed ONCE per query by the
 * caller — phrase-vs-code-list is a property of the QUERY against the whole
 * dataset, not of the row being tested, so it must not be re-derived per row.
 * Omitted = phrase mode.
 */
export function matchesCriteria(row, criteria, needles, keys) {
  if (!hasCriteria(criteria)) return true
  const chips = criteria.chips || []
  const textOk = needles?.length
    ? matchesAnyNeedle(row, needles, keys)
    : matchesFreeText(row, criteria.text, keys)
  return textOk && chips.every((chip) => matchesChip(row, chip))
}
