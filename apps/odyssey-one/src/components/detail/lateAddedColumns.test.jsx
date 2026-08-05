// @vitest-environment jsdom
// User-reported all session (2026-08-05): Pickup #, Shipment Type and Planning
// Type showed no data. The data was present in BOTH modes the whole time — the
// cause was visibility, in two layers:
//   1. the three weren't in the default column lists, and
//   2. a SAVED preset overrides those defaults wholesale (ShipmentsRoute's
//      hydrate effect), so even fixing (1) would not have reached anyone who
//      had ever saved a preset.
// These tests pin both layers plus the actual cell rendering, so "the column is
// listed" can never again be mistaken for "the column shows its value".
import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  LATE_ADDED_COLUMNS,
  mergeLateAddedColumns,
  EXCEPTIONS_DEFAULT_COLUMNS,
  MONITORING_DEFAULT_COLUMNS,
  ALL_COLUMNS,
} from './ColumnPanel.jsx'
import ShipmentTable from '../shipments/ShipmentTable.jsx'

describe('late-added columns are visible by default', () => {
  test('all three are in ALL_COLUMNS (selectable at all)', () => {
    const keys = ALL_COLUMNS.map((c) => c.key)
    for (const k of LATE_ADDED_COLUMNS) expect(keys).toContain(k)
  })

  test('both panel defaults include them', () => {
    for (const k of LATE_ADDED_COLUMNS) {
      expect(EXCEPTIONS_DEFAULT_COLUMNS).toContain(k)
      expect(MONITORING_DEFAULT_COLUMNS).toContain(k)
    }
  })
})

describe('mergeLateAddedColumns — the saved-preset layer', () => {
  test('appends the ones a stale preset predates', () => {
    const stale = ['buyShipment', 'customerId', 'origin']
    const merged = mergeLateAddedColumns(stale)
    expect(merged.slice(0, 3)).toEqual(stale) // order preserved
    for (const k of LATE_ADDED_COLUMNS) expect(merged).toContain(k)
  })

  test('does not duplicate one already present', () => {
    const withOne = ['buyShipment', 'pickupNumbers']
    const merged = mergeLateAddedColumns(withOne)
    expect(merged.filter((c) => c === 'pickupNumbers')).toHaveLength(1)
  })

  test('removes nothing the user deliberately kept', () => {
    const custom = ['buyShipment', 'seal', 'netWeight']
    expect(mergeLateAddedColumns(custom)).toEqual(expect.arrayContaining(custom))
  })

  test('leaves an empty/absent preset alone (defaults apply instead)', () => {
    expect(mergeLateAddedColumns([])).toEqual([])
    expect(mergeLateAddedColumns(undefined)).toBeUndefined()
  })
})

describe('the cells actually render their values', () => {
  const row = {
    sellShipment: '0000000012345',
    buyShipment: '0000000054321',
    shipmentType: 'Consolidation',
    planningType: 'RDD',
    pickupNumbers: ['PU-111111', 'PU-222222'],
  }

  test('Shipment Type, Planning Type and Pickup # show their data, not a dash', () => {
    render(
      <ShipmentTable
        shipments={[row]}
        visibleColumns={['buyShipment', ...LATE_ADDED_COLUMNS]}
        totalCount={1}
      />,
    )
    expect(screen.getByText('Consolidation')).toBeTruthy()
    expect(screen.getByText('RDD')).toBeTruthy()
    // array column joins rather than rendering [object Object] or a dash
    expect(screen.getByText('PU-111111, PU-222222')).toBeTruthy()
  })
})
