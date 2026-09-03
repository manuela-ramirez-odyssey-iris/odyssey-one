import { emailsForQuote } from './emailsForQuote.js'

const base = {
  quoteId: '1', reference: 'L1', orderNumber: 'O1', shipper: 'S',
  from: { name: 'A', lines: [] }, to: { name: 'B', lines: [] },
  equipment: 'TL', weight: '1 lb', hazmat: 'No', distance: '1 mi', pickup: '01/01/2026', deliver: '01/02/2026',
  stops: [], offerExpires: 'x', sender: 's@o.com', plannerGroup: 'p@o.com', appOrigin: 'https://x',
  lowest: { carrier: 'AAAA - TL', amount: '$1.00 USD', shipDate: '01/01/2026', deliveryDate: '01/02/2026' },
}
const carriers = [
  { scac: 'AAAA', name: 'A Co', email: 'a@a', incl: true, token: 'ta', bid: { status: 'bid', total: 1, currency: 'USD' } },
  { scac: 'BBBB', name: 'B Co', email: 'b@b', incl: true, token: 'tb' },
  { scac: 'CCCC', name: 'C Co', email: 'c@c', incl: false, token: 'tc' },
]

describe('emailsForQuote', () => {
  it('open quote: one RFQ per INCLUDED carrier, nothing else', () => {
    const list = emailsForQuote(base, { status: 'open', carriers }, { alertKind: null, awardedScac: null })
    expect(list.map((e) => [e.kind, e.to])).toEqual([['CE-1', 'a@a'], ['CE-1', 'b@b']])
  })
  it('closed out-of-tolerance: RFQs then the IE-2 alert', () => {
    const list = emailsForQuote(base, { status: 'closed', carriers }, { alertKind: 'IE-2', awardedScac: null })
    expect(list.map((e) => e.kind)).toEqual(['CE-1', 'CE-1', 'IE-2'])
  })
  it('awarded: RFQs then CE-2 to the winner with its all-in rate', () => {
    const list = emailsForQuote(base, { status: 'awarded', carriers }, { alertKind: null, awardedScac: 'AAAA' })
    const award = list.find((e) => e.kind === 'CE-2')
    expect(award.to).toBe('a@a')
    expect(award.text).toContain('Your all in rate of 1.00 USD')
  })
  it('every email has a stable id and a "when" label', () => {
    const list = emailsForQuote(base, { status: 'awarded', carriers }, { alertKind: null, awardedScac: 'AAAA' })
    expect(new Set(list.map((e) => e.id)).size).toBe(list.length)
    expect(list.every((e) => typeof e.when === 'string')).toBe(true)
  })
})
