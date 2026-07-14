import { getAllShipments } from '../../data'
import { SHIPMENTS_ATTRIBUTES, SHIPMENTS_PROGRESSION } from './progression'
import { valueMatchDetail } from './searchIndex'
// Shared chip+text matcher (S79c) — the SAME predicates the grid service applies
// to listParams.searchCriteria, so the glimpse previews exactly what committing
// the criteria will show in the table.
import { matchesChip, matchesFreeText } from './criteria'

// How many entry-point attributes to show when the bar is empty + no chips.
const INITIAL_COUNT = 5

// dataKeys that drive avatar icon overrides in MatchRow
const ORDER_KEYS    = new Set(['orders'])
const CUSTOMER_KEYS = new Set(['customerId', 'customerName', 'consignor', 'consignee'])

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
    ...(attr.exact && { exact: true }),
    kind: 'attribute',
  }
}

export const shipmentsSearchAdapter = {
  // Empty-input suggestions. No chips → entry points (top of the progression).
  // With chips → the NEXT progression GROUP (drill forward; never repeat the
  // entry set; on the last group, stay on it). Suggestions only — typing still
  // matches ANY attribute regardless of group. See composed-criteria.md →
  // "Empty-suggestion progression".
  async getInitial(chips = []) {
    if (!chips.length) {
      const items = SHIPMENTS_ATTRIBUTES.slice(0, INITIAL_COUNT).map((a) => toItem(a, null))
      return [{ title: 'Suggested Filters', items }]
    }
    const group = nextProgressionGroup(chips)
    if (!group) return []
    const committed = new Set(chips.map((c) => c.key))
    const items = group.attributes
      .filter((a) => !committed.has(a.key))
      .map((a) => toItem({ ...a, group: group.group }, null))
    return items.length ? [{ title: group.label, items }] : []
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

  // Composed-criteria search. The LEADING chip (chips[0]) determines the result
  // ENTITY: an order-scoped leading chip returns ORDER rows (a shipment with 3
  // matching orders → 3 rows); anything else returns SHIPMENT rows (1 per
  // shipment). See vault/20-cross-cutting/global-search/composed-criteria.md.
  //
  // `query` (optional) is the UNCOMMITTED free text in the bar — an implicit
  // criterion ANDed with the chips, matched OR-wise across FREE_TEXT_KEYS (same
  // fields the grid service's searchTerm uses). Chips-only calls are unchanged.
  //
  // `customerIds` (optional) is the FIRST-order customer scope (S79c decision
  // 10) — the selected customers' shipment dataIds. Same semantics as the grid
  // service: undefined = unscoped, [] = nothing (honest empty glimpse), so the
  // glimpse total keeps equaling the sum of the scoped panel totals.
  async searchShipments(chips, query = '', customerIds) {
    const q = (query || '').trim().toLowerCase()
    const chipList = chips || []
    if (!chipList.length && !q) return { results: [], total: 0 }

    const all = customerIds
      ? getAllShipments().filter((s) => customerIds.includes(s.customerId))
      : getAllShipments()
    const primaryKey = chipList[0]?.dataKey ?? 'buyShipment'
    // No chips → the free-text query drives relevance ordering instead.
    const primaryQuery = (chipList[0]?.queryValue || (chipList.length ? '' : q)).toLowerCase()

    // Shipment-level AND filter: a shipment qualifies if every chip matches it
    // AND (when present) the free-text query matches any free-text field.
    // (An order-scoped chip "matches" when at least one order contains the value
    // — it narrows which shipments survive; the explosion below picks the exact
    // orders.)
    const shipments = all.filter(
      (s) => matchesFreeText(s, q) && chipList.every((chip) => matchesChip(s, chip)),
    )

    // ---- Order entity: explode each shipment into its matching orders --------
    if (ORDER_KEYS.has(primaryKey)) {
      const orderChips = chipList.filter((c) => ORDER_KEYS.has(c.dataKey))
      const rows = []
      for (const s of shipments) {
        const orders = Array.isArray(s.orders) ? s.orders : []
        for (const ord of orders) {
          const o = String(ord)
          const keep = orderChips.every((c) =>
            o.toLowerCase().includes((c.queryValue || '').toLowerCase()),
          )
          if (keep) rows.push(buildOrderRow(s, o))
        }
      }
      const sorted = primaryQuery
        ? rows.sort((a, b) => scoreText(b.matchId, primaryQuery) - scoreText(a.matchId, primaryQuery))
        : rows
      return { results: sorted.slice(0, 15), total: rows.length }
    }

    // ---- Shipment entity: one row per shipment ------------------------------
    const sorted = primaryQuery
      ? [...shipments].sort((a, b) =>
          scorePrimaryMatch(b, primaryKey, primaryQuery) -
          scorePrimaryMatch(a, primaryKey, primaryQuery),
        )
      : shipments
    const results = sorted.slice(0, 15).map((s) => buildShipmentRow(s, primaryKey, primaryQuery))
    return { results, total: shipments.length }
  },
}

// The progression group to suggest next given committed chips: the group AFTER
// the furthest group any chip belongs to. Past the end → stay on the last group
// (user rule). Skips fully-committed groups so the panel is never empty; if the
// tail is exhausted, falls back to any earlier group with room left.
function nextProgressionGroup(chips) {
  const idxByGroup = new Map(SHIPMENTS_PROGRESSION.map((g, i) => [g.group, i]))
  const maxIdx = chips.reduce((m, c) => Math.max(m, idxByGroup.get(c.group) ?? -1), -1)
  const lastIdx = SHIPMENTS_PROGRESSION.length - 1
  const targetIdx = Math.min(maxIdx + 1, lastIdx)
  const committed = new Set(chips.map((c) => c.key))
  const hasRoom = (g) => g.attributes.some((a) => !committed.has(a.key))

  for (let i = targetIdx; i <= lastIdx; i++) {
    if (hasRoom(SHIPMENTS_PROGRESSION[i])) return SHIPMENTS_PROGRESSION[i]
  }
  for (let i = lastIdx; i >= 0; i--) {
    if (hasRoom(SHIPMENTS_PROGRESSION[i])) return SHIPMENTS_PROGRESSION[i]
  }
  return null
}

// One result row when the result entity is a SHIPMENT.
// `data-shipment-key` = sellShipment — the SELECTION id (ShipmentsRoute's
// setSelectedShipmentId / the table row id / the /details/{id}.json key are all
// keyed by sellShipment). Carried as a data-attribute because MatchRow spreads
// unknown props onto its DOM node (a camelCase extra would warn in dev).
function buildShipmentRow(s, primaryKey, primaryQuery) {
  return {
    id: s.buyShipment,
    'data-shipment-key': s.sellShipment,
    matchId: formatPrimaryField(s, primaryKey, primaryQuery),
    route: `${formatLocation(s.origin)} → ${formatLocation(s.destination)}`,
    customer: s.customerName,
    carrier: s.scac,
    bol: s.pro,
    ...(CUSTOMER_KEYS.has(primaryKey) && { iconType: 'handshake' }),
    source: toStatusBadge(s),
  }
}

// One result row when the result entity is an ORDER. Inherits the parent
// shipment's route/customer/carrier/BOL (only order IDs exist at the main-row
// level — see composed-criteria.md Q3). Bold = order #; badge = tender status.
function buildOrderRow(s, orderId) {
  return {
    id: `${s.buyShipment}-${orderId}`,
    'data-shipment-key': s.sellShipment,
    matchId: orderId,
    route: `${formatLocation(s.origin)} → ${formatLocation(s.destination)}`,
    customer: s.customerName,
    carrier: s.scac,
    bol: s.pro,
    shipmentId: s.buyShipment,
    iconType: 'package',
    source: toTenderBadge(s),
  }
}

// Relevance score for ordering: 3 = exact · 2 = starts-with · 1 = contains · 0 = none.
function scoreText(text, query) {
  const t = String(text).toLowerCase()
  if (t === query) return 3
  if (t.startsWith(query)) return 2
  if (t.includes(query)) return 1
  return 0
}

// Scores a shipment's primary field against the query for result ordering.
// For array fields, takes the best score across all elements.
function scorePrimaryMatch(s, dataKey, query) {
  const val = s[dataKey]
  if (val == null) return 0
  const candidates = Array.isArray(val) ? val.map(String) : [String(val)]
  let best = 0
  for (const c of candidates) {
    best = Math.max(best, scoreText(c, query))
    if (best === 3) break
  }
  return best
}

// Returns the display value for the first chip's field. For arrays (e.g. orders),
// finds the element that contains the query so the matching order ID is shown;
// falls back to the first element. For location fields, normalises to "City, ST".
function formatPrimaryField(s, dataKey, query) {
  const val = s[dataKey]
  if (val == null) return s.buyShipment
  if (dataKey === 'origin' || dataKey === 'destination') return formatLocation(val)
  if (Array.isArray(val)) {
    const match = query
      ? val.find((v) => String(v).toLowerCase().includes(query))
      : null
    return String(match ?? val[0] ?? s.buyShipment)
  }
  return String(val)
}

function toStatusBadge(s) {
  if (s.tenderStatus === 'Sent') return { label: 'Sent', variant: 'blue' }
  if (s.shipmentStatus === 'Done') return { label: 'Done', variant: 'green' }
  if (s.shipmentStatus === 'Review') return { label: 'Review', variant: 'amber' }
  return { label: s.shipmentStatus || '—', variant: 'gray' }
}

function toTenderBadge(s) {
  if (s.tenderStatus === 'Accepted')  return { label: 'Accepted',  variant: 'green' }
  if (s.tenderStatus === 'Sent')      return { label: 'Sent',      variant: 'blue'  }
  if (s.tenderStatus === 'Declined')  return { label: 'Declined',  variant: 'red'   }
  if (s.tenderStatus === 'Cancelled') return { label: 'Cancelled', variant: 'gray'  }
  return { label: s.tenderStatus || '—', variant: 'gray' }
}
