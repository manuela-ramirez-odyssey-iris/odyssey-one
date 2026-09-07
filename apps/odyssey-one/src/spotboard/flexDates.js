// flexDates.js — the per-carrier allowable-date list behind a Flexible
// pickup/delivery (SPB-69/73). Two steps: a window of planned ± N days from
// the OCM flex config, then the days the org/carrier operating calendar
// removes. In TMS the calendar walk is APEX code Doug hands to Yuri; here it
// is SEEDED, deterministic per SCAC, never computed from real calendars.
//
// ponytail: window is ± N (both legacy exhibits show both sides). Kathleen's
// 08/20 text says "days permitted BEFORE the requested date" — if she
// confirms before-only, set AFTER_DAYS_FACTOR to 0.
import { strToDate } from '../components/orders/create/fields/DateField.jsx'

const AFTER_DAYS_FACTOR = 1

// Seeded org holidays (US). Real ones come from the TMS org calendar.
const HOLIDAYS = new Set(['2026-09-07', '2026-11-26', '2026-12-25', '2027-01-01'])

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Every carrier is off Sundays; about half are also off Saturdays.
function nonOpSaturday(scac) {
  const h = [...String(scac)].reduce((a, c) => a + c.charCodeAt(0), 0)
  return h % 2 === 1 // ODFL (293) → off Saturdays; SAIA (286) → operates
}

/** @returns {string[]} 'YYYY-MM-DD' ascending; [] when nothing applies */
export function allowableDates(anchorMdy, days, scac) {
  const anchor = strToDate(anchorMdy)
  if (!anchor || !(days > 0)) return []
  const out = []
  for (let off = -days; off <= days * AFTER_DAYS_FACTOR; off++) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + off)
    if (d.getDay() === 0) continue
    if (d.getDay() === 6 && nonOpSaturday(scac)) continue
    if (HOLIDAYS.has(iso(d))) continue
    out.push(iso(d))
  }
  return out
}
