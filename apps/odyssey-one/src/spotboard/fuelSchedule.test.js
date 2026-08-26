import { describe, it, expect } from 'vitest'
import { getFuelSchedule, computeFuel } from './fuelSchedule'

describe('getFuelSchedule (SPB-64 seeded OCM fuel schedule)', () => {
  it('is deterministic per SCAC', () => {
    expect(getFuelSchedule('ODFL')).toEqual(getFuelSchedule('ODFL'))
  })

  it('returns null for a missing SCAC', () => {
    expect(getFuelSchedule(null)).toBeNull()
    expect(getFuelSchedule('')).toBeNull()
  })

  it('covers all three ruled states across a carrier population', () => {
    const scacs = ['ODFL', 'KNGT', 'ARVY', 'FFAJ', 'KCNT', 'TQYL', 'CTNS', 'MAFL', 'AGVS', 'TLDY', 'GWYW', 'LSGA']
    const modes = new Set(scacs.map((s) => getFuelSchedule(s)?.type ?? 'none'))
    expect(modes).toEqual(new Set(['none', 'perMile', 'pctLinehaul']))
  })

  it('keeps rates and percentages in plausible ranges', () => {
    for (let i = 0; i < 200; i++) {
      const s = getFuelSchedule(`S${i}`)
      if (!s) continue
      if (s.type === 'perMile') expect(s.rate).toBeGreaterThanOrEqual(0.35)
      if (s.type === 'perMile') expect(s.rate).toBeLessThan(0.55)
      if (s.type === 'pctLinehaul') expect(s.pct).toBeGreaterThanOrEqual(12)
      if (s.type === 'pctLinehaul') expect(s.pct).toBeLessThan(26)
    }
  })
})

describe('computeFuel', () => {
  it('perMile resolves off distance', () => {
    expect(computeFuel({ type: 'perMile', rate: 0.4 }, { distanceMiles: 100 })).toBe(40)
  })

  it('perMile with no usable distance cannot resolve', () => {
    expect(computeFuel({ type: 'perMile', rate: 0.4 }, { distanceMiles: NaN })).toBeNull()
    expect(computeFuel({ type: 'perMile', rate: 0.4 }, { distanceMiles: 0 })).toBeNull()
  })

  it('pctLinehaul resolves off linehaul, null until one exists (blur gate)', () => {
    expect(computeFuel({ type: 'pctLinehaul', pct: 20 }, { linehaul: 2000 })).toBe(400)
    expect(computeFuel({ type: 'pctLinehaul', pct: 20 }, { linehaul: null })).toBeNull()
  })

  it('no schedule → null', () => {
    expect(computeFuel(null, { linehaul: 2000, distanceMiles: 100 })).toBeNull()
  })
})
