import { buildTenderEmailContext, customerForSubject } from './tenderEmailContext.js'

const shipment = {
  odysseyShipmentIdentifier: '50001096',
  customerName: '*USALCO_SYS_01',
  shipmentType: 'L',
  orderDetails: [
    { orderNumber: '0000000091142', totalWeight: '10,500 lb', grossWeight: '10,500 lb', hazmat: 'No' },
  ],
  stopsData: {
    summary: { grossWeight: '10,500 lb' },
    stops: [
      { type: 'pickup', location: 'Acme Chemical Plant 1, Charlotte, NC 28217 US', address: '12345 N. Tryon', date: '09/20/2026 08:00 EDT' },
      { type: 'delivery', location: 'Spartanburg DC, Spartanburg, SC 29301 US', address: '1 Mill Rd', date: '09/22/2026 08:00 EDT' },
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

describe('buildTenderEmailContext', () => {
  const ctx = buildTenderEmailContext({ shipment, option })
  it('reads carrier/customer/shipment identity off the option and shipment', () => {
    expect(ctx.scac).toBe('CCNI')
    expect(ctx.carrierName).toBe('Cardinal Freight')
    expect(ctx.customerName).toBe('*USALCO_SYS_01')
    expect(ctx.odysseyShipmentIdentifier).toBe('50001096')
  })
  it('normalizes the subject customer name via customerForSubject', () => {
    expect(ctx.customerForSubject).toBe('USALCO')
  })
  it('is not a consolidation for a single order / shipmentType L', () => {
    expect(ctx.consolidation).toBe(false)
    expect(ctx.orderNumber).toBe('0000000091142')
  })
  it('maps addresses off first pickup / last delivery stop', () => {
    expect(ctx.from.name).toBe('Acme Chemical Plant 1, Charlotte, NC 28217 US')
    expect(ctx.from.lines).toEqual(['12345 N. Tryon'])
    expect(ctx.to.name).toBe('Acme Client Plant2, New Orleans, LA 70114 US')
    expect(ctx.stops).toEqual([{ label: 'Stop - Spartanburg DC, Spartanburg, SC 29301 US', date: 'Drop-off: 09/22/2026 08:00 EDT' }])
  })
  it('carries pickup/delivery lines, rate and token off the option', () => {
    expect(ctx.pickupLine).toBe('09/20/2026 08:00 (EDT)')
    expect(ctx.deliverLine).toBe('09/25/2026 09:00 (CDT)')
    expect(ctx.offeredRate).toBe('2,925.05 CAD')
    expect(ctx.token).toBe('tok-abc')
    expect(ctx.api).toBe('Email')
  })
  it('treats shipmentType C or >1 order as a consolidation, no orderNumber', () => {
    const consol = { ...shipment, shipmentType: 'C', orderDetails: [...shipment.orderDetails, { orderNumber: 'X', hazmat: 'No' }] }
    const c = buildTenderEmailContext({ shipment: consol, option })
    expect(c.consolidation).toBe(true)
    expect(c.orderNumber).toBeNull()
  })
  it('falls back distance to another option on the shipment when the tendered option has none', () => {
    const noDistanceOption = { ...option, distance: '--' }
    const withFallback = { ...shipment, routingData: { options: [{ distance: '512 mi' }] } }
    const c = buildTenderEmailContext({ shipment: withFallback, option: noDistanceOption })
    expect(c.distance).toBe('512 mi')
  })
  it('falls back weight to the first order when the shipment summary has none', () => {
    const noSummaryWeight = { ...shipment, stopsData: { ...shipment.stopsData, summary: { grossWeight: '--' } } }
    const c = buildTenderEmailContext({ shipment: noSummaryWeight, option })
    expect(c.weight).toBe('10,500 lb')
  })
  it('never throws on missing data', () => {
    const c = buildTenderEmailContext({ shipment: null, option: null })
    expect(c.scac).toBe('')
    expect(c.from.lines).toEqual([])
    expect(c.consolidation).toBe(false)
  })
})

describe('customerForSubject', () => {
  it('strips a leading * and anything from _SYS onward', () => {
    expect(customerForSubject('*USALCO_SYS_01')).toBe('USALCO')
  })
  it('leaves a plain name unchanged', () => {
    expect(customerForSubject('Acme Chemical Company')).toBe('Acme Chemical Company')
  })
})
