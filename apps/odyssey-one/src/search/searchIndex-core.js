/**
 * Search index core — the lightweight "sub-DB" that ranks attribute suggestions
 * by how well a typed query matches REAL values of a field.
 *
 * Domain-agnostic half of what was `shipments/searchIndex.js`, extracted when
 * Orders needed the same thing (S130). Same split as `criteria-core.js` and its
 * per-domain `criteria.js` bindings — one implementation, one behaviour, two
 * domains that cannot drift apart.
 *
 * Each attribute's DISTINCT value set is built lazily and memoized, so a
 * keystroke consults only the fields it needs and never rescans the whole
 * dataset. In the real architecture this stands in for a per-domain suggestions
 * API — the adapter hides whether ranking came from here or from a service.
 */

/**
 * Match `query` against a field's distinct values. Returns the best score + up
 * to 5 sample matching values (original case, for logging):
 *   3 = a value equals the query exactly (case-insensitive) — typing the whole
 *       identifier; discriminates the one entity from its prefix-siblings.
 *   2 = a value starts with the query with EXACT case.
 *   1 = a value starts with the query only case-INSENSITIVELY ("HUNT" vs
 *       "Huntsman").
 *   0 = no prefix/exact match → the caller hides the attribute.
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
 * An index bound to one row source. `getRows` is called lazily, per attribute,
 * the first time that attribute is asked about.
 *
 * ponytail: the per-attribute distinct set is cached for the process lifetime —
 * correct for a static seed, stale if rows are created at runtime. Call
 * `clear()` from whatever mutates the source if that ever becomes real.
 */
export function createSearchIndex(getRows) {
  const distinctCache = new Map()

  function distinctValues(dataKey) {
    if (distinctCache.has(dataKey)) return distinctCache.get(dataKey)
    const set = new Set()
    for (const row of getRows()) {
      const raw = row[dataKey]
      if (raw == null) continue
      if (Array.isArray(raw)) raw.forEach((v) => set.add(String(v)))
      else set.add(String(raw))
    }
    const arr = [...set]
    distinctCache.set(dataKey, arr)
    return arr
  }

  return {
    /**
     * Distinct values for one attribute whose text starts with `query`
     * (case-insensitive; empty query → the first `limit` values). Feeds the
     * Filters view's ComboBox controls.
     */
    distinctMatches(dataKey, query, limit = 50) {
      const q = (query || '').trim().toLowerCase()
      const out = []
      for (const v of distinctValues(dataKey)) {
        if (!q || v.toLowerCase().startsWith(q)) {
          out.push(v)
          if (out.length >= limit) break
        }
      }
      return out
    },

    valueMatchScore(dataKey, query) {
      return matchInfo(distinctValues(dataKey), query).score
    },

    /** Score + sample matching values — used by the adapters' debug log. */
    valueMatchDetail(dataKey, query) {
      return matchInfo(distinctValues(dataKey), query)
    },

    clear() {
      distinctCache.clear()
    },
  }
}
