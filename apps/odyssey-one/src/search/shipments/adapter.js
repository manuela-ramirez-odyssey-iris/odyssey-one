import { SHIPMENTS_ATTRIBUTES } from './progression'
import { valueMatchDetail } from './searchIndex'

// Logs a per-query table of attributes (score + matching values) so you can see
// WHY each chip is suggested. On in dev, silent in production builds.
const DEBUG_SEARCH = !!(import.meta.env && import.meta.env.DEV)

/**
 * shipmentsSearchAdapter — the Shipments implementation of the domain-agnostic
 * search contract consumed by `useGlobalSearch`. Same two methods every domain's
 * adapter implements; only the data + business logic differ.
 *
 *   getInitial()        → entry-point attribute chips for an empty, focused bar
 *   getSuggestions(q)   → attribute chips whose REAL values match what's typed
 *
 * Both are async so the swap from this local (config + fake-DB) implementation to
 * a real per-domain suggestions API is invisible to the UI.
 *
 * Ranking is purely value-driven (via the search index): an attribute is shown
 * only if at least one of its values matches the query, scored 3/2/1 (exact /
 * case-exact prefix / case-insensitive prefix). No coarse type gate — numbers
 * never prefix "HUNT" and text never prefixes "234", so type discrimination
 * falls out of the value match itself. Progression order breaks score ties.
 *
 * SCOPE (today): attribute suggestions only — the first FilterSuggestions panel.
 * The VALUE chips (a second section, same index) feed the SECOND panel on chip
 * select; pending its own normalization (seam marked below).
 */

const INITIAL_COUNT = 5

function toItem(attr) {
  return { key: attr.key, label: attr.label, group: attr.group, dataKey: attr.dataKey, kind: 'attribute' }
}

export const shipmentsSearchAdapter = {
  async getInitial() {
    const items = SHIPMENTS_ATTRIBUTES.slice(0, INITIAL_COUNT).map(toItem)
    return [{ title: 'Suggested Filters', items }]
  },

  async getSuggestions(query) {
    const q = (query || '').trim()
    if (!q) return this.getInitial()

    const scored = SHIPMENTS_ATTRIBUTES
      .map((attr, order) => {
        const { score, samples } = valueMatchDetail(attr.dataKey, q)
        return { attr, order, score, samples }
      })
      .filter((s) => s.score > 0) // hide attributes whose values don't match at all
      .sort((a, b) => b.score - a.score || a.order - b.order)

    if (DEBUG_SEARCH) {
      console.groupCollapsed(`🔎 FilterSuggestions "${q}" — ${scored.length} chips`)
      console.table(
        scored.map((s) => ({
          attribute: s.attr.label,
          score: s.score, // 3 = exact, 2 = case-exact prefix, 1 = case-insensitive prefix
          matched: s.samples.join(', '),
        })),
      )
      console.groupEnd()
    }

    return [{ title: 'Suggested Filters', items: scored.map((s) => toItem(s.attr)) }]

    // FUTURE — a second section of VALUE chips (Origin: Bastrop, LA …) sourced from
    // the same index, populating the SECOND panel on chip select (not the table).
  },
}
