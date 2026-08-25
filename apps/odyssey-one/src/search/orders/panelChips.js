/**
 * Orders panel state ⇄ bar chips — the two-way binding between the Filters
 * panel and the search bar (S131, user ruling: "the filters panel is just
 * another way of filling the searchbar, both are bound like we have on
 * shipments").
 *
 * ── Why a mapper is needed at all ──────────────────────────────────────────
 * The two halves were built on DIFFERENT criteria paths (S130): the panel emits
 * tab-scoped request params matched with EXACT equality (`oneOf` in the mock,
 * `= ANY()` live), the bar emits flat `searchChips` matched as case-insensitive
 * SUBSTRINGS. Panel → bar already worked as a display (`filterChips` derives a
 * chip per filled field); bar → panel did not, because a substring criterion
 * ("Customer: WEY") has no faithful representation as an exact IN-list — as a
 * param it would return nothing.
 *
 * So the ruling picks ONE owner: for every field the bar can also express, the
 * PANEL WRITES CHIPS. The panel is then literally another way of filling the
 * bar — same matching, same flat/global scope, one state — and the param path
 * is left to the fields the bar has no vocabulary for.
 *
 * ── Who owns what ──────────────────────────────────────────────────────────
 *   CHIP_TWINS  — panel field ⇄ progression attribute. The panel emits a chip
 *                 and NEVER the param, so a criterion can't exist twice.
 *   DATE_TWINS  — seeded FROM a bar chip, emitted back as a PARAM: a bar chip
 *                 carries one day (Orders has no range chip — see the adapter
 *                 header) while the panel's control is a From–To range, and
 *                 `chipClause` in api/_lib/orders.mjs reads `queryValue`, not
 *                 `from`/`to`. A single-day range is the same row set either
 *                 way, so nothing is lost by letting the param own the range.
 *   Neither     — origin / destination (the panel filters City|State|Country
 *                 triples; the bar searches a flattened location string) and
 *                 errorCount (the panel has an operator, a chip is equality
 *                 only). These stay params and keep riding in the bar as
 *                 derived `filterChips`.
 */
import { toItem } from '../adapter-core'
import { ORDERS_ATTRIBUTES } from './progression'
import { attrsForTab } from './registry'
import { emptyState, splitTextValues } from './toRequest'

/** Panel field key → progression key, for fields the panel emits as CHIPS. */
export const CHIP_TWINS = {
  orderNumber: 'order-number',
  customer: 'customer',
  orderStatus: 'order-status',
  draftOrderStatus: 'draft-order-status',
  createdBy: 'created-by',
  lastEditedBy: 'last-edited-by',
}

/** Panel field key → progression key, for fields SEEDED by a chip but kept as params. */
export const DATE_TWINS = {
  latestPickup: 'latest-pickup',
  latestDelivery: 'latest-delivery',
  createdDate: 'created-date',
  lastEditDate: 'last-edit-date',
}

const twinOf = (attr) => CHIP_TWINS[attr.key] ?? DATE_TWINS[attr.key] ?? null
const progAttr = (key) => ORDERS_ATTRIBUTES.find((a) => a.key === key)

const mdyToIso = (value) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(value ?? '').trim())
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : ''
}

/**
 * Committed bar chips → the panel field values that REPRESENT them, for one
 * tab's fields. This is what makes opening the panel show the criteria already
 * on the bar instead of an empty form.
 *
 * Chips whose attribute this tab has no field for are simply absent — they stay
 * bar-only criteria, which is the flat-vs-tab-scoped split LINX-10285 forces.
 */
export function chipsToPanelState(tab, chips = []) {
  const byKey = new Map(chips.map((c) => [c.key, c]))
  const state = {}
  for (const attr of attrsForTab(tab)) {
    const chip = byKey.get(twinOf(attr))
    if (!chip) continue
    const value = String(chip.queryValue ?? '')
    if (attr.control === 'text') state[attr.key] = value
    else if (attr.control === 'combobox') state[attr.key] = value ? [value] : []
    // Only real catalog values can light a toggle chip — an invented one would
    // render as nothing and silently vanish on the next apply.
    else if (attr.control === 'enum') state[attr.key] = splitTextValues(value).filter((v) => attr.values.includes(v))
    else if (attr.control === 'date-range') {
      // A shared-hook `kind: 'date-range'` chip carries from/to; an ordinary
      // Orders date chip carries the day in `queryValue`.
      const from = mdyToIso(chip.from ?? value)
      const to = mdyToIso(chip.to ?? chip.from ?? value)
      if (from || to) state[attr.key] = { from, to }
    }
  }
  return state
}

/**
 * A panel draft → `{ chips, params }`: the criteria that leave as bar chips,
 * and the state that still goes on the request as params (chip-owned fields
 * blanked, so the same criterion can never be applied through both paths).
 */
export function panelStateToChips(tab, state = {}) {
  const blank = emptyState(tab)
  const chips = []
  const params = { ...state }
  for (const attr of attrsForTab(tab)) {
    const key = CHIP_TWINS[attr.key]
    if (!key) continue
    const value = attr.control === 'text'
      ? splitTextValues(state[attr.key]).join(', ')   // "a,b" → the chip's IN-list form
      : (state[attr.key] ?? []).join(', ')
    params[attr.key] = blank[attr.key]
    if (value) chips.push(toItem(progAttr(key), value))
  }
  return { chips, params }
}

/**
 * The chip keys this tab's panel speaks for. An apply REPLACES exactly these on
 * the bar (the draft is the new truth for them); every other chip survives.
 */
export function panelOwnedChipKeys(tab) {
  return new Set(attrsForTab(tab).map(twinOf).filter(Boolean))
}
