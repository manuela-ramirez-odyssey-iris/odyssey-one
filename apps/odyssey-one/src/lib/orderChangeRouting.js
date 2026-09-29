// C4 + C12 (DEC-206, DEC-215) — one re-route for the consolidated order
// change's NEW tender list, shared by the client (View Routing, the Stops-tab
// header) and the API (save-stops, approve-plan, retender/bypass), same
// precedent as shipmentStatus.js / legMiles.js: the modal the planner approves
// and the list the Save writes can't disagree (DEC-192: header = routing).
import { totalMiles } from '../utils/legMiles.js'

// A stop's scheduledDateTime is the long form ('March 4, 2026 10:00 PST',
// generate.mjs:946 / stopsSandbox formatStopDate); a row's pickup_date /
// delivery_date and a tender option's pickupDateTime are 'MM/DD/YYYY HH:MM TZ'
// (001_schema.sql:27, generate.mjs formatDateTime). An already-short string
// passes through.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export function stopDateToDisplay(s) {
  const m = /^([A-Za-z]+) (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2})(?: ([A-Z]{3,4}))?/.exec(s ?? '')
  if (!m || !MONTHS.includes(m[1])) return s ?? ''
  const pad = (v) => String(v).padStart(2, '0')
  return `${pad(MONTHS.indexOf(m[1]) + 1)}/${pad(m[2])}/${m[3]} ${pad(m[4])}:${m[5]} ${m[6] || 'CST'}`
}

const round2 = (n) => Math.round(n * 100) / 100

// D3 (LINX-14515) — the planner's pick (Prior / New / Quote) is the AP TOTAL,
// the same figure as the Tender tab's AP Cost column (totalCostAmount). The
// row's base rate is what remains after its own additional charges, the
// seed's formula run backwards (generate.mjs: apTotal = baseRate + charges).
// ponytail: a quote's own charges aren't carried in the body, so a quote is
// split against the row's charges; send the quote's rateDetails if they differ.
export function withApTotal(o, apTotal) {
  const d = o.rateDetails
  const charges = (d?.additionalCharges ?? []).reduce((s, c) => s + (c.amount ?? 0), 0)
  const baseRate = round2(apTotal - charges)
  return {
    ...o,
    rateAmount: baseRate,
    totalCostAmount: apTotal,
    rateDetails: d && { ...d, baseRate, apTotal, arTotal: round2(baseRate + (d.markup ?? 0) + charges) },
  }
}

// `stops` are normalized { type, date, lat, lng, timeZone } in sequence. An
// undated stop ('' / '--') leaves the option's own date — Evaluate can't be
// reached with one anyway (stopsSandbox routeBlocker 'undated').
export function applyStopDates(options, stops) {
  const pu = stops.find((s) => s.type === 'pickup')
  const del = stops.findLast((s) => s.type === 'delivery')
  const dated = (s) => (s?.date && s.date !== '--' ? stopDateToDisplay(s.date) : null)
  const puDate = dated(pu)
  const delDate = dated(del)
  return options.map((o) => ({
    ...o,
    pickupDateTime: puDate ?? o.pickupDateTime,
    deliveryDateTime: delDate ?? o.deliveryDateTime,
    pickupTZ: pu?.timeZone ?? o.pickupTZ,
    deliveryTZ: del?.timeZone ?? o.deliveryTZ,
  }))
}

// ponytail: a stand-in for the routing engine the prototype lacks — the base
// rate scales linearly with the new stops' miles over the miles the seeded
// list was priced at (`baselineMiles`), charges stay, and carriers/ranks/
// statuses never change (no carrier re-selection). Replace with a real
// routing call when one exists; every caller already goes through here.
export function rerouteTenderList(options, stops, baselineMiles) {
  const miles = totalMiles(stops)
  const factor = miles && baselineMiles ? miles / baselineMiles : 1
  return applyStopDates(options ?? [], stops).map((o) => {
    const d = o.rateDetails
    if (d?.baseRate == null) return o
    const charges = (d.additionalCharges ?? []).reduce((s, c) => s + (c.amount ?? 0), 0)
    return withApTotal(o, round2(round2(d.baseRate * factor) + charges))
  })
}
