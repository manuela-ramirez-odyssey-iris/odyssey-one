import { getAllShipments } from '../../data'
import { SHIPMENTS_ATTRIBUTES, SHIPMENTS_PROGRESSION, FREE_TEXT_ATTRS } from './progression'
import { valueMatchDetail } from './searchIndex'
// Shared chip+text matcher (S79c) — the SAME predicates the grid service applies
// to listParams.searchCriteria, so the glimpse previews exactly what committing
// the criteria will show in the table.
import {
  matchesChip, FREE_TEXT_KEYS, matchesAnyNeedle, textNeedles,
  resolveBestMatch, resolveBestMatchNeedles, scoreText, tokenizeChipValue,
  parseSearchDate,
} from './criteria'

// ── Dates (Case 12, GS-22) ──────────────────────────────────────────────────
// The date-typed attributes (match: 'date' in the progression) each offer TWO
// suggestion items: the plain date and its Range twin. A query "looks like a
// date" only once a SLASH appears ("2/", "2/3", "2/3/2026") — bare digits stay
// code-typing (a pro/shipment number must not collapse into dates).
const DATE_ATTRS = SHIPMENTS_ATTRIBUTES.filter((a) => a.match === 'date')
export const DATE_LIKE = /^\d{1,2}\/\d{0,2}(\/\d{0,4})?$/

// The typed partial PRE-FILLS the chip the way other suggestions carry their
// typed value ("Pro#: 442"): labels show the mask ("Pickup Date: 12/../....",
// "Pickup Date Range: 12/../.... - ../../...."), and the parse fills what it
// can — month+day default the year to CURRENT (from pre-filled); a month
// alone steers the calendar to that month of the current year (monthHint).
// M/D/YYYY reading (matches every displayed date); a first segment > 12
// can't be a month, so it's taken as a DAY in the current month.
export function parseDatePartial(query) {
  const q = (query || '').trim()
  if (!q) return { mask: null, from: null, monthHint: null, invalid: false }
  const [s0 = '', s1 = '', s2 = ''] = q.split('/')
  const mask = `${s0 || '..'}/${s1 || '..'}/${s2 || '....'}`
  const now = new Date()
  let m = null, d = null, y = null, invalid = false
  const a = parseInt(s0, 10)
  if (a >= 1 && a <= 12) m = a
  else if (a >= 13 && a <= 31) { d = a; m = now.getMonth() + 1 }
  else if (s0) invalid = true // "40/" — neither a month nor a day
  const b = parseInt(s1, 10)
  if (s1) {
    if (m != null && d == null && b >= 1 && b <= 31) d = b
    else invalid = true // second segment unusable ("12/40")
  }
  if (s2.length === 4) y = parseInt(s2, 10)
  // A fully-typed date must actually exist on the calendar ("2/30/2026").
  if (!invalid && m != null && d != null && y != null && !parseSearchDate(`${m}/${d}/${y}`)) invalid = true
  const year = y ?? now.getFullYear()
  const from = !invalid && m != null && d != null ? `${m}/${d}/${year}` : null
  const monthHint = !invalid && m != null ? { y: year, m } : null
  return { mask, from, monthHint, invalid }
}

function dateItems(query) {
  const { mask, from, monthHint, invalid } = parseDatePartial(query)
  const value = invalid ? 'Invalid Date' : mask
  return DATE_ATTRS.flatMap((attr) => [
    {
      key: `date-${attr.key}`,
      label: value ? `${attr.label}: ${value}` : attr.label,
      kind: 'date',
      attr: { key: attr.key, label: attr.label, dataKey: attr.dataKey, group: attr.group },
      from, monthHint, invalid,
    },
    {
      key: `date-range-${attr.key}`,
      label: value ? `${attr.label} Range: ${value}${invalid ? '' : ' - ../../....'}` : `${attr.label} Range`,
      kind: 'date-range-suggest',
      attr: { key: attr.key, label: attr.label, dataKey: attr.dataKey, group: attr.group },
      from, monthHint, invalid,
    },
  ])
}

// dataKeys that drive avatar icon overrides in MatchRow
const ORDER_KEYS    = new Set(['orders'])
const CUSTOMER_KEYS = new Set(['customerId', 'customerName', 'consignor', 'consignee'])

// Parse "Phoenix AZ US 85001" → "Phoenix, AZ"
export function formatLocation(str) {
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

export function toItem(attr, queryValue) {
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
  /**
   * Per-code validation + named-set detection for a committed multi-code
   * string (GS-21, Case 11). Returns null when the text is NOT a code list —
   * phrase mode (the whole string matches something) or a single token — so
   * the caller falls back to the plain free-text badge. Otherwise:
   *   codes     — [{ value, valid }] in typed order; valid = the code matches
   *               at least one row on any free-text field (same fieldIncludes
   *               semantics the search itself uses, so "found" here always
   *               means "would return rows").
   *   typeLabel — the named-set rule: set only when EVERY valid code's best
   *               match (exact > prefix > contains, progression tiebreak)
   *               resolves to the SAME attribute; any disagreement → null
   *               ("Multiple"/mixed). The name is a promise, not a guess.
   * Sync against the local fake DB; the live twin is a per-needle hit-count
   * endpoint (GS-20 hits builder already counts DISTINCT needle_ix).
   */
  resolveCodeSet(text) {
    const t = (text || '').trim()
    const all = getAllShipments()
    // Same interpretation gate as the search (GS-20): phrase-first; only a
    // phrase that matches NOTHING tokenizes into a code list.
    if (textNeedles(all, t.toLowerCase()).length < 2) return null
    const rawTokens = t.split(/[\s,]+/).filter(Boolean) // preserve typed case for display
    let typeLabel
    const codes = rawTokens.map((value) => {
      const q = value.toLowerCase()
      let best = null
      for (const s of all) {
        const m = resolveBestMatch(s, q, FREE_TEXT_ATTRS)
        if (m && (!best || m.score > best.score || (m.score === best.score && m.order < best.order))) best = m
        if (best?.score === 3 && best.order === 0) break
      }
      if (best) typeLabel = typeLabel === undefined || typeLabel === best.attr.label ? best.attr.label : null
      return { value, valid: !!best }
    })
    return { codes, typeLabel: typeLabel || null }
  },

  /**
   * Re-validate a code list under an ASSERTED attribute (GS-21 rule 7 — the
   * user clicked a type in the suggestion panel, or edited a typed set).
   * valid = the code matches at least one row on THAT attribute's field.
   */
  validateCodes(values, dataKey) {
    const all = getAllShipments()
    return values.map((value) => ({
      value,
      valid: all.some((s) => matchesChip(s, { dataKey, queryValue: value })),
    }))
  },

  // Empty-input suggestions. No chips → NOTHING (S104). With chips → the NEXT
  // progression GROUP (drill forward; never repeat the entry set; on the last
  // group, stay on it). Suggestions only — typing still matches ANY attribute
  // regardless of group. See composed-criteria.md → "Empty-suggestion
  // progression".
  //
  // `setChip` (GS-21): when an UNTYPED code-set badge sits in the bar, the
  // panel's first job is offering its type — one item per attribute at least
  // one code matches. Clicking one asserts the whole batch as that type (the
  // hook converts the badge into a typed IN-list set chip).
  async getInitial(chips = [], setChip = null) {
    const sections = []
    if (setChip?.kind === 'set' && !setChip.typeLabel) {
      const values = setChip.codes.map((c) => c.value)
      const items = FREE_TEXT_ATTRS
        .filter((attr) => values.some((v) => this.validateCodes([v], attr.dataKey)[0].valid))
        .map((attr) => ({
          key: `set-type-${attr.key}`,
          label: attr.label,
          kind: 'set-type',
          attr: { key: attr.key, label: attr.label, dataKey: attr.dataKey, group: attr.group },
        }))
      if (items.length) sections.push({ title: 'Define set type', items })
    }
    // Untouched bar (focused, nothing typed, no chips): GS-14 said NOTHING —
    // Case 12 (GS-22) carves out DATES: filtering the visible data by date is
    // the one thing users reach for from a cold bar, so the date + range
    // items appear as "Filter by date" ("later we might add more suggested
    // filters to this case" — user, 2026-08-03). Attribute entry points stay
    // gone; drill-forward still needs a chip footing.
    if (!chips.length) {
      // Empty-bar title invites BOTH actions (user, 2026-08-03): keep typing,
      // or filter everything by date. The typed date-like section keeps the
      // plain "Filter by date" title — there the intent is already dates.
      if (!setChip) sections.push({ title: 'Type or Filter by date', items: dateItems('') })
      return sections
    }
    const group = nextProgressionGroup(chips)
    if (!group) return sections
    const committed = new Set(chips.map((c) => c.key))
    const items = group.attributes
      .filter((a) => !committed.has(a.key))
      .map((a) => toItem({ ...a, group: group.group }, null))
    if (items.length) sections.push({ title: group.label, items })
    return sections
  },

  async getSuggestions(query) {
    const q = (query || '').trim()
    if (!q) return this.getInitial()

    // Date-like input ("2", "2/3", "2/3/2026") → the date + range chips lead
    // (Case 12). A complete date rides along as the chip's pre-filled bound.
    if (DATE_LIKE.test(q)) {
      return [{ title: 'Filter by date', items: dateItems(q) }]
    }

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

    // "What is it?" (not "Suggested Filters") — the panel's job at this moment is
    // to tell the user what the thing they typed COULD be, not to offer filters.
    if (scored.length) {
      return [{ title: 'What is it?', items: scored.map((s) => toItem(s.attr, q)) }]
    }

    // Multi-code (Case 9): the whole string matched nothing, but it may be a
    // LIST of codes. Suggest an attribute only when EVERY code matches real
    // values of that attribute — the chip is then an IN-list ("Order #: a, b").
    // One code resolving to a different attribute → no suggestion at all
    // (user rule: mixed lists don't chip; they still free-text search).
    const rawTokens = q.split(/[\s,]+/).filter(Boolean)
    if (rawTokens.length >= 2) {
      const common = SHIPMENTS_ATTRIBUTES
        .map((attr, order) => {
          const details = rawTokens.map((t) => valueMatchDetail(attr.dataKey, t))
          if (details.some((d) => d.score === 0)) return null
          // Weakest code's score is the honest rank for the whole list.
          return { attr, order, score: Math.min(...details.map((d) => d.score)) }
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || a.order - b.order)
      if (common.length) {
        const listValue = rawTokens.join(', ')
        return [{ title: 'What is it?', items: common.map((s) => toItem(s.attr, listValue)) }]
      }
    }
    return []
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
    // Resolve the text interpretation ONCE against the FULL dataset (phrase vs
    // code-list, GS-20) — not per row, and not against the customer-scoped
    // subset, so every surface reads the query the same way.
    const needles = textNeedles(getAllShipments(), q)
    const shipments = all.filter(
      (s) => matchesAnyNeedle(s, needles) && chipList.every((chip) => matchesChip(s, chip)),
    )

    // ---- Order entity: explode each shipment into its matching orders --------
    if (ORDER_KEYS.has(primaryKey)) {
      const orderChips = chipList.filter((c) => ORDER_KEYS.has(c.dataKey))
      const rows = []
      for (const s of shipments) {
        const orders = Array.isArray(s.orders) ? s.orders : []
        for (const ord of orders) {
          const o = String(ord)
          // Multi-value order chip = IN-list: the order survives when it
          // matches ANY of the chip's values (Case 9; GS-12 semantics).
          const keep = orderChips.every((c) => {
            const needles = tokenizeChipValue(c.queryValue)
            if (!needles.length) needles.push('')
            return needles.some((n) => o.toLowerCase().includes(n))
          })
          if (keep) rows.push(buildOrderRow(s, o))
        }
      }
      const sorted = primaryQuery
        ? rows.sort((a, b) => scoreText(b.matchId, primaryQuery) - scoreText(a.matchId, primaryQuery))
        : rows
      return { results: sorted.slice(0, 15), total: rows.length }
    }

    // ---- Bare code: resolve WHICH attribute matched, per row ----------------
    // No chips + free text = "here's a code, I don't know what it is" (S104).
    // Every row resolves its own best-matching attribute, so a pasted order
    // number reads "Order #0000000091000" instead of being silently relabelled
    // with the shipment number. Rows sort by match quality (exact before
    // prefix before contains), progression order breaking ties.
    if (!chipList.length && q) {
      const resolved = shipments
        .map((s) => ({ s, m: resolveBestMatchNeedles(s, needles, FREE_TEXT_ATTRS) }))
        .filter((r) => r.m)
        .sort((a, b) => b.m.score - a.m.score || a.m.order - b.m.order)
      const results = resolved.slice(0, 15).map(({ s, m }) => ({
        ...buildShipmentRow(s, m.attr.dataKey, q),
        matchId: labelMatch(m),
        'data-attr': m.attr.key, // the RESOLVED attribute, not the default
      }))
      return { results, total: shipments.length }
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
    // Which panel tab this row lives in + which attribute group it matched.
    // Both feed `panelForResults` (GS-18) — the landing tab is chosen from what
    // the user can SEE at the top of the preview. Carried as data-attributes
    // because MatchRow spreads unknown props onto its DOM node.
    'data-panel': s.panel,
    'data-attr': primaryKey,
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
    'data-panel': s.panel,
    'data-attr': 'orders',
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

// "Order #" + "0000000091000" → "Order #0000000091000"; labels that don't already
// end in a '#' get a space ("SCAC FXFE").
export function labelMatch({ attr, value }) {
  const display = attr.dataKey === 'origin' || attr.dataKey === 'destination'
    ? formatLocation(value)
    : value
  return attr.label.endsWith('#') ? `${attr.label}${display}` : `${attr.label} ${display}`
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

export function toStatusBadge(s) {
  if (s.tenderStatus === 'Sent') return { label: 'Sent', variant: 'blue' }
  if (s.shipmentStatus === 'Done') return { label: 'Done', variant: 'green' }
  if (s.shipmentStatus === 'Review') return { label: 'Review', variant: 'amber' }
  return { label: s.shipmentStatus || '—', variant: 'gray' }
}

export function toTenderBadge(s) {
  if (s.tenderStatus === 'Accepted')  return { label: 'Accepted',  variant: 'green' }
  if (s.tenderStatus === 'Sent')      return { label: 'Sent',      variant: 'blue'  }
  if (s.tenderStatus === 'Declined')  return { label: 'Declined',  variant: 'red'   }
  if (s.tenderStatus === 'Cancelled') return { label: 'Cancelled', variant: 'gray'  }
  return { label: s.tenderStatus || '—', variant: 'gray' }
}

/**
 * Which panel tab a committed search should open, chosen from the PREVIEW the
 * user just looked at (GS-18).
 *
 * The rule, in the user's words: *"we should choose the group that shows first
 * in the preview panel to pick the tab — the idea behind this is to give user
 * eyes what they are seeing."* So: take the attribute group of the FIRST preview
 * row (e.g. "Buy Shipment #"), keep only the rows in that group, and return the
 * panel most of them live in. Ties inside the group break toward the earliest
 * row, which is the highest-relevance one.
 *
 * Deliberately NOT "the panel with the most matches overall" (the S104 first
 * attempt): a bigger tab the user cannot see anything of is not where their eyes
 * are. Returns null for an empty preview — the caller then falls back.
 */
export function panelForResults(results = []) {
  const first = results[0]
  if (!first) return null
  const group = first['data-attr']
  const counts = new Map()
  for (const r of results) {
    if (r['data-attr'] !== group) continue
    const panel = r['data-panel']
    if (!panel) continue
    counts.set(panel, (counts.get(panel) ?? 0) + 1)
  }
  if (!counts.size) return null
  // Highest count wins; ties fall to the panel seen first (insertion order).
  return [...counts].reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0]
}
