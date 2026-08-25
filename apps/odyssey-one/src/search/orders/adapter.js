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
 *  · ~~The Case-12 date carve-out.~~ **Ported S131** (user ruling: typing "1/"
 *    and picking a date chip must open a calendar in the bar, "just like it is
 *    in shipments"). The machinery moved to `../adapter-core` rather than being
 *    copied — see `dateItems` there.
 *  · Customer scoping (`customerIds`). Shipments' glimpse is customer-scoped;
 *    the Orders grid has no equivalent scope selector.
 */
import { getAllOrders } from '../../data/orders'
import { ORDERS_ATTRIBUTES, ORDERS_PROGRESSION, orderSearchRow } from './progression'
import { ORDER_STATUS_VARIANT } from './registry'
import { valueMatchDetail, distinctMatches } from './searchIndex'
import { toItem, nextProgressionGroup, dateItems, DATE_LIKE } from '../adapter-core'
// Same matcher the Shipments glimpse uses, bound to the Orders free-text keys —
// so the preview shows exactly what committing the criteria will filter to.
import {
  matchesAnyNeedle, textNeedles, resolveBestMatchNeedles, scoreText,
  ORDERS_FREE_TEXT_ATTRS,
} from './criteria'
// `matchesChip` is free-text-key-independent, so it comes straight from the core
// rather than through a domain binding that has nothing to bind.
import { matchesChip } from '../criteria-core'

// The date-typed attributes (Latest Pickup / Latest Delivery / Created / Last
// Edit) — what Case 12 offers when the typed text looks like a date.
const ORDERS_DATE_ATTRS = ORDERS_ATTRIBUTES.filter((a) => a.match === 'date')

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
    // The meta line, Orders' own (S131). Same three-identifier shape Shipments
    // uses (Customer | Carrier | BOL) with the fields an ORDER actually has:
    // the customer's own reference and what it needs to move. An order has no
    // carrier and no BOL until it is planned into a shipment.
    meta: [
      { label: 'Customer', value: row.customer || '—' },
      { label: 'PO #', value: row.poNumber || '—' },
      { label: 'Equipment', value: row.equipment || '—' },
    ],
    iconType: 'package',
    source: statusBadge(row),
    // What OPENING this row does (S131). The rule itself lives with the grid's
    // own action rules (`primaryRowAction`, ordersColumns.jsx) — the row just
    // carries the state it reads, as `data-*` so MatchRow's prop spread puts
    // valid attributes on the DOM (the `data-shipment-key` precedent).
    'data-order-status': row.orderStatus || '',
    'data-draft-status': row.draftOrderStatus || '',
    'data-order-source': row.orderSource || '',
    'data-error-count': row.errorCount ?? '',
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

    // Date-like input ("1/", "1/5", "1/5/2026") → the date + range chips lead
    // (Case 12, S131). Committing one gives the expanded calendar chip, so the
    // day is picked in the bar before the criteria are submitted. A COMPLETE
    // typed date still reaches the value-ranking path below through the chip's
    // pre-filled bound, so nothing that used to work stops working.
    if (DATE_LIKE.test(q)) {
      return [{ title: 'Filter by date', items: dateItems(q, ORDERS_DATE_ATTRS) }]
    }

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
  async search(chips, query = '', customerIds) {
    const q = (query || '').trim().toLowerCase()
    const chipList = chips || []
    if (!chipList.length && !q) return { results: [], total: 0 }

    // The navbar customer scope, the grid's FIRST-order filter (S79c decision
    // 10). Without it the preview counts customers the table won't show —
    // `undefined` = unscoped, `[]` honestly yields nothing.
    const all = customerIds
      ? projectedOrders().filter((r) => customerIds.includes(r.customer))
      : projectedOrders()
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

/**
 * Raw order rows → preview rows, shared with the LIVE adapter (S131).
 *
 * The live path gets its rows from the order-list API and must render them
 * IDENTICALLY — same labels, same badge, same route line — so the mapping is
 * imported, never rewritten. The rows arrive already filtered and ranked by the
 * server; this only decides what each row's bold value says.
 */
export function toPreviewRows(rows, chipList = [], query = '') {
  const projected = rows.map((r) => ({ ...orderSearchRow(r), _raw: r }))
  const lead = chipList[0]
  if (lead) {
    const leadAttr = ORDERS_ATTRIBUTES.find((a) => a.key === lead.key) ?? null
    return projected.map((row) => buildOrderRow(row, leadAttr, String(row[lead.dataKey] ?? '')))
  }
  const needles = [String(query || '').trim().toLowerCase()].filter(Boolean)
  return projected.map((row) => {
    const m = needles.length ? resolveBestMatchNeedles(row, needles, ORDERS_FREE_TEXT_ATTRS) : null
    return buildOrderRow(row, m?.attr ?? null, m?.value ?? '')
  })
}
