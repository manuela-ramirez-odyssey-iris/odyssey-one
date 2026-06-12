import { z } from 'zod'
import type { PickupDeliveryValues, DateTimeTriad } from '../../../api/types/orderFormVm'

// Validation model (spec §2.4). Two gates:
//  - createOrderSchema → enables Create Order (full form must pass)
//  - saveGateSchema    → Save / Save-for-Later (Order Number + Owning Org only; Q16/Q27)
// Past/current dates are WARNINGS (getPastDateWarnings), never schema errors
// (LINX-7632 family). Date format MM/DD/YYYY, time HH:MM 24h.

const DATE_RE = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const E164_RE = /^\+[1-9]\d{6,14}$/

export const normalizePhone = (raw: string): string => raw.replace(/[\s().-]/g, '')

// "06/15/2026" + "16:00" → "2026-06-15T16:00" (lexicographically comparable)
export function toComparableDateTime(date: string, time: string): string {
  const [m, d, y] = date.split('/')
  return `${y}-${m}-${d}T${time || '00:00'}`
}

const optionalDate = z.string().refine(v => v === '' || DATE_RE.test(v), 'Use MM/DD/YYYY')
const optionalTime = z.string().refine(v => v === '' || TIME_RE.test(v), 'Use HH:MM (24h)')

const dateTriadSchema = z.object({
  date: optionalDate,
  time: optionalTime,
  timezone: z.string(),
})

const referenceRowSchema = z.object({
  id: z.string(),
  guided: z.boolean(),
  type: z.string(),
  value: z.string(),
})

const instructionRowSchema = z.object({
  id: z.string(),
  description: z.string().max(2000, 'Maximum 2,000 characters'),
})

export const generalInfoSchema = z.object({
  orderNumber: z.string(), // optional at entry — auto-generated when blank (Q16)
  owningOrganization: z.string().min(1, 'Owning Organization is required'),
  owningOrganizationName: z.string(),
  equipment: z.string().min(1, 'Equipment is required'),
  freightTerm: z.string().min(1, 'Freight Term is required'),
  shipDirection: z.string().min(1, 'Ship Direction is required'),
  consolidatable: z.boolean(),
  carrierScac: z.string(),
  equipmentReferenceNumber: z.string(),
  instructions: z.array(instructionRowSchema),
  references: z.array(referenceRowSchema),
})

const MANUAL_ADDRESS_KEYS = ['idOrgName', 'longName', 'address1', 'city', 'state', 'postal', 'country'] as const

const partySchema = z.object({
  locationId: z.string(),
  manualMode: z.boolean(),
  idOrgName: z.string(),
  longName: z.string(),
  address1: z.string(),
  address2: z.string(), // optional (Efrain §2)
  city: z.string(),
  state: z.string(),
  postal: z.string(),
  country: z.string(),
  showContact: z.boolean(),
  contactName: z.string(),
  contactPhone: z.string().refine(
    v => v === '' || E164_RE.test(normalizePhone(v)),
    'Enter a valid phone number (e.g. +1 765 670 4444)',
  ),
  contactEmail: z.string().refine(
    v => v === '' || z.string().email().safeParse(v).success,
    'Enter a valid email address',
  ),
}).superRefine((p, ctx) => {
  // Resolved = lookup pick OR complete manual address (validated in combination)
  const manualComplete = MANUAL_ADDRESS_KEYS.every(k => p[k].trim() !== '')
  if (p.locationId.trim() !== '' || manualComplete) return
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['locationId'],
    message: 'Pick a location or complete the manual address',
  })
  if (p.manualMode) {
    for (const k of MANUAL_ADDRESS_KEYS) {
      if (p[k].trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [k], message: 'Required' })
      }
    }
  }
})

const TRIAD_KEYS = ['earlyPickup', 'latePickup', 'earlyDelivery', 'lateDelivery'] as const

export const pickupDeliverySchema = z.object({
  consignor: partySchema,
  consignee: partySchema,
  planningDateType: z.enum(['SHIP', 'DELIVERY']),
  earlyPickup: dateTriadSchema,
  latePickup: dateTriadSchema,
  earlyDelivery: dateTriadSchema,
  lateDelivery: dateTriadSchema,
}).superRefine((pd, ctx) => {
  // Q22: Ship → Late Pickup required; Delivery → Late Delivery required
  const requiredKey = pd.planningDateType === 'SHIP' ? 'latePickup' : 'lateDelivery'
  if (pd[requiredKey].date === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [requiredKey, 'date'],
      message: pd.planningDateType === 'SHIP' ? 'Late Pickup date is required' : 'Late Delivery date is required',
    })
  }
  // Timezone required whenever its triad carries a date (auto-derive prefills;
  // manual select covers the not-derivable case — spec §2.4)
  for (const key of TRIAD_KEYS) {
    if (pd[key].date !== '' && pd[key].timezone === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key, 'timezone'], message: 'Time zone is required' })
    }
  }
  // Early ≤ Late ordering (only when both ends of a pair are filled)
  const after = (a: DateTimeTriad, b: DateTimeTriad) =>
    toComparableDateTime(a.date, a.time) > toComparableDateTime(b.date, b.time)
  if (pd.earlyPickup.date && pd.latePickup.date && after(pd.earlyPickup, pd.latePickup)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['earlyPickup', 'date'],
      message: 'Early Pickup must be on or before Late Pickup',
    })
  }
  if (pd.earlyDelivery.date && pd.lateDelivery.date && after(pd.earlyDelivery, pd.lateDelivery)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['earlyDelivery', 'date'],
      message: 'Early Delivery must be on or before Late Delivery',
    })
  }
})

const positiveNumeric = z.string().refine(
  v => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) > 0,
  'Enter a value',
)

// Q26: ALL FIVE fields required per row (design supersedes LINX-9874 either/or)
export const productRowSchema = z.object({
  id: z.string(),
  productId: z.string().min(1, 'Select a Product ID'),
  description: z.string().min(1, 'Please provide a description').max(150, 'Maximum 150 characters'),
  grossWeight: z.object({ value: positiveNumeric, uom: z.string().min(1, 'Select') }),
  volume: z.object({ value: positiveNumeric, uom: z.string().min(1, 'Select') }),
  shipClass: z.string().min(1, 'Select a Ship Class'),
})

export const productsSchema = z.array(productRowSchema).min(1, 'Add at least one product')

export const specialServicesSchema = z.array(z.object({
  code: z.string().min(1),
  description: z.string(),
}))

export const createOrderSchema = z.object({
  general: generalInfoSchema,
  pickupDelivery: pickupDeliverySchema,
  products: productsSchema,
  specialServices: specialServicesSchema,
})

// Save-gate (Q16/Q27): Order Number + Owning Organization, applied to
// values.general by every save path (footer Save, Save-for-Later, navbar).
export const saveGateSchema = z.object({
  orderNumber: z.string().trim().min(1),
  owningOrganization: z.string().trim().min(1),
}).passthrough()

export const PAST_DATE_WARNING = 'Past or current date selected. Please check and modify as needed.'

// Non-blocking warnings (LINX-7632): date+time evaluated in combination.
export function getPastDateWarnings(
  pd: Pick<PickupDeliveryValues, 'earlyPickup' | 'latePickup' | 'earlyDelivery' | 'lateDelivery'>,
  now: Date = new Date(),
): Partial<Record<(typeof TRIAD_KEYS)[number], string>> {
  const pad = (n: number) => String(n).padStart(2, '0')
  const nowComparable = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  const warnings: Partial<Record<(typeof TRIAD_KEYS)[number], string>> = {}
  for (const key of TRIAD_KEYS) {
    const t = pd[key]
    if (t.date !== '' && DATE_RE.test(t.date) && toComparableDateTime(t.date, t.time) <= nowComparable) {
      warnings[key] = PAST_DATE_WARNING
    }
  }
  return warnings
}
