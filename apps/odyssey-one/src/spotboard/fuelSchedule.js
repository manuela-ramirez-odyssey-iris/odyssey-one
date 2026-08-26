const round2 = (n) => Math.round(n * 100) / 100

// OCM fuel schedule (SPB-64, Kathleen email 2026-08-24 item #1): fuel is not
// carrier-editable — it comes from a configured OCM fuel schedule, either a
// rate per mile or a percentage of the linehaul. No schedule configured → the
// fuel section does not appear at all (the carrier may then add fuel manually
// as an ordinary extra charge — today's TMS behavior).
//
// ponytail: the real schedule lives in TMS OCM config we don't hold — this
// SEEDS one deterministically per carrier SCAC (stable across reseeds, since
// SCACs are stable), covering all three ruled states across the carrier set:
// roughly a third each none / per-mile / percentage. Swap for the real OCM
// lookup when the spot service exposes it.
export function getFuelSchedule(scac) {
  if (!scac) return null
  const h = [...String(scac)].reduce((a, c) => a + c.charCodeAt(0), 0)
  const mode = h % 3
  if (mode === 0) return null
  if (mode === 1) return { type: 'perMile', rate: round2(0.35 + (h % 20) / 100) } // $0.35–0.54 / mi
  return { type: 'pctLinehaul', pct: 12 + (h % 14) } // 12–25% of linehaul
}

// Resolves the fuel amount for a schedule. Returns null when it cannot
// resolve yet: a pctLinehaul schedule before the carrier has left the base
// rate field (SPB-64: "if a percentage, it resolves once the carrier leaves
// the base rate field" — the caller passes `linehaul: null` until that blur),
// or a perMile schedule with no usable distance.
export function computeFuel(schedule, { distanceMiles, linehaul }) {
  if (!schedule) return null
  if (schedule.type === 'perMile') {
    if (!Number.isFinite(distanceMiles) || distanceMiles <= 0) return null
    return round2(schedule.rate * distanceMiles)
  }
  if (linehaul == null || !Number.isFinite(linehaul)) return null
  return round2(linehaul * (schedule.pct / 100))
}
