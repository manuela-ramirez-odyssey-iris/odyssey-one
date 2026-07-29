import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3Cog, Plus, SquarePen, Trash2 } from 'lucide-react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { Button, Checkbox, ComboBox, FormField } from '@odyssey/ui'
import MeasureField from './fields/MeasureField.jsx'
import { PRODUCT_COLUMNS, emptyProductRow } from './productColumns'
import { getLookupOptions } from '../../../api/services/lookupService'
import {
  SHIP_CLASSES, HANDLING_UNITS, CURRENCIES, COUNTRIES,
  UOM_WEIGHT, UOM_VOLUME, UOM_DIMENSION,
} from '../../../data/master-data'

export const newProductId = () => `prod-${Math.random().toString(36).slice(2, 9)}`

const toOptions = (list) => list.map((v) => ({ value: v, label: v }))
const SELECT_OPTIONS = {
  // QA screenshot 2026-07-28: the UI's Product Class dropdown IS the 4-type
  // selector; wire codes are the letters H/C/P/N (DB ledger row 6). The NMFC
  // 50–650 catalog (PRODUCT_CLASSES) is a different lookup, not this cell.
  shipClass: SHIP_CLASSES,
  handlingUnit: HANDLING_UNITS.map((u) => ({ value: u.code, label: u.label })),
  declaredValueCurrency: toOptions(CURRENCIES),
  manufacturingCountry: toOptions(COUNTRIES),
}
const UOM_OPTIONS = { weight: UOM_WEIGHT, volume: UOM_VOLUME, dimension: UOM_DIMENSION }

// Product ID lookup (LINX-9875): server-search; free-text entry allowed
// ("Search or enter" — mock). Paged like every create-order ComboBox.
const PAGE = 25
const productLookup = async (q, skip = 0) => {
  if (q.trim().length === 1) return { options: [], total: 0 }
  const all = await getLookupOptions('product', q)
  return { options: all.slice(skip, skip + PAGE), total: all.length }
}

// LINX-9874 warning (non-blocking): TL-family equipment + >19,000 lb.
const TL_WARNING = 'Gross weight is more than what is usually permissible for the Equipment selected. Please re-check and update as needed.'
const TL_FAMILY = new Set(['TL', 'TLR', 'TLH', 'TT', 'TLF'])

// Mandatory-cell fallback for BLANK rows: the schema deliberately skips
// fully-blank rows (a pending row must not block submit — filled mock keeps
// one), so the resolver produces no error for them. A touched-but-empty
// mandatory cell still must flag on blur (user requirement 2026-07-28) —
// messages mirror the schema verbatim.
const REQUIRED_MSG = {
  productId: 'Select a Product ID',
  description: 'Please enter product description',
  grossWeight: 'Please enter gross weight value',
  volume: 'Enter a value',
}
const requiredFallback = (col, fieldState, isEmpty) =>
  col.required && isEmpty && fieldState.isTouched ? REQUIRED_MSG[col.key] : undefined

function SortIcon({ state }) {
  if (state === 'asc') return <ArrowUp size={14} aria-hidden="true" />
  if (state === 'desc') return <ArrowDown size={14} aria-hidden="true" />
  return <ArrowUpDown size={14} aria-hidden="true" className="co-prod__sort-idle" />
}

/**
 * ProductGrid — Product Information grid rebuilt to Figma 5347:10752 /
 * 6025:28087 (2026-07-28). Always-editable rows: every cell is a Controller
 * on `products.${index}.${key}`, columns render from the equipment-driven
 * model (`columnKeys` — arrangement-ordered by the ColumnPanel). Structural
 * columns (Line #, actions) are pinned outside the model. The actions column
 * is two plain icons (inbox mock 2026-07-28): edit = Add More Details
 * (disabled — future LINX-8131) + trash = delete; its header hosts the
 * column-arrangement trigger.
 * Header sorting physically reorders the products array (form rows renumber).
 */
export default function ProductGrid({ columnKeys, equipment, search, onOpenColumns, disabled = false }) {
  const { control, getValues, setValue } = useFormContext()
  const [sort, setSort] = useState(null) // { key, dir }
  // Free-text commit reads the TYPED ref, not the DOM value — at selection
  // time the input still holds the stale query and a DOM read would clobber
  // the pick on the selection's blur (LINX-8126 pattern, same as carrier)
  const typedRef = useRef({})

  const products = useWatch({ control, name: 'products' }) ?? []
  const columns = columnKeys.map((k) => PRODUCT_COLUMNS[k]).filter(Boolean)

  const q = search.trim().toLowerCase()
  const rowVisible = (row) =>
    q === '' ||
    (row.productId ?? '').toLowerCase().includes(q) ||
    (row.description ?? '').toLowerCase().includes(q)

  const sortValue = (row, col) => {
    const v = row[col.key]
    if (col.type === 'measure') return Number(v?.value) || 0
    if (col.type === 'checkbox') return v ? 1 : 0
    return String(v ?? '').toLowerCase()
  }

  const toggleSort = (col) => {
    const dir = sort?.key === col.key && sort.dir === 'asc' ? 'desc' : 'asc'
    setSort({ key: col.key, dir })
    const rows = [...(getValues('products') ?? [])].sort((a, b) => {
      const av = sortValue(a, col)
      const bv = sortValue(b, col)
      const cmp = typeof av === 'number' ? av - bv : av.localeCompare(bv)
      return dir === 'asc' ? cmp : -cmp
    })
    setValue('products', rows)
  }

  const deleteRow = (rowId) => {
    // Deleting the last row leaves the header-only table (Figma 5368:14750)
    setValue('products', (getValues('products') ?? []).filter((r) => r.id !== rowId), { shouldValidate: true })
  }

  const addRow = () => {
    setValue('products', [...(getValues('products') ?? []), emptyProductRow(newProductId())])
  }

  const renderCell = (col, index) => {
    const name = `products.${index}.${col.key}`
    switch (col.type) {
      case 'checkbox':
        return (
          <Controller name={name} control={control} render={({ field }) => (
            <div className="co-prod__center">
              <Checkbox
                checked={!!field.value}
                disabled={disabled}
                onChange={(e) => field.onChange(e.target.checked)}
                aria-label={col.label}
              />
            </div>
          )} />
        )
      case 'product':
        return (
          <Controller name={name} control={control} render={({ field, fieldState }) => (
            <ComboBox
              variant="select"
              placeholder="Search or enter an ID"
              disabled={disabled}
              value={field.value}
              onChange={(text) => {
                typedRef.current[index] = text
                if (field.value && text !== field.value) field.onChange('')
              }}
              onBlur={() => {
                const t = (typedRef.current[index] ?? '').trim()
                if (t && t !== field.value) field.onChange(t) // manual product entry
                field.onBlur() // touched → onTouched validation fires
              }}
              loadOptions={productLookup}
              emptyMessage="No matching products"
              onSelect={(val, opt) => {
                typedRef.current[index] = val ?? ''
                field.onChange(val ?? '')
                if (opt?.description) setValue(`products.${index}.description`, opt.description)
                if (opt?.meta?.hazmat) setValue(`products.${index}.hazardous`, true)
              }}
              error={fieldState.error?.message ?? requiredFallback(col, fieldState, !field.value)}
            />
          )} />
        )
      case 'counter':
        return (
          <Controller name={name} control={control} render={({ field, fieldState }) => (
            <FormField
              showLabel={false}
              placeholder={col.placeholder}
              disabled={disabled}
              value={field.value}
              maxLength={col.maxLength}
              showCounter
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              error={fieldState.error?.message ?? requiredFallback(col, fieldState, !field.value)}
            />
          )} />
        )
      case 'measure': {
        const warn = col.key === 'grossWeight' && TL_FAMILY.has(equipment)
        return (
          <Controller name={name} control={control} render={({ field, fieldState }) => (
            <div>
              {/* Figma FormField `State=Filled Trailing Button` — one field,
                  UoM as the trailing FieldSelect (2026-07-28 audit) */}
              <MeasureField
                disabled={disabled}
                value={field.value}
                options={UOM_OPTIONS[col.uomKind]}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message ?? fieldState.error?.value?.message ?? fieldState.error?.uom?.message ?? requiredFallback(col, fieldState, !field.value?.value)}
              />
              {warn && field.value?.uom === 'lb' && Number(field.value?.value) > 19000 && (
                <p className="co-field-warning text-label-xs-regular">{TL_WARNING}</p>
              )}
            </div>
          )} />
        )
      }
      case 'select':
        return (
          <Controller name={name} control={control} render={({ field, fieldState }) => (
            <ComboBox
              variant="select"
              typable={false}
              placeholder={col.placeholder}
              disabled={disabled}
              options={SELECT_OPTIONS[col.key] ?? []}
              value={field.value}
              onSelect={(val) => field.onChange(val ?? '')}
              error={fieldState.error?.message}
            />
          )} />
        )
      default:
        return (
          <Controller name={name} control={control} render={({ field, fieldState }) => (
            <FormField
              showLabel={false}
              placeholder={col.placeholder}
              inputMode={col.inputMode}
              disabled={disabled}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )} />
        )
    }
  }

  return (
    <>
    <div className="co-product-table-wrap">
      <table className="odyssey-table co-prod-table">
        <thead>
          <tr>
            <th className="text-label-sm-semibold co-prod__line-col">Line # *</th>
            {columns.map((col) => (
              <th key={col.key} className="text-label-sm-semibold" style={{ minWidth: col.width }}>
                <button
                  type="button"
                  className="co-prod__sort text-label-sm-semibold"
                  disabled={disabled}
                  onClick={() => toggleSort(col)}
                  aria-label={`Sort by ${col.label}`}
                >
                  {col.label}{col.required ? ' *' : ''}
                  <SortIcon state={sort?.key === col.key ? sort.dir : null} />
                </button>
              </th>
            ))}
            {/* Columns3Cog 18 icon-button header; rows carry the two plain
                action icons (edit + trash) */}
            <th className="co-product-col-manage">
              <Button
                variant="icon"
                size="sm"
                icon={<Columns3Cog size={18} />}
                aria-label="Arrange columns"
                disabled={disabled}
                onClick={onOpenColumns}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((row, index) => rowVisible(row) && (
            <tr key={row.id} className="co-prod-row">
              <td className="text-label-sm-regular co-prod__line-col">{index + 1}</td>
              {columns.map((col) => (
                <td key={col.key}>{renderCell(col, index)}</td>
              ))}
              <td className="co-product-col-manage">
                {/* Two plain action icons (inbox mock 2026-07-28): edit = Add
                    More Details (disabled pending LINX-8131), trash = delete */}
                <button
                  type="button"
                  className="co-rep__trash"
                  aria-label="Add more details"
                  disabled
                >
                  <SquarePen size={20} />
                </button>
                <button
                  type="button"
                  className="co-rep__trash"
                  aria-label="Delete row"
                  disabled={disabled}
                  onClick={() => deleteRow(row.id)}
                >
                  <Trash2 size={20} />
                </button>
              </td>
            </tr>
          ))}
          {products.length > 0 && products.every((r) => !rowVisible(r)) && (
            <tr>
              <td colSpan={columns.length + 2} className="co-product-empty text-label-sm-regular">
                No products match your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    {/* Outside the scroll wrap — never moves with horizontal scroll */}
    <div className="co-prod-add">
      <Button variant="link" icon={<Plus size={16} />} disabled={disabled} onClick={addRow}>Add Product</Button>
    </div>
    </>
  )
}
