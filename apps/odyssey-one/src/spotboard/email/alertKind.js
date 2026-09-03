// Maps a closed quote's outcome to the planner alert it fires (PRD Feature 11,
// SPB-78). Precedence follows the legacy close routine: cancellation, then
// no bids, then "cannot evaluate tolerance" (no benchmark: no distance → IE-6,
// else IE-5), then the tolerance verdict. `within` fires nothing — auto-award.
export function alertKindFor({ quote, evaluation, benchmark, distanceMi }) {
  if (!quote) return null
  if (quote.status === 'invalidated') return 'IE-4'
  if (quote.status !== 'closed') return null
  const bids = (quote.carriers ?? []).filter((c) => c.incl && c.bid?.status === 'bid')
  if (bids.length === 0) return 'IE-1'
  if (!benchmark) return Number.isFinite(distanceMi) && distanceMi > 0 ? 'IE-5' : 'IE-6'
  switch (evaluation?.reason) {
    case 'manual-review': return 'IE-3'
    case 'out-of-tolerance':
    case 'total-cap': return 'IE-2'
    default: return null
  }
}
