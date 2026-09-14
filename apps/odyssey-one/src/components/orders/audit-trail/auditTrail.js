/**
 * Audit Trail derive (LINX-8091 / LINX-9128, ORD-27). Pure: an orders.json row
 * + its order-details.json enrichment → the order's trail, OLDEST FIRST.
 *
 * Derived at read time, not seeded in tools/generate.mjs (plan amendment): a
 * new faker draw there re-numbers every seeded id, and everything a trail
 * needs is already ON the order — creation actor/instant/zone, the current
 * status (so the lifecycle path is known), header values (the "new" side of
 * every edit), lines (the line-level rows). Variation (how many edits, whether
 * a past hold happened, a partial cancellation) comes from a tiny PRNG keyed on
 * the order number, so the trail is stable across renders and reloads.
 *
 * Row granularity follows the AC — one row per save holding a LIST of changes
 * (Q-AT-1). Ramesh's spoken "one row per field" is a change to how `changes`
 * is filled, not to this module's shape.
 *
 * PRNG is a local copy of interfaceErrors.js's seededRandom recipe (kept
 * local there on purpose).
 */

import { EQUIPMENT_CODES, FREIGHT_TERMS } from '../../../data/master-data.js'

// ── PRNG (mulberry32 over an FNV-1a hash of the key) ─────────────────────────
function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)]
const intIn = (r, min, max) => min + Math.floor(r() * (max - min + 1))

// ── Vocabulary ───────────────────────────────────────────────────────────────
const ACTION = 'Order Action'
const EVENT = 'Order Event'
export const CATEGORY_TYPE = {
  'Order Creation': ACTION,
  'Order Header Editing': ACTION,
  'Order Line Item Editing': ACTION,
  'Order Lifecycle Status Change': EVENT,
  'Order Applied on Hold': EVENT,
  'Order Released from Hold (Header Level Editing)': EVENT,
  'Order Released from Hold (Line Item Editing)': EVENT,
  'Order Partial Cancellation': EVENT,
  'Order Full Cancellation': EVENT,
}

// The status path an order walked to reach where it is (registry
// ORDER_STATUS_VALUES). Every path starts at Ready for Planning — that is what
// creation lands on (LINX-10777) — and Hold/Cancelled are terminal EVENTS here,
// not status-change rows, per the 9128 matrix.
const LIFECYCLE_PATH = {
  'Ready for Planning': [],
  'Planned Load': ['Planned Load'],
  'Planned Shipment': ['Planned Load', 'Planned Shipment'],
  'Planning Failed': ['Planning Failed'],
  'Shipment Failed': ['Planned Load', 'Shipment Failed'],
  Hold: [],
  Cancelled: [],
}

// Seeded usernames are `first.last` (tools/seed-users.mjs usernameFor); the
// e-mail domain is the seeded users' `@odyssey.local`. The AC's Source for a
// User is "E-mail ID & full name" — this is the inverse of usernameFor.
export function actorFor(username) {
  const name = String(username).split('.').map((p) => p ? p[0].toUpperCase() + p.slice(1) : p).join(' ')
  return `${username}@odyssey.local · ${name}`
}

const weight = (v, uom) => `${Number(v).toLocaleString('en-US')} ${uom}`
const addHours = (iso, h) => {
  const d = new Date(iso)
  d.setHours(d.getHours() + h)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
}

// Header fields an edit can touch — old value derived FROM the current one so
// the new side is always the order's real value (coherence rule). Old-side
// pools are the real master-data enums (data-pools.mjs), not hand-copied lists.
const TERMS_ALT = FREIGHT_TERMS.map((t) => t.value)
function headerChange(r, row) {
  const kind = pick(r, ['weight', 'equipment', 'terms', 'pickup'])
  if (kind === 'weight') {
    const value = row.grossWeight.value
    let delta = intIn(r, 100, Math.max(101, Math.floor(value * 0.4)))
    if (value > 1) delta = Math.min(delta, value - 1)
    return { field: 'Gross Weight', oldValue: weight(value - delta, row.grossWeight.uom), newValue: weight(value, row.grossWeight.uom) }
  }
  if (kind === 'equipment') {
    return { field: 'Equipment', oldValue: pick(r, EQUIPMENT_CODES.filter((e) => e !== row.equipment)), newValue: row.equipment }
  }
  if (kind === 'terms') {
    return { field: 'Freight Terms', oldValue: pick(r, TERMS_ALT.filter((t) => t !== row.freightTerms)), newValue: row.freightTerms }
  }
  return { field: 'Latest Pickup', oldValue: addHours(row.consignor.latestPickupDateTime, -intIn(r, 24, 96)), newValue: row.consignor.latestPickupDateTime }
}
function lineChange(r, line) {
  const value = line.grossWeightValue
  let delta = intIn(r, 50, Math.max(51, Math.floor(value * 0.4)))
  if (value > 1) delta = Math.min(delta, value - 1)
  return { field: 'Gross Weight', oldValue: weight(value - delta, line.grossWeightUomCode), newValue: weight(value, line.grossWeightUomCode) }
}

/**
 * @param {object} row        orders.json row (OrderListRow)
 * @param {object|null} enrichment order-details.json entry (ManualOrder-shaped) or null
 * @returns {import('../../../api/types/auditTrail').AuditTrailRow[]} oldest → newest
 */
export function deriveAuditTrail(row, enrichment) {
  const r = rng(hash(row.orderNumber || `pending-${row.orderId}`))
  const zone = row.createdTimeZoneCode || 'CDT'
  const manual = row.orderSource === 'MANUAL'
  const user = { changedBy: 'User', source: actorFor(row.createdBy) }
  const lines = enrichment?.orderLines ?? []
  let n = 0
  let at = row.createdAt
  const rows = []
  const push = (category, extra) => {
    rows.push({
      id: `${row.orderNumber || row.orderId}-${n++}`,
      timestamp: at,
      timeZoneCode: zone,
      changeType: CATEGORY_TYPE[category],
      changeCategory: category,
      lineItemId: null,
      changes: [],
      ...extra,
    })
  }
  const step = () => { at = addHours(at, intIn(r, 1, 30)) }

  if (row.orderStatus == null) return [] // validation-error row — not an order yet, nothing to audit

  // 1. Creation — integrated orders arrive from the customer ERP.
  push('Order Creation', manual ? user : { changedBy: 'System', source: 'ERP' })

  if (row.orderStatus === 'Draft') return rows // no lifecycle yet
  const path = LIFECYCLE_PATH[row.orderStatus] ?? [] // genuinely unknown status string: creation only

  // 2. Edits (manual and integrated alike — a customer re-sends, a planner
  //    corrects). 0–2 header saves of 1–3 fields; a line save when lines exist.
  const headerSaves = intIn(r, 0, 2)
  for (let k = 0; k < headerSaves; k++) {
    step()
    const count = intIn(r, 1, 3)
    const changes = []
    const seen = new Set()
    while (changes.length < count) {
      const c = headerChange(r, row)
      if (!seen.has(c.field)) { seen.add(c.field); changes.push(c) }
    }
    push('Order Header Editing', manual ? { ...user, changes } : { changedBy: 'System', source: 'ERP', changes })
  }
  if (lines.length && r() < 0.5) {
    step()
    const line = pick(r, lines)
    push('Order Line Item Editing', { ...user, lineItemId: String(line.lineIdentifier), changes: [lineChange(r, line)] })
  }

  // 3. A past hold, released with an edit (header or line), on ~15% of orders.
  if (row.orderStatus !== 'Hold' && r() < 0.15) {
    step(); push('Order Applied on Hold', user)
    step()
    if (lines.length && r() < 0.4) {
      const line = pick(r, lines)
      push('Order Released from Hold (Line Item Editing)', { ...user, lineItemId: String(line.lineIdentifier), changes: [lineChange(r, line)] })
    } else {
      push('Order Released from Hold (Header Level Editing)', { ...user, changes: [headerChange(r, row)] })
    }
  }

  // 4. A partial cancellation on ~10% of multi-line orders that are not cancelled.
  if (lines.length > 1 && row.orderStatus !== 'Cancelled' && r() < 0.1) {
    step()
    push('Order Partial Cancellation', { ...user, lineItemId: String(pick(r, lines).lineIdentifier) })
  }

  // 5. Lifecycle — the planning system moves the order; each hop is a System row.
  let prev = 'Ready for Planning'
  for (const status of path) {
    step()
    push('Order Lifecycle Status Change', { changedBy: 'System', source: 'LINX', changes: [{ field: 'Status', oldValue: prev, newValue: status }] })
    prev = status
  }

  // 6. Terminal events.
  if (row.orderStatus === 'Hold') { step(); push('Order Applied on Hold', user) }
  if (row.orderStatus === 'Cancelled') { step(); push('Order Full Cancellation', user) }

  return rows
}
