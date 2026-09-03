import { rfqEmail, awardEmail, alertEmail, ALERT_KINDS } from './templates.js'

const ctx = {
  quoteId: '14903', reference: 'C11562', orderNumber: null,
  shipper: 'Acme Chemical Company',
  from: { name: 'Acme Chemical Plant 1', lines: ['12345 N. Tryon', 'Charlotte NC 28217 US'] },
  to: { name: 'Acme Client Plant2', lines: ['123 Main St', 'New Orleans LA 70114 US'] },
  equipment: 'TL - Truck Load', weight: '10,500 lb', hazmat: 'No', distance: '727 mi',
  pickup: '09/20/2023', deliver: '09/25/2023',
  stops: [{ label: 'Stop - Spartanburg SC 29301 US', date: 'Drop-off: 09/22/2023' }],
  offerExpires: '09/08/2023 11:44 EST',
  sender: 'planning@odysseylogistics.com', plannerGroup: 'planning@odysseylogistics.com',
  appOrigin: 'https://odyssey-one-stage.vercel.app',
  lowest: { carrier: 'CCNI - TL', amount: '$2,925.05 CAD', shipDate: '09/20/2023', deliveryDate: '09/25/2023' },
}
const carrier = { scac: 'CCNI', name: 'Cardinal Freight', email: 'ops@ccni.example.com', token: 'tok-ccni' }

describe('CE-1 rfqEmail', () => {
  const m = rfqEmail(ctx, carrier)
  it('uses the legacy subject pattern and the planning-group sender', () => {
    expect(m.subject).toBe('Request for Quote to CCNI for Quote No: 14903, for ACME CHEMICAL COMPANY')
    expect(m.from).toBe('planning@odysseylogistics.com')
    expect(m.to).toBe('ops@ccni.example.com')
  })
  it('is a data sheet with the token link and NO order/load id', () => {
    expect(m.text).toContain('Offer Expires: 09/08/2023 11:44 EST')
    expect(m.text).toContain('Quote#: 14903')
    expect(m.text).toContain('Distance: 727 mi')
    expect(m.text).toContain('Stop Offs:')
    expect(m.text).toContain('Stop - Spartanburg SC 29301 US')
    expect(m.text).toContain('https://odyssey-one-stage.vercel.app/spot-bid/tok-ccni')
    expect(m.text).not.toMatch(/Order#|Load#|Reference#/)
    expect(m.html).toContain('href="https://odyssey-one-stage.vercel.app/spot-bid/tok-ccni"')
    expect(m.html).toContain('Stop - Spartanburg SC 29301 US')
    expect(m.html).not.toMatch(/Reference#/)
  })
  it('puts Distance directly under Pickup/Deliver, stop-offs below it', () => {
    expect(m.html.indexOf('Deliver')).toBeLessThan(m.html.indexOf('Distance'))
    expect(m.html.indexOf('Distance')).toBeLessThan(m.html.indexOf('Stop - Spartanburg SC 29301 US'))
  })
  it('sets off the whole stops group with one hairline above it, none between stops', () => {
    const multi = rfqEmail({ ...ctx, stops: [
      { label: 'Stop - Spartanburg SC 29301 US', date: 'Drop-off: 09/22/2023' },
      { label: 'Stop - Atlanta GA 30301 US', date: 'Drop-off: 09/23/2023' },
      { label: 'Stop - Mobile AL 36601 US', date: 'Drop-off: 09/24/2023' },
    ] }, carrier)
    // one rule above the stops group, plus the footer's own border-top — never
    // one per stop, regardless of how many stops there are.
    expect(multi.html.match(/border-top:1px solid #E4E6EB;/g)).toHaveLength(2)
    // single stop: still gets its own group rule, plus the footer's border-top
    expect(m.html.match(/border-top:1px solid #E4E6EB;/g)).toHaveLength(2)
  })
})

describe('CE-2 awardEmail', () => {
  const m = awardEmail(ctx, carrier, '2259.05 CAD')
  it('matches the legacy wording and names the tender as a separate step', () => {
    expect(m.subject).toBe('Quote Request 14903 Awarded')
    expect(m.text).toContain('Great news! Your all in rate of 2259.05 CAD has been approved.')
    expect(m.text).toContain('Please accept the EDI or email tender at your earliest convenience.')
    expect(m.text).toContain('Quote#: 14903')
    expect(m.text).not.toMatch(/Order#|Load#/)
  })
  it('does not repeat the "Great news!" greeting in the HTML body', () => {
    expect(m.html).toContain('Great news!')
    expect(m.html.match(/Great news!/g)).toHaveLength(1)
    expect(m.html).toContain('Your all in rate of 2259.05 CAD has been approved.')
  })
})

describe('IE-* alertEmail', () => {
  it('knows six kinds', () => {
    expect(ALERT_KINDS).toEqual(['IE-1', 'IE-2', 'IE-3', 'IE-4', 'IE-5', 'IE-6'])
  })
  it('IE-1 uses the Attention skeleton with no bid block', () => {
    const m = alertEmail('IE-1', { ...ctx, lowest: null })
    expect(m.subject).toBe('Attention - Quote Request 14903 closed with no carrier bids submitted.')
    expect(m.to).toBe('planning@odysseylogistics.com')
    expect(m.text.split('\n')[0]).toBe(m.subject)
    expect(m.text).toContain('Reference#: C11562')
    expect(m.text).not.toContain('Order#')
    expect(m.text).not.toContain('Lowest Cost Carrier')
  })
  it('IE-2 appends the lowest-bid block when a bid exists', () => {
    const m = alertEmail('IE-2', ctx)
    expect(m.subject).toBe('Attention - Quote Request 14903 closed and the lowest cost carrier is out of tolerance.')
    expect(m.text).toContain('Lowest Cost Carrier: CCNI - TL')
    expect(m.text).toContain('Quoted Amount: $2,925.05 CAD')
    expect(m.text).toContain('Ship Date: 09/20/2023')
  })
  it('IE-3 has two shapes: with and without the bid block', () => {
    expect(alertEmail('IE-3', ctx).text).toContain('Lowest Cost Carrier')
    expect(alertEmail('IE-3', { ...ctx, lowest: null }).text).not.toContain('Lowest Cost Carrier')
    expect(alertEmail('IE-3', ctx).subject).toBe('Attention - Quote Request 14903 closed and Manual Review = Yes.  Please review quote responses immediately.')
  })
  it('IE-4 carries the cancellation body', () => {
    const m = alertEmail('IE-4', ctx)
    expect(m.subject).toBe('Attention - Quote Request 14903 Cancelled, Consolidation Impacted by Order Change')
    expect(m.text).toContain('Your consolidation has changed.')
    expect(m.text).toContain('Do not process any bids associated with this consolidation.')
  })
  it('IE-5 / IE-6 show Order# for single loads', () => {
    const single = { ...ctx, reference: 'L31429', orderNumber: 'ACME-09082023.001', lowest: null }
    expect(alertEmail('IE-5', single).text).toContain('Order#: ACME-09082023.001')
    expect(alertEmail('IE-6', single).subject).toBe('Attention - Quote Request 14903 closed and no distance was found to calculate an estimated costed LCE option.')
  })
  it('rejects unknown kinds', () => {
    expect(() => alertEmail('IE-9', ctx)).toThrow()
  })
  it('renders a hairline divider between Ship From/Ship To', () => {
    expect(alertEmail('IE-1', { ...ctx, lowest: null }).html).toContain('border-left:1px solid #E4E6EB;')
  })
})

describe('every email carries the Ship From/Ship To divider', () => {
  it('rfqEmail (CE-1) has the divider, additive to its route band', () => {
    expect(rfqEmail(ctx, carrier).html).toContain('border-left:1px solid #E4E6EB;')
  })
  it('awardEmail (CE-2) has the divider', () => {
    expect(awardEmail(ctx, carrier, '2259.05 CAD').html).toContain('border-left:1px solid #E4E6EB;')
  })
})
