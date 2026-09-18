import { beforeEach, describe, it, expect } from 'vitest'
import { getAllShipments, addShipment, getOverlayShipmentDetail, __resetShipmentWriteState } from './index'
import shipmentsJson from './shipments.json'

const row = { sellShipment: '26090001', buyShipment: '900090001', odysseyShipmentIdentifier: 'O60090001', orders: ['0000000090001'] }
const detail = { shipmentId: '26090001', orderList: [], shipmentStopList: [], historyList: [] }

beforeEach(() => __resetShipmentWriteState())

describe('shipments overlay', () => {
  it('prepends a created shipment to the seeded list', () => {
    const before = getAllShipments().length
    addShipment(row, detail)
    const all = getAllShipments()
    expect(all.length).toBe(before + 1)
    expect(all[0]).toEqual(row)
  })

  it('serves the created detail by sellShipment and null for anything else', () => {
    addShipment(row, detail)
    expect(getOverlayShipmentDetail('26090001')).toEqual(detail)
    expect(getOverlayShipmentDetail('25000178')).toBeNull()
  })

  it('replaces, not duplicates, a re-added sellShipment', () => {
    addShipment(row, detail)
    addShipment({ ...row, customerName: 'X' }, detail)
    expect(getAllShipments().filter(s => s.sellShipment === '26090001')).toHaveLength(1)
  })

  it('reset empties the overlay', () => {
    addShipment(row, detail)
    __resetShipmentWriteState()
    expect(getOverlayShipmentDetail('26090001')).toBeNull()
    expect(getAllShipments()[0].sellShipment).not.toBe('26090001')
  })

  it('returns the base array BY REFERENCE while the overlay is empty', () => {
    // The conditional in getAllShipments exists for exactly this: hot call sites
    // (ShipmentsRoute's useMemo, the search index cache) hold the result and
    // compare identity. An unconditional spread would break them invisibly.
    expect(getAllShipments()).toBe(shipmentsJson)
    addShipment(row, detail)
    expect(getAllShipments()).not.toBe(shipmentsJson)
  })
})
