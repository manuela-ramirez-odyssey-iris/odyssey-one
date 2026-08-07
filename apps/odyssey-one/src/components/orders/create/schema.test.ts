import { describe, expect, it } from 'vitest'
import {
  createOrderSchema,
  generalInfoSchema,
  pickupDeliverySchema,
  productRowSchema,
  productsSchema,
  saveGateSchema,
  getPastDateWarnings,
  normalizePhone,
} from './schema'
import { makeDefaultOrderFormValues } from '../../../api/types/orderFormVm'
import { orderFormValuesSample } from '../../../api/fixtures/orderFormValues.sample'

const sample = () => structuredClone(orderFormValuesSample)

describe('createOrderSchema (submit gate)', () => {
  it('passes the filled long-form sample', () => {
    expect(createOrderSchema.safeParse(sample()).success).toBe(true)
  })

  it('fails the pristine defaults (required sets empty, no products)', () => {
    const res = createOrderSchema.safeParse(makeDefaultOrderFormValues())
    expect(res.success).toBe(false)
  })
})

describe('generalInfoSchema', () => {
  it('requires owning org, equipment, freight term, ship direction — not order number', () => {
    const v = sample().general
    v.orderNumber = '' // optional at entry (Q16)
    expect(generalInfoSchema.safeParse(v).success).toBe(true)
    for (const key of ['owningOrganization', 'equipment', 'freightTerm', 'shipDirection'] as const) {
      const broken = { ...sample().general, [key]: '' }
      expect(generalInfoSchema.safeParse(broken).success).toBe(false)
    }
  })

  it('caps instruction descriptions at 2,000 chars', () => {
    const v = sample().general
    v.instructions = [{ id: 'i1', description: 'x'.repeat(2001) }]
    expect(generalInfoSchema.safeParse(v).success).toBe(false)
  })
})

describe('pickupDeliverySchema (Q22 conditional dates)', () => {
  it('SHIP selected → Late Pickup date required', () => {
    const v = sample().pickupDelivery
    v.latePickup = { date: '', time: '00:00', timezone: '' }
    const res = pickupDeliverySchema.safeParse(v)
    expect(res.success).toBe(false)
    expect(res.success ? [] : res.error.issues.map(i => i.path.join('.'))).toContain('latePickup.date')
  })

  it('DELIVERY selected → Late Delivery date required, Late Pickup free', () => {
    const v = sample().pickupDelivery
    v.planningDateType = 'DELIVERY'
    v.latePickup = { date: '', time: '00:00', timezone: '' }
    v.lateDelivery = { date: '', time: '00:00', timezone: '' }
    const res = pickupDeliverySchema.safeParse(v)
    expect(res.success).toBe(false)
    const paths = res.success ? [] : res.error.issues.map(i => i.path.join('.'))
    expect(paths).toContain('lateDelivery.date')
    expect(paths).not.toContain('latePickup.date')
  })

  it('enforces Early ≤ Late (pickup pair)', () => {
    const v = sample().pickupDelivery
    v.earlyPickup = { date: '06/16/2026', time: '08:00', timezone: 'CST' }
    v.latePickup = { date: '06/15/2026', time: '16:00', timezone: 'CST' }
    const res = pickupDeliverySchema.safeParse(v)
    expect(res.success).toBe(false)
    expect(res.success ? [] : res.error.issues.map(i => i.path.join('.'))).toContain('earlyPickup.date')
  })

  it('requires a timezone on any triad that has a date', () => {
    const v = sample().pickupDelivery
    v.latePickup = { date: '06/15/2026', time: '16:00', timezone: '' }
    const res = pickupDeliverySchema.safeParse(v)
    expect(res.success).toBe(false)
    expect(res.success ? [] : res.error.issues.map(i => i.path.join('.'))).toContain('latePickup.timezone')
  })

  it('party resolves via lookup pick OR complete manual address', () => {
    const v = sample().pickupDelivery
    v.consignor.locationId = '' // still complete manually → OK
    expect(pickupDeliverySchema.safeParse(v).success).toBe(true)
    v.consignor.city = '' // now incomplete and no pick → fail
    expect(pickupDeliverySchema.safeParse(v).success).toBe(false)
  })

  it('validates phone (E.164 after normalization) and email only when filled', () => {
    const v = sample().pickupDelivery
    v.consignor.contactPhone = '+1 (765) 670-4444' // display format → normalizes clean
    v.consignor.contactEmail = 'nick.strauss@krm.com'
    expect(pickupDeliverySchema.safeParse(v).success).toBe(true)
    v.consignor.contactPhone = '765-4444' // no +country → fail
    expect(pickupDeliverySchema.safeParse(v).success).toBe(false)
    v.consignor.contactPhone = ''
    v.consignor.contactEmail = 'not-an-email'
    expect(pickupDeliverySchema.safeParse(v).success).toBe(false)
    v.consignor.contactEmail = '' // both empty → fine (optional)
    expect(pickupDeliverySchema.safeParse(v).success).toBe(true)
  })
})

describe('productsSchema (Q26 — all five required, ≥1 row)', () => {
  it('rejects an empty product list', () => {
    expect(productsSchema.safeParse([]).success).toBe(false)
  })

  it('rejects a row missing a required field (Product Class now optional — Figma ruling 2026-07-28)', () => {
    const base = sample().products[0]
    expect(productRowSchema.safeParse(base).success).toBe(true)
    expect(productRowSchema.safeParse({ ...base, productId: '' }).success).toBe(false)
    expect(productRowSchema.safeParse({ ...base, description: '' }).success).toBe(false)
    expect(productRowSchema.safeParse({ ...base, grossWeight: { value: '', uom: 'lb' } }).success).toBe(false)
    expect(productRowSchema.safeParse({ ...base, volume: { value: '79', uom: '' } }).success).toBe(false)
    expect(productRowSchema.safeParse({ ...base, shipClass: '' }).success).toBe(true)
  })

  it('caps description at 75 chars and requires numeric positive measures', () => {
    const base = sample().products[0]
    expect(productRowSchema.safeParse({ ...base, description: 'x'.repeat(76) }).success).toBe(false)
    expect(productRowSchema.safeParse({ ...base, grossWeight: { value: 'abc', uom: 'lb' } }).success).toBe(false)
    expect(productRowSchema.safeParse({ ...base, grossWeight: { value: '0', uom: 'lb' } }).success).toBe(false)
  })

  it('ignores a fully-blank pending row but still gates on ≥1 real product', () => {
    const blank = { id: 'p-x', hazardous: false, productId: '', description: '', grossWeight: { value: '', uom: 'lb' }, volume: { value: '', uom: 'cuft' }, shipClass: '' }
    expect(productsSchema.safeParse([blank]).success).toBe(false) // blank-only → no product
    expect(productsSchema.safeParse([sample().products[0], blank]).success).toBe(true)
  })

  it('pairs Declared Value with Currency (LINX-8131) and rejects decimal handling counts', () => {
    const base = sample().products[0]
    expect(productRowSchema.safeParse({ ...base, declaredValue: '100.00' }).success).toBe(false) // currency missing
    expect(productRowSchema.safeParse({ ...base, declaredValue: '100.00', declaredValueCurrency: 'USD' }).success).toBe(true)
    expect(productRowSchema.safeParse({ ...base, handlingCount: '2.5' }).success).toBe(false)
    expect(productRowSchema.safeParse({ ...base, handlingCount: '24' }).success).toBe(true)
  })
})

describe('saveGateSchema (Owning Organization only — 2026-08-07 decision D: Order Number is optional, blank is the normal Save-for-Later path since the server assigns it)', () => {
  it('passes with both fields present', () => {
    const g = makeDefaultOrderFormValues().general
    g.orderNumber = 'ORD-1'
    g.owningOrganization = 'ERCO_SYS_01'
    expect(saveGateSchema.safeParse(g).success).toBe(true)
  })

  it('passes with a BLANK Order Number — the normal path; server auto-generates it', () => {
    const g = makeDefaultOrderFormValues().general
    g.orderNumber = ''
    g.owningOrganization = 'ERCO_SYS_01'
    expect(saveGateSchema.safeParse(g).success).toBe(true)
  })

  it('fails when Owning Organization is missing, regardless of Order Number', () => {
    const g1 = makeDefaultOrderFormValues().general
    g1.orderNumber = 'ORD-1'
    expect(saveGateSchema.safeParse(g1).success).toBe(false)
  })
})

describe('getPastDateWarnings (warnings, never errors)', () => {
  it('flags past/current dates and leaves future dates alone', () => {
    const v = sample().pickupDelivery
    const now = new Date('2026-06-16T12:00:00')
    const w = getPastDateWarnings(v, now)
    expect(w.earlyPickup).toMatch(/Past or current date/) // 06/15 is past
    expect(w.lateDelivery).toBeUndefined()                // 06/18 is future
  })

  it('past dates never block the schema (still valid)', () => {
    expect(pickupDeliverySchema.safeParse(sample().pickupDelivery).success).toBe(true)
  })
})

describe('normalizePhone', () => {
  it('strips display punctuation', () => {
    expect(normalizePhone('+1 (765) 670-4444')).toBe('+17656704444')
  })
})
