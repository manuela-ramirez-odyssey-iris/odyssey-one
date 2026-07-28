import { useState } from 'react'
import { FormField } from '@odyssey/ui'
import { useAnchoredPortal } from '@odyssey/ui'

/**
 * MeasureField — value + UoM in ONE FormField (Figma `State=Filled Trailing
 * Button`: the input with a trailing FieldSelect edge). Replaces the old
 * two-field pair (2026-07-28 audit: Gross Weight / Volume / Length / Width /
 * Height are the trailing-button fields in order creation). The UoM menu is
 * the same anchored `.co-dropdown` surface SelectField uses.
 *
 * `value` = { value, uom }; `options` = [{ value, label }].
 */
export default function MeasureField({ id, value, options, onChange, onBlur, error, placeholder = '0.00' }) {
  const [open, setOpen] = useState(false)
  const { triggerRef, dropdownRef, AnchoredPortal } = useAnchoredPortal({
    open,
    onClose: () => setOpen(false),
  })

  const uomLabel = options.find((o) => o.value === value?.uom)?.label ?? 'UOM'

  return (
    <div className="co-typeahead" ref={triggerRef}>
      <FormField
        id={id}
        showLabel={false}
        placeholder={placeholder}
        inputMode="decimal"
        value={value?.value ?? ''}
        onChange={(e) => onChange({ ...value, value: e.target.value })}
        onBlur={onBlur}
        error={error}
        trailingSelect={{ label: uomLabel, onClick: () => setOpen((o) => !o) }}
      />
      {open && (
        <AnchoredPortal>
          <div ref={dropdownRef} role="listbox" className="co-dropdown" onMouseDown={(e) => e.preventDefault()}>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value?.uom}
                className="co-dropdown__item"
                onClick={() => {
                  onChange({ ...value, uom: opt.value })
                  setOpen(false)
                }}
              >
                <span className="text-label-sm-regular">{opt.label}</span>
              </button>
            ))}
          </div>
        </AnchoredPortal>
      )}
    </div>
  )
}
