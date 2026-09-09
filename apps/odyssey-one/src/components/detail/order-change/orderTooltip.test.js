import { describe, it, expect } from 'vitest'
import { orderTooltipProps } from './orderTooltip'

const o = { orderNumber: '4859', planningType: 'SSD', earliestPickup: '06/04/2026 08:00 CST', earliestDelivery: '06/06/2026 10:00 CST', grossWeight: '500 LB', totalVolume: '30 cuft', shipFrom: { location: '30301, Atlanta, GA, US' }, shipTo: { location: '55401, Minneapolis, MN, US' } }

describe('orderTooltipProps (VD 2143-11775)', () => {
  it('pickup leg: header + six groups with the pickup date', () => {
    const p = orderTooltipProps(o, 'pickup')
    expect(p.label).toBe('Order Number: 4859')
    expect(p.groups.map((g) => g.subtitle)).toEqual(['Planning Type', 'Pickup Date Time', 'Gross Weight', 'Volume', 'Origin', 'Destination'])
    expect(p.groups[1].content).toBe('06/04/2026 08:00 CST')
    expect(p.groups[2].content).toBe('500 LB')
  })
  it('delivery leg uses the delivery date; no leg shows both', () => {
    expect(orderTooltipProps(o, 'delivery').groups[1]).toEqual({ subtitle: 'Delivery Date Time', content: '06/06/2026 10:00 CST' })
    expect(orderTooltipProps(o).groups[1]).toEqual({ subtitle: 'Pickup / Delivery Date Time', content: '06/04/2026 08:00 CST / 06/06/2026 10:00 CST' })
  })
  it('missing order → header only', () => {
    expect(orderTooltipProps(undefined, 'pickup', 'X')).toEqual({ label: 'Order Number: X', groups: [] })
  })
})
