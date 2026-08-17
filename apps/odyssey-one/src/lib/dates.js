// Platform-wide date-format canon (S107 addendum, user ruling 2026-08-03):
// every SLASHED numeric date displays as padded MM/DD/YYYY — matches the
// current Odyssey system (US default) and Jira LINX-8120. The long
// alphanumeric tier ("Mar 24, 2026", "Sep 25, 2026 at 2:30 PM CDT") is a
// SEPARATE, sanctioned tier and does not route through here.
//
// Region-switching is HALTED (deferred until a real regional user model
// exists) — this one constant is the seam a later per-region preference
// would flip.
export const DATE_FORMAT = 'MM/DD/YYYY'

// month/day/year (numbers or numeric strings, any padding) → padded "MM/DD/YYYY".
export function formatDateMDY(month, day, year) {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${mm}/${dd}/${year}`
}

// JS Date → padded "MM/DD/YYYY" ('' for a non-Date).
//
// `utc` reads the calendar date in UTC instead of the viewer's local zone.
// It is not cosmetic: for a timestamp late in the day the two disagree on the
// DATE, not just the clock (2026-06-02T02:00Z is June 1st in Chicago), so a
// caller that shows UTC times must pass it here too or the row will print a
// UTC time against a local date.
export function formatDateMDYFromDate(d, { utc = false } = {}) {
  if (!(d instanceof Date)) return ''
  return utc
    ? formatDateMDY(d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCFullYear())
    : formatDateMDY(d.getMonth() + 1, d.getDate(), d.getFullYear())
}

// Any "M/D/YYYY" (unpadded or padded) → padded "MM/DD/YYYY"; passes through
// anything that doesn't match (null/invalid stay as given, callers decide).
export function padMdy(s) {
  const m = String(s ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return m ? formatDateMDY(m[1], m[2], m[3]) : s
}

// JS Date → "MM/DD/YYYY HH:MM" (24-hour) — verbatim from LINX-8091's
// order-audit timestamp AC, reused for the Shipment History tab (S107).
//
// `utc` renders the instant in UTC rather than the viewer's local zone (user
// ruling 2026-08-12, for the Shipment History trail: an audit log read across
// timezones has to name one clock or two people reading the same row disagree
// about when it happened). It does NOT append a zone label — the caller owns
// that, because only some surfaces have room for it.
export function formatDateTimeMDYHM(d, { utc = false } = {}) {
  if (!(d instanceof Date)) return ''
  const hh = String(utc ? d.getUTCHours() : d.getHours()).padStart(2, '0')
  const mm = String(utc ? d.getUTCMinutes() : d.getMinutes()).padStart(2, '0')
  return `${formatDateMDYFromDate(d, { utc })} ${hh}:${mm}`
}

// ── Carrier date/time composition ─────────────────────────────────────────────
// Moved here from QuoteModal.jsx (2026-08-17) when Dropped Carrier became the
// second consumer. Behaviour is unchanged; QuoteModal re-exports for compat.

const DASH = '--'
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function splitDateTime(s) {
  const m = /^(\d{2}\/\d{2}\/\d{4})?\s*(\d{1,2}:\d{2})?\s*([A-Z]{3,4})?/.exec(String(s ?? '').trim())
  if (!m) return { date: '', time: '', tz: 'CST' }
  return { date: m[1] ?? '', time: m[2] ? m[2].padStart(5, '0') : '', tz: m[3] ?? 'CST' }
}

export function joinDateTime({ date, time, tz }) {
  if (!date) return ''
  return [date, time, time ? tz : ''].filter(Boolean).join(' ')
}

// Day-of-week is DERIVED from the date, never read from a stored field: the
// routing VM carries `pickupOrgDay` but has NO `deliveryOrgDay`, so only one
// side could ever have used a stored value — and a stored day can silently
// disagree with its own date, which a derived one cannot (DEC-98). Parsed
// part-wise, not via `new Date(string)`, whose "MM/DD/YYYY" handling is
// implementation-defined.
export function dayOfWeek(mdY) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(mdY ?? '').trim())
  if (!m) return ''
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]))
  // Guard a rolled-over invalid date (e.g. 02/31) rather than naming a day
  // that isn't the one written down.
  if (d.getMonth() !== Number(m[1]) - 1 || d.getDate() !== Number(m[2])) return ''
  return DAY_NAMES[d.getDay()]
}

/**
 * Composes "MM/DD/YYYY HH:MM TZ, Day, (org hours)" — every part optional and
 * simply omitted when missing, so a partial record degrades to
 * "01/07/2026, Tue" rather than "01/07/2026 , , ()". Entirely empty reads '--'.
 *
 * Two consumers with deliberately different shapes:
 *   • LINX-13895 Quote — passes `orgHours`, so the trailing "(07:00-15:30)" renders.
 *   • LINX-13953 Dropped Carrier — passes no `orgHours` ("org hrs are not
 *     required"), so the segment drops out and the value matches that ticket's
 *     own example, "08/20/2025 14:00 CST, Wed".
 */
export function composeCarrierDateTime(value) {
  if (!value) return DASH
  const day = dayOfWeek(value.date)
  const hours = value.orgHours && value.orgHours !== DASH ? `(${value.orgHours})` : ''
  return [joinDateTime(value), day, hours].filter(Boolean).join(', ') || DASH
}
