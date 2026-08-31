import { describe, test, expect } from 'vitest'
import { mapShipmentErrorRow } from './mapShipmentErrorRow'
import { LATE_ADDED_COLUMNS } from '../../components/detail/ColumnPanel.jsx'

// This mapper is a WHITELIST: it builds a new object, so any field it doesn't
// name is dropped between the API and the table — invisibly, and with the
// database, the API projection and the column definition all still correct.
// That failure mode cost a full session: Pickup # rendered "—" for months, and
// Shipment Type / Planning Type arrived empty on the day they shipped, because
// every layer was verified EXCEPT this one.
//
// These tests exist so the next added column fails loudly here instead.

const FULL_ROW = {
  buyShipment: '0000000054321',
  sellShipment: '0000000012345',
  orders: ['ORD-1', 'ORD-2'],
  pickupNumbers: ['PU-111111', 'PU-222222'],
  poNumbers: ['SVI5HCKT4', '4000438190'],
  pro: 'PRO-9',
  customerId: 'VALTRIS_01',
  customerName: 'Valtris',
  consignor: 'A',
  consignee: 'B',
  origin: 'HOUSTON TX US 77001',
  destination: 'CHICAGO IL US 60601',
  pickupDate: '08/10/2026 08:00 CDT',
  deliveryDate: '08/11/2026 17:00 CDT',
  mode: 'TL',
  equipmentCode: 'V',
  scac: 'SEFL',
  tenderStatus: 'Sent',
  shipmentStatus: 'Review',
  panel: 'exceptions',
  category: 'all',
  validationMessage: null,
  grossWeight: '12,000 LB',
  loadCount: '1',
  orderCount: '2',
  apFreightCost: '1,234.00',
  shipmentType: 'Consolidation',
  planningType: 'RDD',
  legType: 'Pooling',
  shipmentSequenceLeg: 1,
  nextShipmentId: '0000000099999',
}

describe('mapShipmentErrorRow preserves every displayable field', () => {
  test('the late-added columns survive the mapper', () => {
    const vm = mapShipmentErrorRow(FULL_ROW)
    // The exact regression: these arrived from the API and were dropped here.
    for (const key of LATE_ADDED_COLUMNS) {
      expect(vm, `"${key}" was dropped by mapShipmentErrorRow`).toHaveProperty(key)
    }
    expect(vm.shipmentType).toBe('Consolidation')
    expect(vm.planningType).toBe('RDD')
    expect(vm.pickupNumbers).toEqual(['PU-111111', 'PU-222222'])
  })

  test('the multi-leg linkage fields survive too', () => {
    const vm = mapShipmentErrorRow(FULL_ROW)
    expect(vm.legType).toBe('Pooling')
    expect(vm.shipmentSequenceLeg).toBe(1)
    expect(vm.nextShipmentId).toBe('0000000099999')
  })

  test('absent optional fields become null/[] rather than undefined', () => {
    // A single-leg shipment with no references — the common case. These must be
    // explicit empties so the table renders an em dash, not "undefined".
    const bare: Record<string, unknown> = { ...FULL_ROW }
    delete bare.pickupNumbers
    delete bare.legType
    delete bare.shipmentSequenceLeg
    const vm = mapShipmentErrorRow(bare as never)
    expect(vm.pickupNumbers).toEqual([])
    expect(vm.legType).toBeNull()
    expect(vm.shipmentSequenceLeg).toBeNull()
  })

  // LINX-14509 — the row action gate (Review Order Change) reads vm.category,
  // so it must survive this whitelist even though it isn't a table column.
  test('carries category through (Review Order Change action gate)', () => {
    const vm = mapShipmentErrorRow({ ...FULL_ROW, category: 'order-change' } as never)
    expect(vm.category).toBe('order-change')
  })
})
