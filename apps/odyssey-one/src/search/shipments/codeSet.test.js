import { describe, test, expect } from 'vitest'
import { getAllShipments } from '../../data'
import { shipmentsSearchAdapter as adapter } from './adapter'

// GS-21 (Case 11) — the committed multi-code SET: per-code validation, the
// named-set rule, and suggestion-panel type application. Data-derived
// (seed-42 fixtures) — no magic IDs, survives regen.

const ALL = getAllShipments()

// Two real values of the SAME attribute → the named-set rule can name it.
const [PRO_A, PRO_B] = [...new Set(ALL.map((s) => s.pro).filter(Boolean))]
// A value of a DIFFERENT attribute (an order number not colliding with pros).
const ORDER = ALL.flatMap((s) => s.orders || []).find(
  (o) => !ALL.some((s) => String(s.pro || '').includes(String(o))),
)

describe('resolveCodeSet — commit-time set detection', () => {
  test('returns null for a phrase that matches rows (never tokenizes a company name)', () => {
    const name = ALL.find((s) => /\s/.test(s.customerName || ''))?.customerName
    expect(adapter.resolveCodeSet(name)).toBeNull()
  })

  test('returns null for a single code', () => {
    expect(adapter.resolveCodeSet(String(PRO_A))).toBeNull()
  })

  test('same-attribute list → every code valid + the set is NAMED', () => {
    const set = adapter.resolveCodeSet(`${PRO_A}, ${PRO_B}`)
    expect(set.codes.map((c) => c.valid)).toEqual([true, true])
    expect(set.typeLabel).toBeTruthy() // named — both best-match the same attribute
  })

  test('mixed-attribute list → valid codes but NO name (Multiple)', () => {
    const set = adapter.resolveCodeSet(`${PRO_A}, ${ORDER}`)
    expect(set.codes.every((c) => c.valid)).toBe(true)
    expect(set.typeLabel).toBeNull()
  })

  test('a not-found code is flagged invalid and never poisons the others', () => {
    const set = adapter.resolveCodeSet(`${PRO_A}, ZZGARBAGE99, ${PRO_B}`)
    expect(set.codes.map((c) => c.valid)).toEqual([true, false, true])
  })
})

describe('validateCodes — asserted-type revalidation (GS-21 rule 7)', () => {
  test('codes match under their own attribute, fail under a foreign one', () => {
    const [underPro] = adapter.validateCodes([String(PRO_A)], 'pro')
    const [underOrders] = adapter.validateCodes([String(PRO_A)], 'orders')
    expect(underPro.valid).toBe(true)
    expect(underOrders.valid).toBe(false)
  })
})

describe('getInitial — "Define set type" section for an untyped set badge', () => {
  test('an untyped set surfaces type items; each asserts an attribute', async () => {
    const setChip = { kind: 'set', typeLabel: null, codes: adapter.resolveCodeSet(`${PRO_A}, ${ORDER}`).codes }
    const sections = await adapter.getInitial([], setChip)
    const typeSection = sections.find((s) => s.title === 'Define set type')
    expect(typeSection).toBeTruthy()
    const labels = typeSection.items.map((i) => i.label)
    expect(labels).toContain('Pro#/Booking #')
    expect(labels).toContain('Order #')
    expect(typeSection.items.every((i) => i.kind === 'set-type' && i.attr.dataKey)).toBe(true)
  })

  test('a NAMED set offers no type section (its type is already a promise)', async () => {
    const set = adapter.resolveCodeSet(`${PRO_A}, ${PRO_B}`)
    const sections = await adapter.getInitial([], { kind: 'set', ...set })
    expect(sections.find((s) => s.title === 'Define set type')).toBeUndefined()
  })

  test('no set badge → no sections at all; the empty bar suggests nothing (user, 2026-08-04 reversal of S106 Case 12 carve-out)', async () => {
    for (const sections of [await adapter.getInitial([]), await adapter.getInitial([], null)]) {
      expect(sections).toEqual([])
    }
  })
})

// S107 — Filters-view value suggestions (per-attribute distinct index).
describe('getAttributeValues — Filters ComboBox source', () => {
  test('prefix-matches real distinct values, case-insensitive', async () => {
    const scac = ALL.find((s) => s.scac)?.scac
    const hits = await adapter.getAttributeValues('scac', scac.slice(0, 2).toLowerCase())
    expect(hits).toContain(scac)
    expect(new Set(hits).size).toBe(hits.length) // distinct
  })

  test('empty query returns values, capped at 50', async () => {
    const hits = await adapter.getAttributeValues('customerName', '')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.length).toBeLessThanOrEqual(50)
  })

  test('unknown dataKey → empty, never throws', async () => {
    expect(await adapter.getAttributeValues('noSuchField', 'x')).toEqual([])
  })
})
