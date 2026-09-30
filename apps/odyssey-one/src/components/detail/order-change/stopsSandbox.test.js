import { describe, it, expect } from 'vitest'
import { initSandbox, moveStop, canMoveStop, reorderStop, canReorderStop, moveToPending, addToStop, addPending, labelsOf, isRoutable, isStopDated, routeBlocker, firstSequenceViolation, confirmStop, totals, priorDiff, toDto, parseStamp, formatStopDate, setStopDate, windowViolations, plannedDates, legDistances } from './stopsSandbox'

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
// Bug fix (S160 follow-up, live 25390278) — initSandbox now places a
// location-changed order off its OWN order.shipFrom/shipTo (already
// relocated by buildConsolidationChange's B3b(c) in real data), not the
// bare stopChanges display string. These fixtures mirror that invariant.
const relocate = (list, id, side, loc) => list.map((o) => (o.orderNumber === id ? { ...o, [side]: { ...o[side], location: loc, stopLocation: loc } } : o))

describe('initSandbox', () => {
  it('copies stops, labels P1 P2 D1, not dirty, empty pending', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    expect(labelsOf(s)).toEqual(['P1', 'P2', 'D1'])
    expect(s.dirty).toBe(false); expect(s.pending).toEqual([])
    expect(s.stops[0].orderIds).toEqual(['A', 'B'])
  })
  it('applies a location change: order leaves its pickup, lands on a new P? at the end of the pickup group; emptied stop removed (LINX-15668)', () => {
    const s = initSandbox({ stops, consolidation: locChange, orders: relocate(orders, 'C', 'shipFrom', 'Q, Burg') })
    expect(labelsOf(s)).toEqual(['P1', 'P?', 'D1'])
    expect(s.stops[1]).toMatchObject({ type: 'pickup', unsequenced: true, orderIds: ['C'], location: 'Q, Burg' })
    expect(isRoutable(s)).toBe(false)
    expect(s.dirty).toBe(false)                                  // system-applied, not a planner edit
  })
  it('T1.1: prior is the pre-relocation snapshot (original stop); arrival is what priorDiff compares against, so the relocation itself shows no planner-change mark', () => {
    const s = initSandbox({ stops, consolidation: locChange, orders: relocate(orders, 'C', 'shipFrom', 'Q, Burg') })
    expect(s.prior[1]).toMatchObject({ type: 'pickup', unsequenced: false, orderIds: ['C'], location: 'Y, Town' })
    expect(s.stops[1]).toMatchObject({ unsequenced: true, orderIds: ['C'], location: 'Q, Burg' }) // New shows P?
    expect(priorDiff(s)).toEqual({ removedOrderIds: [], movedStopKeys: [], addedStopKeys: [], removedStopKeys: [] })
  })
  it('a location change matching an existing stop reuses it instead of creating P?', () => {
    const c = { ...locChange, stopChanges: { '2': { changedOrderIds: ['C'], fields: { location: { prior: 'Y, Town', new: 'X, City' } } } } }
    const s = initSandbox({ stops, consolidation: c, orders: relocate(orders, 'C', 'shipFrom', 'X, City') })
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
    const relocatedOrders = relocate(relocate(orders, 'C', 'shipFrom', 'Q, Burg'), 'A', 'shipTo', 'R, Newtown')
    const s = initSandbox({ stops, consolidation: c, orders: relocatedOrders })
    expect(labelsOf(s)).toEqual(['P1', 'P?', 'D1', 'D?'])
  })
  it('a delivery-side location change creates D? at the end of the delivery group', () => {
    const c = { ...noChange, stopChanges: { '3': { changedOrderIds: ['A'], fields: { location: { prior: 'Z, Ville', new: 'R, Newtown' } } } } }
    const s = initSandbox({ stops, consolidation: c, orders: relocate(orders, 'A', 'shipTo', 'R, Newtown') })
    expect(labelsOf(s)).toEqual(['P1', 'P2', 'D1', 'D?'])
    expect(s.stops[3]).toMatchObject({ type: 'delivery', unsequenced: true, orderIds: ['A'], location: 'R, Newtown' })
    expect(s.stops[2].orderIds).toEqual(['B', 'C'])
  })
})
describe('created-stop defaults (S143 — order window date/address)', () => {
  const ordersWithWindow = orders.map((o) => (o.orderNumber !== 'C' ? o : {
    ...o,
    earliestPickup: 'June 5, 2026 09:00 CDT',
    earliestDelivery: 'June 7, 2026 09:00 CDT',
    shipFrom: { ...o.shipFrom, address: '123 Main St', location: 'Q, Burg', stopLocation: 'Q, Burg' },
    shipTo: { ...o.shipTo, address: '456 Oak St' },
  }))
  it("a location-change created P? takes the order's earliest pickup date/address; sandbox is routable once placed", () => {
    let s = initSandbox({ stops, consolidation: locChange, orders: ordersWithWindow })
    expect(s.stops[1]).toMatchObject({ date: 'June 5, 2026 09:00 CDT', address: '123 Main St' })
    s = moveStop(s, 1, 'up') // sequences the P? into place, same as the moveStop suite below
    expect(isRoutable(s)).toBe(true)
  })
  it("an addToStop-created delivery stop takes the order's earliest delivery date/address", () => {
    const orderD = {
      orderNumber: 'D',
      shipFrom: { location: 'X, City', address: '1 First St' },
      shipTo: { location: 'W, Newplace', address: '99 New Ave' },
      grossWeight: '1 LB',
      totalVolume: '1 cuft',
      earliestPickup: 'June 4, 2026 08:00 CDT',
      earliestDelivery: 'June 8, 2026 10:00 CDT',
    }
    const allOrders = [...orders, orderD]
    const s0 = initSandbox({ stops, consolidation: noChange, orders: allOrders })
    const s = addToStop(s0, 'D', allOrders)
    const created = s.stops.find((st) => st.type === 'delivery' && st.orderIds.includes('D') && st.location === 'W, Newplace')
    expect(created).toMatchObject({ date: 'June 8, 2026 10:00 CDT', address: '99 New Ave', unsequenced: true })
  })
  it('an order with no earliest-pickup window ("--") yields an empty date, not "--" — the routing gate stays closed', () => {
    const ordersNoWindow = relocate(orders, 'C', 'shipFrom', 'Q, Burg').map((o) => (o.orderNumber === 'C' ? { ...o, earliestPickup: '--' } : o))
    const s = initSandbox({ stops, consolidation: locChange, orders: ordersNoWindow })
    expect(s.stops[1].date).toBe('')
    expect(isRoutable(s)).toBe(false)
  })
})
describe('created-stop joint default date (T1.3)', () => {
  const orderD = { orderNumber: 'D', shipFrom: { location: 'W, Newplace' }, shipTo: { location: 'Z, Ville' }, grossWeight: '1 LB', totalVolume: '1 cuft', earliestPickup: 'June 4, 2026 08:00 CDT', latestPickup: 'June 4, 2026 20:00 CDT', earliestDelivery: 'June 8, 2026 10:00 CDT' }
  const orderE = { orderNumber: 'E', shipFrom: { location: 'W, Newplace' }, shipTo: { location: 'Z, Ville' }, grossWeight: '1 LB', totalVolume: '1 cuft', earliestPickup: 'June 4, 2026 10:00 CDT', latestPickup: 'June 4, 2026 18:00 CDT', earliestDelivery: 'June 8, 2026 10:00 CDT' }

  it("fits every order joined to it — recomputes to the latest earliest bound, still inside every order's window", () => {
    const allOrders = [...orders, orderD, orderE]
    let s = initSandbox({ stops, consolidation: noChange, orders: allOrders })
    s = addToStop(s, 'D', allOrders)
    const stopKey = s.stops.find((st) => st.orderIds.includes('D') && st.type === 'pickup').key
    expect(s.stops.find((st) => st.key === stopKey).date).toBe('June 4, 2026 08:00 CDT') // D alone: its own default
    s = addToStop(s, 'E', allOrders)
    const joined = s.stops.find((st) => st.key === stopKey)
    expect(joined.orderIds).toEqual(['D', 'E'])
    expect(joined.date).toBe('June 4, 2026 10:00 CDT') // latest of the earliest bounds, <= earliest of the latest bounds
  })
  it('falls back to keeping the existing default when the joined orders\' windows are disjoint', () => {
    const orderF = { orderNumber: 'F', shipFrom: { location: 'W, Newplace' }, shipTo: { location: 'Z, Ville' }, grossWeight: '1 LB', totalVolume: '1 cuft', earliestPickup: 'June 5, 2026 08:00 CDT', latestPickup: 'June 5, 2026 09:00 CDT', earliestDelivery: 'June 8, 2026 10:00 CDT' }
    const allOrders = [...orders, orderD, orderF]
    let s = initSandbox({ stops, consolidation: noChange, orders: allOrders })
    s = addToStop(s, 'D', allOrders)
    const stopKey = s.stops.find((st) => st.orderIds.includes('D') && st.type === 'pickup').key
    s = addToStop(s, 'F', allOrders)
    const joined = s.stops.find((st) => st.key === stopKey)
    expect(joined.orderIds).toEqual(['D', 'F'])
    expect(joined.date).toBe('June 4, 2026 08:00 CDT') // disjoint — keeps D's own default, untouched
  })
  it('never overwrites a stop the planner already hand-dated', () => {
    const allOrders = [...orders, orderD, orderE]
    let s = initSandbox({ stops, consolidation: noChange, orders: allOrders })
    s = addToStop(s, 'D', allOrders)
    const stopKey = s.stops.find((st) => st.orderIds.includes('D') && st.type === 'pickup').key
    s = setStopDate(s, stopKey, 'June 4, 2026 07:00 CDT')
    s = addToStop(s, 'E', allOrders)
    expect(s.stops.find((st) => st.key === stopKey).date).toBe('June 4, 2026 07:00 CDT')
  })
})
describe('confirmStop ("Keep here", T1.2)', () => {
  it('clears unsequenced without moving the stop, and marks dirty', () => {
    let s = initSandbox({ stops, consolidation: locChange, orders: relocate(orders, 'C', 'shipFrom', 'Q, Burg') })
    const key = s.stops[1].key
    expect(s.stops[1].unsequenced).toBe(true)
    s = confirmStop(s, key)
    expect(s.stops[1]).toMatchObject({ key, unsequenced: false })
    expect(s.dirty).toBe(true)
  })
  it('is a no-op on an already-sequenced stop', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    expect(confirmStop(s, s.stops[0].key)).toBe(s)
  })
  it('is a no-op for an unknown key', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    expect(confirmStop(s, 'nope')).toBe(s)
  })
})
describe('moveStop', () => {
  it('moves up/down, renumbers, and sequences a P? once placed', () => {
    let s = initSandbox({ stops, consolidation: locChange, orders: relocate(orders, 'C', 'shipFrom', 'Q, Burg') })
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
    let s = initSandbox({ stops, consolidation: locChange, orders: relocate(orders, 'C', 'shipFrom', 'Q, Burg') })
    expect(labelsOf(s)).toEqual(['P1', 'P?', 'D1'])
    s = moveStop(s, 0, 'down')
    expect(labelsOf(s)).toEqual(['P?', 'P1', 'D1'])
  })
})
describe('reorderStop (drag)', () => {
  const four = [
    stop({ stopNumber: 1, orderIds: ['A', 'B'] }),
    stop({ stopNumber: 2, orderIds: ['C'], location: 'Y, Town' }),
    stop({ type: 'delivery', stopNumber: 3, orderIds: ['C'], location: 'W, Ville' }),
    stop({ type: 'delivery', stopNumber: 4, orderIds: ['A', 'B'], location: 'Z, Ville' }),
  ]
  it('a legal multi-slot drop moves the stop with all its orders and marks dirty', () => {
    const s = initSandbox({ stops: four, consolidation: noChange, orders })
    const r = reorderStop(s, 0, 2) // P(A,B) below D(C), still above D(A,B)
    expect(r.stops.map((x) => x.key)).toEqual(['s2', 's3', 's1', 's4'])
    expect(labelsOf(r)).toEqual(['P1', 'D1', 'P2', 'D2'])
    expect(r.dirty).toBe(true)
  })
  it('an illegal drop is refused with the SAME reason canMoveStop gives, and returns the same reference', () => {
    const s = initSandbox({ stops: four, consolidation: noChange, orders })
    const arrowRefusal = canMoveStop(s, 2, 'up') // D(C) above P(C)
    expect(arrowRefusal.ok).toBe(false)
    expect(canReorderStop(s, 0, 3)).toEqual(arrowRefusal) // P(A,B) below D(A,B)
    expect(reorderStop(s, 0, 3)).toBe(s)
    expect(reorderStop(s, 1, 1)).toBe(s) // dropped in place: no-op
  })
  it('an adjacent drop is exactly the arrow move; dropping a P? sequences only the dropped stop (parity with moveStop)', () => {
    const s = initSandbox({ stops, consolidation: locChange, orders: relocate(orders, 'C', 'shipFrom', 'Q, Burg') })
    expect(reorderStop(s, 1, 0)).toEqual(moveStop(s, 1, 'up'))
    expect(labelsOf(reorderStop(s, 1, 0))).toEqual(['P1', 'P2', 'D1'])
    expect(labelsOf(reorderStop(s, 0, 1))).toEqual(['P?', 'P1', 'D1']) // P1 dragged past the P? — the P? stays unplaced
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
  it('routeBlocker names the reason isRoutable is false for, else null', () => {
    let s = initSandbox({ stops, consolidation: locChange, orders: relocate(orders, 'C', 'shipFrom', 'Q, Burg') })
    expect(routeBlocker(s)).toBe('unsequenced')                       // the created P? is unsequenced
    s = moveStop(s, 1, 'up')                                          // sequences it, but it has no date yet
    expect(routeBlocker(s)).toBe('undated')
    s = setStopDate(s, s.stops[0].key, 'June 5, 2026 09:00 CDT')
    expect(routeBlocker(s)).toBeNull()
    expect(isRoutable(s)).toBe(true)
  })
  // C16 (LINX-15669 §5 / BR-4) — date, time AND zone.
  it('a stop dated without a time zone blocks Evaluate; a fully stamped one passes', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    expect(isStopDated(s.stops[0])).toBe(true)
    s = setStopDate(s, s.stops[0].key, 'March 4, 2026 10:00')
    expect(isStopDated(s.stops[0])).toBe(false)
    expect(routeBlocker(s)).toBe('undated')
    expect(isRoutable(s)).toBe(false)
    s = setStopDate(s, s.stops[0].key, 'March 4, 2026 10:00 CST')
    expect(routeBlocker(s)).toBeNull()
    expect(isRoutable(s)).toBe(true)
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

describe('addToStop — system placement (DEC-193)', () => {
  it('an order whose locations still have stops rejoins them — no picker, no new stop', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = addToStop(moveToPending(s, 'A'), 'A', orders)          // P1 (X, City) survives via B
    expect(labelsOf(s)).toEqual(['P1', 'P2', 'D1'])
    expect(s.stops[0].orderIds).toContain('A')
    expect(s.stops[2].orderIds).toContain('A')
    expect(s.pending).toEqual([])
  })
  it('a new-location pickup creates P? and never lands on a delivery stop', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    const ext = [...orders, { orderNumber: 'E', shipFrom: { location: 'W, Far' }, shipTo: { location: 'Z, Ville' }, grossWeight: '1 LB', totalVolume: '1 cuft', earliestPickup: '2026-06-01', earliestDelivery: '2026-06-03' }]
    s = addToStop(addPending(s, ['E']), 'E', ext)
    const withE = s.stops.filter((st) => st.orderIds.includes('E'))
    expect(withE.map((st) => st.type).sort()).toEqual(['delivery', 'pickup'])
    expect(withE.find((st) => st.type === 'pickup')).toMatchObject({ unsequenced: true, location: 'W, Far' })
    expect(labelsOf(s)).toContain('P?')
  })
})

describe('addPending', () => {
  it('adds ids once, ignores ids already on a stop, does not touch dirty/routed', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    const r = addPending(s, ['E', 'E', 'A'])
    expect(r.pending).toEqual(['E'])
    expect(r.dirty).toBe(false)
  })
})

describe('stop dates + planning windows (DEC-199)', () => {
  const win = (over) => ({ orderNumber: 'A', earliestPickup: '06/04/2026 06:00 CDT', latestPickup: '06/04/2026 10:00 CDT', earliestDelivery: '06/06/2026 06:00 CDT', latestDelivery: '06/06/2026 12:00 CDT', ...over })
  const stopAt = (date, type = 'pickup') => ({ key: 's1', type, orderIds: ['A'], date })

  it('parses both stamp shapes and round-trips the long one', () => {
    expect(parseStamp('June 4, 2026 08:00 CDT')).toEqual({ y: 2026, mo: 5, d: 4, h: 8, mi: 0, tz: 'CDT' })
    expect(parseStamp('06/04/2026 08:00 CDT')).toEqual({ y: 2026, mo: 5, d: 4, h: 8, mi: 0, tz: 'CDT' })
    expect(formatStopDate(parseStamp('June 4, 2026 08:00 CDT'))).toBe('June 4, 2026 08:00 CDT')
    expect(parseStamp('--')).toBeNull()
  })
  it('inside the window → no flag', () => {
    expect(windowViolations([stopAt('June 4, 2026 08:00 CDT')], [win()])).toEqual([])
  })
  it('before earliest / after latest → early / late', () => {
    expect(windowViolations([stopAt('June 3, 2026 08:00 CDT')], [win()])[0]).toMatchObject({ orderId: 'A', side: 'early' })
    expect(windowViolations([stopAt('June 9, 2026 08:00 CDT')], [win()])[0]).toMatchObject({ side: 'late', from: '06/04/2026 06:00 CDT' })
  })
  it('delivery stops check the delivery window', () => {
    expect(windowViolations([stopAt('June 6, 2026 11:00 CDT', 'delivery')], [win()])).toEqual([])
    expect(windowViolations([stopAt('June 7, 2026 11:00 CDT', 'delivery')], [win()])[0]).toMatchObject({ side: 'late', type: 'delivery' })
  })
  it('compares across zones: 14:00 EST is after an 11:30 CST latest; 12:00 EST is not', () => {
    expect(windowViolations([stopAt('June 4, 2026 14:00 EDT')], [win()])[0]).toMatchObject({ side: 'late' }) // 13:00 CDT > 10:00 CDT
    expect(windowViolations([stopAt('June 4, 2026 11:00 EDT')], [win()])).toEqual([])                     // 10:00 CDT
  })
  it('a missing bound checks only the other one', () => {
    expect(windowViolations([stopAt('June 9, 2026 08:00 CDT')], [win({ latestPickup: '--' })])).toEqual([])
  })
  it('setStopDate edits one stop, marks dirty and dateEdited', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = setStopDate(s, 's1', 'June 5, 2026 09:00 CDT')
    expect(s.stops[0].date).toBe('June 5, 2026 09:00 CDT')
    expect(s.dirty).toBe(true); expect(s.stops[0].dateEdited).toBe(true)
    expect(toDto(s)[0].scheduledDateTime).toBe('June 5, 2026 09:00 CDT')
  })
})

describe('placement matches on site id + postal, not display strings (DEC-193 bug, live 25412375)', () => {
  // The live shapes: a stop reads "MIAMI TERMINAL, Miami, FL 33101 US",
  // its order's fmtLocation reads "33101, Miami, FL, US" — never equal.
  const site = { facilityName: 'MIAMI TERMINAL', city: 'Miami', region: 'FL', postal: '33101', country: 'US' }
  const liveStops = [
    { type: 'pickup', stopNumber: 1, orderIds: ['A', 'B'], siteKey: 'MIAMI TERMINAL|33101', location: 'MIAMI TERMINAL, Miami, FL 33101 US', date: 'June 4, 2026 08:00 CDT' },
    { type: 'delivery', stopNumber: 2, orderIds: ['A', 'B'], siteKey: 'SEMPRA|92101', location: 'SEMPRA, San Diego, CA 92101 US', date: 'June 6, 2026 08:00 CDT' },
  ]
  const at = (s, loc) => ({ siteKey: `${s.facilityName}|${s.postal}`, location: loc, stopLocation: 'X', site: s })
  const liveOrders = ['A', 'B'].map((n) => ({
    orderNumber: n,
    shipFrom: at(site, '33101, Miami, FL, US'),
    shipTo: at({ facilityName: 'SEMPRA', city: 'San Diego', region: 'CA', postal: '92101', country: 'US' }, '92101, San Diego, CA, US'),
  }))
  it('an order set aside and added back rejoins its own stops — no P?', () => {
    let s = initSandbox({ stops: liveStops, consolidation: noChange, orders: liveOrders })
    s = addToStop(moveToPending(s, 'B'), 'B', liveOrders)
    expect(labelsOf(s)).toEqual(['P1', 'D1'])
    expect(s.stops[0].orderIds).toEqual(['A', 'B'])
  })
  it('a created stop carries the structured site through toDto', () => {
    let s = initSandbox({ stops: liveStops, consolidation: noChange, orders: liveOrders })
    const e = { orderNumber: 'E', shipFrom: at({ ...site, facilityName: 'NEW PLANT', postal: '33102' }, 'x'), shipTo: liveOrders[0].shipTo }
    s = addToStop(addPending(s, ['E']), 'E', [...liveOrders, e])
    const created = toDto(s).find((d) => d.sourceStopSequence == null)
    expect(created).toMatchObject({ facilityName: 'NEW PLANT', city: 'Miami', region: 'FL', postal: '33102' })
  })
})

// Bug fix (S160 follow-up, live 25390278): a location-changed order's
// created P? had no lat/lng (every leg touching it read '--', and the
// All Stops total silently read "0.00 mi" instead of unknown), a
// truncated location string, and an order-window date in the wrong
// format/zone. Coverage below matches those three symptoms directly.
describe('location-change created stop carries coordinates + zone (S160 follow-up)', () => {
  const coordStops = [
    { type: 'pickup', stopNumber: 1, orderIds: ['A'], location: 'ACME, Dallas', date: 'June 4, 2026 08:00 CDT', lat: 32.78, lng: -96.80 },
    { type: 'pickup', stopNumber: 2, orderIds: ['C'], location: 'Y, Town', date: 'June 4, 2026 08:00 CDT', lat: 30.45, lng: -91.15 },
    { type: 'delivery', stopNumber: 3, orderIds: ['A', 'C'], location: 'Z, Ville', date: 'June 6, 2026 08:00 CDT', lat: 29.42, lng: -98.49 },
  ]
  const phoenixSite = { facilityName: 'PHOENIX TERMINAL', city: 'Phoenix', region: 'AZ', postal: '85001', country: 'US', lat: 33.45, lng: -112.07, timeZone: 'America/Phoenix' }
  const relocatedC = { orderNumber: 'C', shipFrom: { siteKey: 'PHOENIX TERMINAL|85001', location: 'PHOENIX TERMINAL, Phoenix, AZ 85001 US', stopLocation: 'PHOENIX TERMINAL, Phoenix, AZ 85001 US', site: phoenixSite }, earliestPickup: '06/01/2026 03:30 CDT' }
  const coordOrders = [{ orderNumber: 'A' }, relocatedC]
  const coordLocChange = { ...noChange, locationChange: true, changedOrderIds: ['C'], stopChanges: { '2': { changedOrderIds: ['C'], fields: { location: { prior: 'Y, Town', new: 'PHOENIX TERMINAL, Phoenix' } } } } }

  it('the created P? carries the site lat/lng and its full location string', () => {
    const s = initSandbox({ stops: coordStops, consolidation: coordLocChange, orders: coordOrders })
    expect(s.stops[1]).toMatchObject({ type: 'pickup', unsequenced: true, lat: 33.45, lng: -112.07, location: 'PHOENIX TERMINAL, Phoenix, AZ 85001 US' })
  })
  it("the created P?'s default date is in the SITE's own zone, long-format like every other stop", () => {
    const s = initSandbox({ stops: coordStops, consolidation: coordLocChange, orders: coordOrders })
    // 06/01/2026 03:30 CDT == 08:30 UTC == 01:30 MST the same morning in Phoenix (no DST).
    expect(s.stops[1].date).toBe('June 1, 2026 01:30 MST')
  })
  it('legDistances totals a real number once every stop (incl. the created one) has coordinates', () => {
    const s = initSandbox({ stops: coordStops, consolidation: coordLocChange, orders: coordOrders })
    const { legs, total } = legDistances(s.stops)
    expect(legs.every((l, i) => i === 0 || typeof l === 'number')).toBe(true)
    expect(total).not.toBeNull()
    expect(total).toBeGreaterThan(0)
  })
  it('a leg with no coordinate source reads null (UI shows "--"), and the total is null, not an invented 0.00', () => {
    const bareOrders = [{ orderNumber: 'A' }, { orderNumber: 'C', shipFrom: { location: 'PHOENIX TERMINAL, Phoenix' } }]
    const s = initSandbox({ stops: coordStops, consolidation: coordLocChange, orders: bareOrders })
    const { legs, total } = legDistances(s.stops)
    expect(legs[1]).toBeNull() // leg INTO the coordinate-less created stop
    expect(total).toBeNull()
  })
})

// C7 (S163 audit, LINX-15669/15668 §2) — a system placement can join an
// order to stops in the wrong order; routing must refuse it until repaired.
describe('delivery-before-pickup gate (C7)', () => {
  const site = (name) => ({ siteKey: `${name}|0`, location: `${name}, Town`, site: { facilityName: name, city: 'Town' } })
  const seqStops = [
    { type: 'pickup', stopNumber: 1, orderIds: ['O1'], siteKey: 'P1|0', location: 'P1, Town', date: 'June 4, 2026 08:00 CDT' },
    { type: 'delivery', stopNumber: 2, orderIds: ['O1'], siteKey: 'D1|0', location: 'D1, Town', date: 'June 5, 2026 08:00 CDT' },
    { type: 'pickup', stopNumber: 3, orderIds: ['O2'], siteKey: 'P2|0', location: 'P2, Town', date: 'June 5, 2026 10:00 CDT' },
    { type: 'delivery', stopNumber: 4, orderIds: ['O2'], siteKey: 'D2|0', location: 'D2, Town', date: 'June 6, 2026 08:00 CDT' },
  ]
  const o3 = { orderNumber: 'O3', shipFrom: site('P2'), shipTo: site('D1') }
  const seqOrders = [{ orderNumber: 'O1' }, { orderNumber: 'O2' }, o3]

  it('the S163 repro: O3 joins P2 and D1, so it is delivered before pickup; moving P2 above D1 repairs it', () => {
    let s = initSandbox({ stops: seqStops, consolidation: noChange, orders: seqOrders })
    s = addToStop(addPending(s, ['O3']), 'O3', seqOrders)
    expect(labelsOf(s)).toEqual(['P1', 'D1', 'P2', 'D2'])        // joined, no P?/D?
    expect(isRoutable(s)).toBe(false)
    expect(routeBlocker(s)).toBe('sequence')
    expect(firstSequenceViolation(s.stops)).toBe('O3')
    // Already invalid, so the repairing move is allowed.
    expect(canReorderStop(s, 2, 1).ok).toBe(true)
    s = reorderStop(s, 2, 1)
    expect(firstSequenceViolation(s.stops)).toBeNull()
    expect(isRoutable(s)).toBe(true)
  })
  it('canReorderStop still refuses a move that breaks a valid sequence', () => {
    const s = initSandbox({ stops: seqStops, consolidation: noChange, orders: seqOrders })
    expect(canReorderStop(s, 0, 1)).toEqual({ ok: false, reason: 'An order must be picked up before it can be delivered.' })
  })
  it("a new P? for an order whose delivery sits before the last pickup goes just above that delivery", () => {
    // O1's pickup relocates to a new site: the pickup group ends at P2
    // (index 2), but O1's delivery D1 is at index 1.
    const c = { ...noChange, stopChanges: { '1': { changedOrderIds: ['O1'], fields: { location: { prior: 'P1, Town', new: 'PX, Town' } } } } }
    const relocatedOrders = [{ orderNumber: 'O1', shipFrom: site('PX') }, ...seqOrders.slice(1)]
    const s = initSandbox({ stops: [{ ...seqStops[0], orderIds: ['O1', 'O2'] }, ...seqStops.slice(1)], consolidation: c, orders: relocatedOrders })
    expect(s.stops.map((x) => x.location)).toEqual(['P1, Town', 'PX, Town', 'D1, Town', 'P2, Town', 'D2, Town'])
    expect(labelsOf(s)).toEqual(['P1', 'P?', 'D1', 'P2', 'D2'])
    expect(firstSequenceViolation(s.stops)).toBeNull()
  })
})

// C9 — a created stop's coordinates + zone ride the save (mergeStops keeps
// an existing stop's own).
describe('toDto carries lat/lng/timeZone (C9)', () => {
  it('a created stop emits its site coordinates and zone', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    const e = { orderNumber: 'E', shipFrom: { siteKey: 'NEW|1', location: 'NEW, Phoenix', site: { facilityName: 'NEW', city: 'Phoenix', lat: 33.45, lng: -112.07, timeZone: 'America/Phoenix' } }, shipTo: orders[0].shipTo }
    const created = toDto(addToStop(addPending(s, ['E']), 'E', [...orders, e])).find((d) => d.sourceStopSequence == null)
    expect(created).toMatchObject({ lat: 33.45, lng: -112.07, timeZone: 'America/Phoenix' })
  })
})

it('F5: plannedDates maps each order to its New pickup/delivery stop dates', () => {
  const sb = [
    { type: 'pickup', orderIds: ['A', 'B'], date: 'June 4, 2026 08:00 CDT' },
    { type: 'delivery', orderIds: ['A'], date: 'June 6, 2026 08:00 CDT' },
  ]
  expect(plannedDates(sb)).toEqual({
    A: { pickup: 'June 4, 2026 08:00 CDT', delivery: 'June 6, 2026 08:00 CDT' },
    B: { pickup: 'June 4, 2026 08:00 CDT' },
  })
  expect(plannedDates(sb).Z).toBeUndefined()   // pending / unknown → '--' in the modal
})
