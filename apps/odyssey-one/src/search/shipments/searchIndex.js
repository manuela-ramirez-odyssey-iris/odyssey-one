import { getAllShipments } from '../../data'

/**
 * Search index — the lightweight "sub-DB" for suggestion ranking. Builds, lazily
 * and per attribute (header), the DISTINCT values for that field from the fake
 * JSON DB. Lets us rank attribute suggestions by how well the typed query matches
 * REAL values, without scanning the full DB on every keystroke: each header's
 * distinct set is built once then memoized, and only the candidate headers for
 * the current input class are ever consulted.
 *
 * In the real architecture this stands in for a per-domain suggestions API — the
 * adapter hides whether ranking comes from this local index or a remote service.
 */
const distinctCache = new Map()

function distinctValues(dataKey) {
  if (distinctCache.has(dataKey)) return distinctCache.get(dataKey)
  const set = new Set()
  for (const s of getAllShipments()) {
    const raw = s[dataKey]
    if (raw == null) continue
    if (Array.isArray(raw)) raw.forEach((v) => set.add(String(v)))
    else set.add(String(raw))
  }
  const arr = [...set]
  distinctCache.set(dataKey, arr)
  return arr
}

/**
 * Match `query` against a header's distinct values. Returns the best score +
 * sample matching values (original case, for logging):
 *   3 = a value equals the query exactly (full match, case-insensitive) — typing
 *       the whole identifier; discriminates the one entity from prefix-siblings.
 *   2 = a value starts with the query with EXACT case (case-sensitive prefix).
 *   1 = a value starts with the query only case-INSENSITIVELY (case differs,
 *       e.g. "HUNT" vs "Huntsman").
 *   0 = no prefix/exact match → caller hides the attribute.
 */
function matchInfo(values, query) {
  const raw = (query || '').trim()
  if (!raw) return { score: 0, samples: [] }
  const q = raw.toLowerCase()
  const exact = []
  const casePrefix = []
  const loosePrefix = []
  for (const v of values) {
    const vl = v.toLowerCase()
    if (vl === q) exact.push(v)
    else if (v.startsWith(raw)) casePrefix.push(v)
    else if (vl.startsWith(q)) loosePrefix.push(v)
  }
  if (exact.length) return { score: 3, samples: exact.slice(0, 5) }
  if (casePrefix.length) return { score: 2, samples: casePrefix.slice(0, 5) }
  if (loosePrefix.length) return { score: 1, samples: loosePrefix.slice(0, 5) }
  return { score: 0, samples: [] }
}

/**
 * Distinct values for one attribute whose text starts with `query`
 * (case-insensitive; empty query → the first `limit` values). Feeds the
 * Filters view's ComboBox controls (S107) — same memoized index, so a
 * keystroke never rescans the DB.
 */
export function distinctMatches(dataKey, query, limit = 50) {
  const q = (query || '').trim().toLowerCase()
  const out = []
  for (const v of distinctValues(dataKey)) {
    if (!q || v.toLowerCase().startsWith(q)) {
      out.push(v)
      if (out.length >= limit) break
    }
  }
  return out
}

export function valueMatchScore(dataKey, query) {
  return matchInfo(distinctValues(dataKey), query).score
}

/** Score + up to 5 sample matching values — used by the adapter's debug log. */
export function valueMatchDetail(dataKey, query) {
  return matchInfo(distinctValues(dataKey), query)
}
