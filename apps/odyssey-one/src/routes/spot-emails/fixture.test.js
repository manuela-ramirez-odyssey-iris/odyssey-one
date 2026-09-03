import { SCENARIOS, emailsForScenario } from './fixture.js'

describe('spot-emails fixture', () => {
  it('offers one scenario per outcome, each with a label', () => {
    expect(SCENARIOS.map((s) => s.key)).toEqual([
      'sent', 'no-bids', 'out-of-tolerance', 'manual-review', 'cancelled', 'no-lce', 'no-distance', 'awarded',
    ])
    expect(SCENARIOS.every((s) => typeof s.label === 'string' && s.label.length > 0)).toBe(true)
  })
  it('sent: RFQs only', () => {
    expect(emailsForScenario('sent').map((e) => e.kind)).toEqual(['CE-1', 'CE-1', 'CE-1'])
  })
  it('each closed scenario adds exactly its own alert', () => {
    const kindOf = (k) => emailsForScenario(k).map((e) => e.kind).filter((x) => x.startsWith('IE'))
    expect(kindOf('no-bids')).toEqual(['IE-1'])
    expect(kindOf('out-of-tolerance')).toEqual(['IE-2'])
    expect(kindOf('manual-review')).toEqual(['IE-3'])
    expect(kindOf('cancelled')).toEqual(['IE-4'])
    expect(kindOf('no-lce')).toEqual(['IE-5'])
    expect(kindOf('no-distance')).toEqual(['IE-6'])
  })
  it('awarded: RFQs plus CE-2 to the winner', () => {
    const list = emailsForScenario('awarded')
    const award = list.find((e) => e.kind === 'CE-2')
    expect(award).toBeTruthy()
    expect(award.to).toContain('@')
  })
  it('every scenario together covers all eight emails', () => {
    const all = new Set(SCENARIOS.flatMap((s) => emailsForScenario(s.key).map((e) => e.kind)))
    expect([...all].sort()).toEqual(['CE-1', 'CE-2', 'IE-1', 'IE-2', 'IE-3', 'IE-4', 'IE-5', 'IE-6'])
  })
})
