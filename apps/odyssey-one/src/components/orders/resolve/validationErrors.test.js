import { describe, test, expect } from 'vitest'
import { deriveValidationErrors, RESOLVE_POOL } from './validationErrors.js'
import { makeDefaultOrderFormValues } from '../../../api/types/orderFormVm'

function sampleValues() {
  const v = makeDefaultOrderFormValues()
  v.general.equipment = 'SUTU3456789'
  v.general.freightTerm = 'P'
  v.general.shipDirection = 'O'
  v.pickupDelivery.consignor.idOrgName = 'PMX1214'
  v.pickupDelivery.consignor.address1 = '714 Warehouse St'
  v.pickupDelivery.consignor.city = 'Missoula'
  v.pickupDelivery.consignor.state = 'MT'
  v.pickupDelivery.consignor.postal = '59801'
  v.pickupDelivery.consignor.contactPhone = '+1 (765) 670-4444'
  v.pickupDelivery.consignee.idOrgName = 'DEST01'
  v.pickupDelivery.consignee.address1 = '496 Distribution Ave'
  v.pickupDelivery.consignee.city = 'Eden'
  v.pickupDelivery.consignee.state = 'NC'
  v.pickupDelivery.consignee.postal = '30340'
  v.pickupDelivery.consignee.contactPhone = '+1 (782) 605-6660'
  return v
}

describe('deriveValidationErrors', () => {
  test('deterministic: same order → same errors', () => {
    const a = deriveValidationErrors('S260004NGW', 5, sampleValues())
    const b = deriveValidationErrors('S260004NGW', 5, sampleValues())
    expect(a.errors.map((e) => e.path)).toEqual(b.errors.map((e) => e.path))
  })

  test('different orders → different sets (spot check)', () => {
    const a = deriveValidationErrors('S260004NGW', 5, sampleValues())
    const b = deriveValidationErrors('S260009XKQ', 5, sampleValues())
    expect(a.errors.map((e) => e.path)).not.toEqual(b.errors.map((e) => e.path))
  })

  test('count fidelity + pool cap', () => {
    expect(deriveValidationErrors('X', 5, sampleValues()).errors).toHaveLength(5)
    expect(deriveValidationErrors('X', 99, sampleValues()).errors).toHaveLength(RESOLVE_POOL.length)
  })

  test('count clamps to 1 for falsy/negative counts (no fabricated errors)', () => {
    for (const bad of [0, null, -2]) {
      expect(deriveValidationErrors('X', bad, sampleValues()).errors).toHaveLength(1)
    }
  })

  test('errors are in pool (DOM) order and carry field/reason/section/path', () => {
    const { errors } = deriveValidationErrors('S260004NGW', 6, sampleValues())
    const poolIdx = errors.map((e) => RESOLVE_POOL.findIndex((p) => p.path === e.path))
    expect([...poolIdx].sort((x, y) => x - y)).toEqual(poolIdx)
    for (const e of errors) {
      expect(e.field).toMatch(/\*$/)
      expect(['Missing Mandatory', 'Invalid Data', 'Invalid Data Type']).toContain(e.reason)
      expect(['general', 'pickupDelivery']).toContain(e.section)
    }
  })

  test('applyErrors blanks Missing Mandatory paths, corrupts the others, leaves the source alone', () => {
    const values = sampleValues()
    const { errors, applyErrors } = deriveValidationErrors('S260004NGW', 8, values)
    const draft = applyErrors(values)
    const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
    for (const e of errors) {
      if (e.reason === 'Missing Mandatory') expect(get(draft, e.path)).toBe('')
      else expect(get(draft, e.path)).toBe(e.badValue) // corrupted, not blanked
    }
    // source untouched
    expect(values).toEqual(sampleValues())
    // a pool path that wasn't selected keeps its sample value
    const untouched = RESOLVE_POOL.find((p) => !errors.some((e) => e.path === p.path))
    expect(get(draft, untouched.path)).toBe(get(sampleValues(), untouched.path))
  })

  test('isResolved: blank fails, filled passes; corrupted value fails until changed', () => {
    const values = sampleValues()
    const { errors, applyErrors, isResolved } = deriveValidationErrors('S260004NGW', 8, values)
    const draft = applyErrors(values)
    const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
    for (const e of errors) {
      expect(isResolved(e, get(draft, e.path))).toBe(false)
      if (e.reason === 'Missing Mandatory') expect(isResolved(e, 'fixed')).toBe(true)
      if (e.reason === 'Invalid Data') expect(isResolved(e, 'DIFFERENT-VALUE')).toBe(true)
      if (e.reason === 'Invalid Data Type') {
        expect(isResolved(e, 'still-letters')).toBe(false)
        expect(isResolved(e, '+1 555 0100')).toBe(true)
      }
    }
  })
})
