/**
 * Adapter core — the domain-agnostic pieces every search adapter needs.
 *
 * Extracted from `shipments/adapter.js` when Orders got its own adapter (S130).
 * Both were going to be character-identical apart from which progression they
 * read, and a second copy is free to drift — the same reasoning `criteria-core`
 * and `searchIndex-core` already record.
 *
 * S131 moved the Case-12 date machinery here for the same reason: Orders needed
 * the identical "type `1/` → pick the day in a calendar chip" behaviour, and
 * nothing in it was ever Shipments-specific.
 */
import { formatDateMDY } from '../lib/dates'
import { parseSearchDate } from './criteria-core'

/**
 * One progression attribute as a suggestion ITEM (and, once clicked, a committed
 * chip). `queryValue` null = an entry-point item ("Customer"); a value present
 * makes it a ready-to-commit criterion ("Customer: WEYERH_01").
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

// ── Dates (Case 12, GS-22) ──────────────────────────────────────────────────
// A query "looks like a date" only once a SLASH appears ("2/", "2/3",
// "2/3/2026") — bare digits stay code-typing (a pro/order number must not
// collapse into dates).
export const DATE_LIKE = /^\d{1,2}\/\d{0,2}(\/\d{0,4})?$/

/**
 * The typed partial PRE-FILLS the chip the way other suggestions carry their
 * typed value ("Pro#: 442"): labels show the mask ("Pickup Date: 12/../....",
 * "Pickup Date Range: 12/../.... - ../../...."), and the parse fills what it
 * can — month+day default the year to CURRENT (from pre-filled); a month
 * alone steers the calendar to that month of the current year (monthHint).
 * M/D/YYYY reading (matches every displayed date); a first segment > 12
 * can't be a month, so it's taken as a DAY in the current month.
 */
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
  // Padded MM/DD/YYYY canon (S107 addendum) — this is a COMPLETE typed date,
  // not the "12/../...." mask, so it commits as a chip bound and must display
  // padded like every other slashed date.
  const from = !invalid && m != null && d != null ? formatDateMDY(m, d, year) : null
  const monthHint = !invalid && m != null ? { y: year, m } : null
  return { mask, from, monthHint, invalid }
}

/**
 * The two suggestion items each date-typed attribute offers — the plain date
 * and its Range twin. Committing either gives the expanded calendar chip
 * (`kind: 'date-range'` in useGlobalSearch), which is where the day is picked.
 *
 * `dateAttrs` is the domain's `match: 'date'` progression attributes.
 */
export function dateItems(query, dateAttrs) {
  const { mask, from, monthHint, invalid } = parseDatePartial(query)
  const value = invalid ? 'Invalid Date' : mask
  return dateAttrs.flatMap((attr) => [
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

/**
 * The progression group to suggest next given the committed chips: the group
 * AFTER the furthest group any chip belongs to. Past the end → stay on the last
 * group (user rule). Skips fully-committed groups so the panel is never empty;
 * if the tail is exhausted, falls back to any earlier group with room left.
 */
export function nextProgressionGroup(progression, chips) {
  const idxByGroup = new Map(progression.map((g, i) => [g.group, i]))
  const maxIdx = chips.reduce((m, c) => Math.max(m, idxByGroup.get(c.group) ?? -1), -1)
  const lastIdx = progression.length - 1
  const targetIdx = Math.min(maxIdx + 1, lastIdx)
  const committed = new Set(chips.map((c) => c.key))
  const hasRoom = (g) => g.attributes.some((a) => !committed.has(a.key))

  for (let i = targetIdx; i <= lastIdx; i++) {
    if (hasRoom(progression[i])) return progression[i]
  }
  for (let i = lastIdx; i >= 0; i--) {
    if (hasRoom(progression[i])) return progression[i]
  }
  return null
}
