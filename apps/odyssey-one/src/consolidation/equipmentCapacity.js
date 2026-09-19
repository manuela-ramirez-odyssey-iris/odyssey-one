// ponytail: placeholder capacities per equipment code — no equipment master
// exists in this prototype and no one has given us the capacity rule (spec
// open question 2). Utilization = total / capacity. Replace this table with
// the real rule when Dave provides it; the callers only use capacityFor().
// Codes = EQUIPMENT_LABELS in tools/data-pools.mjs.
export const EQUIPMENT_CAPACITY = {
  TL:  { weightLb: 45000, volumeCuft: 3800 },
  TLR: { weightLb: 43000, volumeCuft: 3400 },
  TLH: { weightLb: 45000, volumeCuft: 3800 },
  TLF: { weightLb: 43000, volumeCuft: 3400 },
  TT:  { weightLb: 48000, volumeCuft: 900 },
  LTL: { weightLb: 20000, volumeCuft: 1500 },
  LTR: { weightLb: 18000, volumeCuft: 1300 },
  LTH: { weightLb: 20000, volumeCuft: 1500 },
  LCL: { weightLb: 25000, volumeCuft: 1000 },
  FCL: { weightLb: 44000, volumeCuft: 2350 },
  RR:  { weightLb: 200000, volumeCuft: 6000 },
}
export const DEFAULT_CAPACITY = { weightLb: 45000, volumeCuft: 3800 }

export function capacityFor(code) {
  return (code && EQUIPMENT_CAPACITY[code]) || DEFAULT_CAPACITY
}

/** Whole-percent utilization, or null when there is no total to divide. */
export function utilizationPct(total, capacity) {
  if (total == null || !capacity) return null
  return Math.round((total / capacity) * 100)
}
