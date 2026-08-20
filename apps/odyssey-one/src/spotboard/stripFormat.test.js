import { describe, it, expect } from 'vitest'
import { cityState, compactWindow } from './stripFormat.js'

describe('cityState', () => {
  it('extracts "City, ST" from a full stop location', () => {
    expect(cityState('NOURYON COLUMBUS PL, Kansas City, MO 64101 US')).toBe('Kansas City, MO')
  })
  it('passes through short/unparseable values', () => {
    expect(cityState('Kansas City')).toBe('Kansas City')
    expect(cityState(undefined)).toBe(undefined)
  })
})

describe('compactWindow', () => {
  it('same-day window → time range', () => {
    expect(compactWindow('03/23/2026 08:00 CDT', '03/23/2026 12:00 CDT')).toBe('08:00 – 12:00 CDT')
  })
  it('multi-day window → date range', () => {
    expect(compactWindow('03/23/2026 08:00 CDT', '03/25/2026 12:00 CDT')).toBe('03/23 – 03/25')
  })
  it('missing side → the present side, dash when neither', () => {
    expect(compactWindow('03/23/2026 08:00 CDT', '--')).toBe('03/23/2026 08:00 CDT')
    expect(compactWindow('--', '--')).toBe('--')
  })
})
