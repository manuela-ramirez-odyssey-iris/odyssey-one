import { describe, it, expect } from 'vitest'
import { initSandbox, moveStop, canMoveStop, moveToPending, addToStop, labelsOf, isRoutable, markRouted, totals, priorDiff, toDto } from './stopsSandbox'

const stop = (over) => ({ type: 'pickup', stopNumber: 1, orderIds: ['A'], location: 'X, City', address: '1 St', date: 'June 4, 2026 08:00 CDT', weight: '10 LB', volume: '1 cuft', packageCount: '1', pickupNo: '', ...over })
const stops = [
  stop({ stopNumber: 1, orderIds: ['A', 'B'] }),
  stop({ stopNumber: 2, orderIds: ['C'], location: 'Y, Town' }),
  stop({ type: 'delivery', stopNumber: 3, orderIds: ['A', 'B', 'C'], location: 'Z, Ville', date: 'June 6, 2026 08:00 CDT' }),
]
const orders = [
  { orderNumber: 'A', shipFrom: { company: 'X', location: 'X, City' }, shipTo: { company: 'Z', location: 'Z, Ville' }, grossWeight: '5 LB', totalVolume: '1 cuft' },
  { orderNumber: 'B', shipFrom: { company: 'X', location: 'X, City' }, shipTo: { company: 'Z', location: 'Z, Ville' }, grossWeight: '5 LB', totalVolume: '1 cuft' },
  { orderNumber: 'C', shipFrom: { company: 'Y', location: 'Y, Town' }, shipTo: { company: 'Z', location: 'Z, Ville' }, grossWeight: '1,005 LB', totalVolume: '1 cuft' },
]
const noChange = { locationChange: false, changedOrderIds: [], stopChanges: {}, orderComparisons: {}, summaryChanges: {}, costs: {} }
const locChange = { ...noChange, locationChange: true, changedOrderIds: ['C'], stopChanges: { '2': { changedOrderIds: ['C'], fields: { location: { prior: 'Y, Town', new: 'Q, Burg' } } } } }

describe('initSandbox', () => {
  it('copies stops, labels P1 P2 D1, not dirty, not routed, empty pending', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    expect(labelsOf(s)).toEqual(['P1', 'P2', 'D1'])
    expect(s.dirty).toBe(false); expect(s.routed).toBe(false); expect(s.pending).toEqual([])
    expect(s.stops[0].orderIds).toEqual(['A', 'B'])
  })
  it('applies a location change: order leaves its pickup, lands on a new P? at the end of the pickup group; emptied stop removed (LINX-15668)', () => {
    const s = initSandbox({ stops, consolidation: locChange, orders })
    expect(labelsOf(s)).toEqual(['P1', 'P?', 'D1'])
    expect(s.stops[1]).toMatchObject({ type: 'pickup', unsequenced: true, orderIds: ['C'], location: 'Q, Burg' })
    expect(isRoutable(s)).toBe(false)
    expect(s.dirty).toBe(false)                                  // system-applied, not a planner edit
  })
  it('a location change matching an existing stop reuses it instead of creating P?', () => {
    const c = { ...locChange, stopChanges: { '2': { changedOrderIds: ['C'], fields: { location: { prior: 'Y, Town', new: 'X, City' } } } } }
    const s = initSandbox({ stops, consolidation: c, orders })
    expect(labelsOf(s)).toEqual(['P1', 'D1'])
    expect(s.stops[0].orderIds).toEqual(['A', 'B', 'C'])
  })
  it('a no-op location change (new equals current) leaves stops untouched', () => {
    const c = { ...locChange, stopChanges: { '2': { changedOrderIds: ['C'], fields: { location: { prior: 'Y, Town', new: 'Y, Town' } } } } }
    const s = initSandbox({ stops, consolidation: c, orders })
    expect(labelsOf(s)).toEqual(['P1', 'P2', 'D1'])
    expect(s.stops[1].orderIds).toEqual(['C'])
  })
  it('handles both a pickup and a delivery location change in one open (LINX-15668)', () => {
    const c = { ...noChange, stopChanges: {
      '2': { changedOrderIds: ['C'], fields: { location: { prior: 'Y, Town', new: 'Q, Burg' } } },
      '3': { changedOrderIds: ['A'], fields: { location: { prior: 'Z, Ville', new: 'R, Newtown' } } },
    } }
    const s = initSandbox({ stops, consolidation: c, orders })
    expect(labelsOf(s)).toEqual(['P1', 'P?', 'D1', 'D?'])
  })
  it('a delivery-side location change creates D? at the end of the delivery group', () => {
    const c = { ...noChange, stopChanges: { '3': { changedOrderIds: ['A'], fields: { location: { prior: 'Z, Ville', new: 'R, Newtown' } } } } }
    const s = initSandbox({ stops, consolidation: c, orders })
    expect(labelsOf(s)).toEqual(['P1', 'P2', 'D1', 'D?'])
    expect(s.stops[3]).toMatchObject({ type: 'delivery', unsequenced: true, orderIds: ['A'], location: 'R, Newtown' })
    expect(s.stops[2].orderIds).toEqual(['B', 'C'])
  })
})
describe('moveStop', () => {
  it('moves up/down, renumbers, and sequences a P? once placed', () => {
    let s = initSandbox({ stops, consolidation: locChange, orders })
    s = moveStop(s, 1, 'up')
    expect(labelsOf(s)).toEqual(['P1', 'P2', 'D1'])
    expect(s.stops[0].orderIds).toEqual(['C']); expect(s.dirty).toBe(true); expect(isRoutable(s)).toBe(false) // P? placed but its date is blank
  })
  it('refuses a move that puts a delivery before one of its pickups (LINX-15669) and returns the same reference', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    expect(canMoveStop(s, 2, 'up')).toEqual({ ok: false, reason: 'An order must be picked up before it can be delivered.' })
    expect(moveStop(s, 2, 'up')).toBe(s)
  })
  it('refuses moving past the edges', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    expect(canMoveStop(s, 0, 'up').ok).toBe(false); expect(canMoveStop(s, 2, 'down').ok).toBe(false)
  })
  it('does not let an unsequenced P? consume a stop number', () => {
    let s = initSandbox({ stops, consolidation: locChange, orders })
    expect(labelsOf(s)).toEqual(['P1', 'P?', 'D1'])
    s = moveStop(s, 0, 'down')
    expect(labelsOf(s)).toEqual(['P?', 'P1', 'D1'])
  })
})
describe('moveToPending / addToStop', () => {
  it('removes the order from every stop, drops emptied stops, renumbers without gaps (LINX-15869)', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = moveToPending(s, 'C')
    expect(s.pending).toEqual(['C']); expect(labelsOf(s)).toEqual(['P1', 'D1'])
    expect(s.stops[1].orderIds).toEqual(['A', 'B']); expect(s.dirty).toBe(true)
  })
  it('refuses to remove the last remaining order', () => {
    const one = initSandbox({ stops: [stop({ orderIds: ['A'] }), stop({ type: 'delivery', stopNumber: 2, orderIds: ['A'] })], consolidation: noChange, orders: orders.slice(0, 1) })
    expect(moveToPending(one, 'A')).toBe(one)
  })
  it('is a no-op for an id not on any stop', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    expect(moveToPending(s, 'ZZZ')).toBe(s)
  })
  it('addToStop matches existing stops by location, else creates P?/D? (LINX-15871)', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = moveToPending(s, 'C')
    s = addToStop(s, 'C', orders)
    expect(s.pending).toEqual([])
    expect(labelsOf(s)).toEqual(['P1', 'P?', 'D1'])
    expect(s.stops[1]).toMatchObject({ orderIds: ['C'], location: 'Y, Town', unsequenced: true })
    expect(s.stops[2].orderIds).toEqual(['A', 'B', 'C'])
  })
  it('addToStop is a no-op for an unknown order id', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    expect(addToStop(s, 'ZZZ', orders)).toBe(s)
  })
})
describe('gate, totals, prior diff, dto', () => {
  it('any edit clears routed', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = markRouted(s); expect(s.routed).toBe(true); expect(isRoutable(s)).toBe(true)
    s = moveToPending(s, 'C'); expect(s.routed).toBe(false)
  })
  it('totals sum the orders on pickup stops with thousands separators', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    expect(totals(s, orders)).toEqual({ grossWeight: '1,015 LB', volume: '3 cuft' })
  })
  it('totals excludes orders that have been moved to pending', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = moveToPending(s, 'C')
    expect(totals(s, orders)).toEqual({ grossWeight: '10 LB', volume: '2 cuft' })
  })
  it('priorDiff reports removed orders and removed/added/moved stops relative to open', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    const k2 = s.stops[1].key
    s = moveToPending(s, 'C')
    expect(priorDiff(s)).toEqual({ removedOrderIds: ['C'], movedStopKeys: [], addedStopKeys: [], removedStopKeys: [k2] })
    let m = initSandbox({ stops, consolidation: noChange, orders })
    m = moveStop(m, 0, 'down')
    expect(priorDiff(m).movedStopKeys.sort()).toEqual([m.stops[0].key, m.stops[1].key].sort())
  })
  it('toDto emits SellShipmentStop-shaped rows in current order with 1-based stopSequence', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = moveStop(s, 0, 'down')
    const dto = toDto(s)
    expect(dto.map((d) => [d.stopSequence, d.stopType, d.orderIds])).toEqual([[1, 'pickup', ['C']], [2, 'pickup', ['A', 'B']], [3, 'delivery', ['A', 'B', 'C']]])
    expect(dto[0]).toMatchObject({ facilityName: 'Y', city: 'Town', scheduledDateTime: 'June 4, 2026 08:00 CDT', sourceStopSequence: 2 })
  })
  it('toDto falls back to the whole location as facilityName when there is no comma', () => {
    const s = initSandbox({ stops: [stop({ location: 'Warehouse' })], consolidation: noChange, orders })
    expect(toDto(s)[0]).toMatchObject({ facilityName: 'Warehouse', city: '' })
  })
  it('toDto sets sourceStopSequence null for a created (unsequenced) stop', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = addToStop(moveToPending(s, 'C'), 'C', orders)
    const created = toDto(s).find((d) => d.orderIds.includes('C') && d.stopType === 'pickup')
    expect(created.sourceStopSequence).toEqual(null)
  })
})
