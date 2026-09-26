import { describe, test, expect } from 'vitest'
import { reorderStops, validateStopOrder, labelStops } from './stopOrder'

const byKey = {
  'pickup-a': { key: 'pickup-a', type: 'pickup', location: 'Houston, TX' },
  'pickup-b': { key: 'pickup-b', type: 'pickup', location: 'Sparta, NJ' },
  'delivery-a': { key: 'delivery-a', type: 'delivery', location: 'Baltimore, MD' },
  'delivery-b': { key: 'delivery-b', type: 'delivery', location: 'Fairfax, VA' },
}
const order = ['pickup-a', 'pickup-b', 'delivery-a', 'delivery-b']

describe('reorderStops', () => {
  test('moves the key at fromIndex to toIndex', () => {
    expect(reorderStops(order, 0, 2)).toEqual(['pickup-b', 'delivery-a', 'pickup-a', 'delivery-b'])
    expect(reorderStops(order, 3, 0)).toEqual(['delivery-b', 'pickup-a', 'pickup-b', 'delivery-a'])
  })
  test('a no-op move (same index) or an out-of-range index returns the SAME array', () => {
    expect(reorderStops(order, 1, 1)).toBe(order)
    expect(reorderStops(order, -1, 1)).toBe(order)
    expect(reorderStops(order, 1, 9)).toBe(order)
  })
})

describe('validateStopOrder', () => {
  test('valid when every delivery sits at or after the first pickup', () => {
    expect(validateStopOrder(order, byKey)).toBeNull()
    expect(validateStopOrder(['pickup-a', 'delivery-a', 'pickup-b', 'delivery-b'], byKey)).toBeNull()
  })
  test('a delivery above the first pickup is rejected (order-level link absent, B2 fallback)', () => {
    const bad = ['delivery-a', 'pickup-a', 'pickup-b', 'delivery-b']
    expect(validateStopOrder(bad, byKey)).toMatch(/cannot come before the first pickup/)
  })
  test('no pickups at all → nothing to check', () => {
    expect(validateStopOrder(['delivery-a', 'delivery-b'], byKey)).toBeNull()
  })
})

describe('labelStops', () => {
  test('numbers P1…/D1… by type and position, independent of interleaving', () => {
    const labeled = labelStops(order, byKey)
    expect(labeled.map((s) => s.label)).toEqual(['P1', 'P2', 'D1', 'D2'])
  })
  test('re-numbers live when the order interleaves types', () => {
    const labeled = labelStops(['pickup-a', 'delivery-a', 'pickup-b', 'delivery-b'], byKey)
    expect(labeled.map((s) => s.label)).toEqual(['P1', 'D1', 'P2', 'D2'])
  })
  test('every other field on the stop rides through unchanged', () => {
    const labeled = labelStops(order, byKey)
    expect(labeled[0]).toMatchObject({ key: 'pickup-a', type: 'pickup', location: 'Houston, TX' })
  })
})
