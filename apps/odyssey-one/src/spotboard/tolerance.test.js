import { describe, it, expect } from 'vitest'
import { benchmark, evaluateTolerance, applyMarkup } from './tolerance.js'

describe('benchmark', () => {
  it('returns the highest total routed cost among options with a numeric cost', () => {
    expect(
      benchmark([{ cost: '$2,800 USD' }, { cost: '$2,500 USD' }], {})
    ).toBe(2800)
  })

  it('falls back to ratePerMile * distanceMi when no options have a numeric cost', () => {
    expect(benchmark([], { ratePerMile: 2, distanceMi: 900 })).toBe(1800)
  })

  it('returns 0 instead of NaN when there are no costs and no args at all', () => {
    expect(benchmark([], {})).toBe(0)
  })

  it('returns 0 instead of NaN when ratePerMile is missing', () => {
    expect(benchmark([], { ratePerMile: undefined, distanceMi: 900 })).toBe(0)
  })
})

describe('evaluateTolerance', () => {
  it('is within tolerance when lowestBid <= ceiling', () => {
    expect(
      evaluateTolerance({ lowestBid: 2540, benchmark: 2800, tolerancePct: 5, manualReview: false })
    ).toEqual({ ceiling: 2940, withinTolerance: true, reason: 'within' })
  })

  it('is out of tolerance when lowestBid > ceiling', () => {
    expect(
      evaluateTolerance({ lowestBid: 3000, benchmark: 2800, tolerancePct: 5, manualReview: false })
    ).toMatchObject({ withinTolerance: false, reason: 'out-of-tolerance' })
  })

  it('flags manual-review even when within the tolerance ceiling', () => {
    expect(
      evaluateTolerance({ lowestBid: 2540, benchmark: 2800, tolerancePct: 5, manualReview: true })
    ).toMatchObject({ withinTolerance: false, reason: 'manual-review' })
  })

  it('flags total-cap when lowestBid exceeds totalCap even though under the tolerance ceiling', () => {
    expect(
      evaluateTolerance({ lowestBid: 2900, benchmark: 2800, tolerancePct: 10, totalCap: 2850 })
    ).toMatchObject({ withinTolerance: false, reason: 'total-cap' })
  })
})

describe('applyMarkup', () => {
  it('appends a flat QMU charge and totals the lines', () => {
    const result = applyMarkup({ linehaul: 2540, fuel: 0, accessorials: [] }, { type: 'flat', value: 150 })
    expect(result.total).toBe(2690)
    expect(result.charges[result.charges.length - 1]).toMatchObject({ code: 'QMU', amount: 150 })
  })

  it('computes a pct QMU charge off linehaul + fuel + accessorials', () => {
    const result = applyMarkup({ linehaul: 100, fuel: 0, accessorials: [] }, { type: 'pct', value: 50 })
    expect(result.total).toBe(150)
  })

  it('preserves an accessorial description when present, falls back to code when absent', () => {
    const result = applyMarkup(
      {
        linehaul: 100,
        fuel: 0,
        accessorials: [
          { code: 'LIFT', description: 'Liftgate service', amount: 25 },
          { code: 'DET', amount: 10 },
        ],
      },
      { type: 'flat', value: 0 }
    )
    expect(result.charges).toContainEqual({ code: 'LIFT', description: 'Liftgate service', amount: 25 })
    expect(result.charges).toContainEqual({ code: 'DET', description: 'DET', amount: 10 })
  })
})
