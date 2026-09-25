import { describe, it, expect } from 'vitest'
import { legMiles, totalMiles } from './legMiles.js'

const p = (lat, lng) => ({ lat, lng })

describe('legMiles', () => {
  it('returns a positive road-mile number for two coordinated points', () => {
    expect(legMiles(p(29.76, -95.37), p(32.78, -96.80))).toBeGreaterThan(0)
  })
  it('returns null when either point is missing a coordinate', () => {
    expect(legMiles(p(29.76, -95.37), {})).toBeNull()
    expect(legMiles(null, p(29.76, -95.37))).toBeNull()
  })
})

// Bug fix (S160 follow-up, live 25390278) — a coordinate-less created stop
// used to silently sum to "0.00 mi" instead of reading as unknown.
describe('totalMiles', () => {
  it('sums every leg when all stops have coordinates', () => {
    const stops = [p(29.76, -95.37), p(32.78, -96.80), p(30.21, -91.03)]
    expect(totalMiles(stops)).toBeGreaterThan(0)
  })
  it('returns null the moment any leg is unknown, not a partial/zero sum', () => {
    const stops = [p(29.76, -95.37), {}, p(30.21, -91.03)]
    expect(totalMiles(stops)).toBeNull()
  })
  it('returns 0 for a single stop (no legs at all — not "unknown")', () => {
    expect(totalMiles([p(29.76, -95.37)])).toBe(0)
  })
})
