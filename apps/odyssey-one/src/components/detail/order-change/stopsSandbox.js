/**
 * Edit Shipment Stops — pure sandbox model (LINX-15667: "Entire screen is like Sandbox").
 * Nothing here touches the DOM or persists; the page mutates this in memory and only
 * commits (toDto) on Approve.
 */

// A6/B2 (DEC-198) — the SAME distance function the seed uses (generate.mjs),
// so a live reorder in this editor can never disagree with the seeded header.
import { legMiles, totalMiles } from '../../../utils/legMiles.js'

// Bug fix (S160 follow-up, live 25390278) — a created stop's default date
// must read in ITS OWN site's zone, not the order's window zone (which stays
// anchored to the order's ORIGINAL stop, B3b(a)). Formats a UTC instant into
// an IANA zone's wall clock via Intl (browser-safe; no node/server deps).
function formatInZone(utcMs, ianaZone) {
  if (utcMs == null || !ianaZone) return null
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaZone, year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short',
    }).formatToParts(new Date(utcMs))
    const get = (t) => parts.find((p) => p.type === t)?.value
    let hour = Number(get('hour'))
    if (hour === 24) hour = 0
    return formatStopDate({
      y: Number(get('year')), mo: Number(get('month')) - 1, d: Number(get('day')),
      h: hour, mi: Number(get('minute')), tz: get('timeZoneName'),
    })
  } catch {
    return null
  }
}

const parseNum = (s) => Number(String(s).replace(/[^0-9.]/g, '')) || 0

const orDash = (v) => (v === '--' ? '' : (v ?? ''))

// LINX-15669 wants the planner to enter Planned Date/Time/TZ on a created
// stop; until that control exists (OC-open-13) the order's earliest window
// date is the only coherent default — anything else leaves isRoutable's
// date gate permanently unreachable for every location-change shipment.
// ponytail: order-window date only, upgrade path = a real per-stop Planned
// Date/Time/TZ control (OC-open-13).
function defaultsFor(order, type, site) {
  if (!order) return { date: '', address: '' }
  const raw = type === 'pickup'
    ? { date: orDash(order.earliestPickup), address: orDash(order.shipFrom?.address) }
    : { date: orDash(order.earliestDelivery), address: orDash(order.shipTo?.address) }
  // Bug fix (S160 follow-up) — reformat into the CREATED stop's own site
  // zone/shape (matches every other stop's scheduledDateTime), not the
  // order-window's short "MM/DD/YYYY" form in the order's ORIGINAL zone.
  if (site?.timeZone) {
    const zoned = formatInZone(stampValue(parseStamp(raw.date)), site.timeZone)
    if (zoned) return { ...raw, date: zoned }
  }
  return raw
}

// Where a leg goes: `at` = { siteKey, location, site } (an order's shipFrom/
// shipTo, or a bare { location } for a seeded location change). Matches a
// stop of the SAME type on site id + postal (DEC-193); a bare location falls
// back to display equality.
// ponytail: site id + postal, not the AC's Location-ID + full address — the
// seed's order and stop address1 disagree for the same site (plan Wave B).
const sameSite = (s, at) => (at.siteKey && s.siteKey ? s.siteKey === at.siteKey : s.location === at.location)

// T1.3 (spec item 3) — a created stop's default date must fit EVERY order
// joined to it, not just the first: the latest of their earliest bounds,
// kept only if it's <= the earliest of their latest bounds; else the stop
// keeps whatever default it already had (today's first-order default — the
// `dateEdited` flag then shows truthfully that no one has looked at it).
// Same zone formatting as defaultsFor.
function jointDefaultDate(orderIds, type, orders, site) {
  const bounds = orderIds
    .map((id) => orders?.find((o) => o.orderNumber === id))
    .filter(Boolean)
    .map((o) => {
      const earliestRaw = type === 'pickup' ? o.earliestPickup : o.earliestDelivery
      const latestRaw = type === 'pickup' ? o.latestPickup : o.latestDelivery
      return { earliestRaw: orDash(earliestRaw), earliest: stampValue(parseStamp(earliestRaw)), latest: stampValue(parseStamp(latestRaw)) }
    })
    .filter((b) => b.earliest != null)
  if (!bounds.length) return null
  const latestOfEarliest = Math.max(...bounds.map((b) => b.earliest))
  const knownLatests = bounds.map((b) => b.latest).filter((v) => v != null)
  const earliestOfLatest = knownLatests.length ? Math.min(...knownLatests) : Infinity
  if (latestOfEarliest > earliestOfLatest) return null // disjoint windows — keep the existing default
  if (site?.timeZone) {
    const zoned = formatInZone(latestOfEarliest, site.timeZone)
    if (zoned) return zoned
  }
  return bounds.find((b) => b.earliest === latestOfEarliest).earliestRaw
}

function placeOrder(list, orderId, type, at, makeKey, orders) {
  const idx = list.findIndex((s) => s.type === type && sameSite(s, at))
  if (idx !== -1) {
    const cur = list[idx]
    if (!cur.orderIds.includes(orderId)) cur.orderIds.push(orderId)
    // T1.3 — only a stop THIS session created is still up for a recomputed
    // default; a pre-existing stop's date is the shipment's real record.
    if (cur.key.startsWith('new:') && !cur.dateEdited) {
      const joint = jointDefaultDate(cur.orderIds, type, orders, cur.site ?? at.site)
      if (joint != null) cur.date = joint
    }
    return
  }
  let lastIdx = -1
  for (let i = 0; i < list.length; i++) if (list[i].type === type) lastIdx = i
  const order = orders?.find((o) => o.orderNumber === orderId)
  const { date, address } = defaultsFor(order, type, at.site)
  const newStop = {
    key: makeKey(),
    type,
    orderIds: [orderId],
    siteKey: at.siteKey ?? '',
    site: at.site,
    location: at.stopLocation ?? at.location,
    address,
    date,
    dateEdited: false,
    weight: '',
    volume: '',
    packageCount: '',
    pickupNo: '',
    unsequenced: true,
    // Bug fix (S160 follow-up) — a created stop's own coordinates, when its
    // site carries them (B2's legMiles reads lat/lng off every stop it's
    // given; previously always undefined here, so a location-change or
    // manual add's created stop always dropped out of every leg it touched).
    lat: at.site?.lat,
    lng: at.site?.lng,
  }
  let insertAt = lastIdx === -1 ? (type === 'pickup' ? 0 : list.length) : lastIdx + 1
  // C7 (LINX-15668 §2, "before the same order's delivery") — a relocated
  // pickup whose order's delivery already sits at or before the end of the
  // pickup group goes just above that delivery, so the system's own
  // placement never hands the planner a delivery-before-pickup.
  if (type === 'pickup') {
    const dIdx = list.findIndex((s) => s.type === 'delivery' && s.orderIds.includes(orderId))
    if (dIdx !== -1 && dIdx < insertAt) insertAt = dIdx
  }
  list.splice(insertAt, 0, newStop)
}

// LINX-15669: every pickup of an order must precede that order's delivery.
// C7 — the first order delivered before it's picked up, else null (the
// Evaluate tooltip names it).
export function firstSequenceViolation(stops) {
  for (let i = 0; i < stops.length; i++) {
    const st = stops[i]
    if (st.type !== 'delivery') continue
    for (const id of st.orderIds) {
      const pickedBefore = stops.slice(0, i).some((s) => s.type === 'pickup' && s.orderIds.includes(id))
      if (!pickedBefore) return id
    }
  }
  return null
}

// ponytail: per-order check only. With one pickup stop per order, 15669's
// "all pickups on a multi-order delivery stop precede it" is the same rule;
// widen if an order can ever sit on two pickup stops.
const validSequence = (stops) => firstSequenceViolation(stops) == null

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
    // B2/A6 (DEC-198) — read by legDistances below. Absent on a P?/D? stop
    // created in THIS session (placeOrder has no coordinate source for a
    // brand-new site) — legMiles skips a leg it can't compute rather than
    // treating it as zero.
    lat: s.lat,
    lng: s.lng,
    unsequenced: false,
    // T1.3 — a pre-existing stop's date is the shipment's real record, never
    // recomputed by placeOrder's joint-default logic.
    dateEdited: true,
  }))
  // T1.1 (user default, 2026-09-25) — a Prior that is really prior: snapshot
  // BEFORE the relocation loop below moves anything, empties dropped (same
  // drop rule as `arrival`, for a fixture that somehow arrives pre-emptied).
  // This is what the Prior column renders: the customer's relocation shows
  // up here as the order's ORIGINAL stop, not the P?/D? the loop creates.
  const prior = sbStops.filter((st) => st.orderIds.length > 0).map((s) => ({ ...s, orderIds: [...s.orderIds] }))
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
      // Bug fix (S160 follow-up, live 25390278) — was a bare `{ location }`
      // string (no siteKey/site/coords), so the created P? stop always
      // dropped its distance leg and showed a truncated location. The
      // order's OWN shipFrom/shipTo already carries the relocated site
      // (buildConsolidationChange B3b(c) writes it onto the order record),
      // same full site addToStop already uses for a manual placement — one
      // code path for both.
      const order = orders?.find((o) => o.orderNumber === orderId)
      const at = (type === 'pickup' ? order?.shipFrom : order?.shipTo) ?? { location: locField.new }
      placeOrder(sbStops, orderId, type, at, () => `new:${type}:${++seq}`, orders)
      src.orderIds = src.orderIds.filter((id) => id !== orderId)
    }
  }
  const finalStops = sbStops.filter((st) => st.orderIds.length > 0)
  // T1.1 — `arrival`: today's post-relocation snapshot (what `prior` used to
  // BE before this fix). "Did the planner change anything" (priorDiff)
  // compares against THIS, not against the true `prior` above.
  const arrival = finalStops.map((s) => ({ ...s, orderIds: [...s.orderIds] }))
  return { stops: finalStops, pending: [], prior, arrival, dirty: false, seq }
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

const SEQUENCE_REASON = 'An order must be picked up before it can be delivered.'

// The stop at `from` lifted out and dropped at `to` (an arrow move is the
// adjacent case: to = from ± 1, which is the same as a swap).
function relocate(stops, from, to) {
  const next = stops.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

// LINX-15669 — the ONE gate for every reorder (arrows + drag): a move is
// refused only when it BREAKS a valid sequence. C7 — when the sequence is
// already invalid (a placement joined an order to stops in the wrong order),
// every move is allowed so the planner can repair it; isRoutable holds
// Evaluate until they do. A drag is only checked at its drop point: from a
// valid sequence, moving one stop can only ADD pickup/delivery inversions as
// it passes stops, so if the final spot is legal every adjacent step on the
// way was too — a drag and the equivalent arrow run accept the same moves.
export function canReorderStop(sb, from, to) {
  const n = sb.stops.length
  if (from < 0 || from >= n || to < 0 || to >= n) return { ok: false, reason: 'Already at the edge.' }
  if (validSequence(sb.stops) && !validSequence(relocate(sb.stops, from, to))) return { ok: false, reason: SEQUENCE_REASON }
  return { ok: true }
}

export function canMoveStop(sb, i, dir) {
  if (i < 0 || i >= sb.stops.length) return { ok: false, reason: 'Already at the edge.' }
  return canReorderStop(sb, i, dir === 'up' ? i - 1 : i + 1)
}

// Moving a stop sequences it (a P?/D? stops being "?" once the planner has
// placed it) and marks the sandbox dirty. Rejected moves return `sb` as is.
export function reorderStop(sb, from, to) {
  if (from === to || !canReorderStop(sb, from, to).ok) return sb
  const stops = relocate(sb.stops.map((s) => ({ ...s, orderIds: [...s.orderIds] })), from, to)
  stops[to].unsequenced = false
  return { ...sb, stops, dirty: true }
}

export function moveStop(sb, i, dir) {
  if (!canMoveStop(sb, i, dir).ok) return sb
  return reorderStop(sb, i, dir === 'up' ? i - 1 : i + 1)
}

// T1.2 — "Keep here" (user default): clears `unsequenced` on a stop WITHOUT
// moving it. No-op on an already-sequenced stop.
export function confirmStop(sb, key) {
  const target = sb.stops.find((s) => s.key === key)
  if (!target || !target.unsequenced) return sb
  const stops = sb.stops.map((s) => (s.key === key ? { ...s, unsequenced: false } : s))
  return { ...sb, stops, dirty: true }
}

// LINX-15869: pull an order off every stop it's on, into the pending list.
export function moveToPending(sb, id) {
  const allIds = new Set()
  sb.stops.forEach((s) => s.orderIds.forEach((o) => allIds.add(o)))
  if (!allIds.has(id) || allIds.size <= 1) return sb
  const stops = sb.stops
    .map((s) => ({ ...s, orderIds: s.orderIds.filter((o) => o !== id) }))
    .filter((s) => s.orderIds.length > 0)
  return { ...sb, stops, pending: [...sb.pending, id], dirty: true }
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
  return { ...sb, stops, pending, seq, dirty: true }
}

// LINX-15870: orders picked in Search & Add land in the pending column with
// their own Add action. Not a stop edit — dirty untouched.
export function addPending(sb, ids) {
  const onStops = new Set(sb.stops.flatMap((s) => s.orderIds))
  const add = ids.filter((id, i) => !onStops.has(id) && !sb.pending.includes(id) && ids.indexOf(id) === i)
  return add.length ? { ...sb, pending: [...sb.pending, ...add] } : sb
}

// C16 (LINX-15669 §5 / BR-4) — dated means date, time AND time zone.
export const isStopDated = (s) => !!parseStamp(s.date)?.tz

// Gate for LINX-15670/15869/15871: routable iff no unsequenced stop, every
// stop is dated (C16), and (C7, LINX-15669) no order is delivered before pickup.
export function isRoutable(sb) {
  return sb.stops.length > 0 && sb.stops.every((s) => !s.unsequenced && isStopDated(s)) && validSequence(sb.stops)
}

// T1.5 — isRoutable's reason, for the Evaluate tooltip.
export function routeBlocker(sb) {
  if (sb.stops.some((s) => s.unsequenced)) return 'unsequenced'
  if (!validSequence(sb.stops)) return 'sequence'
  if (!sb.stops.every(isStopDated)) return 'undated'
  return null
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

// A6/B2 (DEC-198) — per-leg + total distance over a stop sequence (either
// sb.stops or sb.prior — both are plain stop arrays), recomputed on every
// render (move/place/add all go through setSb, which is enough to trigger
// this since it's pure and cheap over <=~10 stops). The first stop has no
// leg. A leg with a missing coordinate (a freshly created P?/D? stop) reads
// null so the UI can show '--' for that one leg instead of a wrong number,
// while the total still sums whatever legs it CAN compute (legMiles.js's own
// documented behavior).
export function legDistances(stops) {
  const legs = stops.map((s, i) => (i === 0 ? null : legMiles(stops[i - 1], s)))
  return { legs, total: totalMiles(stops) }
}

// T1.1 — what the PLANNER changed, relative to the structure on arrival
// (today's post-relocation snapshot) — never relative to `prior`, which is
// now the pre-relocation record the Prior column renders, not a diff base.
export function priorDiff(sb) {
  const priorKeys = sb.arrival.map((s) => s.key)
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
      // C9 — a created stop's coordinates + zone (mergeStops keeps an
      // existing stop's own; these only fill a created one).
      lat: s.lat,
      lng: s.lng,
      timeZone: s.site?.timeZone,
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
export const stampValue = (p) => (p ? Date.UTC(p.y, p.mo, p.d, p.h, p.mi) - (TZ_OFFSET_H[p.tz] ?? 0) * 3600000 : null)

// Same long shape the stop cards and save-stops already carry.
export function formatStopDate({ y, mo, d, h, mi, tz }) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${MONTHS[mo]} ${d}, ${y} ${pad(h)}:${pad(mi)}${tz ? ` ${tz}` : ''}`
}

// T1.3 — hand-dating a stop sets `dateEdited`, so a later order joining it
// never overwrites the planner's own choice.
export function setStopDate(sb, key, date) {
  const stops = sb.stops.map((s) => (s.key === key ? { ...s, date, dateEdited: true } : s))
  return { ...sb, stops, dirty: true }
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

// S164 F5 — where each order sits NOW: the date of the New stop of each type
// holding it (the same s.date windowViolations compares, so the modal column
// and the missed-bound badge can't disagree). An order on no stop is absent.
export function plannedDates(stops) {
  const out = {}
  for (const s of stops) {
    for (const id of s.orderIds) (out[id] ??= {})[s.type === 'pickup' ? 'pickup' : 'delivery'] = s.date
  }
  return out
}
