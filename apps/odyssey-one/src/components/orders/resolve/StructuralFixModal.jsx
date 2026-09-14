import { createPortal } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import { Button, Dropdown, FormField, ModalMedium } from '@odyssey/ui'
import { TIMEZONES } from '../../../data/master-data'
import { STRUCTURAL_DRAFT_KEYS } from './interfaceErrors.js'
import { isStructuralFixed } from './StructuralGrid.jsx'

// The app's one timezone list (src/data/master-data.js) — NOT a second source
// of truth.
const TZ_OPTIONS = [
  { value: '', label: 'Pick a time zone' },
  ...TIMEZONES.map((z) => ({ value: z, label: z })),
]

/**
 * StructuralFixModal — hosts the per-fault fix controls for ONE line, opened
 * from StructuralGrid's Action column (S147, user ruling 2026-09-14: the row
 * itself only lists the line's faults, the controls moved here unchanged in
 * behaviour).
 *
 *   extra-schedule    → plain trash icon on every schedule beyond the first
 *   quantity-mismatch → line gross weight editable next to the schedule's value
 *   timezone-missing  → zone picker (Dropdown, replacing the earlier native
 *                       <select> now that this lives in a modal rather than an
 *                       inline row jsdom had to be able to drive without a portal)
 *
 * Each control calls `onFix(errorId, patch)` immediately — no staging, a fixed
 * fault stays editable so the planner can change their mind before submitting.
 * `disabled` freezes every control (read-only look-back); the trash affordance
 * additionally disappears once a schedule is already nominated, same as before.
 */
export default function StructuralFixModal({ line, product, faults, fixes, onFix, disabled = false, onClose }) {
  const title = `Line ${line} · ${product.productId}`
  const schedules = product[STRUCTURAL_DRAFT_KEYS['extra-schedule']] ?? []
  const scheduleQty = product[STRUCTURAL_DRAFT_KEYS['quantity-mismatch']]

  return createPortal(
    <ModalMedium
      title={title}
      ariaLabel={title}
      onClose={onClose}
      className="structural-grid__modal"
      footer={<Button variant="primary" onClick={onClose}>Done</Button>}
    >
      <div className="structural-grid__modal-body">
        {faults.map((s) => {
          const fix = fixes[s.id]
          const fixed = isStructuralFixed(product, s, fix)
          return (
            <div key={s.id} className="structural-grid__modal-fault">
              <div className="text-label-sm-medium">{s.field}</div>
              <div className="structural-grid__message text-label-xs-regular">{s.message}</div>

              {s.kind === 'extra-schedule' && (
                <ul className="structural-grid__schedules">
                  {schedules.map((sch, i) => (
                    <li key={sch.id}>
                      Schedule {i + 1}
                      {/* Order-creation row convention: a delete affordance is a
                          plain trash icon, never a Button. `.co-rep__trash` is the
                          existing skin for exactly that (RepeatableRows/ProductGrid),
                          reused rather than cloned. */}
                      {i > 0 && !disabled && !fixed && (
                        <button
                          type="button"
                          className="co-rep__trash"
                          aria-label={`Remove schedule ${i + 1} on line ${line}`}
                          onClick={() => onFix(s.id, { removeSchedule: sch.id })}
                        >
                          <Trash2 {...ICON_LG} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {s.kind === 'quantity-mismatch' && (
                <div className="structural-grid__pair">
                  {/* aria-label, NOT label + showLabel={false}: FormField drops the
                      <label> entirely when showLabel is false, so a `label` prop
                      would leave the input nameless. aria-label rides `...rest`
                      onto the <input> and is the single accessible name. */}
                  <FormField
                    aria-label={`Gross weight, line ${line}`}
                    format="decimal"
                    value={fix?.grossWeight ?? product.grossWeight?.value ?? ''}
                    onChange={(e) => onFix(s.id, { grossWeight: e.target.value })}
                    disabled={disabled}
                    validated={fixed}
                  />
                  <span className="text-label-xs-regular structural-grid__hint">
                    schedule says {scheduleQty?.grossWeight} {product.grossWeight?.uom}
                  </span>
                </div>
              )}

              {s.kind === 'timezone-missing' && (
                // Dropdown has no aria-label passthrough to its trigger button
                // (the molecule spreads `...rest` onto its OUTER span, not
                // DropdownButton) — implicit <label> wrapping is the only way
                // to name the trigger without touching @odyssey/ui.
                <label className="structural-grid__tz-label">
                  <span className="structural-grid__sr-only">{`Time zone, line ${line}`}</span>
                  <Dropdown
                    value={fix?.timezone ?? ''}
                    options={TZ_OPTIONS}
                    onChange={(v) => onFix(s.id, { timezone: v })}
                    disabled={disabled}
                  />
                </label>
              )}

              {/* FormField renders its own "Validated" line, so the quantity
                  fault must NOT get a second one. */}
              {fixed && s.kind !== 'quantity-mismatch' && (
                <p className="structural-grid__validated text-label-xs-regular">Validated</p>
              )}
            </div>
          )
        })}
      </div>
    </ModalMedium>,
    document.body,
  )
}
