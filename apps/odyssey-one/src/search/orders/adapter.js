/**
 * Orders search adapter — the domain seam `useGlobalSearch` talks to, twin of
 * `shipments/adapter.js` (S130: "make the orders search+filters+saved filters
 * be parallel in functionality with the shipments one").
 *
 * Read the Shipments adapter's header first. This one records only what differs.
 *
 * The contract:
 *   getInitial(chips)        → entry-point / drill-forward attribute items
 *   getSuggestions(query)    → attribute items whose REAL values match the input
 *   search(chips, query)     → { results, total } for the preview panel
 *   getAttributeValues(k, q) → distinct values for one attribute (Filters panel)
 *
 * Every method is async so swapping this local (seed JSON) implementation for a
 * real suggestions/search API is invisible to the UI — the same promise the
 * Shipments adapter made before its live twin existed.
 *
 * ── Rows are PROJECTED, never raw ──────────────────────────────────────────
 * Both the index and the matcher read `orderSearchRow(row)` (see
 * progression.js): an order row is not flat, and index and matcher MUST see the
 * same values, or a suggestion could offer an attribute the search then fails to
 * match. `_raw` is carried through so a result row can still reach fields the
 * projection flattens (the consignor object for the route line).
 *
 * ── Deliberately NOT ported from Shipments (yet) ───────────────────────────
 *  · resolveCodeSet / validateCodes — the GS-21 multi-code SET chip. The hook
 *    treats both as optional (`adapter?.resolveCodeSet`), so the bar degrades to
 *    a plain free-text badge, which is exactly what Orders does today.
 *  · The Case-12 date carve-out (a slashed partial like "5/" offering date +
 *    range chips). Orders needs no special case for a COMPLETE date: the
 *    projection stores dates as "5/29/2026", so a typed date matches the date
 *    attributes through the ordinary value-ranking path below. Only PARTIALS
 *    are unserved.
 *  · Customer scoping (`customerIds`). Shipments' glimpse is customer-scoped;
 *    the Orders grid has no equivalent scope selector.
 */
import { getAllOrders } from '../../data/orders'
import { ORDERS_ATTRIBUTES, ORDERS_PROGRESSION, orderSearchRow } from './progression'
import { ORDER_STATUS_VARIANT } from './registry'
import { valueMatchDetail, distinctMatches } from './searchIndex'
import { toItem, nextProgressionGroup } from '../adapter-core'
// Same matcher the Shipments glimpse uses, bound to the Orders free-text keys —
// so the preview shows exactly what committing the criteria will filter to.
import {
  matchesAnyNeedle, textNeedles, resolveBestMatchNeedles, scoreText,
  ORDERS_FREE_TEXT_ATTRS,
} from './criteria'
// `matchesChip` is free-text-key-independent, so it comes straight from the core
// rather than through a domain binding that has nothing to bind.
import { matchesChip } from '../criteria-core'

// The projected rows, memoized on source length — same reasoning as
// searchIndex.js's cache (a mock-created order must not stay invisible).
let cached = { len: -1, rows: [] }
function projectedOrders() {
  const all = getAllOrders()
  if (cached.len !== all.length) cached = { len: all.length, rows: all.map((r) => ({ ...orderSearchRow(r), _raw: r })) }
  return cached.rows
}

// "Order Number" + "0000000091000" → "Order Number 0000000091000". Same rule as
// Shipments' labelMatch: a label already ending in '#' gets no separator.
export function labelMatch(attr, value) {
  return attr.label.endsWith('#') ? `${attr.label}${value}` : `${attr.label} ${value}`
}

// The route line under a result row. The full projected location carries the
// facility name too, which is too long for one line here.
const shortLocation = (loc) => [loc?.city, loc?.state].filter(Boolean).join(', ') || '—'

function statusBadge(row) {
  const label = row.orderStatus || '—'
  return { label, variant: ORDER_STATUS_VARIANT[label] ?? 'gray' }
}

/**
 * One result row. `data-attr` is the attribute that MATCHED — the preview's
 * bold value comes from it, and it is what a landing-tab rule would read (the
 * Shipments twin of that is `panelForResults`; Orders' tab rule arrives with the
 * wiring, so nothing consumes this field yet).
 */
function buildOrderRow(row, attr, value) {
  return {
    id: row.orderNumber,
    'data-attr': attr?.key ?? 'order-number',
    matchId: attr ? labelMatch(attr, value) : row.orderNumber,
    route: `${shortLocation(row._raw?.consignor)} → ${shortLocation(row._raw?.consignee)}`,
    customer: row.customer,
    iconType: 'package',
    source: statusBadge(row),
  }
}

/**
 * The value a suggestion should COMMIT, which is not always the text typed.
 *
 * An `exact` enum only ever matches a whole catalog value, so committing the
 * partial the user typed ("O") would produce a chip that matches nothing. When
 * the partial resolves to exactly ONE catalog value, commit that value instead
 * ("Outbound"); ambiguity falls back to the typed text rather than guessing.
 * Non-enum attributes are substring-matched, so the typed text is already the
 * right criterion.
 */
function chipValueFor({ attr, samples }, typed) {
  if (attr.match !== 'enum' || !attr.exact) return typed
  const distinct = [...new Set(samples)]
  return distinct.length === 1 ? distinct[0] : typed
}

export const ordersSearchAdapter = {
  /**
   * Value suggestions for ONE attribute — feeds the Filters panel's ComboBox
   * controls. `registry.getOrdersAttributeValues` still serves the PANEL (it is
   * paged and knows the location triple format); this is the bar-side contract
   * method, kept so the adapter satisfies the same shape Shipments' does.
   */
  async getAttributeValues(dataKey, query) {
    return distinctMatches(dataKey, query)
  },

  /**
   * Empty-input suggestions. No chips → NOTHING (the S104 rule the Shipments
   * bar settled on: an untouched bar suggests nothing). With chips → the NEXT
   * progression group, drilling forward.
   */
  async getInitial(chips = []) {
    if (!chips.length) return []
    const group = nextProgressionGroup(ORDERS_PROGRESSION, chips)
    if (!group) return []
    const committed = new Set(chips.map((c) => c.key))
    const items = group.attributes
      .filter((a) => !committed.has(a.key))
      .map((a) => toItem({ ...a, group: group.group }, null))
    return items.length ? [{ title: group.label, items }] : []
  },

  /**
   * "What is it?" — the attributes whose real values match what was typed,
   * ranked 3/2/1 (exact / case-exact prefix / loose prefix), progression order
   * breaking ties. No type gate: numbers never prefix "WEYERH" and text never
   * prefixes "91000", so type discrimination falls out of the value match.
   */
  async getSuggestions(query) {
    const q = (query || '').trim()
    if (!q) return this.getInitial()

    const scored = ORDERS_ATTRIBUTES
      .map((attr, order) => ({ attr, order, ...valueMatchDetail(attr.dataKey, q) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || a.order - b.order)

    if (scored.length) {
      return [{ title: 'What is it?', items: scored.map((s) => toItem(s.attr, chipValueFor(s, q))) }]
    }

    // Multi-code: the whole string matched nothing, but it may be a LIST. An
    // attribute is offered only when EVERY code matches real values of it — the
    // chip is then an IN-list. One code resolving elsewhere → no suggestion,
    // the query stays free text (the Shipments rule, verbatim).
    const tokens = q.split(/[\s,]+/).filter(Boolean)
    if (tokens.length >= 2) {
      const common = ORDERS_ATTRIBUTES
        .map((attr, order) => {
          const details = tokens.map((t) => valueMatchDetail(attr.dataKey, t))
          if (details.some((d) => d.score === 0)) return null
          // The weakest code's score is the honest rank for the whole list.
          return { attr, order, score: Math.min(...details.map((d) => d.score)) }
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || a.order - b.order)
      if (common.length) {
        const listValue = tokens.join(', ')
        return [{ title: 'What is it?', items: common.map((s) => toItem(s.attr, listValue)) }]
      }
    }
    return []
  },

  /**
   * Composed-criteria search: every chip ANDs, and the uncommitted free text
   * (if any) ANDs on top, matched OR-wise across the free-text keys.
   *
   * One row per ORDER — there is no second entity to explode into, so the
   * Shipments order-explosion branch has no counterpart here.
   */
  async search(chips, query = '') {
    const q = (query || '').trim().toLowerCase()
    const chipList = chips || []
    if (!chipList.length && !q) return { results: [], total: 0 }

    const all = projectedOrders()
    // The phrase-vs-code-list decision is made ONCE against the full dataset
    // (GS-20), not per row, so every surface reads the query the same way.
    const needles = textNeedles(all, q)
    const matched = all.filter(
      (row) => matchesAnyNeedle(row, needles) && chipList.every((chip) => matchesChip(row, chip)),
    )

    // Bare code, no chips: each row resolves its OWN best-matching attribute, so
    // a pasted customer code reads "Customer WEYERH_01" rather than being
    // silently relabelled with the order number.
    if (!chipList.length && q) {
      const resolved = matched
        .map((row) => ({ row, m: resolveBestMatchNeedles(row, needles, ORDERS_FREE_TEXT_ATTRS) }))
        .filter((r) => r.m)
        .sort((a, b) => b.m.score - a.m.score || a.m.order - b.m.order)
      return {
        results: resolved.slice(0, 15).map(({ row, m }) => buildOrderRow(row, m.attr, m.value)),
        total: matched.length,
      }
    }

    // Chips present: the LEADING chip names the field the bold value comes from
    // and the field results are ranked by, exactly as in Shipments.
    const lead = chipList[0]
    const leadAttr = ORDERS_ATTRIBUTES.find((a) => a.key === lead.key) ?? null
    const leadQuery = String(lead.queryValue ?? '').toLowerCase()
    const sorted = leadQuery
      ? [...matched].sort((a, b) =>
          scoreText(String(b[lead.dataKey] ?? ''), leadQuery) -
          scoreText(String(a[lead.dataKey] ?? ''), leadQuery))
      : matched
    return {
      results: sorted.slice(0, 15).map((row) => buildOrderRow(row, leadAttr, String(row[lead.dataKey] ?? ''))),
      total: matched.length,
    }
  },
}
