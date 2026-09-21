import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))

import { applyConsolidation, __resetConsolidationSeq } from './consolidationService'
import { addShipment, getAllShipments, __resetShipmentWriteState } from '../../data'
import { getSellShipmentDetail } from './shipmentService'

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
  orderList: [{ orderNumber: `ORD-${n}` }],
  shipmentStopList: [
    { stopSequence: 1, stopType: 'pickup', facilityName: `P${n}` },
    { stopSequence: 2, stopType: 'delivery', facilityName: `D${n}` },
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
    const { row: created, detail: blob } = await applyConsolidation({ sellShipments: ['26090001', '26090002'] })
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
    await applyConsolidation({ sellShipments: ['26090001', '26090002'] })
    const ids = getAllShipments().map((r: { sellShipment: string }) => r.sellShipment)
    expect(ids).toContain('27000001')
    expect(ids).not.toContain('26090001')
    expect(ids).not.toContain('26090002')
  })

  it('the created shipment is readable through the normal detail path', async () => {
    await applyConsolidation({ sellShipments: ['26090001', '26090002'] })
    const vm = await getSellShipmentDetail('27000001')
    expect(vm.odysseyShipmentIdentifier).toBe('C70000001')
  })

  it('__resetShipmentWriteState clears the tombstones', async () => {
    const before = getAllShipments().length
    await applyConsolidation({ sellShipments: ['26090001', '26090002'] })
    __resetShipmentWriteState()
    // back to the bare seed — overlay AND tombstones gone
    expect(getAllShipments().length).toBe(before - 2)
    expect(getAllShipments().every((r: { sellShipment: string }) => !r.sellShipment.startsWith('2709'))).toBe(true)
  })

  it('a second consolidation in the session gets the next id', async () => {
    await applyConsolidation({ sellShipments: ['26090001', '26090002'] })
    addShipment(row(3), detail(3))
    addShipment(row(4), detail(4))
    const { row: second } = await applyConsolidation({ sellShipments: ['26090003', '26090004'] })
    expect(second.odysseyShipmentIdentifier).toBe('C70000002')
  })

  it('an unknown id is refused before anything is written', async () => {
    await expect(applyConsolidation({ sellShipments: ['26090001', 'nope'] })).rejects.toThrow(/nope/)
    expect(getAllShipments().map((r: { sellShipment: string }) => r.sellShipment)).toContain('26090001')
  })

  it('re-consolidating a consolidation keeps its id (CNS-09) and drops only the other source', async () => {
    const { row: first } = await applyConsolidation({ sellShipments: ['26090001', '26090002'] })
    addShipment(row(3), detail(3))
    const { row: again } = await applyConsolidation({ sellShipments: [first.sellShipment, '26090003'] })
    expect(again.odysseyShipmentIdentifier).toBe('C70000001')
    const ids = getAllShipments().map((r: { sellShipment: string }) => r.sellShipment)
    expect(ids).toContain('27000001')
    expect(ids).not.toContain('26090003')
  })
})
