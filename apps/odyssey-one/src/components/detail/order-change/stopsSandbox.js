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

// Where a leg goes: `at` = { siteKey, location, site } (an order's shipFrom/
// shipTo, or a bare { location } for a seeded location change). Matches a
// stop of the SAME type on site id + postal (DEC-193); a bare location falls
// back to display equality.
// ponytail: site id + postal, not the AC's Location-ID + full address — the
// seed's order and stop address1 disagree for the same site (plan Wave B).
const sameSite = (s, at) => (at.siteKey && s.siteKey ? s.siteKey === at.siteKey : s.location === at.location)

function placeOrder(list, orderId, type, at, makeKey, orders) {
  const idx = list.findIndex((s) => s.type === type && sameSite(s, at))
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
    siteKey: at.siteKey ?? '',
    site: at.site,
    location: at.stopLocation ?? at.location,
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
    siteKey: s.siteKey ?? '',
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
      placeOrder(sbStops, orderId, type, { location: locField.new }, () => `new:${type}:${++seq}`, orders)
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

// LINX-15871 + DEC-193 (Jana 2026-09-24, reverses the S144 stop picker):
// placement is the system's. Each leg joins a stop of the SAME type at the
// same location, else a new P?/D? the planner sequences. Legs never cross.
export function addToStop(sb, id, orders) {
  const order = orders.find((o) => o.orderNumber === id)
  if (!order) return sb
  const stops = sb.stops.map((s) => ({ ...s, orderIds: [...s.orderIds] }))
  let seq = sb.seq
  placeOrder(stops, id, 'pickup', order.shipFrom, () => `new:pickup:${++seq}`, orders)
  placeOrder(stops, id, 'delivery', order.shipTo, () => `new:delivery:${++seq}`, orders)
  const pending = sb.pending.filter((p) => p !== id)
  return { ...sb, stops, pending, seq, dirty: true, routed: false }
}

// LINX-15870: orders picked in Search & Add land in the pending column with
// their own Add action. Not a stop edit — dirty/routed untouched.
export function addPending(sb, ids) {
  const onStops = new Set(sb.stops.flatMap((s) => s.orderIds))
  const add = ids.filter((id, i) => !onStops.has(id) && !sb.pending.includes(id) && ids.indexOf(id) === i)
  return add.length ? { ...sb, pending: [...sb.pending, ...add] } : sb
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
    // A created stop carries its order's structured site; otherwise the
    // display string is split (the server takes an existing stop's own
    // fields off sourceStopSequence anyway).
    const idx = s.location.indexOf(', ')
    const facilityName = s.site?.facilityName ?? (idx === -1 ? s.location : s.location.slice(0, idx))
    const city = s.site?.city ?? (idx === -1 ? '' : s.location.slice(idx + 2))
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
      region: s.site?.region,
      postal: s.site?.postal,
      country: s.site?.country,
      sourceStopSequence,
    }
  })
}

// ── Stop date/time (DEC-199, LINX-15669 §3–5) ────────────────────────────
// Two string shapes reach this model: stop dates ("March 4, 2026 10:00 EST")
// and order window bounds ("03/04/2026 05:30 CST"). Both parse to wall-clock
// minutes and compare in UTC via the zone abbreviation — stops carry their
// local zone (EST/PST…) while order windows are CST, so wall clock would lie.
// ponytail: US abbreviations only; an unknown zone compares as UTC.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function parseStamp(str) {
  if (!str || str === '--') return null
  let m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?:\s+([A-Z]{2,4}))?/.exec(str)
  if (m) return { y: +m[3], mo: +m[1] - 1, d: +m[2], h: +m[4], mi: +m[5], tz: m[6] ?? '' }
  m = /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})(?:\s+([A-Z]{2,4}))?/.exec(str)
  if (m && MONTHS.includes(m[1])) return { y: +m[3], mo: MONTHS.indexOf(m[1]), d: +m[2], h: +m[4], mi: +m[5], tz: m[6] ?? '' }
  return null
}

const TZ_OFFSET_H = { EST: -5, EDT: -4, CST: -6, CDT: -5, MST: -7, MDT: -6, PST: -8, PDT: -7, AKST: -9, AKDT: -8, HST: -10 }
const stampValue = (p) => (p ? Date.UTC(p.y, p.mo, p.d, p.h, p.mi) - (TZ_OFFSET_H[p.tz] ?? 0) * 3600000 : null)

// Same long shape the stop cards and save-stops already carry.
export function formatStopDate({ y, mo, d, h, mi, tz }) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${MONTHS[mo]} ${d}, ${y} ${pad(h)}:${pad(mi)}${tz ? ` ${tz}` : ''}`
}

export function setStopDate(sb, key, date) {
  const stops = sb.stops.map((s) => (s.key === key ? { ...s, date } : s))
  return { ...sb, stops, dirty: true, routed: false }
}

// Orders whose planning window the stop's date misses — flagged, never
// blocked (Jana 2026-09-24: "I am aware about it"). The order's window is
// the customer's reference and is never edited here.
export function windowViolations(stops, orders) {
  const byId = new Map(orders.map((o) => [o.orderNumber, o]))
  const out = []
  for (const s of stops) {
    const at = stampValue(parseStamp(s.date))
    if (at == null) continue
    const pickup = s.type === 'pickup'
    for (const id of s.orderIds) {
      const o = byId.get(id)
      if (!o) continue
      const from = pickup ? o.earliestPickup : o.earliestDelivery
      const to = pickup ? o.latestPickup : o.latestDelivery
      const lo = stampValue(parseStamp(from))
      const hi = stampValue(parseStamp(to))
      const side = lo != null && at < lo ? 'early' : hi != null && at > hi ? 'late' : null
      if (side) out.push({ orderId: id, stopKey: s.key, type: s.type, side, from, to })
    }
  }
  return out
}
