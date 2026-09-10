import { Trash2 } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import { FormField } from '@odyssey/ui'
import { TIMEZONES } from '../../../data/master-data'
import { STRUCTURAL_DRAFT_KEYS } from './interfaceErrors.js'

/**
 * Is this structural error actually fixed by `fix`?
 *
 * EXPORTED ON PURPOSE — the composing panel (later task) must call THIS, not
 * re-derive the rule. The plan originally left the equality check to the panel
 * and had the grid paint "Validated" on `fixes[id] != null`, which would show a
 * green row for a WRONG weight. The check lives here instead, and the panel
 * reuses it, so the badge, the grid, and `applyFixes` can never disagree.
 *
 *   extra-schedule    — a schedule was nominated for removal
 *   quantity-mismatch — the line's own gross weight now EQUALS the schedule's
 *                       (rule 2, LINX-16049: "must be identical at both levels")
 *   timezone-missing  — a non-empty zone was picked
 *
 * ponytail: rule 2 nominally covers package count + weights + volume, but the
 * Level-1 seed (`applyErrors` in interfaceErrors.js) only ever diverges
 * grossWeight — volume is copied straight across. One editable field is the
 * whole surface today; widen to a field list when the real endpoint sends more.
 */
export function isStructuralFixed(product, error, fix) {
  if (!product || !fix) return false
  const scheduleValue = product[STRUCTURAL_DRAFT_KEYS['quantity-mismatch']]
  switch (error.kind) {
    case 'extra-schedule': return !!fix.removeSchedule
    case 'quantity-mismatch':
      return fix.grossWeight != null && fix.grossWeight !== '' &&
        String(fix.grossWeight) === String(scheduleValue?.grossWeight ?? '')
    case 'timezone-missing': return !!fix.timezone
    default: return false
  }
}

// The app's one timezone list (src/data/master-data.js) — NOT a second source
// of truth. The plan's inline 4-zone array was dropped for this.
const TZ_OPTIONS = TIMEZONES

/**
 * StructuralGrid — Step 1 (LINX-16049) faults INSIDE a line (rules 1, 2, 4).
 * Only the offending lines render (Level-1 review §2.1 "grouped by defect
 * class"); the faulty cell is the only editable thing on its row. The planner
 * fixes in place (Ramesh 2026-09-10 #6). Controlled via `fixes` {errorId → fix}
 * + `onFix(errorId, fix)` — keyed by ERROR id (`s1`), the same key space
 * `applyFixes(src, picks, structuralFixes)` expects. `disabled` = read-only
 * look-back.
 *   extra-schedule    → plain trash icon on every schedule beyond the first
 *   quantity-mismatch → line gross weight editable next to the schedule's value
 *   timezone-missing  → zone picker
 *
 * A FIXED row stays editable: the planner may change their mind before
 * submitting, and nothing is committed until the panel calls `applyFixes`.
 * Only `disabled` freezes the controls. The one exception is the trash — once a
 * schedule is nominated for removal the remaining one must not also be
 * removable, so the affordance goes away.
 *
 * `line` is 1-based over `values.products` — same indexing `applyErrors` /
 * `applyFixes` use (`draft.products[s.line - 1]`), verified in interfaceErrors.js.
 */
export default function StructuralGrid({ products = [], structural = [], fixes = {}, onFix, disabled = false }) {
  return (
    <div className="structural-grid">
      <table className="odyssey-table structural-grid__table">
        <thead>
          <tr>
            <th className="text-label-sm-semibold">Line</th>
            <th className="text-label-sm-semibold">Product</th>
            <th className="text-label-sm-semibold">Fault</th>
            <th className="text-label-sm-semibold">Fix</th>
          </tr>
        </thead>
        <tbody>
          {structural.map((s) => {
            const p = products[s.line - 1]
            if (!p) return null
            const fix = fixes[s.id]
            const fixed = isStructuralFixed(p, s, fix)
            const schedules = p[STRUCTURAL_DRAFT_KEYS['extra-schedule']] ?? []
            const scheduleQty = p[STRUCTURAL_DRAFT_KEYS['quantity-mismatch']]
            return (
              <tr key={s.id} className={fixed ? 'structural-grid__row--fixed' : 'structural-grid__row--error'}>
                <td>{s.line}</td>
                <td className="odyssey-table__cell--title text-label-sm-medium">{p.productId}</td>
                <td>
                  <div className="text-label-sm-medium">{s.field}</div>
                  <div className="structural-grid__message text-label-xs-regular">{s.message}</div>
                </td>
                <td>
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
                              aria-label={`Remove schedule ${i + 1} on line ${s.line}`}
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
                        aria-label={`Gross weight, line ${s.line}`}
                        format="decimal"
                        value={fix?.grossWeight ?? p.grossWeight?.value ?? ''}
                        onChange={(e) => onFix(s.id, { grossWeight: e.target.value })}
                        disabled={disabled}
                        validated={fixed}
                      />
                      <span className="text-label-xs-regular structural-grid__hint">
                        schedule says {scheduleQty?.grossWeight} {p.grossWeight?.uom}
                      </span>
                    </div>
                  )}
                  {s.kind === 'timezone-missing' && (
                    /* ponytail: native <select>. The normalized Dropdown renders an
                       anchored portal jsdom cannot drive, and the Level-1 visual
                       design has not landed. Swap to Dropdown when it does. */
                    <select
                      aria-label={`Time zone, line ${s.line}`}
                      className="structural-grid__select text-label-sm-regular"
                      value={fix?.timezone ?? ''}
                      onChange={(e) => onFix(s.id, { timezone: e.target.value })}
                      disabled={disabled}
                    >
                      <option value="">Pick a time zone</option>
                      {TZ_OPTIONS.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                  )}
                  {/* FormField renders its own "Validated" line, so the quantity row
                      must NOT get a second one — `within(row).getByText('Validated')`
                      would match twice. */}
                  {fixed && s.kind !== 'quantity-mismatch' && (
                    <p className="structural-grid__validated text-label-xs-regular">Validated</p>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
