import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Button, Checkbox, Dropdown, ModalMedium } from '@odyssey/ui'
import MeasureField from '../create/fields/MeasureField.jsx'
import { TIMEZONES, UOM_WEIGHT } from '../../../data/master-data'
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
 *   extra-schedule    → one row per schedule (its own ship date / package
 *                       count / time zone), a leading Checkbox, and a single
 *                       "Delete selected" button beneath (S147: the old plain
 *                       featureless rows left the planner unable to tell which
 *                       schedule to remove).
 *   quantity-mismatch → MeasureField (value + weight-UOM selector), matching
 *                       the create form's own gross-weight control.
 *   timezone-missing  → zone picker (Dropdown, replacing the earlier native
 *                       <select> now that this lives in a modal rather than an
 *                       inline row jsdom had to be able to drive without a portal)
 *
 * Each control calls `onFix(errorId, patch)` immediately — no staging, a fixed
 * fault stays editable so the planner can change their mind before submitting.
 * `disabled` freezes every control (read-only look-back). Checkbox selection
 * for extra-schedule is local modal state; nothing commits until "Delete
 * selected" fires `onFix(errorId, { removeSchedules: [ids] })`.
 */
export default function StructuralFixModal({ line, product, faults, fixes, onFix, disabled = false, onClose }) {
  // S147, user ruling: title is the product, not the line — every
  // Validation-Errors order now carries real lines so productId should
  // always be present, but fall back to description, then Line N.
  const title = `Product · ${product.productId || product.description || `Line ${line}`}`
  const schedules = product[STRUCTURAL_DRAFT_KEYS['extra-schedule']] ?? []
  const scheduleQty = product[STRUCTURAL_DRAFT_KEYS['quantity-mismatch']]
  // Keyed by error id — a line could in principle carry more than one
  // extra-schedule fault, each with its own selection.
  const [checkedByError, setCheckedByError] = useState({})

  return createPortal(
    <ModalMedium
      title={title}
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
              <div className={`structural-grid__message${fixed ? ' structural-grid__message--fixed' : ''} text-label-xs-regular`}>{s.message}</div>

              {s.kind === 'extra-schedule' && (() => {
                const checked = checkedByError[s.id] ?? []
                const toggle = (id) => setCheckedByError((prev) => {
                  const cur = prev[s.id] ?? []
                  return { ...prev, [s.id]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] }
                })
                const canDelete = checked.length > 0 && checked.length < schedules.length
                return (
                  <div className="structural-grid__schedule-picker">
                    <p className="text-label-xs-regular structural-grid__hint">
                      An order line can carry only one schedule. Select the schedule(s) to remove — one must remain.
                    </p>
                    <ul className="structural-grid__schedules">
                      {schedules.map((sch, i) => (
                        <li key={sch.id}>
                          <Checkbox
                            label={<>
                              {`Schedule ${i + 1}`}
                              {' '}
                              <span className="text-label-xs-regular structural-grid__schedule-detail">
                                {`— ship ${sch.requestedShipDate || '—'} · ${sch.packageCount ?? '—'} pkgs · ${sch.requestedShipTimeZoneCode || '—'}`}
                              </span>
                            </>}
                            checked={checked.includes(sch.id)}
                            disabled={disabled || fixed}
                            onChange={() => toggle(sch.id)}
                          />
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Trash2 {...ICON_MD} />}
                      disabled={disabled || fixed || !canDelete}
                      onClick={() => onFix(s.id, { removeSchedules: checked })}
                    >
                      Delete selected
                    </Button>
                  </div>
                )
              })()}

              {s.kind === 'quantity-mismatch' && (
                <div className="structural-grid__pair">
                  <MeasureField
                    aria-label={`Gross weight, line ${line}`}
                    value={{
                      value: fix?.grossWeight ?? product.grossWeight?.value ?? '',
                      uom: fix?.grossWeightUom ?? product.grossWeight?.uom ?? '',
                    }}
                    options={UOM_WEIGHT}
                    onChange={({ value, uom }) => onFix(s.id, { grossWeight: value, grossWeightUom: uom })}
                    disabled={disabled}
                    validated={fixed}
                  />
                  <span className="text-label-xs-regular structural-grid__hint">
                    schedule says {scheduleQty?.grossWeight} {scheduleQty?.grossWeightUom ?? product.grossWeight?.uom}
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

              {/* MeasureField forwards `validated` into FormField, which
                  renders its own "Validated" line — quantity-mismatch must
                  NOT get a second one here. */}
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
