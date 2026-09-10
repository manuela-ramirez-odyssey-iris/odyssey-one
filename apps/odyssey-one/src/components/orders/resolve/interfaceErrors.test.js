import { describe, test, expect } from 'vitest'
import { deriveInterfaceErrors, INTERFACE_RULES } from './interfaceErrors'

const values = () => ({
  general: { freightTerm: 'P' },
  pickupDelivery: {
    planningDateType: 'SHIP',
    consignor: { address1: '9507 Lynch Junction', city: 'Odessa', state: 'TX', postal: '79761' },
    consignee: { address1: '4304 Predovic Ramp', city: 'Lake Charles', state: 'LA', postal: '70601' },
    earlyPickup: { date: '2026-05-17', time: '09:00', timezone: 'CDT' },
    latePickup: { date: '2026-05-17', time: '11:00', timezone: 'CDT' },
    earlyDelivery: { date: '2026-05-24', time: '08:30', timezone: 'CDT' },
    lateDelivery: { date: '2026-05-24', time: '11:00', timezone: 'CDT' },
  },
  products: [
    { id: 'prod-1', productId: 'A', grossWeight: { value: '100', uom: 'lbs' }, volume: { value: '10', uom: 'cbf' }, handlingCount: '2' },
    { id: 'prod-2', productId: 'B', grossWeight: { value: '200', uom: 'lbs' }, volume: { value: '20', uom: 'cbf' }, handlingCount: '3' },
    { id: 'prod-3', productId: 'C', grossWeight: { value: '300', uom: 'lbs' }, volume: { value: '30', uom: 'cbf' }, handlingCount: '4' },
  ],
})

describe('INTERFACE_RULES', () => {
  test('encodes all 13 pre-validation rules with class, fieldTree and message', () => {
    expect(INTERFACE_RULES.length).toBe(13)
    for (const r of INTERFACE_RULES) {
      expect(['conflict', 'structural', 'message-control']).toContain(r.class)
      expect(r.fieldTree).toMatch(/^orderInterface\./)
      expect(r.message.length).toBeGreaterThan(10)
    }
    expect(INTERFACE_RULES.filter(r => r.class === 'message-control').map(r => r.rule)).toEqual([8, 9, 10, 11])
  })
})

describe('deriveInterfaceErrors', () => {
  test('is deterministic per order number', () => {
    const a = deriveInterfaceErrors('0000000091002', 3, 'conflict', values())
    const b = deriveInterfaceErrors('0000000091002', 3, 'conflict', values())
    expect(a.errors.map(e => e.fieldTree)).toEqual(b.errors.map(e => e.fieldTree))
  })

  test('count 0 → empty result', () => {
    const r = deriveInterfaceErrors('X', 0, null, values())
    expect(r.errors).toEqual([])
    expect(r.conflicts.size).toBe(0)
    expect(r.structural).toEqual([])
    expect(r.messageControl).toEqual([])
  })

  // The contract: `count` is a number of ERROR ROWS, not of rules. Rule 5 emits
  // two rows (City + Postal), so the row budget is what must hold — for every
  // seed, not just the lucky one the plan sampled.
  test('errors.length === count for every class, across many seeds', () => {
    const capacity = { conflict: 7, structural: 3, mixed: 10, 'delete-flag': 1, unresolvable: 3 }
    for (const cls of Object.keys(capacity)) {
      for (let n = 1; n <= 4; n++) {
        for (const seed of ['0000000091002', '0000000091003', '0000000091004', 'A', 'B', 'zz9']) {
          const r = deriveInterfaceErrors(seed, n, cls, values())
          expect(r.errors.length).toBe(Math.min(n, capacity[cls]))
          expect(new Set(r.errors.map(e => e.id)).size).toBe(r.errors.length)
          // no rule emitted twice (the 'mixed' substitution used to duplicate)
          const conflictPaths = r.errors.filter(e => e.class === 'conflict').map(e => e.path)
          expect(new Set(conflictPaths).size).toBe(conflictPaths.length)
        }
      }
    }
  })

  test("class 'conflict' → only conflict rows, each with ≥2 distinct values whose lines cover every product line", () => {
    const r = deriveInterfaceErrors('0000000091002', 2, 'conflict', values())
    expect(r.errors.length).toBe(2)
    expect(r.errors.every(e => e.class === 'conflict')).toBe(true)
    for (const [, options] of r.conflicts) {
      expect(options.length).toBeGreaterThanOrEqual(2)
      const lines = options.flatMap(o => o.lines).sort()
      expect(lines).toEqual([1, 2, 3])
      expect(new Set(options.map(o => o.value)).size).toBe(options.length)
    }
  })

  test('a single-line order cannot have a cross-line conflict', () => {
    const one = { ...values(), products: [values().products[0]] }
    const r = deriveInterfaceErrors('0000000091002', 3, 'conflict', one)
    expect(r.errors).toEqual([])
    const m = deriveInterfaceErrors('0000000091004', 3, 'mixed', one)
    expect(m.conflicts.size).toBe(0)
    expect(m.structural.length).toBe(3)
  })

  test('applyErrors blanks the conflicting header field and diverges the per-line values', () => {
    const src = values()
    const r = deriveInterfaceErrors('0000000091002', 1, 'conflict', src)
    const draft = r.applyErrors(src)
    const [path, options] = [...r.conflicts][0]
    expect(getPath(draft, path)).toBe('')
    expect(draft.lineValues[path].length).toBe(3)
    expect(new Set(draft.lineValues[path]).size).toBe(options.length)
    expect(src).toEqual(values()) // source untouched
  })

  test("class 'structural' → rule 1/2/4 faults on real lines", () => {
    const r = deriveInterfaceErrors('0000000091003', 2, 'structural', values())
    expect(r.structural.length).toBe(2)
    for (const s of r.structural) {
      expect([1, 2, 4]).toContain(s.rule)
      expect(s.line).toBeGreaterThanOrEqual(1)
      expect(s.line).toBeLessThanOrEqual(3)
    }
  })

  test("class 'delete-flag' → one editable message-control error; 'unresolvable' → one non-editable", () => {
    const d = deriveInterfaceErrors('A', 1, 'delete-flag', values())
    expect(d.messageControl).toEqual([expect.objectContaining({ rule: 10, editable: true })])
    const u = deriveInterfaceErrors('B', 1, 'unresolvable', values())
    expect(u.messageControl.length).toBe(1)
    expect(u.messageControl[0].editable).toBe(false)
    expect([8, 9, 11]).toContain(u.messageControl[0].rule)
  })

  // Not seed-lucky: without the "one of each class" guarantee this fails on
  // ~1/3 of seeds (measured), so the test bites the guarantee itself.
  test("class 'mixed' spreads the count over conflict + structural, for every seed", () => {
    const barren = []
    for (let i = 0; i < 200; i++) {
      for (const n of [2, 3, 4]) {
        const r = deriveInterfaceErrors(`seed${i}`, n, 'mixed', values())
        expect(r.errors.length).toBe(n)
        if (!r.conflicts.size || !r.structural.length) barren.push(`seed${i}/${n}`)
      }
    }
    expect(barren).toEqual([])
  })

  test('isResolved: conflict resolves on a pick; structural on its fix; message-control only when editable and set', () => {
    const r = deriveInterfaceErrors('0000000091004', 3, 'mixed', values())
    const conflict = r.errors.find(e => e.class === 'conflict')
    expect(r.isResolved(conflict, { picks: {}, structuralFixed: new Set(), deleteFlag: null })).toBe(false)
    expect(r.isResolved(conflict, { picks: { [conflict.path]: 'X' }, structuralFixed: new Set(), deleteFlag: null })).toBe(true)
    const st = r.errors.find(e => e.class === 'structural')
    expect(r.isResolved(st, { picks: {}, structuralFixed: new Set([st.id]), deleteFlag: null })).toBe(true)

    const d = deriveInterfaceErrors('A', 1, 'delete-flag', values()).errors[0]
    expect(r.isResolved(d, { picks: {}, structuralFixed: new Set(), deleteFlag: null })).toBe(false)
    expect(r.isResolved(d, { picks: {}, structuralFixed: new Set(), deleteFlag: 'N' })).toBe(true)
    const u = deriveInterfaceErrors('B', 1, 'unresolvable', values()).errors[0]
    expect(r.isResolved(u, { picks: {}, structuralFixed: new Set(), deleteFlag: 'Y' })).toBe(false)
  })

  // 'structural' with count 3 draws ALL THREE rules (1/2/4 is the whole pool),
  // so every kind branch of applyFixes is asserted — a single seed only ever
  // exercised whichever kind it happened to draw.
  test('applyFixes writes the picks into the header and clears every structural kind (keyed by ERROR id)', () => {
    const src = values()
    const r = deriveInterfaceErrors('0000000091003', 3, 'structural', src)
    expect(r.structural.map(s => s.kind).sort())
      .toEqual(['extra-schedule', 'quantity-mismatch', 'timezone-missing'])
    const draft = r.applyErrors(src)
    for (const s of r.structural) {
      const p = draft.products[s.line - 1]
      if (s.kind === 'extra-schedule') expect(p.schedules.length).toBe(2)
      if (s.kind === 'quantity-mismatch') expect(p.scheduleQuantity).toBeDefined()
      if (s.kind === 'timezone-missing') expect(p.scheduleTimezone).toBe('')
    }
    const fixes = Object.fromEntries(r.structural.map(s => [s.id, { timezone: 'CDT', grossWeight: '999' }]))
    const fixed = r.applyFixes(draft, { 'general.freightTerm': 'PICKED' }, fixes)
    expect(fixed.general.freightTerm).toBe('PICKED')
    expect(fixed.lineValues).toBeUndefined()
    for (const s of r.structural) {
      const line = fixed.products[s.line - 1]
      if (s.kind === 'extra-schedule') expect(line.schedules.length).toBe(1)
      if (s.kind === 'quantity-mismatch') {
        expect(line.scheduleQuantity).toBeUndefined()
        expect(line.grossWeight.value).toBe('999')
      }
      if (s.kind === 'timezone-missing') expect(line.scheduleTimezone).toBe('CDT')
    }
  })

  // A zero-error order must still hand back a usable draft (and its own
  // objects — the early return used to be a shared mutable singleton).
  test('zero-error result is a fresh object whose applyErrors still sets lineValues', () => {
    const a = deriveInterfaceErrors('X', 0, null, values())
    const b = deriveInterfaceErrors('Y', 0, null, values())
    expect(a).not.toBe(b)
    expect(a.conflicts).not.toBe(b.conflicts)
    a.conflicts.set('poison', 1)
    expect(b.conflicts.size).toBe(0)
    expect(a.applyErrors(values()).lineValues).toEqual({})
  })
})

function getPath(obj, path) { return path.split('.').reduce((o, k) => o?.[k], obj) }

// The create-form VM stores dates as MM/DD/YYYY (DateTimeTriad), not ISO — the
// fixture above uses ISO, which hid a crash: the ALT shifter built
// `new Date('06/15/2026T00:00:00Z')` → Invalid Date → toISOString() THREW,
// taking the whole derive with it for any order whose values came from
// getOrderView (found wiring ResolveShell, 2026-09-10).
describe('date conflicts against real form values (MM/DD/YYYY)', () => {
  const usValues = () => {
    const v = values()
    for (const k of ['earlyPickup', 'latePickup', 'earlyDelivery', 'lateDelivery']) {
      v.pickupDelivery[k].date = '06/15/2026'
    }
    return v
  }

  test('derives without throwing and offers a shifted alternative in the same format', () => {
    // Sweep the seeds: every conflict order must survive, whichever rule it draws.
    const dateRules = new Set([3, 12, 13])
    let sawDate = false
    for (let i = 0; i < 60; i++) {
      const d = deriveInterfaceErrors(`ORD-${i}`, 3, 'conflict', usValues())
      for (const e of d.errors) {
        if (!dateRules.has(e.rule)) continue
        sawDate = true
        const alts = d.conflicts.get(e.path).map((o) => o.value)
        expect(alts).toContain('06/15/2026')
        expect(alts.every((v) => /^\d{2}\/\d{2}\/\d{4}$/.test(v))).toBe(true)
      }
    }
    expect(sawDate).toBe(true)
  })
})
