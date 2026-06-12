import type { MeasureValue, ProductRowValues } from '../../../api/types/orderFormVm'
import { CHEMICAL_PRODUCTS } from '../../../data/master-data'

// US|Metric ButtonToggle converts DISPLAY only (spec §10): stored values keep
// the entered { value, uom } and the mapper sends them verbatim. This module
// is the single conversion point for read rows + confirmation roll-ups.

export type UnitSystem = 'us' | 'metric'

const KG_PER_LB = 0.45359237
const M3_PER_CUFT = 0.0283168

// uom → its system + the conversion into the other system
const CONVERSIONS: Record<string, { system: UnitSystem; to: { uom: string; factor: number } }> = {
  lb: { system: 'us', to: { uom: 'kg', factor: KG_PER_LB } },
  kg: { system: 'metric', to: { uom: 'lb', factor: 1 / KG_PER_LB } },
  cuft: { system: 'us', to: { uom: 'm3', factor: M3_PER_CUFT } },
  m3: { system: 'metric', to: { uom: 'cuft', factor: 1 / M3_PER_CUFT } },
}

const UOM_DISPLAY_LABELS: Record<string, string> = {
  lb: 'Lb', kg: 'Kg', cuft: 'Cu ft', m3: 'm³',
}

export function toDisplayMeasure(measure: MeasureValue, system: UnitSystem): { value: number; uom: string } | null {
  const n = Number(measure.value)
  if (measure.value.trim() === '' || Number.isNaN(n)) return null
  const conv = CONVERSIONS[measure.uom]
  if (!conv || conv.system === system) return { value: n, uom: measure.uom } // passthrough (incl. unknown uoms)
  return { value: n * conv.to.factor, uom: conv.to.uom }
}

export function formatMeasure(m: { value: number; uom: string } | null): string {
  if (!m) return ''
  return `${m.value.toFixed(2)} ${UOM_DISPLAY_LABELS[m.uom] ?? m.uom}`
}

export function convertMeasureDisplay(measure: MeasureValue, system: UnitSystem): string {
  return formatMeasure(toDisplayMeasure(measure, system))
}

export interface ProductRollups {
  count: number
  totalWeight: string
  totalVolume: string
  hazmat: 'Yes' | 'No'
}

export function computeProductRollups(products: ProductRowValues[], system: UnitSystem): ProductRollups {
  const total = (pick: (p: ProductRowValues) => MeasureValue, uom: string) => {
    const sum = products.reduce((acc, p) => acc + (toDisplayMeasure(pick(p), system)?.value ?? 0), 0)
    return formatMeasure({ value: sum, uom })
  }
  const hazmat = products.some(p =>
    (CHEMICAL_PRODUCTS as Array<{ item: string; hazmat: boolean }>).find(c => c.item === p.productId)?.hazmat,
  )
  return {
    count: products.length,
    totalWeight: total(p => p.grossWeight, system === 'metric' ? 'kg' : 'lb'),
    totalVolume: total(p => p.volume, system === 'metric' ? 'm3' : 'cuft'),
    hazmat: hazmat ? 'Yes' : 'No',
  }
}
