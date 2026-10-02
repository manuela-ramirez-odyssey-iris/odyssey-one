// Mock twin of buildListQuery's consolidation extras (S165, Ramesh #4/#6,
// LINX-15786 BR II). Own file so the S165 hunks stay out of gridService.test.ts.
import { describe, test, expect } from 'vitest'
import { getShipmentErrorList } from './gridService'
import { getAllShipments, addShipment, __resetShipmentWriteState } from '../../data'
import { getAllOrders } from '../../data/orders'

const base = { panel: 'monitoring', pageNumber: 0, pageSize: 25 }
const EXTRA_KEYS = ['totalVolume', 'originLocationId', 'destinationLocationId']

describe('mock list: consolidation extras', () => {
  test('absent without the flag', async () => {
    const { rows } = await getShipmentErrorList(base)
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) for (const k of EXTRA_KEYS) expect(r).not.toHaveProperty(k)
  })

  test('present with it — volume summed over the row\'s orders, ids from its consignor/consignee', async () => {
    const { rows } = await getShipmentErrorList({ ...base, extras: 'consolidation' })
    const byNumber = new Map(getAllOrders().map((o) => [o.orderNumber, o]))
    for (const r of rows) {
      for (const k of EXTRA_KEYS) expect(r).toHaveProperty(k)
      const orders = r.orders.map((n) => byNumber.get(n)!)
      expect(r.totalVolume).toBe(orders.reduce((t, o) => t + o.volume.value, 0))
    }
    // C50000001: DALLAS PACKAGING → LAKE CHARLES PACKAGING (orders.json carries both ids)
    const all = await getShipmentErrorList({ ...base, pageSize: 5000, extras: 'consolidation' })
    const c = all.rows.find((r) => r.odysseyShipmentIdentifier === 'C50000001')!
    const seed = getAllShipments().find((r: { odysseyShipmentIdentifier: string }) => r.odysseyShipmentIdentifier === 'C50000001')
    expect(c.consignor).toBe(seed.consignor)
    const first = byNumber.get(c.orders.find((n) => byNumber.get(n)!.consignor.name === c.consignor)!)!
    expect(c.originLocationId).toBe(first.consignor.locationId)
    expect(c.destinationLocationId).toMatch(/^[A-Z]+-[A-Z]{2}-\d{3}$/)
  })

  test('null when there is no data', async () => {
    const seed = getAllShipments().find((r: { panel: string }) => r.panel === 'monitoring')
    addShipment({ ...seed, sellShipment: 'X-NODATA', orders: ['NO-SUCH-ORDER'] }, {})
    try {
      const { rows } = await getShipmentErrorList({ ...base, pageSize: 5000, extras: 'consolidation' })
      expect(rows.find((r) => r.sellShipment === 'X-NODATA')).toMatchObject({ totalVolume: null, originLocationId: null, destinationLocationId: null })
    } finally { __resetShipmentWriteState() }
  })
})
