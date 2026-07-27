import { describe, expect, it } from 'vitest'
import { mapOrderListRow } from './mapOrderListRow'
import { orderListRowSample } from '../fixtures/orderListRow.sample'
import type { OrderListRow } from '../types/orderList'

describe('mapOrderListRow', () => {
  it('maps the LLD sample row to flat display strings', () => {
    const vm = mapOrderListRow(orderListRowSample)
    expect(vm).toEqual({
      id: 'SUT355123',
      idLabel: 'SUT355123',
      pending: false,
      customer: 'SABIC_CLT',
      origin: 'RGC-STL-001: St Louis, MO',
      destination: 'SAB-CLT-001: Charlotte, NC',
      weight: '4,300 lbs',   // thousands separator (S94 format change)
      volume: '730 cbf',
      commodity: 'Plastic',
      equipment: 'TL',
      earlyPickup: '06/15/2026 08:00',
      status: 'Ready For Plan',
      hazardous: false,
      orderSource: 'Integrated',
      shipDirection: 'Inbound',
      freightTerms: 'Pre-Paid',
      shipperLocation: { id: 'RGC-STL-001', name: '', address: 'St Louis, MO, US' },
      destinationLocation: { id: 'SAB-CLT-001', name: '', address: 'Charlotte, NC, US' },
      latestPickup: 'Jun 15, 2026 at 4:00 PM',
      latestDelivery: 'Jun 18, 2026 at 4:00 PM',
      created: '--',
      createdBy: '--',
      lastEdit: '--',
      draftOrderStatus: '',
      errorCount: null,
    })
  })

  it('is null-safe on a fully sparse row', () => {
    const vm = mapOrderListRow({} as OrderListRow)
    expect(vm.id).toBe('')
    expect(vm.idLabel).toBe('')
    expect(vm.customer).toBe('')
    expect(vm.origin).toBe('')
    expect(vm.destination).toBe('')
    expect(vm.weight).toBe('--')
    expect(vm.volume).toBe('--')
    expect(vm.earlyPickup).toBe('')
    expect(vm.status).toBe('')
  })

  it('renders a number-less async row as pending with a "-" label and an orderId-keyed row id', () => {
    const vm = mapOrderListRow({ ...orderListRowSample, orderNumber: '', orderId: 91004 })
    expect(vm.pending).toBe(true)
    expect(vm.idLabel).toBe('-')
    expect(vm.id).toBe('pending-91004') // unique row key despite the missing number
  })

  it('does NOT mark a sparse row without an orderId as pending', () => {
    const vm = mapOrderListRow({} as OrderListRow)
    expect(vm.pending).toBe(false)
    expect(vm.idLabel).toBe('')
  })

  it('degrades the place format gracefully when parts are missing', () => {
    const partial = {
      ...orderListRowSample,
      consignor: { ...orderListRowSample.consignor, locationId: undefined as unknown as string },
      consignee: { ...orderListRowSample.consignee, city: undefined as unknown as string, state: undefined as unknown as string },
    }
    const vm = mapOrderListRow(partial)
    expect(vm.origin).toBe('St Louis, MO')          // no locationId → city/state only
    expect(vm.destination).toBe('SAB-CLT-001')      // no city/state → id only
  })
})

const baseRow = {
  orderNumber: 'SUT355123', orderSource: 'INTEGRATED', customer: 'SABIC_CLT',
  shipDirection: 'Inbound', freightTerms: 'Pre-Paid', equipment: 'TL',
  consignor: { locationId: 'RGC-STL-001', name: 'J & K INGREDIENTS', address: '900 Hall St SW',
    city: 'St Louis', state: 'MO', country: 'US',
    earliestPickupDateTime: '2026-06-08T06:00:00', latestPickupDateTime: '2026-06-08T08:45:00' },
  consignee: { locationId: 'RGC-BER-002', name: 'Batory Foods', address: '2905 Ridgeland Ave',
    city: 'Berwyn', state: 'IL', country: 'US',
    earliestDeliveryDateTime: '', latestDeliveryDateTime: '' },
  grossWeight: { value: 24530, uom: 'LB' }, volume: { value: 64, uom: 'cuft' },
  commodity: 'Plastic', orderStatus: 'Ready For Plan',
  hazardous: true, createdAt: '2026-06-08T08:45:00', createdBy: 'Amy Cook',
  lastEditAt: '2026-06-09T10:00:00', draftOrderStatus: 'Ready', errorCount: 7,
} satisfies OrderListRow

describe('mapOrderListRow — per-tab grid fields', () => {
  const vm = mapOrderListRow(baseRow)
  it('formats long date-times ("MMM D, YYYY at h:mm AM/PM", no timezone)', () => {
    expect(vm.latestPickup).toBe('Jun 8, 2026 at 8:45 AM')
    expect(vm.created).toBe('Jun 8, 2026 at 8:45 AM')
  })
  it('renders BLANK (not --) for missing date-times (LINX-13590)', () => {
    expect(vm.latestDelivery).toBe('')
  })
  it('builds 3-line location cells', () => {
    expect(vm.shipperLocation).toEqual({
      id: 'RGC-STL-001', name: 'J & K INGREDIENTS',
      address: '900 Hall St SW St Louis, MO, US',
    })
  })
  it('formats measures with thousands separators, -- when absent', () => {
    expect(vm.weight).toBe('24,530 LB')
    expect(mapOrderListRow({ ...baseRow, volume: undefined } as unknown as OrderListRow).volume).toBe('--')
  })
  it('title-cases orderSource for display', () => {
    expect(vm.orderSource).toBe('Integrated')
  })
  it('passes draft + VE fields through with -- empties', () => {
    expect(vm.createdBy).toBe('Amy Cook')
    expect(vm.draftOrderStatus).toBe('Ready')
    expect(vm.errorCount).toBe(7)
    const bare = mapOrderListRow({ ...baseRow, createdBy: undefined, errorCount: undefined })
    expect(bare.createdBy).toBe('--')
    expect(bare.errorCount).toBeNull()
  })
})
