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
export function formatDateMDYFromDate(d) {
  if (!(d instanceof Date)) return ''
  return formatDateMDY(d.getMonth() + 1, d.getDate(), d.getFullYear())
}

// Any "M/D/YYYY" (unpadded or padded) → padded "MM/DD/YYYY"; passes through
// anything that doesn't match (null/invalid stay as given, callers decide).
export function padMdy(s) {
  const m = String(s ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return m ? formatDateMDY(m[1], m[2], m[3]) : s
}

// JS Date → "MM/DD/YYYY HH:MM" (24-hour) — verbatim from LINX-8091's
// order-audit timestamp AC, reused for the Shipment History tab (S107).
export function formatDateTimeMDYHM(d) {
  if (!(d instanceof Date)) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${formatDateMDYFromDate(d)} ${hh}:${mm}`
}
