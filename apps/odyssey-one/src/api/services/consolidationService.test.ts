import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))

import { applyConsolidation, __resetConsolidationSeq } from './consolidationService'
import { addShipment, getAllShipments, __resetShipmentWriteState } from '../../data'
import { getSellShipmentDetail } from './shipmentService'

// The editor's StopDto[] for the sources n… (pickups, then deliveries), and the S7.1 body.
const stopsFor = (...ns: number[]) => [
  ...ns.map((n) => ({ stopType: 'pickup', orderIds: [`ORD-${n}`], sourceSellShipment: `2609000${n}`, sourceStopSequence: 1 })),
  ...ns.map((n) => ({ stopType: 'delivery', orderIds: [`ORD-${n}`], sourceSellShipment: `2609000${n}`, sourceStopSequence: 2 })),
].map((s, i) => ({ ...s, stopSequence: i + 1 }))
const body = (...ns: number[]) => ({
  sellShipments: ns.map((n) => `2609000${n}`), stops: stopsFor(...ns), externalOrders: [], tenderList: [],
})

const row = (n: number, over: Record<string, unknown> = {}) => ({
  odysseyShipmentIdentifier: `O6009000${n}`, sellShipment: `2609000${n}`, buyShipment: `9000900${n}`,
  orders: [`ORD-${n}`], pickupNumbers: [], poNumbers: [], pro: null,
  shipmentType: 'Direct', planningType: 'SSD',
  customerId: 'ERCO_SYS_01', customerName: 'ERCO Systems Inc',
  consignor: `CONSIGNOR-${n}`, consignee: `CONSIGNEE-${n}`,
  origin: 'Houston TX US 77001', destination: 'San Antonio TX US 78201',
  pickupDate: `06/1${n}/2026 08:00 CST`, deliveryDate: `06/2${n}/2026 12:00 CST`,
  mode: 'LTL', equipmentCode: 'VAN', equipment: '', seal: null, scac: null,
  tenderStatus: '', shipmentStatus: '', panel: 'monitoring', category: 'consolidation',
  validationMessage: null, grossWeight: '4300', load: String(n), loadCount: '1',
  orderCount: '1', apFreightCost: '',
  ...over,
})

const detail = (n: number) => ({
  shipmentId: `2609000${n}`, odysseyShipmentIdentifier: `O6009000${n}`, shipmentType: 'Direct',
  customerId: 'ERCO_SYS_01', customerName: 'ERCO Systems Inc',
  orderList: [{ orderNumber: `ORD-${n}`, grossWeightValue: 4300, orderLines: [{}] }],
  shipmentStopList: [
    { stopSequence: 1, stopType: 'pickup', facilityName: `P${n}`, city: `P${n}`, orderIds: [`ORD-${n}`] },
    { stopSequence: 2, stopType: 'delivery', facilityName: `D${n}`, city: `D${n}`, orderIds: [`ORD-${n}`] },
  ],
  shippingOptionList: [], droppedCarrierList: [], documentList: [], noteList: [], historyList: [],
})

beforeEach(() => {
  __resetShipmentWriteState()
  __resetConsolidationSeq()
  addShipment(row(1), detail(1))
  addShipment(row(2), detail(2))
})

describe('applyConsolidation (mock)', () => {
  it('creates the C… row with an `id` the grid can key on, and returns its detail', async () => {
    const { row: created, detail: blob } = await applyConsolidation(body(1, 2))
    expect(created.odysseyShipmentIdentifier).toBe('C70000001')
    expect(created.sellShipment).toBe('27000001')
    // `id` is what ShipmentTable's getRowId reads — same derivation as the list
    expect(created.id).toBe('27000001')
    expect(created.shipmentType).toBe('Consolidation')
    expect(created.orders).toEqual(['ORD-1', 'ORD-2'])
    expect(created.grossWeight).toBe('8600')
    expect(blob.shipmentStopList?.map((s) => s.stopType)).toEqual(['pickup', 'pickup', 'delivery', 'delivery'])
  })

  it('tombstones the sources — they leave getAllShipments, the new one joins it', async () => {
    await applyConsolidation(body(1, 2))
    const ids = getAllShipments().map((r: { sellShipment: string }) => r.sellShipment)
    expect(ids).toContain('27000001')
    expect(ids).not.toContain('26090001')
    expect(ids).not.toContain('26090002')
  })

  it('the created shipment is readable through the normal detail path', async () => {
    await applyConsolidation(body(1, 2))
    const vm = await getSellShipmentDetail('27000001')
    expect(vm.odysseyShipmentIdentifier).toBe('C70000001')
  })

  it('__resetShipmentWriteState clears the tombstones', async () => {
    const before = getAllShipments().length
    await applyConsolidation(body(1, 2))
    __resetShipmentWriteState()
    // back to the bare seed — overlay AND tombstones gone
    expect(getAllShipments().length).toBe(before - 2)
    expect(getAllShipments().every((r: { sellShipment: string }) => !r.sellShipment.startsWith('2709'))).toBe(true)
  })

  it('a second consolidation in the session gets the next id', async () => {
    await applyConsolidation(body(1, 2))
    addShipment(row(3), detail(3))
    addShipment(row(4), detail(4))
    const { row: second } = await applyConsolidation(body(3, 4))
    expect(second.odysseyShipmentIdentifier).toBe('C70000002')
  })

  it('an unknown id is refused before anything is written', async () => {
    await expect(applyConsolidation({ ...body(1, 2), sellShipments: ['26090001', 'nope'] })).rejects.toThrow(/nope/)
    expect(getAllShipments().map((r: { sellShipment: string }) => r.sellShipment)).toContain('26090001')
  })

  it('re-consolidating a consolidation keeps its id (CNS-09) and drops only the other source', async () => {
    const { row: first } = await applyConsolidation(body(1, 2))
    addShipment(row(3), detail(3))
    const { row: again } = await applyConsolidation({
      ...body(1, 3), sellShipments: [first.sellShipment, '26090003'],
      stops: stopsFor(1, 3).map((st) => ({ ...st, sourceSellShipment: st.orderIds[0] === 'ORD-1' ? first.sellShipment : '26090003', sourceStopSequence: st.orderIds[0] === 'ORD-1' ? (st.stopType === 'pickup' ? 1 : 3) : st.sourceStopSequence })),
    })
    expect(again.odysseyShipmentIdentifier).toBe('C70000001')
    const ids = getAllShipments().map((r: { sellShipment: string }) => r.sellShipment)
    expect(ids).toContain('27000001')
    expect(ids).not.toContain('26090003')
  })

  it('runs the live guards: a source outside the pool, one order, out-of-order stops (S7.2)', async () => {
    addShipment(row(3, { category: 'hold' }), detail(3))
    await expect(applyConsolidation(body(1, 3))).rejects.toThrow('Only shipments in Consolidation can be consolidated: 26090003')
    await expect(applyConsolidation({ ...body(1, 2), stops: stopsFor(1) })).rejects.toThrow('A consolidation needs at least two orders.')
    const reversed = stopsFor(1, 2).map((s, i, a) => ({ ...s, stopSequence: a.length - i }))
    await expect(applyConsolidation({ ...body(1, 2), stops: reversed })).rejects.toThrow('Stops are out of order.')
  })

  it('files a Hold C when an order is not consolidatable, and stores the posted list untendered', async () => {
    addShipment(row(3), { ...detail(3), orderList: [{ orderNumber: 'ORD-3', consolidatable: false }] })
    const { row: held, detail: blob } = await applyConsolidation({
      ...body(1, 3), tenderList: [{ rank: 1, scac: 'ABCD', status: 'Sent' }],
    })
    expect(held.category).toBe('hold')
    expect(blob.shippingOptionList).toEqual([{ rank: 1, scac: 'ABCD', status: '' }])
  })

  it('a Direct source whose order is left pending stays in the store', async () => {
    addShipment(row(3), detail(3))
    await applyConsolidation({ ...body(1, 2, 3), stops: stopsFor(1, 2) })
    const ids = getAllShipments().map((r: { sellShipment: string }) => r.sellShipment)
    expect(ids).toContain('26090003')
    expect(ids).not.toContain('26090001')
  })

  it('an external order from a non-emptied source: the source shows ONCE, with recomputed aggregates', async () => {
    const two = {
      ...detail(5),
      orderList: [
        { orderNumber: 'ORD-5', grossWeightValue: 1000, orderLines: [{}], pickupNumber: 'PU-5' },
        { orderNumber: 'ORD-6', grossWeightValue: 2500, orderLines: [{}, {}], pickupNumber: 'PU-6' },
      ],
      shipmentStopList: [
        { stopSequence: 1, stopType: 'pickup', facilityName: 'P5', city: 'P5', orderIds: ['ORD-5', 'ORD-6'] },
        { stopSequence: 2, stopType: 'delivery', facilityName: 'D5', city: 'D5', orderIds: ['ORD-5', 'ORD-6'] },
      ],
    }
    addShipment(row(5, { orders: ['ORD-5', 'ORD-6'], orderCount: '2', grossWeight: '3500' }), two)
    const stops = [
      ...stopsFor(1, 2).slice(0, 2),
      { stopSequence: 3, stopType: 'pickup', orderIds: ['ORD-6'], sourceSellShipment: null, sourceStopSequence: null, facilityName: 'X' },
      { stopSequence: 4, stopType: 'delivery', orderIds: ['ORD-1'], sourceSellShipment: '26090001', sourceStopSequence: 2 },
      { stopSequence: 5, stopType: 'delivery', orderIds: ['ORD-2'], sourceSellShipment: '26090002', sourceStopSequence: 2 },
      { stopSequence: 6, stopType: 'delivery', orderIds: ['ORD-6'], sourceSellShipment: null, sourceStopSequence: null, facilityName: 'Y' },
    ]
    await applyConsolidation({ ...body(1, 2), stops, externalOrders: [{ orderNumber: 'ORD-6', sourceSellShipment: '26090005' }] })
    const mine = getAllShipments().filter((r: { sellShipment: string }) => r.sellShipment === '26090005')
    expect(mine).toHaveLength(1)
    expect(mine[0]).toMatchObject({ orders: ['ORD-5'], orderCount: '1', grossWeight: '1000', loadCount: '1', pickupNumbers: ['PU-5'] })
  })

  it('an overlay row replaces its seeded twin instead of listing both', () => {
    const seeded = getAllShipments().find((r: { sellShipment: string }) => !r.sellShipment.startsWith('2609'))
    addShipment({ ...seeded, orderCount: '77' }, detail(1))
    const same = getAllShipments().filter((r: { sellShipment: string }) => r.sellShipment === seeded.sellShipment)
    expect(same).toHaveLength(1)
    expect(same[0].orderCount).toBe('77')
  })

  it('an external order from a Sent shipment is rejected with the FULL move message (LINX-15872)', async () => {
    addShipment(row(5, { category: 'sent', tenderStatus: 'Sent' }), detail(5))
    const stops = [
      ...stopsFor(1, 2).slice(0, 2),
      { stopSequence: 3, stopType: 'pickup', orderIds: ['ORD-5'], sourceSellShipment: null, sourceStopSequence: null },
      ...stopsFor(1, 2).slice(2).map((s, i) => ({ ...s, stopSequence: 4 + i })),
      { stopSequence: 6, stopType: 'delivery', orderIds: ['ORD-5'], sourceSellShipment: null, sourceStopSequence: null },
    ]
    await expect(applyConsolidation({ ...body(1, 2), stops, externalOrders: [{ orderNumber: 'ORD-5', sourceSellShipment: '26090005' }] }))
      .rejects.toThrow(/Edit the source shipment or cancel the applicable tender or bid action before moving the order\. Order impacted: ORD-5/)
  })

  it('editing a C: an order left pending becomes its own Direct in the mock too (C3)', async () => {
    addShipment(row(3), detail(3))
    const { row: c } = await applyConsolidation(body(1, 2, 3))   // stops: PU1 PU2 PU3 DEL1 DEL2 DEL3
    const from = (seq: number, type: string, order: string) => ({
      stopSequence: 0, stopType: type, orderIds: [order], sourceSellShipment: c.sellShipment, sourceStopSequence: seq,
    })
    const stops = [from(1, 'pickup', 'ORD-1'), from(2, 'pickup', 'ORD-2'), from(4, 'delivery', 'ORD-1'), from(5, 'delivery', 'ORD-2')]
      .map((s, i) => ({ ...s, stopSequence: i + 1 }))
    const { row: edited } = await applyConsolidation({ sellShipments: [c.sellShipment], stops, externalOrders: [], tenderList: [] })
    expect(edited.sellShipment).toBe(c.sellShipment)              // ids reused (S7.5)
    expect(edited.orders).toEqual(['ORD-1', 'ORD-2'])
    const split = getAllShipments().find((r: { orders: string[] }) => r.orders.length === 1 && r.orders[0] === 'ORD-3')
    expect(split).toMatchObject({ shipmentType: 'Direct', category: 'consolidation', panel: 'monitoring' })
    expect(split.sellShipment).toBe('34000001')                   // the mock split-id band
  })
})
