/**
 * Edit Shipment Stops — pure sandbox model (LINX-15667: "Entire screen is like Sandbox").
 * Nothing here touches the DOM or persists; the page mutates this in memory and only
 * commits (toDto) on Approve.
 */

const parseNum = (s) => Number(String(s).replace(/[^0-9.]/g, '')) || 0

const orDash = (v) => (v === '--' ? '' : (v ?? ''))

// LINX-15669 wants the planner to enter Planned Date/Time/TZ on a created
// stop; until that control exists (OC-open-13) the order's earliest window
// date is the only coherent default — anything else leaves isRoutable's
// date gate permanently unreachable for every location-change shipment.
// ponytail: order-window date only, upgrade path = a real per-stop Planned
// Date/Time/TZ control (OC-open-13).
function defaultsFor(order, type) {
  if (!order) return { date: '', address: '' }
  return type === 'pickup'
    ? { date: orDash(order.earliestPickup), address: orDash(order.shipFrom?.address) }
    : { date: orDash(order.earliestDelivery), address: orDash(order.shipTo?.address) }
}

// ponytail: location match is plain string equality on the display location.
// The AC calls for a Location-ID + full-address match; upgrade when that data is on the VM.
function placeOrder(list, orderId, type, location, makeKey, orders) {
  const idx = list.findIndex((s) => s.type === type && s.location === location)
  if (idx !== -1) {
    if (!list[idx].orderIds.includes(orderId)) list[idx].orderIds.push(orderId)
    return
  }
  let lastIdx = -1
  for (let i = 0; i < list.length; i++) if (list[i].type === type) lastIdx = i
  const order = orders?.find((o) => o.orderNumber === orderId)
  const { date, address } = defaultsFor(order, type)
  const newStop = {
    key: makeKey(),
    type,
    orderIds: [orderId],
    location,
    address,
    date,
    weight: '',
    volume: '',
    packageCount: '',
    pickupNo: '',
    unsequenced: true,
  }
  if (lastIdx === -1) {
    if (type === 'pickup') list.unshift(newStop)
    else list.push(newStop)
  } else {
    list.splice(lastIdx + 1, 0, newStop)
  }
}

// LINX-15669: every pickup of an order must precede that order's delivery.
function validSequence(stops) {
  for (let i = 0; i < stops.length; i++) {
    const st = stops[i]
    if (st.type !== 'delivery') continue
    for (const id of st.orderIds) {
      const pickedBefore = stops.slice(0, i).some((s) => s.type === 'pickup' && s.orderIds.includes(id))
      if (!pickedBefore) return false
    }
  }
  return true
}

// LINX-15668: on open, relocate every order whose location changed.
export function initSandbox({ stops, consolidation, orders }) {
  const sbStops = stops.map((s) => ({
    key: `s${s.stopNumber}`,
    type: s.type,
    orderIds: [...s.orderIds],
    location: s.location,
    address: s.address,
    date: s.date,
    weight: s.weight,
    volume: s.volume,
    packageCount: s.packageCount,
    pickupNo: s.pickupNo,
    unsequenced: false,
  }))
  let seq = 0
  const stopChanges = consolidation?.stopChanges || {}
  for (const [stopNumStr, change] of Object.entries(stopChanges)) {
    const locField = change.fields?.location
    if (!locField) continue
    const src = sbStops.find((st) => st.key === `s${stopNumStr}`)
    if (!src) continue
    if (locField.new === src.location) continue // no-op: nothing actually moved
    const type = src.type
    for (const orderId of change.changedOrderIds ?? []) {
      if (!src.orderIds.includes(orderId)) continue
      placeOrder(sbStops, orderId, type, locField.new, () => `new:${type}:${++seq}`, orders)
      src.orderIds = src.orderIds.filter((id) => id !== orderId)
    }
  }
  const finalStops = sbStops.filter((st) => st.orderIds.length > 0)
  const prior = finalStops.map((s) => ({ ...s, orderIds: [...s.orderIds] }))
  return { stops: finalStops, pending: [], prior, dirty: false, routed: false, seq }
}

export function labelsOf(sb) {
  let p = 0
  let d = 0
  return sb.stops.map((s) => {
    if (s.unsequenced) return s.type === 'pickup' ? 'P?' : 'D?'
    if (s.type === 'pickup') {
      p += 1
      return `P${p}`
    }
    d += 1
    return `D${d}`
  })
}

export function canMoveStop(sb, i, dir) {
  if (i < 0 || i >= sb.stops.length) return { ok: false, reason: 'Already at the edge.' }
  const j = dir === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= sb.stops.length) return { ok: false, reason: 'Already at the edge.' }
  const stops = sb.stops.slice()
  ;[stops[i], stops[j]] = [stops[j], stops[i]]
  if (!validSequence(stops)) return { ok: false, reason: 'An order must be picked up before it can be delivered.' }
  return { ok: true }
}

export function moveStop(sb, i, dir) {
  const check = canMoveStop(sb, i, dir)
  if (!check.ok) return sb
  const j = dir === 'up' ? i - 1 : i + 1
  const stops = sb.stops.map((s) => ({ ...s, orderIds: [...s.orderIds] }))
  ;[stops[i], stops[j]] = [stops[j], stops[i]]
  stops[j].unsequenced = false
  return { ...sb, stops, dirty: true, routed: false }
}

// LINX-15869: pull an order off every stop it's on, into the pending list.
export function moveToPending(sb, id) {
  const allIds = new Set()
  sb.stops.forEach((s) => s.orderIds.forEach((o) => allIds.add(o)))
  if (!allIds.has(id) || allIds.size <= 1) return sb
  const stops = sb.stops
    .map((s) => ({ ...s, orderIds: s.orderIds.filter((o) => o !== id) }))
    .filter((s) => s.orderIds.length > 0)
  return { ...sb, stops, pending: [...sb.pending, id], dirty: true, routed: false }
}

// LINX-15871: put a pending order back — pickup by ship-from, delivery by ship-to.
export function addToStop(sb, id, orders) {
  const order = orders.find((o) => o.orderNumber === id)
  if (!order) return sb
  const stops = sb.stops.map((s) => ({ ...s, orderIds: [...s.orderIds] }))
  let seq = sb.seq
  placeOrder(stops, id, 'pickup', order.shipFrom.location, () => `new:pickup:${++seq}`, orders)
  placeOrder(stops, id, 'delivery', order.shipTo.location, () => `new:delivery:${++seq}`, orders)
  const pending = sb.pending.filter((p) => p !== id)
  return { ...sb, stops, pending, seq, dirty: true, routed: false }
}

// Gate for LINX-15670/15869/15871: routable iff no unsequenced stop and every stop has a date.
export function isRoutable(sb) {
  return sb.stops.length > 0 && sb.stops.every((s) => !s.unsequenced && s.date)
}

export function markRouted(sb) {
  return { ...sb, routed: true }
}

export function totals(sb, orders) {
  const ids = new Set()
  sb.stops.forEach((s) => {
    if (s.type === 'pickup') s.orderIds.forEach((id) => ids.add(id))
  })
  let weight = 0
  let volume = 0
  orders.forEach((o) => {
    if (!ids.has(o.orderNumber)) return
    weight += parseNum(o.grossWeight)
    volume += parseNum(o.totalVolume)
  })
  return { grossWeight: `${weight.toLocaleString('en-US')} LB`, volume: `${volume.toLocaleString('en-US')} cuft` }
}

// "Prior" view: what the planner changed relative to the structure at open.
export function priorDiff(sb) {
  const priorKeys = sb.prior.map((s) => s.key)
  const curKeys = sb.stops.map((s) => s.key)
  const removedStopKeys = priorKeys.filter((k) => !curKeys.includes(k))
  const addedStopKeys = curKeys.filter((k) => !priorKeys.includes(k))
  const priorSurvivors = priorKeys.filter((k) => curKeys.includes(k))
  const curSurvivors = curKeys.filter((k) => priorKeys.includes(k))
  const movedStopKeys = curSurvivors.filter((k, idx) => priorSurvivors[idx] !== k)
  return { removedOrderIds: [...sb.pending], movedStopKeys, addedStopKeys, removedStopKeys }
}

export function toDto(sb) {
  return sb.stops.map((s, i) => {
    const idx = s.location.indexOf(', ')
    const facilityName = idx === -1 ? s.location : s.location.slice(0, idx)
    const city = idx === -1 ? '' : s.location.slice(idx + 2)
    // Pre-existing stop keys are `s<originalStopSequence>`; created stops key
    // as `new:<type>:<n>`. The server (mergeStops) needs the ORIGINAL sequence
    // to pull region/postal/timezone etc. off detail.shipmentStopList — this
    // client-only sandbox never carries those fields at all.
    const m = /^s(\d+)$/.exec(s.key)
    const sourceStopSequence = m ? Number(m[1]) : null
    return {
      stopSequence: i + 1,
      stopType: s.type,
      orderIds: s.orderIds,
      facilityName,
      city,
      address1: s.address,
      scheduledDateTime: s.date,
      sourceStopSequence,
    }
  })
}
