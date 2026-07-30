import { useState } from 'react'
import { FormField } from '@odyssey/ui'
import { useAnchoredPortal } from '@odyssey/ui'
// The .co-typeahead / .co-dropdown surface this renders lives in create-order.css.
// Imported here so the component works outside the create-order route too (the
// Tender quote modal uses it for rate + charge amounts).
import '../create-order.css'

/**
 * MeasureField — value + UoM in ONE FormField (Figma `State=Filled Trailing
 * Button`: the input with a trailing FieldSelect edge). Replaces the old
 * two-field pair (2026-07-28 audit: Gross Weight / Volume / Length / Width /
 * Height are the trailing-button fields in order creation). The UoM menu is
 * the same anchored `.co-dropdown` surface SelectField uses.
 *
 * `value` = { value, uom }; `options` = [{ value, label }].
 *
 * `decimals` — opt-in fixed precision, normalized ON BLUR ("803.7" → "803.70",
 * "12" → "12.00"). Money fields pass 2; it stays OFF by default because most
 * measures here are whole numbers (a 22,416 lb gross weight must not become
 * "22416.00"). Precision is this composite's business, not FormField's —
 * FormField's `format` governs which CHARACTERS may be typed, nothing about
 * numeric meaning.
 */
export default function MeasureField({ id, value, options, onChange, onBlur, error, placeholder = '0.00', disabled = false, label, showLabel = false, decimals }) {
  const [open, setOpen] = useState(false)
  const { triggerRef, dropdownRef, AnchoredPortal } = useAnchoredPortal({
    open,
    onClose: () => setOpen(false),
  })

  const uomLabel = options.find((o) => o.value === value?.uom)?.label ?? 'UOM'

  const handleBlur = (e) => {
    const raw = value?.value
    if (decimals != null && raw !== '' && raw != null) {
      const n = Number(raw)
      // Non-numeric can't happen via typing (format="decimal" strips it), but a
      // hydrated value could be junk — leave it alone rather than write NaN.
      if (Number.isFinite(n)) {
        const fixed = n.toFixed(decimals)
        if (fixed !== String(raw)) onChange({ ...value, value: fixed })
      }
    }
    onBlur?.(e)
  }

  return (
    <div className="co-typeahead" ref={triggerRef}>
      <FormField
        id={id}
        showLabel={showLabel}
        label={label}
        placeholder={placeholder}
        format="decimal"
        value={value?.value ?? ''}
        onChange={(e) => onChange({ ...value, value: e.target.value })}
        onBlur={handleBlur}
        error={error}
        disabled={disabled}
        trailingSelect={{ label: uomLabel, onClick: () => setOpen((o) => !o) }}
      />
      {open && !disabled && (
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
