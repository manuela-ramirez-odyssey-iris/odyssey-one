/**
 * Deterministic derive+seed error generator for the OIF resolution behavior
 * (LINX-11137). Seeded by order number so the Validation Errors tab's
 * errorCount and the resolution view always agree. This module is the seam a
 * real OIF endpoint replaces when LINX-11137 leaves Analysis (Q3).
 *
 * `applyErrors(values)` returns a NEW hydrated draft — the source is untouched.
 *
 * Three AC categories:
 * - Missing Mandatory  → field blanked in the hydrated draft (data agrees)
 * - Invalid Data       → value present but wrong (TMS-master mismatch stand-in);
 *                        resolved when the user CHANGES it
 * - Invalid Data Type  → corrupted value (letters in a phone); resolved when
 *                        the value parses again
 */

// Pool order = DOM order (top of the form → bottom), so "Error 1/N" reads
// naturally. Labels match the field labels on screen (mock 6005:39544).
export const RESOLVE_POOL = [
  { path: 'general.equipment',      field: 'Equipment *',      reason: 'Invalid Data' },
  { path: 'general.freightTerm',    field: 'Freight Term *',   reason: 'Missing Mandatory' },
  { path: 'general.shipDirection',  field: 'Ship Direction *', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.idOrgName',    field: 'Shipper ID/Org Name *', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.address1',     field: 'Shipper Address 1 *',   reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.city',         field: 'Shipper City *',        reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.state',        field: 'Shipper State *',       reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.postal',       field: 'Shipper Postal Code *', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.contactPhone', field: 'Shipper Phone Number *', reason: 'Invalid Data Type' },
  { path: 'pickupDelivery.consignee.idOrgName',    field: 'Destination ID/Org Name *', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.address1',     field: 'Destination Address 1 *',   reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.city',         field: 'Destination City *',        reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.state',        field: 'Destination State *',       reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.postal',       field: 'Destination Postal Code *', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.contactPhone', field: 'Destination Phone Number *', reason: 'Invalid Data Type' },
]

const INVALID_EQUIPMENT_FALLBACK = 'SUTU3456789' // mock 5711:16403's bad value
const CORRUPT_PHONE = 'not-a-number'

// Tiny deterministic PRNG (xmur3 hash → mulberry32). No app-wide util exists;
// keep it local — the generator uses faker seeding, not reusable here.
function seededRandom(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = (h ^= h >>> 16) >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}
function setPath(obj, path, value) {
  const keys = path.split('.')
  const last = keys.pop()
  const target = keys.reduce((o, k) => o[k], obj)
  target[last] = value
}

/**
 * @param {object} [options]
 * @param {string[]} [options.excludePaths] Paths the planner already settled in
 *   Step 1 (LINX-16049). They are filtered OUT of the pool before the pick, so
 *   a value chosen in Step 1 is never re-broken as a Step 2 error. Note the
 *   consequence, which is deliberate: the clamp follows the FILTERED pool, so
 *   an order whose row badge claims N errors can seed fewer than N once picks
 *   are excluded. That is correct — the badge counts what OIF rejected, and a
 *   path resolved upstream is no longer outstanding. The alternative (topping
 *   the count back up from the remaining pool) would invent errors the planner
 *   never earned by fixing Step 1.
 */
export function deriveValidationErrors(orderNumber, errorCount, values, { excludePaths = [] } = {}) {
  const rand = seededRandom(String(orderNumber))
  const pool = RESOLVE_POOL.filter((p) => !excludePaths.includes(p.path))
  // Falsy / negative / NaN counts clamp to 1 — never fabricate errors the tab
  // didn't claim. Upper clamp is `pool.length` (NOT RESOLVE_POOL.length): with
  // exclusions the pool shrinks, and clamping against the full pool would index
  // past the end. An empty pool legitimately yields zero errors.
  const count = Math.min(Math.max(1, Number(errorCount) || 1), pool.length)

  // Fisher-Yates pick of `count` pool entries, then restore DOM order.
  const idx = pool.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  const chosen = idx.slice(0, count).sort((a, b) => a - b)

  const errors = chosen.map((i) => {
    const p = pool[i]
    const original = getPath(values, p.path)
    // Invalid Data keeps a visible-but-wrong value; remember what "wrong" is.
    const badValue =
      p.reason === 'Invalid Data' ? (original || INVALID_EQUIPMENT_FALLBACK)
      : p.reason === 'Invalid Data Type' ? CORRUPT_PHONE
      : ''
    return { ...p, section: p.path.split('.')[0], badValue }
  })

  const applyErrors = (src) => {
    const draft = structuredClone(src)
    for (const e of errors) setPath(draft, e.path, e.badValue)
    return draft
  }

  const isResolved = (error, currentValue) => {
    const v = (currentValue ?? '').trim()
    if (!v) return false
    if (error.reason === 'Invalid Data') return v !== error.badValue
    if (error.reason === 'Invalid Data Type') return !/[a-z]/i.test(v)
    return true // Missing Mandatory: any non-blank value
  }

  return { errors, applyErrors, isResolved }
}
