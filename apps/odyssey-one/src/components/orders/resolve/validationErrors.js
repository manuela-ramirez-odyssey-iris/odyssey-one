/**
 * Deterministic derive+seed error generator for the OIF resolution behavior
 * (LINX-11137). Seeded by order number so the Validation Errors tab's
 * errorCount and the resolution view always agree. This module is the seam a
 * real OIF endpoint replaces when LINX-11137 leaves Analysis (Q3).
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
  { path: 'general.equipment',      field: 'Equipment *',      section: 'general', reason: 'Invalid Data' },
  { path: 'general.freightTerm',    field: 'Freight Term *',   section: 'general', reason: 'Missing Mandatory' },
  { path: 'general.shipDirection',  field: 'Ship Direction *', section: 'general', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.idOrgName',    field: 'Shipper ID/Org Name *', section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.address1',     field: 'Shipper Address 1 *',   section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.city',         field: 'Shipper City *',        section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.state',        field: 'Shipper State *',       section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.postal',       field: 'Shipper Postal Code *', section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.contactPhone', field: 'Shipper Phone Number *', section: 'pickupDelivery', reason: 'Invalid Data Type' },
  { path: 'pickupDelivery.consignee.idOrgName',    field: 'Destination ID/Org Name *', section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.address1',     field: 'Destination Address 1 *',   section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.city',         field: 'Destination City *',        section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.state',        field: 'Destination State *',       section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.postal',       field: 'Destination Postal Code *', section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.contactPhone', field: 'Destination Phone Number *', section: 'pickupDelivery', reason: 'Invalid Data Type' },
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

export function deriveValidationErrors(orderNumber, errorCount, values) {
  const rand = seededRandom(String(orderNumber))
  const count = Math.max(1, Math.min(errorCount || 3, RESOLVE_POOL.length))

  // Fisher-Yates pick of `count` pool entries, then restore DOM order.
  const idx = RESOLVE_POOL.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  const chosen = idx.slice(0, count).sort((a, b) => a - b)

  const errors = chosen.map((i) => {
    const p = RESOLVE_POOL[i]
    const original = getPath(values, p.path)
    // Invalid Data keeps a visible-but-wrong value; remember what "wrong" is.
    const badValue =
      p.reason === 'Invalid Data' ? (original || INVALID_EQUIPMENT_FALLBACK)
      : p.reason === 'Invalid Data Type' ? CORRUPT_PHONE
      : ''
    return { ...p, badValue }
  })

  const mutateDraft = (draft) => {
    for (const e of errors) {
      if (e.reason === 'Missing Mandatory') setPath(draft, e.path, '')
      else setPath(draft, e.path, e.badValue)
    }
    return draft
  }

  const isResolved = (error, currentValue) => {
    const v = (currentValue ?? '').trim()
    if (!v) return false
    if (error.reason === 'Invalid Data') return v !== error.badValue
    if (error.reason === 'Invalid Data Type') return !/[a-z]/i.test(v)
    return true // Missing Mandatory: any non-blank value
  }

  return { errors, mutateDraft, isResolved }
}
