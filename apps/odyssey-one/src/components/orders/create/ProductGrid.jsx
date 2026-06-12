import { useState } from 'react'
import { Maximize2, Plus } from 'lucide-react'
import { Button, FormField } from '@odyssey/ui'
import TypeaheadSelect from './fields/TypeaheadSelect.jsx'
import SelectField from './fields/SelectField.jsx'
import OrderRowActionMenu from '../OrderRowActionMenu.jsx'
import { productRowSchema } from './schema'
import { convertMeasureDisplay } from './productMath'
import { SHIP_CLASSES, UOM_WEIGHT, UOM_VOLUME } from '../../../data/master-data'

const newId = () => `prod-${Math.random().toString(36).slice(2, 9)}`
const SHIP_CLASS_OPTIONS = SHIP_CLASSES.map((v) => ({ value: v, label: v }))

const EMPTY_ROW = () => ({
  id: newId(),
  productId: '',
  description: '',
  grossWeight: { value: '', uom: 'lb' },
  volume: { value: '', uom: 'cuft' },
  shipClass: '',
})

/**
 * ProductRowEditor — inline edit row (screen 4): Product ID typeahead,
 * Description enabled after ID (1–150), Gross Weight + UoM, Volume + UoM,
 * Ship Class, per-row Cancel/Save + inert expand icon. Save validates the
 * Q26 all-five rule via productRowSchema; errors render inline per cell.
 * Local state until Save (plan decision 12).
 */
function ProductRowEditor({ index, initial, onSave, onCancel }) {
  const [row, setRow] = useState(initial ?? EMPTY_ROW())
  const [errors, setErrors] = useState({})
  const set = (patch) => setRow((r) => ({ ...r, ...patch }))

  const handleSave = () => {
    const res = productRowSchema.safeParse(row)
    if (!res.success) {
      const map = {}
      for (const issue of res.error.issues) map[issue.path.join('.')] = issue.message
      setErrors(map)
      return
    }
    onSave(row)
  }

  return (
    <tr className="co-product-editor">
      <td className="text-label-sm-regular">{index}</td>
      <td>
        <TypeaheadSelect
          showLabel={false}
          placeholder="Search an ID"
          lookupType="product"
          selected={row.productId ? { value: row.productId, label: row.productId } : null}
          onSelect={(opt) =>
            set(opt
              ? { productId: opt.value, description: opt.description ?? row.description }
              : { productId: '' })}
          error={errors.productId}
        />
      </td>
      <td>
        <FormField
          showLabel={false}
          placeholder="Add Description"
          value={row.description}
          disabled={!row.productId}
          maxLength={150}
          onChange={(e) => set({ description: e.target.value })}
          error={errors.description}
        />
      </td>
      <td>
        <div className="co-cell-measure">
          <FormField
            showLabel={false}
            placeholder="0.00"
            inputMode="decimal"
            value={row.grossWeight.value}
            onChange={(e) => set({ grossWeight: { ...row.grossWeight, value: e.target.value } })}
            error={errors['grossWeight.value']}
          />
          <SelectField
            showLabel={false}
            placeholder="Select"
            options={UOM_WEIGHT}
            value={row.grossWeight.uom}
            onChange={(uom) => set({ grossWeight: { ...row.grossWeight, uom } })}
            error={errors['grossWeight.uom']}
          />
        </div>
      </td>
      <td>
        <div className="co-cell-measure">
          <FormField
            showLabel={false}
            placeholder="0.00"
            inputMode="decimal"
            value={row.volume.value}
            onChange={(e) => set({ volume: { ...row.volume, value: e.target.value } })}
            error={errors['volume.value']}
          />
          <SelectField
            showLabel={false}
            placeholder="Select"
            options={UOM_VOLUME}
            value={row.volume.uom}
            onChange={(uom) => set({ volume: { ...row.volume, uom } })}
            error={errors['volume.uom']}
          />
        </div>
      </td>
      <td>
        <SelectField
          showLabel={false}
          placeholder="Select a Ship Class"
          options={SHIP_CLASS_OPTIONS}
          value={row.shipClass}
          onChange={(v) => set({ shipClass: v })}
          error={errors.shipClass}
        />
      </td>
      <td>
        <div className="co-inline-actions">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
          <Button variant="icon" size="sm" icon={<Maximize2 size={16} />} aria-label="Expand row (coming soon)" disabled />
        </div>
      </td>
    </tr>
  )
}

/**
 * ProductGrid — `.odyssey-table` contract skin (S-handoff 2026-06-11); a
 * simple in-section table, deliberately NOT the OrdersTable sticky-header
 * architecture. Read rows show display-converted measures (US|Metric);
 * saved rows re-edit in place; three-dot menu = Edit/Delete.
 * Class column label is the interim constant "Ship Class" (Q26 residual).
 */
export default function ProductGrid({ products, system, search, sortDir, onChange }) {
  const [editing, setEditing] = useState(null) // null | 'new' | row id

  const q = search.trim().toLowerCase()
  let visible = products.filter(
    (p) => q === '' || p.productId.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
  )
  if (sortDir) {
    visible = [...visible].sort(
      (a, b) => a.productId.localeCompare(b.productId) * (sortDir === 'asc' ? 1 : -1),
    )
  }

  const saveRow = (row) => {
    if (editing === 'new') onChange([...products, row])
    else onChange(products.map((p) => (p.id === editing ? row : p)))
    setEditing(null)
  }
  const deleteRow = (id) => onChange(products.filter((p) => p.id !== id))

  return (
    <div className="co-product-table-wrap">
      <table className="odyssey-table">
        <thead>
          <tr>
            <th className="text-label-sm-medium">#</th>
            <th className="text-label-sm-medium">Product ID *</th>
            <th className="text-label-sm-medium">Product Description *</th>
            <th className="text-label-sm-medium">Gross Weight *</th>
            <th className="text-label-sm-medium">Volume *</th>
            <th className="text-label-sm-medium">Ship Class *</th>
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && editing !== 'new' && (
            <tr>
              <td colSpan={7} className="co-product-empty text-label-sm-regular">
                {products.length > 0 ? 'No products match your search.' : '0 products added'}
              </td>
            </tr>
          )}
          {visible.map((p, i) =>
            editing === p.id ? (
              <ProductRowEditor key={p.id} index={i + 1} initial={p} onSave={saveRow} onCancel={() => setEditing(null)} />
            ) : (
              <tr key={p.id}>
                <td className="text-label-sm-regular">{i + 1}</td>
                <td className="odyssey-table__cell--title text-label-sm-medium">{p.productId}</td>
                <td className="text-label-sm-regular">{p.description}</td>
                <td className="text-label-sm-regular">{convertMeasureDisplay(p.grossWeight, system)}</td>
                <td className="text-label-sm-regular">{convertMeasureDisplay(p.volume, system)}</td>
                <td className="text-label-sm-regular">{p.shipClass}</td>
                <td>
                  <OrderRowActionMenu
                    actions={['Edit', 'Delete']}
                    onAction={(action) => (action === 'Edit' ? setEditing(p.id) : deleteRow(p.id))}
                  />
                </td>
              </tr>
            ),
          )}
          {editing === 'new' && (
            <ProductRowEditor index={products.length + 1} initial={null} onSave={saveRow} onCancel={() => setEditing(null)} />
          )}
        </tbody>
      </table>
      {editing !== 'new' && (
        <Button variant="link" icon={<Plus size={16} />} onClick={() => setEditing('new')}>
          Add Product
        </Button>
      )}
    </div>
  )
}
