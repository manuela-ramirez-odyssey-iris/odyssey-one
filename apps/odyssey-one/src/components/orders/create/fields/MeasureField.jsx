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
 * `decimals` — opt-in FIXED precision, normalized ON BLUR ("803.7" → "803.70",
 * "12" → "12.00"). Money fields pass 2; it stays OFF by default because most
 * measures here are whole numbers (a 22,416 lb gross weight must not become
 * "22416.00"). Precision is this composite's business, not FormField's —
 * FormField's `format` governs which CHARACTERS may be typed, nothing about
 * numeric meaning.
 *
 * `maxDecimals` — a CEILING, not a pad: rounds on blur to at most N places and
 * drops trailing zeros ("12" stays "12", "1.2345678" → "1.234568"). This is
 * what an AC phrased "up to N decimal places" (LINX-13895) actually asks for;
 * passing `decimals={6}` for that reading was the bug — it blurred every entry
 * to "150.000000". Pass one or the other, not both; `decimals` wins if both.
 */
export default function MeasureField({ id, value, options, onChange, onBlur, error, placeholder = '0.00', disabled = false, label, showLabel = false, decimals, maxDecimals }) {
  const [open, setOpen] = useState(false)
  const { triggerRef, dropdownRef, AnchoredPortal } = useAnchoredPortal({
    open,
    onClose: () => setOpen(false),
  })

  const uomLabel = options.find((o) => o.value === value?.uom)?.label ?? 'UOM'

  // A one-option list means the UoM is decided elsewhere (the SpotBid charge
  // rows echo the bid-level currency the Base Charge field drives) — there is
  // nothing to open, so the edge renders as FieldSelect's `locked` flavour:
  // static text, no chevron, no button semantics. Inferred rather than a prop:
  // a single-option menu is pointless for every caller, not just this one.
  const uomLocked = options.length <= 1

  const handleBlur = (e) => {
    const raw = value?.value
    const places = decimals ?? maxDecimals
    if (places != null && raw !== '' && raw != null) {
      const n = Number(raw)
      // Non-numeric can't happen via typing (format="decimal" strips it), but a
      // hydrated value could be junk — leave it alone rather than write NaN.
      if (Number.isFinite(n)) {
        // `decimals` pads to exactly N; `maxDecimals` rounds to at most N and
        // lets Number() drop the trailing zeros the rounding introduced.
        const fixed = decimals != null ? n.toFixed(places) : String(Number(n.toFixed(places)))
        if (fixed !== String(raw)) onChange({ ...value, value: fixed })
      }
    }
    onBlur?.(e)
  }

  return (
    <div className="co-typeahead">
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
        trailingSelect={{
          label: uomLabel,
          locked: uomLocked,
          // Anchor the menu to the FieldSelect BUTTON, not the field: the
          // portal takes its minWidth from the trigger's rect, so anchoring
          // the wrapper stretched a "USD / CAD / EUR" menu across the whole
          // field (same fix as the DSM demos, 2026-08-27). Taken from the
          // click event — the button lives inside FormField, unreachable by
          // a ref from here.
          onClick: (e) => {
            triggerRef.current = e.currentTarget
            setOpen((o) => !o)
          },
        }}
      />
      {open && !disabled && !uomLocked && (
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
