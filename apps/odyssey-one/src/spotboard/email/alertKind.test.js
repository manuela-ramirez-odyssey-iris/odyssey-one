import { alertKindFor } from './alertKind.js'

const bid = { total: 1000, status: 'bid' }
const open = { status: 'open', carriers: [{ incl: true, bid }] }
const closedWith = { status: 'closed', carriers: [{ incl: true, bid }] }
const closedNone = { status: 'closed', carriers: [{ incl: true }, { incl: true, bid: { status: 'declined' } }] }

describe('alertKindFor', () => {
  it('is null while the quote is open or awarded', () => {
    expect(alertKindFor({ quote: open, benchmark: 900, distanceMi: 700 })).toBeNull()
    expect(alertKindFor({ quote: { ...closedWith, status: 'awarded' }, benchmark: 900, distanceMi: 700 })).toBeNull()
  })
  it('IE-4 when the quote was invalidated by an order change', () => {
    expect(alertKindFor({ quote: { ...closedWith, status: 'invalidated' } })).toBe('IE-4')
  })
  it('IE-1 when closed with zero bids', () => {
    expect(alertKindFor({ quote: closedNone, benchmark: 900, distanceMi: 700 })).toBe('IE-1')
  })
  it('IE-6 when no benchmark and no distance; IE-5 when no benchmark but distance exists', () => {
    expect(alertKindFor({ quote: closedWith, benchmark: 0, distanceMi: null })).toBe('IE-6')
    expect(alertKindFor({ quote: closedWith, benchmark: 0, distanceMi: 700 })).toBe('IE-5')
  })
  it('IE-3 on manual review, IE-2 out of tolerance, null when within', () => {
    expect(alertKindFor({ quote: closedWith, benchmark: 900, distanceMi: 700, evaluation: { reason: 'manual-review' } })).toBe('IE-3')
    expect(alertKindFor({ quote: closedWith, benchmark: 900, distanceMi: 700, evaluation: { reason: 'out-of-tolerance' } })).toBe('IE-2')
    expect(alertKindFor({ quote: closedWith, benchmark: 900, distanceMi: 700, evaluation: { reason: 'total-cap' } })).toBe('IE-2')
    expect(alertKindFor({ quote: closedWith, benchmark: 900, distanceMi: 700, evaluation: { reason: 'within' } })).toBeNull()
  })
})
