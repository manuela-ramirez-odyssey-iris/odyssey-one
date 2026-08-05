// Benchmark, tolerance & markup logic for SpotBoard spot-bidding.
import { parseDollar } from '../utils/money.js'

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Highest total routed cost among options with a numeric cost; falls back to
// ratePerMile * distanceMi (per-mile estimate) when no option has one.
export function benchmark(routingOptions, { ratePerMile, distanceMi } = {}) {
  const costs = routingOptions
    .map((o) => parseDollar(o.cost))
    .filter((n) => n != null)
  if (costs.length > 0) return Math.max(...costs)
  if (!Number.isFinite(ratePerMile) || !Number.isFinite(distanceMi)) return 0
  return ratePerMile * distanceMi
}

export function evaluateTolerance({ lowestBid, benchmark, tolerancePct, monetaryCap, totalCap, manualReview }) {
  let ceiling = benchmark * (1 + tolerancePct / 100)
  if (monetaryCap != null) ceiling = Math.min(ceiling, benchmark + monetaryCap)
  ceiling = round2(ceiling)

  let reason = 'within'
  let withinTolerance = true
  if (manualReview) {
    withinTolerance = false
    reason = 'manual-review'
  } else if (totalCap != null && lowestBid > totalCap) {
    withinTolerance = false
    reason = 'total-cap'
  } else if (lowestBid > ceiling) {
    withinTolerance = false
    reason = 'out-of-tolerance'
  }

  return { ceiling, withinTolerance, reason }
}

// Appends a QMU ('QUOTE MARKUP') line to the bid's charges and totals them.
export function applyMarkup({ linehaul, fuel, accessorials }, { type, value }) {
  const charges = [
    { code: 'LH', description: 'Linehaul', amount: linehaul },
    { code: 'FSC', description: 'Fuel', amount: fuel },
    ...accessorials.map((a) => ({ code: a.code, description: a.description || a.code, amount: a.amount })),
  ]
  const subtotal = charges.reduce((sum, c) => sum + c.amount, 0)
  const qmuAmount = round2(type === 'pct' ? subtotal * (value / 100) : value)
  charges.push({ code: 'QMU', description: 'QUOTE MARKUP', amount: qmuAmount })

  const total = round2(subtotal + qmuAmount)
  return { charges, total }
}
