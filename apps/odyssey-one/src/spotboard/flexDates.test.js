import { describe, it, expect } from 'vitest'
import { allowableDates } from './flexDates.js'

// 10/14/2026 is a Wednesday. Sundays are out for everyone; ODFL's hash also
// drops Saturdays (see NON_OP_SATURDAY in the module).
describe('allowableDates', () => {
  it('returns planned ± N as YYYY-MM-DD, skipping Sundays', () => {
    expect(allowableDates('10/14/2026', 2, 'SAIA')).toEqual([
      '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16',
    ])
    expect(allowableDates('10/17/2026', 1, 'SAIA')).toEqual(['2026-10-16', '2026-10-17']) // Sun 18th dropped
  })
  it('drops Saturdays for a carrier whose calendar has them off', () => {
    expect(allowableDates('10/17/2026', 1, 'ODFL')).toEqual(['2026-10-16']) // Sat 17th + Sun 18th dropped
  })
  it('drops seeded holidays', () => {
    expect(allowableDates('12/24/2026', 1, 'SAIA')).toEqual(['2026-12-23', '2026-12-24']) // Christmas dropped
  })
  it('returns [] when the anchor is not MM/DD/YYYY or N is not configured', () => {
    expect(allowableDates('', 3, 'SAIA')).toEqual([])
    expect(allowableDates('2026-08-10 08:00', 3, 'SAIA')).toEqual([])
    expect(allowableDates('10/14/2026', null, 'SAIA')).toEqual([])
  })
})
