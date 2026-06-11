import type { OrderListRow } from '../types/orderList'

// Sample row for mapper/service tests — values track the LLD /order/list example
// ("SUT355123", "SABIC_CLT", "RGC-STL-001", 4300 lbs, 730 cbf, "Ready For Plan").
export const orderListRowSample: OrderListRow = {
  orderNumber: 'SUT355123',
  orderSource: 'INTEGRATED',
  customer: 'SABIC_CLT',
  shipDirection: 'Inbound',
  freightTerms: 'Pre-Paid',
  equipment: 'TL',
  consignor: {
    locationId: 'RGC-STL-001',
    city: 'St Louis',
    state: 'MO',
    country: 'US',
    earliestPickupDateTime: '2026-06-15T08:00:00.000Z',
    latestPickupDateTime: '2026-06-15T16:00:00.000Z',
  },
  consignee: {
    locationId: 'SAB-CLT-001',
    city: 'Charlotte',
    state: 'NC',
    country: 'US',
    earliestDeliveryDateTime: '2026-06-18T08:00:00.000Z',
    latestDeliveryDateTime: '2026-06-18T16:00:00.000Z',
  },
  grossWeight: { value: 4300, uom: 'lbs' },
  volume: { value: 730, uom: 'cbf' },
  commodity: 'Plastic',
  orderStatus: 'Ready For Plan',
}
