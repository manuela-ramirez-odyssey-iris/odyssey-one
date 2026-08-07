import { z } from 'zod'
import type { PickupDeliveryValues, DateTimeTriad } from '../../../api/types/orderFormVm'

// Validation model (spec §2.4). Two gates:
//  - createOrderSchema → enables Create Order (full form must pass)
//  - saveGateSchema    → Save / Save-for-Later (Owning Org only; Q16/Q27,
//                        revised 2026-08-07 decision D — blank Order Number
//                        is the normal path, server assigns it)
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
  // optional at entry — auto-generated when blank (Q16); LINX-8118: max 150 chars excluding space
  orderNumber: z.string().refine(
    v => v.replace(/\s/g, '').length <= 150,
    'Order Number can have only 150 characters (excluding space). Please check the order number.',
  ),
  // "Customer" in the UI (LINX-13553 rename); wire key stays owningOrganization
  owningOrganization: z.string().min(1, 'Please select Customer'),
  owningOrganizationName: z.string(),
  equipment: z.string().min(1, 'Please select Equipment'),
  freightTerm: z.string().min(1, 'Freight Term is required'),
  shipDirection: z.string().min(1, 'Ship Direction is required'),
  hazardous: z.boolean(), // LINX-12102: derives from product lines
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
  pickupAppointment: z.boolean(),   // LINX-12095: latest-date-gated flags
  deliveryAppointment: z.boolean(),
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

// Product row (rebuilt 2026-07-28 — Figma 5347:10752/6025:28087 + LINX-13893).
// Required: Product ID, Description (≤75 per user ruling), Gross Weight,
// Volume. Everything else optional (per-equipment columns); Shipping Class/ID
// pair dropped per Figma decision — the LINX-8121 either/or rule collapses to
// the Product ID path. Verbatim Jira messages where they exist.
const optionalMeasure = z.object({ value: z.string(), uom: z.string() })
const wholeNumberOrEmpty = z.string().refine(
  v => v.trim() === '' || /^[1-9]\d*$/.test(v.trim()),
  'Please enter a non-zero whole number',
)
export const productRowSchema = z.object({
  id: z.string(),
  hazardous: z.boolean().default(false),
  productId: z.string().min(1, 'Select a Product ID'),
  description: z.string().min(1, 'Please enter product description').max(75, 'Maximum 75 characters'),
  grossWeight: z.object({
    value: z.string()
      .refine(v => v.trim() !== '', 'Please enter gross weight value')
      .refine(v => v.trim() === '' || (!Number.isNaN(Number(v)) && Number(v) > 0), 'Enter a value'),
    uom: z.string().min(1, 'Please select gross weight UoM'),
  }),
  volume: z.object({ value: positiveNumeric, uom: z.string().min(1, 'Select') }),
  shipClass: z.string().default(''),
  handlingUnit: z.string().default(''),
  handlingCount: wholeNumberOrEmpty.default(''),
  length: optionalMeasure.optional(),
  width: optionalMeasure.optional(),
  height: optionalMeasure.optional(),
  harmonizedCode: z.string().default(''),
  declaredValue: z.string().refine(
    v => v.trim() === '' || /^\d+(\.\d{1,2})?$/.test(v.trim()),
    'Numeric, up to 2 decimals',
  ).default(''),
  declaredValueCurrency: z.string().default(''),
  manufacturingCountry: z.string().default(''),
  stccCode: z.string().default(''),
}).superRefine((row, ctx) => {
  // LINX-8131: Declared Value ⟷ Currency mandatory-if-other-filled
  if (row.declaredValue.trim() && !row.declaredValueCurrency.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['declaredValueCurrency'], message: 'Please enter declared value currency' })
  }
  if (row.declaredValueCurrency.trim() && !row.declaredValue.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['declaredValue'], message: 'Please enter declared value' })
  }
})

// A fully-blank pending row is ignored by validation — only touched rows must
// be complete, and ≥1 real product must exist (LINX-8121 submission gate).
// Validated per-index via superRefine (NOT a filtering preprocess: filtering
// would shift error paths off the RHF field names, landing errors on the
// wrong rows).
export const isBlankProductRow = (r: { productId?: string; description?: string; grossWeight?: { value?: string }; volume?: { value?: string } }) =>
  !r?.productId && !r?.description && !r?.grossWeight?.value && !r?.volume?.value
export const productsSchema = z.array(z.record(z.string(), z.unknown())).superRefine((rows, ctx) => {
  if (!rows.some((r) => !isBlankProductRow(r as Parameters<typeof isBlankProductRow>[0]))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Add at least one product' })
  }
  rows.forEach((row, i) => {
    if (isBlankProductRow(row as Parameters<typeof isBlankProductRow>[0])) return
    const res = productRowSchema.safeParse(row)
    if (!res.success) {
      for (const issue of res.error.issues) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i, ...issue.path], message: issue.message })
      }
    }
  })
})

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

// Save-gate (Q16/Q27, revised 2026-08-07 decision D): Owning Organization
// only. Order Number is intentionally NOT required here — leaving it blank
// is the normal Save-for-Later path (the server auto-generates a 13-digit
// zero-padded number on first save; orderService.saveDraft adopts it so the
// form's later saves target the same row).
export const saveGateSchema = z.object({
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
