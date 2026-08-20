/**
 * Orders panel filter-state → OrderListRequest.filters.
 *
 * The SINGLE mapping point between what the panel holds and what goes on the
 * wire — same role `chipsToFilters` plays for Shipments. Keeping it out of the
 * view is what lets the request shape be tested without rendering anything, and
 * what the phase-2 GlobalSearch chip layer will reuse instead of restating.
 *
 * Panel state is keyed by `attr.key`; the value shape follows `attr.control`:
 *   text                       → string, comma-separated for several values
 *   combobox / enum / location → string[] (location values are "City|State|Country")
 *   date-range                 → { from, to }  ISO yyyy-mm-dd, either side optional
 *   comparator                 → { op, value } op ∈ gt|eq|lt, value a numeric string
 *
 * Empty values are OMITTED, never sent as []: an empty array would read as
 * "match nothing" against `oneOf`'s `!values?.length` short-circuit only by
 * accident, and it makes `hasFilters` ambiguous.
 */
import { ORDERS_FILTER_ATTRS, attrsForTab } from './registry'

/**
 * LINX-11659: "whole number only, >=1 & no decimals allowed". Returns the
 * number, or null when the text is anything else — the panel shows an inline
 * error and toRequest emits nothing, so a half-typed "1." never filters.
 */
export function parseErrorCount(text) {
  const s = String(text ?? '').trim()
  if (!/^\d+$/.test(s)) return null
  const n = Number(s)
  return n >= 1 ? n : null
}

/** "City|State|Country" → { city, state, country }. */
export function parseLocationValue(value) {
  const [city = '', state = '', country = ''] = String(value ?? '').split('|')
  return { city, state, country }
}

const nonEmpty = (v) => Array.isArray(v) && v.length > 0

/**
 * A `text` field is an IN-list: "091000, 091001" is two values, matching the
 * Shipments chip rule (tokenizeChipValue splits on commas only — a value can
 * contain spaces, so whitespace is NOT a separator).
 */
export function splitTextValues(text) {
  return String(text ?? '').split(',').map((s) => s.trim()).filter(Boolean)
}

/**
 * Build the `filters` object for ONE tab's state. Attributes not on that tab
 * are ignored even if state lingers for them, so a stale value can never filter
 * a tab whose panel doesn't show the field.
 */
export function toRequestFilters(tab, state = {}) {
  const filters = {}
  for (const attr of attrsForTab(tab)) {
    const value = state[attr.key]
    if (value == null) continue

    if (attr.control === 'text') {
      const values = splitTextValues(value)
      if (values.length) filters[attr.param] = values
      continue
    }

    if (attr.control === 'combobox' || attr.control === 'enum') {
      if (nonEmpty(value)) filters[attr.param] = [...value]
      continue
    }

    if (attr.control === 'location') {
      if (!nonEmpty(value)) continue
      const triples = value.map(parseLocationValue)
      // Our extension — the semantically correct shape. Three parallel arrays
      // ANDed (the LLD's own model, mirrored below) cross-product on multi
      // select: Miami/Florida/US + Milan/Lombardy/Italy would also match
      // "Miami, Lombardy, Italy". Open question with Ramesh; until it's
      // answered we send BOTH, and the mock matches on the triples.
      filters[attr.param] = triples
      const [cityKey, stateKey, countryKey] = attr.lldParams
      filters[cityKey] = [...new Set(triples.map((t) => t.city).filter(Boolean))]
      filters[stateKey] = [...new Set(triples.map((t) => t.state).filter(Boolean))]
      filters[countryKey] = [...new Set(triples.map((t) => t.country).filter(Boolean))]
      continue
    }

    if (attr.control === 'date-range') {
      const [fromKey, toKey] = attr.param
      if (value.from) filters[fromKey] = value.from
      if (value.to) filters[toKey] = value.to
      continue
    }

    if (attr.control === 'comparator') {
      const [opKey, valueKey] = attr.param
      const n = parseErrorCount(value.value)
      // Both halves are required — an operator with no number narrows nothing,
      // and a number with no operator has no meaning.
      if (value.op && n != null) {
        filters[opKey] = value.op
        filters[valueKey] = n
      }
    }
  }
  return filters
}

/** True when this tab's state carries anything the server would act on. */
export function hasFilters(tab, state = {}) {
  return Object.keys(toRequestFilters(tab, state)).length > 0
}

/**
 * How many FIELDS are filled (not how many filter params were emitted) — a
 * location fills one field but emits four params, and a date range fills one
 * field but can emit two. This is the count the toolbar badge shows.
 */
export function activeFilterCount(tab, state = {}) {
  let n = 0
  for (const attr of attrsForTab(tab)) {
    const value = state[attr.key]
    if (value == null) continue
    if (attr.control === 'text') n += splitTextValues(value).length > 0 ? 1 : 0
    else if (Array.isArray(value)) n += value.length > 0 ? 1 : 0
    else if (attr.control === 'date-range') n += value.from || value.to ? 1 : 0
    else if (attr.control === 'comparator') n += value.op && parseErrorCount(value.value) != null ? 1 : 0
  }
  return n
}

/** Blank state for a tab — every field cleared to its control's empty value. */
export function emptyState(tab) {
  const state = {}
  for (const attr of attrsForTab(tab)) {
    if (attr.control === 'text') state[attr.key] = ''
    else if (attr.control === 'date-range') state[attr.key] = { from: '', to: '' }
    else if (attr.control === 'comparator') state[attr.key] = { op: '', value: '' }
    else state[attr.key] = []
  }
  return state
}

/** Every tab key the registry knows about — used to seed per-tab state. */
export const ORDERS_FILTER_TABS = [
  ...new Set(ORDERS_FILTER_ATTRS.flatMap((a) => a.tabs)),
]
