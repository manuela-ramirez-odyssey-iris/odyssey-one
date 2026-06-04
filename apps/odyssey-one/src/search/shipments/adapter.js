import { getAllShipments } from '../../data'
import { SHIPMENTS_ATTRIBUTES } from './progression'
import { valueMatchDetail } from './searchIndex'

// Parse "Phoenix AZ US 85001" → "Phoenix, AZ"
function formatLocation(str) {
  if (!str) return ''
  const base = str.split(' US ')[0].trim()
  const parts = base.split(' ')
  const state = parts.pop()
  const city = parts.join(' ')
  return city ? `${city}, ${state}` : state
}

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

function toItem(attr, queryValue) {
  const label = queryValue ? `${attr.label}: ${queryValue}` : attr.label
  return {
    key: attr.key,
    label,
    attrLabel: attr.label,
    queryValue: queryValue || null,
    group: attr.group,
    dataKey: attr.dataKey,
    kind: 'attribute',
  }
}

export const shipmentsSearchAdapter = {
  // Returns ALL attributes (not capped) so the hook can filter committed ones
  // then slice to its INITIAL_COUNT, naturally walking down the progression.
  async getInitial() {
    const items = SHIPMENTS_ATTRIBUTES.map((a) => toItem(a, null))
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
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || a.order - b.order)

    if (DEBUG_SEARCH) {
      console.groupCollapsed(`🔎 FilterSuggestions "${q}" — ${scored.length} chips`)
      console.table(
        scored.map((s) => ({
          attribute: s.attr.label,
          score: s.score,
          matched: s.samples.join(', '),
        })),
      )
      console.groupEnd()
    }

    return [{ title: 'Suggested Filters', items: scored.map((s) => toItem(s.attr, q)) }]
  },

  // AND-filter all committed chip criteria; return up to 15 results + total count.
  async searchShipments(chips) {
    if (!chips || !chips.length) return { results: [], total: 0 }
    const all = getAllShipments()
    const matching = all.filter((s) =>
      chips.every((chip) => {
        const field = s[chip.dataKey]
        if (field == null) return false
        const str = (Array.isArray(field) ? field.join(' ') : String(field)).toLowerCase()
        return str.includes((chip.queryValue || '').toLowerCase())
      }),
    )
    const total = matching.length
    const results = matching.slice(0, 15).map((s) => ({
      id: s.buyShipment,
      matchId: s.buyShipment,
      route: `${formatLocation(s.origin)} → ${formatLocation(s.destination)}`,
      customer: s.customerName,
      carrier: s.scac,
      bol: s.pro,
      source: toStatusBadge(s),
    }))
    return { results, total }
  },
}

function toStatusBadge(s) {
  if (s.tenderStatus === 'Sent') return { label: 'Sent', variant: 'blue' }
  if (s.shipmentStatus === 'Done') return { label: 'Done', variant: 'green' }
  if (s.shipmentStatus === 'Review') return { label: 'Review', variant: 'amber' }
  return { label: s.shipmentStatus || '—', variant: 'gray' }
}
