/**
 * Level 1 (Order Interface / pre-validation) errors — LINX-16049.
 * The 13 checks the backend runs before an integrated message can become
 * OrderIn (OrderValidationComponent; Appendix A of the Level-1 design review),
 * as data, plus a deterministic derive+seed that stands in for the real error
 * feed. Output mirrors LINX-16281: { fieldTree, field, message }.
 *
 * Sibling of validationErrors.js (Level 2, LINX-11137). Same seeded PRNG
 * recipe, same "this module is the seam a real endpoint replaces" framing —
 * no Level 1 endpoint exists yet (LINX-16049 is in design).
 *
 * Classes:
 *   conflict        — lines disagree; the planner PICKS a value per field
 *   structural      — a fault inside one line; the planner FIXES it in a grid
 *   message-control — provenance fields; only deleteFlag is editable (Yes/No)
 *
 * CONTRACT — `interfaceErrorCount` counts ERROR ROWS, not rules.
 * The order-list badge shows a number of errors, so the derive must produce
 * exactly that many rows. One rule can emit more than one row: rule 5 (address)
 * is picked field by field (PO ruling: the planner may take City from line 1
 * and Postal from line 3), so it emits a City row and a Postal row. The derive
 * therefore fills a ROW BUDGET and, when it runs out, drops whichever chosen
 * rule sorts last, in whole or in part — the chosen set is sorted by rule
 * number BEFORE the budget runs, so the casualty is usually a whole
 * higher-numbered rule rather than rule 5's sibling row. An order where only
 * City disagrees is perfectly plausible either way.
 * The budget is capped by the class's total row capacity (`classCapacity`).
 *
 * CONTRACT — a conflict needs ≥2 order lines. A single-line order cannot have
 * lines that disagree, so conflict rules are dropped for such orders (which
 * lowers the capacity; a single-line 'conflict' order yields no errors).
 */

// Rule table. `path` = the create-form (RHF) path the pick lands in.
export const INTERFACE_RULES = [
  { rule: 1, class: 'structural', kind: 'extra-schedule', fieldTree: 'orderInterface.orderLines[].schedules[]', field: 'Schedules per line', message: 'An order line can have only 1 schedule. Please check the order.' },
  { rule: 2, class: 'structural', kind: 'quantity-mismatch', fieldTree: 'orderInterface.orderLines[].schedules[].packageCount', field: 'Line vs schedule quantity', message: 'Line and Schedule mismatch: Package count, weights, and volume (including UOM codes) must be identical at both levels.' },
  { rule: 3, class: 'conflict', path: 'pickupDelivery.latePickup.date', fieldTree: 'orderInterface.orderLines[].schedules[].requestedShipDate', field: 'Requested Ship Date', message: 'Corresponding Ship Dates & Delivery Dates must be the same in all Order lines. Please check the planning dates in the order.' },
  { rule: 4, class: 'structural', kind: 'timezone-missing', fieldTree: 'orderInterface.orderLines[].schedules[].requestedShipTimeZoneCode', field: 'Requested Ship Time Zone', message: 'Requested Ship Time-Zone missing. Please re-submit the order with the correct Requested Ship Time-Zone.' },
  { rule: 5, class: 'conflict', path: 'pickupDelivery.consignor.city', fieldTree: 'orderInterface.orderLines[].sites[SHIPPER].city', field: 'Shipper City', message: 'Address fields must be the same in all Order lines. Please check the order address fields.', siblings: [
    { path: 'pickupDelivery.consignor.postal', fieldTree: 'orderInterface.orderLines[].sites[SHIPPER].postal', field: 'Shipper Postal Code' },
  ] },
  { rule: 6, class: 'conflict', path: 'general.freightTerm', fieldTree: 'orderInterface.orderLines[].freightTermCode', field: 'Freight Term', message: 'Freight Term Codes must be the same across all order lines.' },
  { rule: 7, class: 'conflict', path: 'pickupDelivery.planningDateType', fieldTree: 'orderInterface.orderLines[].planningDateType', field: 'Planning Date Type', message: 'Planning Date Type must be the same across all order lines.' },
  { rule: 8, class: 'message-control', editable: false, fieldTree: 'orderInterface.messageProperties[].relySourceId', field: 'relySourceId', message: 'Mandatory message properties are missing. Please check the message properties.' },
  { rule: 9, class: 'message-control', editable: false, fieldTree: 'orderInterface.sourceSystem', field: 'sourceSystem', message: 'Incorrect Source System.' },
  { rule: 10, class: 'message-control', editable: true, fieldTree: 'orderInterface.deleteFlag', field: 'deleteFlag', message: 'Incorrect Delete Flag Value.' },
  { rule: 11, class: 'message-control', editable: false, fieldTree: 'orderInterface.modifyTimestamp', field: 'modifyTimestamp', message: 'Invalid Modify Timestamp format.' },
  { rule: 12, class: 'conflict', path: 'pickupDelivery.earlyDelivery.date', fieldTree: 'orderInterface.orderLines[].schedules[].earliestDeliveryDate', field: 'Earliest Delivery Date', message: 'Earliest Delivery Date must be same across all order lines.' },
  { rule: 13, class: 'conflict', path: 'pickupDelivery.lateDelivery.date', fieldTree: 'orderInterface.orderLines[].schedules[].latestDeliveryDate', field: 'Latest Delivery Date', message: 'Latest Delivery Date must be same across all order lines.' },
]

// Same xmur3 → mulberry32 recipe as validationErrors.js (kept local on purpose).
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
const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
// Deliberately NOT creating missing intermediates: every conflict path exists
// in the create-form values, so a missing branch means a typo'd path and
// should throw here rather than silently grow a phantom object (same as
// validationErrors.js).
function setPath(obj, path, value) {
  const keys = path.split('.')
  const last = keys.pop()
  const target = keys.reduce((o, k) => o[k], obj)
  target[last] = value
}
/**
 * Shift a date by `days`, GIVING BACK THE FORMAT IT WAS GIVEN.
 *
 * Two formats are real here and the module used to assume only one: the create
 * form's VM (`DateTimeTriad`, mapOrderViewToFormVm) carries dates as
 * MM/DD/YYYY, while the wire/ISO form appears in this module's own unit-test
 * fixture. `new Date('06/15/2026T00:00:00Z')` is Invalid Date, and the
 * subsequent `toISOString()` THREW — which killed the whole derive for any
 * date-conflict rule against real form values (found at the Task 10 browser
 * wiring, 2026-09-10). Anything that is neither format is passed through
 * untouched rather than being turned into a crash.
 */
const shiftDate = (value, days) => {
  if (!value) return ''
  const s = String(value)
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!us && !iso) return s
  const [y, m, d] = us ? [us[3], us[1], us[2]] : [iso[1], iso[2], iso[3]]
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  dt.setUTCDate(dt.getUTCDate() + days)
  const pad = (n) => String(n).padStart(2, '0')
  return us
    ? `${pad(dt.getUTCMonth() + 1)}/${pad(dt.getUTCDate())}/${dt.getUTCFullYear()}`
    : `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

// A plausible "other" value per conflict path, derived from the current one.
const ALT = {
  'general.freightTerm': (v) => (v === 'P' ? 'C' : 'P'),
  'pickupDelivery.planningDateType': (v) => (v === 'SHIP' ? 'DELIVERY' : 'SHIP'),
  'pickupDelivery.consignor.city': (v) => (v === 'Odessa' ? 'Midland' : 'Odessa'),
  // Seed postals are 5-digit US, but live data arrives through a different
  // mapper (alphanumeric CA/UK codes exist) — bump numerically only when the
  // value really is all digits, else suffix it.
  'pickupDelivery.consignor.postal': (v) =>
    /^\d+$/.test(String(v ?? '')) ? String(Number(v) + 11) : `${v || '70000'}-B`,
  'pickupDelivery.latePickup.date': (v) => shiftDate(v, 2),
  'pickupDelivery.earlyDelivery.date': (v) => shiftDate(v, 3),
  'pickupDelivery.lateDelivery.date': (v) => shiftDate(v, 2),
}

// Which rules a class draws from.
const CLASS_RULES = {
  conflict: [3, 5, 6, 7, 12, 13],
  structural: [1, 2, 4],
  mixed: [3, 5, 6, 7, 12, 13, 1, 2, 4],
  'delete-flag': [10],
  unresolvable: [8, 9, 11],
}

/**
 * Draft keys the structural grid reads — the ONLY place these names are
 * defined. `applyErrors` stamps the fault under the key, `applyFixes` clears
 * it. Seed scaffolding: these stand in for the real OrderInterface line shape
 * (orderLines[].schedules[]), which the Level-1 endpoint will supply.
 */
export const STRUCTURAL_DRAFT_KEYS = {
  'extra-schedule': 'schedules',
  'quantity-mismatch': 'scheduleQuantity',
  'timezone-missing': 'scheduleTimezone',
}

/**
 * Max ERROR ROWS a class can actually produce for an order with `lineCount`
 * lines. Conflict rules need ≥2 lines (nothing to disagree with otherwise),
 * and rule 5 emits 2 rows (City + Postal). The generator clamps its seeded
 * `interfaceErrorCount` to this so a row's badge never promises more errors
 * than the derive can render.
 */
export function classCapacity(interfaceErrorClass, lineCount = 1) {
  return (CLASS_RULES[interfaceErrorClass] ?? [])
    .map((n) => INTERFACE_RULES.find((r) => r.rule === n))
    .filter((r) => r.class !== 'conflict' || lineCount > 1)
    .reduce((sum, r) => sum + 1 + (r.siblings?.length ?? 0), 0)
}

// Fresh object per call: `conflicts` is a Map and `applyErrors` writes
// `lineValues`, so a shared singleton would be mutable state consumers share.
const empty = () => ({
  errors: [], conflicts: new Map(), structural: [], messageControl: [],
  applyErrors: (v) => ({ ...structuredClone(v), lineValues: {} }),
  applyFixes: (v) => structuredClone(v),
  isResolved: () => true,
})

/**
 * @param {string} orderNumber          seed — the row and the resolve view agree
 * @param {number} interfaceErrorCount  number of ERROR ROWS to produce
 * @param {'conflict'|'structural'|'mixed'|'delete-flag'|'unresolvable'} interfaceErrorClass
 * @param {object} values               create-form values for this order
 */
export function deriveInterfaceErrors(orderNumber, interfaceErrorCount, interfaceErrorClass, values) {
  const count = Math.max(0, Number(interfaceErrorCount) || 0)
  if (!count || !CLASS_RULES[interfaceErrorClass]) return empty()

  const rand = seededRandom(`L1:${orderNumber}`)
  const lineCount = Math.max(1, values?.products?.length ?? 1)
  const pool = CLASS_RULES[interfaceErrorClass]
    .map((n) => INTERFACE_RULES.find((r) => r.rule === n))
    // one line ⇒ nothing to disagree with
    .filter((r) => r.class !== 'conflict' || lineCount > 1)
  if (!pool.length) return empty()

  // Fisher-Yates over the pool.
  const queue = [...pool]
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[queue[i], queue[j]] = [queue[j], queue[i]]
  }
  // 'mixed' guarantees one of each class when the budget is ≥2 rows: move a
  // sibling-free conflict rule (1 row) to the front and a structural rule
  // straight after it, so both survive a budget of 2. Moving (not overwriting)
  // is what keeps the selection duplicate-free.
  if (interfaceErrorClass === 'mixed' && count >= 2) {
    const toFront = (pred, at) => {
      const i = queue.findIndex(pred)
      if (i > -1) queue.splice(at, 0, ...queue.splice(i, 1))
    }
    toFront((r) => r.class === 'conflict' && !r.siblings, 0)
    toFront((r) => r.class === 'structural', 1)
  }

  const errors = []
  const conflicts = new Map()
  const structural = []
  const messageControl = []
  let seq = 0

  // Fill the row budget in rule order, truncating the last rule's extra rows.
  const chosen = []
  let capacity = 0
  for (const r of queue) {
    if (capacity >= count) break
    chosen.push(r)
    capacity += 1 + (r.siblings?.length ?? 0)
  }
  chosen.sort((a, b) => a.rule - b.rule)

  let budget = count
  for (const r of chosen) {
    if (budget <= 0) break
    if (r.class === 'conflict') {
      for (const f of [r, ...(r.siblings ?? [])]) {
        if (budget-- <= 0) break
        const current = getPath(values, f.path) ?? ''
        const alt = (ALT[f.path] ?? ((v) => `${v}-alt`))(current)
        // Split lines: the majority keeps `current`, one odd line carries `alt`.
        const oddLine = 1 + Math.floor(rand() * lineCount)
        const lines = Array.from({ length: lineCount }, (_, i) => i + 1)
        const options = [
          { value: current, lines: lines.filter((l) => l !== oddLine) },
          { value: alt, lines: [oddLine] },
        ]
        conflicts.set(f.path, options)
        errors.push({ id: `c${++seq}`, rule: r.rule, class: 'conflict', path: f.path, fieldTree: f.fieldTree, field: f.field, message: r.message })
      }
    } else if (r.class === 'structural') {
      budget--
      const line = 1 + Math.floor(rand() * lineCount)
      const id = `s${++seq}`
      structural.push({ id, rule: r.rule, kind: r.kind, line, fieldTree: r.fieldTree, field: r.field, message: r.message })
      errors.push({ id, rule: r.rule, class: 'structural', line, kind: r.kind, fieldTree: r.fieldTree, field: `${r.field} · line ${line}`, message: r.message })
    } else {
      budget--
      const id = `m${++seq}`
      messageControl.push({ id, rule: r.rule, editable: r.editable, fieldTree: r.fieldTree, field: r.field, message: r.message })
      errors.push({ id, rule: r.rule, class: 'message-control', editable: r.editable, fieldTree: r.fieldTree, field: r.field, message: r.message })
    }
  }

  /** Hydrated draft that agrees with the errors: conflicting header fields
   *  blanked, per-line values recorded under `lineValues[path]`, structural
   *  faults stamped on the lines. The source is untouched. */
  const applyErrors = (src) => {
    const draft = structuredClone(src)
    draft.lineValues = {}
    for (const [path, options] of conflicts) {
      setPath(draft, path, '')
      draft.lineValues[path] = Array.from({ length: lineCount }, (_, i) =>
        options.find((o) => o.lines.includes(i + 1))?.value ?? options[0].value)
    }
    draft.products ??= []
    for (const s of structural) {
      const p = draft.products[s.line - 1]
      if (!p) continue
      const key = STRUCTURAL_DRAFT_KEYS[s.kind]
      if (s.kind === 'extra-schedule') p[key] = [{ id: `${p.id}-sch-1` }, { id: `${p.id}-sch-2` }]
      if (s.kind === 'quantity-mismatch') p[key] = { grossWeight: String(Number(p.grossWeight?.value || 0) + 50), volume: p.volume?.value ?? '' }
      if (s.kind === 'timezone-missing') p[key] = ''
    }
    return draft
  }

  /** Step 2 draft: picks written into the header, structural faults cleared.
   *  `structuralFixes` is keyed by ERROR id (`s1`, `s2`) — the same key space
   *  as `isResolved`'s `structuralFixed` set, so a UI holds one map. */
  const applyFixes = (src, picks = {}, structuralFixes = {}) => {
    const draft = structuredClone(src)
    for (const [path, value] of Object.entries(picks)) setPath(draft, path, value)
    delete draft.lineValues
    for (const s of structural) {
      const p = draft.products?.[s.line - 1]
      const fix = structuralFixes[s.id]
      if (!p || !fix) continue
      const key = STRUCTURAL_DRAFT_KEYS[s.kind]
      if (s.kind === 'extra-schedule') p[key] = (p[key] ?? []).slice(0, 1)
      if (s.kind === 'quantity-mismatch') {
        if (fix.grossWeight) p.grossWeight = { ...p.grossWeight, value: fix.grossWeight }
        delete p[key]
      }
      if (s.kind === 'timezone-missing' && fix.timezone) p[key] = fix.timezone
    }
    return draft
  }

  /** state = { picks: {path→value}, structuralFixed: Set<errorId>, deleteFlag: 'Y'|'N'|null } */
  const isResolved = (error, state) => {
    if (error.class === 'conflict') return state.picks[error.path] != null && state.picks[error.path] !== ''
    if (error.class === 'structural') return state.structuralFixed.has(error.id)
    return error.editable ? state.deleteFlag === 'Y' || state.deleteFlag === 'N' : false
  }

  return { errors, conflicts, structural, messageControl, applyErrors, applyFixes, isResolved }
}
