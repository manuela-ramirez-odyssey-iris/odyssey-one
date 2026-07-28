/**
 * Product Information column model — equipment-driven per LINX-13893 (4 cases)
 * + Figma 5347:10752 / 6025:28087. Wire key `shipClass` keeps its name; the
 * label is "Product Class" (rename convention — wire keys never change).
 *
 * `type` drives the cell renderer in ProductGrid:
 *   product   — ComboBox over the product lookup (server-search, LINX-9875)
 *   counter   — FormField with maxLength + built-in 0/N counter
 *   measure   — value + UoM select pair
 *   select    — SelectField over `options`
 *   checkbox  — Checkbox
 *   text      — plain FormField
 */

// Equipment code → 13893 case family. TLF is legacy-only (absent from the
// matrix) — treated as TL family (Frozen Box Trailer); flagged inference.
export const EQUIPMENT_CASE = {
  LTL: 1, LTR: 1, LTH: 1,
  TL: 2, TLR: 2, TLH: 2, TT: 2, TLF: 2,
  LCL: 3, FCL: 3,
  RR: 4,
}

export const PRODUCT_COLUMNS = {
  hazardous: { key: 'hazardous', label: 'Hazardous?', type: 'checkbox', width: 96 },
  productId: { key: 'productId', label: 'Product ID', type: 'product', required: true, width: 180 },
  description: { key: 'description', label: 'Product Description', type: 'counter', required: true, maxLength: 75, width: 360, placeholder: 'Select or enter product description' },
  grossWeight: { key: 'grossWeight', label: 'Gross Weight', type: 'measure', required: true, uomKind: 'weight', width: 180 },
  volume: { key: 'volume', label: 'Volume', type: 'measure', required: true, uomKind: 'volume', width: 180 },
  shipClass: { key: 'shipClass', label: 'Product Class', type: 'select', width: 160, placeholder: 'Select product class' },
  handlingUnit: { key: 'handlingUnit', label: 'Handling Unit', type: 'select', width: 160, placeholder: 'Select handling unit' },
  handlingCount: { key: 'handlingCount', label: 'Handling Count', type: 'text', width: 160, placeholder: 'e.g. 24', inputMode: 'numeric' },
  length: { key: 'length', label: 'Length', type: 'measure', uomKind: 'dimension', width: 170 },
  width: { key: 'width', label: 'Width', type: 'measure', uomKind: 'dimension', width: 170 },
  height: { key: 'height', label: 'Height', type: 'measure', uomKind: 'dimension', width: 170 },
  harmonizedCode: { key: 'harmonizedCode', label: 'Harmonized Code', type: 'text', width: 180, placeholder: 'e.g. 156600' },
  declaredValue: { key: 'declaredValue', label: 'Declared Value', type: 'text', width: 160, placeholder: '0.00', inputMode: 'decimal' },
  declaredValueCurrency: { key: 'declaredValueCurrency', label: 'Declared Value Currency', type: 'select', width: 190, placeholder: 'Select currency' },
  manufacturingCountry: { key: 'manufacturingCountry', label: 'Manufacturing Country Code', type: 'select', width: 210, placeholder: 'Select country' },
  stccCode: { key: 'stccCode', label: 'STCC Code', type: 'text', width: 160, placeholder: 'Enter STCC Code' },
}

const BASE = ['hazardous', 'productId', 'description', 'grossWeight', 'volume']

// Per-case column key sets (LINX-13893). Line # + actions are structural
// (always rendered by the grid, not part of the arrangeable model).
export const CASE_COLUMNS = {
  1: [...BASE, 'shipClass', 'handlingUnit', 'handlingCount', 'length', 'width', 'height'],
  2: [...BASE, 'handlingUnit', 'handlingCount', 'length', 'width', 'height'],
  3: [...BASE, 'shipClass', 'harmonizedCode', 'declaredValue', 'declaredValueCurrency', 'manufacturingCountry'],
  4: [...BASE, 'shipClass', 'stccCode'],
}

// No equipment picked → Case 1 set (matches both Figma mocks; revisit if
// Ramesh rules otherwise — plan 2026-07-28).
export function columnsForEquipment(equipmentCode) {
  const c = EQUIPMENT_CASE[equipmentCode] ?? 1
  return CASE_COLUMNS[c]
}

export const emptyProductRow = (id) => ({
  id,
  hazardous: false,
  productId: '',
  description: '',
  grossWeight: { value: '', uom: 'lb' },
  volume: { value: '', uom: 'cuft' },
  shipClass: '',
  handlingUnit: '',
  handlingCount: '',
  length: { value: '', uom: 'ft' },
  width: { value: '', uom: 'ft' },
  height: { value: '', uom: 'ft' },
  harmonizedCode: '',
  declaredValue: '',
  declaredValueCurrency: '',
  manufacturingCountry: '',
  stccCode: '',
})
