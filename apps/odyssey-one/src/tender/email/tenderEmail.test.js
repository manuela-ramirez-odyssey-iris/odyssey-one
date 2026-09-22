import { tenderEmail, isEmailNotify } from './tenderEmail.js'
import { buildTenderEmailContext, customerForSubject } from './tenderEmailContext.js'

const shipment = {
  odysseyShipmentIdentifier: '50001096',
  customerName: '*USALCO_SYS_01',
  shipmentType: 'L',
  orderDetails: [{ orderNumber: '0000000091142', totalWeight: '10,500 lb', grossWeight: '10,500 lb', hazmat: 'No' }],
  stopsData: {
    summary: { grossWeight: '10,500 lb' },
    stops: [
      { type: 'pickup', location: 'Acme Chemical Plant 1, Charlotte, NC 28217 US', address: '12345 N. Tryon', date: '09/20/2026 08:00 EDT' },
      { type: 'delivery', location: 'Acme Client Plant2, New Orleans, LA 70114 US', address: '123 Main St', date: '09/25/2026 09:00 CDT' },
    ],
  },
  routingData: { options: [] },
}
const option = {
  scac: 'CCNI',
  carrierName: 'Cardinal Freight',
  equipment: 'TL - Truck Load',
  rate: '2,925.05',
  rateDetails: { currency: 'CAD' },
  distance: '727 mi',
  pickupDateTime: '09/20/2026 08:00',
  pickupTZ: 'EDT',
  deliveryDateTime: '09/25/2026 09:00',
  deliveryTZ: 'CDT',
  notifyDateTime: '09/18/2026 14:12 EDT',
  api: 'Email',
  tenderToken: 'tok-abc',
}
const consolidation = {
  ...shipment,
  shipmentType: 'C',
  orderDetails: [...shipment.orderDetails, { orderNumber: '0000000091143', hazmat: 'No' }],
}

describe('tenderEmail — TE-1 (Email)', () => {
  const ctx = buildTenderEmailContext({ shipment, option })
  const m = tenderEmail(ctx)
  it('subject: direct shipment format, verbatim', () => {
    expect(m.subject).toBe('Tender Notification to CCNI of Shipment ID:50001096, for USALCO delivery:0000000091142')
  })
  it('is kind TE-1 with the Review & Respond CTA and the tendered notice', () => {
    expect(m.kind).toBe('TE-1')
    expect(m.html).toContain('Review &amp; Respond')
    expect(m.html).toContain('Tendered 09/18/2026 14:12 EDT')
  })
  it('CTA href carries the token', () => {
    expect(m.html).toContain(`/tender-review/${ctx.token}`)
    expect(m.text).toContain(`/tender-review/${ctx.token}`)
  })
  it('the text twin carries the same key facts as the html', () => {
    expect(m.text).toContain('Shipper: *USALCO_SYS_01')
    expect(m.text).toContain('Carrier: CCNI - Cardinal Freight')
    expect(m.text).toContain('Shipment ID: 50001096')
    expect(m.text).toContain('Offered Rate: 2,925.05 CAD')
  })
  it('envelope: from the planning group, to the synthesized carrier ops address', () => {
    expect(m.from).toMatch(/@odysseylogistics\.com$/)
    expect(m.to).toBe('ops@ccni.example.com')
  })
})

describe('tenderEmail — TE-2 (Email & EDI)', () => {
  const ctx = buildTenderEmailContext({ shipment, option: { ...option, api: 'Email & EDI' } })
  const m = tenderEmail(ctx)
  it('is kind TE-2 with the Review Tender CTA and the EDI notice, no Tendered notice', () => {
    expect(m.kind).toBe('TE-2')
    expect(m.html).toContain('Review Tender')
    expect(m.html).toContain('also sent to you by EDI')
    expect(m.html).not.toContain('Tendered 09/18/2026')
  })
  it('contains no Accept/Decline wording anywhere in html or text', () => {
    expect(m.html).not.toMatch(/accept|decline/i)
    expect(m.text).not.toMatch(/accept|decline/i)
  })
  it('CTA href still carries the token', () => {
    expect(m.html).toContain(`/tender-review/${ctx.token}`)
  })
})

describe('tenderEmail — consolidation subject', () => {
  it('reads "multiple deliveries" instead of a single Order#', () => {
    const ctx = buildTenderEmailContext({ shipment: consolidation, option })
    const m = tenderEmail(ctx)
    expect(m.subject).toBe('Tender Notification to CCNI of Shipment ID:50001096, for USALCO, multiple deliveries')
  })
})

describe('customerForSubject', () => {
  it('*USALCO_SYS_01 -> USALCO', () => {
    expect(customerForSubject('*USALCO_SYS_01')).toBe('USALCO')
  })
  it('leaves a plain name unchanged', () => {
    expect(customerForSubject('Acme Chemical Company')).toBe('Acme Chemical Company')
  })
})

describe('isEmailNotify', () => {
  it('is true for Email and Email & EDI, case-insensitive', () => {
    expect(isEmailNotify('Email')).toBe(true)
    expect(isEmailNotify('email & edi')).toBe(true)
    expect(isEmailNotify('Email & EDI')).toBe(true)
  })
  it('is false for other api values', () => {
    expect(isEmailNotify('EDI')).toBe(false)
    expect(isEmailNotify('Fax')).toBe(false)
    expect(isEmailNotify('Manual')).toBe(false)
    expect(isEmailNotify(undefined)).toBe(false)
  })
})
