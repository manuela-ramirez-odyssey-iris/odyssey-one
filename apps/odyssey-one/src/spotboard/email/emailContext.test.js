import { buildEmailContext, fmtStamp } from './emailContext.js'

const shipmentDetails = {
  summary: { seedEquipment: 'TL' },
  stopsData: {
    summary: { distance: '727 mi' },
    stops: [
      { type: 'pickup', facilityName: 'Acme Chemical Plant 1', address1: '12345 N. Tryon', city: 'Charlotte', region: 'NC', postal: '28217', country: 'US', scheduledDateTime: 'September 20, 2023 08:00 EDT' },
      { type: 'delivery', facilityName: 'Spartanburg DC', address1: '1 Mill Rd', city: 'Spartanburg', region: 'SC', postal: '29301', country: 'US', scheduledDateTime: 'September 22, 2023 08:00 EDT' },
      { type: 'delivery', facilityName: 'Acme Client Plant2', address1: '123 Main St', city: 'New Orleans', region: 'LA', postal: '70114', country: 'US', scheduledDateTime: 'September 25, 2023 08:00 EDT' },
    ],
  },
  orderDetails: [{ orderNumber: '0000000091142', grossWeightValue: 10500, grossWeightUomCode: 'LB', hazmat: 'No' }],
}
const shipment = { sellShipment: '25000178', customerName: 'Acme Chemical Company' }
const quote = {
  status: 'closed', closeAt: Date.UTC(2023, 8, 8, 15, 44),
  carriers: [
    { scac: 'CCNI', name: 'Cardinal Freight', email: 'ops@ccni.example.com', incl: true, token: 't1', bid: { status: 'bid', total: 2925.05, currency: 'CAD' } },
    { scac: 'ZZZZ', name: 'Other', email: 'ops@zzzz.example.com', incl: true, token: 't2', bid: { status: 'bid', total: 3100, currency: 'CAD' } },
  ],
}

describe('buildEmailContext', () => {
  const ctx = buildEmailContext({ shipmentDetails, shipment, quote, benchmark: 2500, distanceMi: 727 })
  it('reads shipper, origin (first pickup), destination (last delivery), and intermediate stops', () => {
    expect(ctx.shipper).toBe('Acme Chemical Company')
    expect(ctx.from.name).toBe('Acme Chemical Plant 1')
    expect(ctx.from.lines).toEqual(['12345 N. Tryon', 'Charlotte NC 28217 US'])
    expect(ctx.to.name).toBe('Acme Client Plant2')
    expect(ctx.stops).toEqual([{ label: 'S1 - Spartanburg SC 29301 US', date: 'Drop-off: 09/22/2023' }])
  })
  it('formats equipment, weight, hazmat, distance, dates, expiry', () => {
    expect(ctx.equipment).toBe('TL')
    expect(ctx.weight).toBe('10,500 lb')
    expect(ctx.hazmat).toBe('No')
    expect(ctx.distance).toBe('727 mi')
    expect(ctx.pickup).toBe('09/20/2023')
    expect(ctx.deliver).toBe('09/25/2023')
    expect(ctx.offerExpires).toBe(fmtStamp(quote.closeAt))
  })
  it('derives the reference (L + id for single loads, with Order#) and the lowest bid block', () => {
    expect(ctx.reference).toBe('L25000178')
    expect(ctx.orderNumber).toBe('0000000091142')
    expect(ctx.lowest).toEqual({ carrier: 'CCNI - TL', amount: '$2,925.05 CAD', shipDate: '09/20/2023', deliveryDate: '09/25/2023' })
    expect(ctx.quoteId).toBe('25000178')
    expect(ctx.sender).toMatch(/@odysseylogistics\.com$/)
    expect(ctx.appOrigin).toMatch(/^https?:\/\//)
  })
  it('treats a multi-order shipment as a consolidation: C + id, no Order#', () => {
    const consol = { ...shipmentDetails, orderDetails: [shipmentDetails.orderDetails[0], { orderNumber: 'X' }] }
    const c = buildEmailContext({ shipmentDetails: consol, shipment, quote, benchmark: 2500, distanceMi: 727 })
    expect(c.reference).toBe('C25000178')
    expect(c.orderNumber).toBeNull()
  })
  it('never throws on missing details', () => {
    const c = buildEmailContext({ shipmentDetails: null, shipment, quote: null })
    expect(c.shipper).toBe('Acme Chemical Company')
    expect(c.lowest).toBeNull()
    expect(c.from.lines).toEqual([])
  })
})
