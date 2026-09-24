import { Check } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Badge, Dropdown, GroupTable, PillTab } from '@odyssey/ui'
import { STRUCTURAL_DRAFT_KEYS } from './interfaceErrors.js'
import { TIMEZONES } from '../../../data/master-data'

// The app's one timezone list (src/data/master-data.js) — NOT a second source
// of truth.
const TZ_OPTIONS = [
  { value: '', label: 'Pick a time zone' },
  ...TIMEZONES.map((z) => ({ value: z, label: z })),
]

/**
 * Is this structural error actually fixed by `fix`?
 *
 * EXPORTED ON PURPOSE — the composing panel must call THIS, not re-derive the
 * rule, so the badge, the grid, and `applyFixes` can never disagree.
 *
 *   extra-schedule    — a schedule was PICKED to keep (`fix.keepSchedule`, an
 *                       id). Pick-only (user ruling, 2026-09-23) — no free
 *                       date entry, no delete-selection transaction.
 *   quantity-mismatch — the planner picked a SIDE, not a value: `fix.use` is
 *                       'line' or 'schedule' (OIF review, 2026-09-16: "a
 *                       decision rather than forcing one value to overwrite
 *                       the other").
 *   timezone-missing  — a non-empty zone was picked
 */
export function isStructuralFixed(product, error, fix) {
  if (!product || !fix) return false
  switch (error.kind) {
    case 'extra-schedule': return !!fix.keepSchedule
    case 'quantity-mismatch': return fix.use === 'line' || fix.use === 'schedule'
    case 'timezone-missing': return !!fix.timezone
    default: return false
  }
}

const COLUMNS = [
  { key: 'line', label: 'Line' },
  { key: 'product', label: 'Product' },
  { key: 'faults', label: 'Faults' },
  { key: 'status', label: 'Status', align: 'center' },
]

const weightLabel = (w) => `${w?.value ?? '—'}${w?.uom ? ` ${w.uom}` : ''}`

/**
 * StructuralGrid — Step 1 (LINX-16049) faults INSIDE a line (rules 1, 2, 4).
 * Only the offending lines render (Level-1 review §2.1 "grouped by defect
 * class"), ONE ROW PER LINE (user ruling, 2026-09-14: `GroupTable flat`).
 *
 * S158 / user ruling 2026-09-23 (OIF & Audit Trail review minutes,
 * 2026-09-16): `StructuralFixModal`'s Done/Cancel TRANSACTION is gone. Every
 * fault's decision renders INLINE in the Faults cell, same visual family as
 * `ConflictPicker` — PillTab chips, one decision per fault, committed the
 * instant a chip is clicked (`onFix` writes straight through, no staging) and
 * clearable any time via "Reset" until the order is reprocessed:
 *
 *   extra-schedule    → one chip per schedule on the line (ship date ·
 *                       delivery date · package count · weight); picking one
 *                       KEEPS it, the others are dropped on reprocess. A
 *                       compact read-only strip below lists the OTHER faulty
 *                       lines' kept-or-first schedule dates, so the pick can
 *                       be made consistent across lines (minutes: "ship and
 *                       delivery dates consistent across lines").
 *   quantity-mismatch → two chips, "Use line value" / "Use schedule value",
 *                       each showing package count · weight · volume — a
 *                       decision between the two sides, never a typed value.
 *   timezone-missing  → the zone Dropdown, inline (no longer inside a modal).
 *
 * Controlled via `fixes` {errorId → fix} + `onFix(errorId, fix | null)` —
 * `null` clears the fault's fix (Reset), keyed by ERROR id (`s1`), the same
 * key space `applyFixes(src, picks, structuralFixes)` expects. `disabled` =
 * read-only look-back (chips/dropdown/Reset all inert).
 *
 * `line` is 1-based over `values.products` — same indexing `applyErrors` /
 * `applyFixes` use (`draft.products[s.line - 1]`), verified in interfaceErrors.js.
 */
export default function StructuralGrid({ products = [], structural = [], fixes = {}, onFix, disabled = false }) {
  const lines = [...new Set(structural.map((s) => s.line))].sort((a, b) => a - b)

  // For the extra-schedule consistency strip: every OTHER faulty line's
  // kept schedule (or its first, before a pick is made) — ship/delivery
  // dates only, the detail the planner needs to keep lines consistent.
  // Scaffolding note: only faulty lines carry a `schedules` array today
  // (the Level-1 seed only stamps it where rule 1 fired) — a clean line has
  // nothing to show here regardless, so this is the whole real surface.
  const otherScheduleLines = (currentErrorId) => structural
    .filter((s) => s.kind === 'extra-schedule' && s.id !== currentErrorId)
    .map((s) => {
      const p = products[s.line - 1]
      const schedules = p?.[STRUCTURAL_DRAFT_KEYS['extra-schedule']] ?? []
      const kept = schedules.find((sch) => sch.id === fixes[s.id]?.keepSchedule) ?? schedules[0]
      return kept ? { line: s.line, ship: kept.requestedShipDate, delivery: kept.latestDeliveryDate } : null
    })
    .filter(Boolean)

  const renderFault = (p, line, s) => {
    const fix = fixes[s.id]
    const fixed = isStructuralFixed(p, s, fix)
    const hasFix = fix && Object.keys(fix).length > 0
    return (
      <li key={s.id} className="structural-grid__fault">
        <div className={`text-label-sm-medium${fixed ? ' structural-grid__field--fixed' : ''}`}>
          {fixed && <Check {...ICON_MD} />}
          {s.field}
        </div>
        {!fixed && (
          <div className="structural-grid__message text-label-xs-regular">{s.message}</div>
        )}

        {s.kind === 'extra-schedule' && (() => {
          const schedules = p[STRUCTURAL_DRAFT_KEYS['extra-schedule']] ?? []
          const others = otherScheduleLines(s.id)
          return (
            <div className="structural-grid__decision">
              <div className="structural-grid__chips">
                {schedules.map((sch, i) => (
                  <PillTab
                    key={sch.id}
                    label={`Schedule ${i + 1} · ship ${sch.requestedShipDate || '—'} · del ${sch.latestDeliveryDate || '—'} · ${sch.packageCount ?? '—'} pkgs · ${weightLabel({ value: sch.grossWeight, uom: sch.grossWeightUom })}`}
                    showCount={false}
                    selected={fix?.keepSchedule === sch.id}
                    disabled={disabled}
                    onClick={() => onFix(s.id, { keepSchedule: sch.id })}
                  />
                ))}
              </div>
              {/* Read-only strip — the OTHER faulty lines' schedule dates, so
                  the pick here can be made consistent (minutes, 2026-09-16). */}
              {others.length > 0 && (
                <ul className="structural-grid__other-schedules text-label-xs-regular">
                  {others.map((o) => (
                    <li key={o.line}>{`Line ${o.line}: ship ${o.ship || '—'} · delivery ${o.delivery || '—'}`}</li>
                  ))}
                </ul>
              )}
            </div>
          )
        })()}

        {s.kind === 'quantity-mismatch' && (() => {
          const scheduleQty = p[STRUCTURAL_DRAFT_KEYS['quantity-mismatch']]
          const pkgCount = p.handlingCount ?? '—'
          return (
            <div className="structural-grid__chips">
              <PillTab
                label={`Use line value · ${pkgCount} pkgs · ${weightLabel(p.grossWeight)} · ${p.volume?.value ?? '—'}${p.volume?.uom ? ` ${p.volume.uom}` : ''}`}
                showCount={false}
                selected={fix?.use === 'line'}
                disabled={disabled}
                onClick={() => onFix(s.id, { use: 'line' })}
              />
              <PillTab
                label={`Use schedule value · ${pkgCount} pkgs · ${weightLabel({ value: scheduleQty?.grossWeight, uom: scheduleQty?.grossWeightUom ?? p.grossWeight?.uom })} · ${scheduleQty?.volume ?? '—'}${p.volume?.uom ? ` ${p.volume.uom}` : ''}`}
                showCount={false}
                selected={fix?.use === 'schedule'}
                disabled={disabled}
                onClick={() => onFix(s.id, { use: 'schedule' })}
              />
            </div>
          )
        })()}

        {s.kind === 'timezone-missing' && (
          // Dropdown has no aria-label passthrough to its trigger button (the
          // molecule spreads `...rest` onto its OUTER span, not
          // DropdownButton) — implicit <label> wrapping is the only way to
          // name the trigger without touching @odyssey/ui.
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

        {/* Reversible by construction (2026-09-23 ruling): any decision can be
            changed by picking again, or cleared entirely here — no Done/Cancel,
            nothing is staged. */}
        {!disabled && hasFix && (
          <button type="button" className="structural-grid__reset text-label-xs-regular" onClick={() => onFix(s.id, null)}>
            Reset
          </button>
        )}
      </li>
    )
  }

  const groups = lines.map((line) => {
    const p = products[line - 1]
    if (!p) return null
    const faults = structural.filter((s) => s.line === line)
    const openCount = faults.filter((s) => !isStructuralFixed(p, s, fixes[s.id])).length
    return {
      id: String(line),
      label: line,
      values: {
        // Two-line ID + name, same convention as the Orders grid's
        // `locationCell` (ordersColumns.jsx) — `description` can be empty
        // (mapOrderViewToFormVm has a lossy path, LINX-11163 deferred), so
        // the second line only renders when there's something to show.
        product: (
          <div className="structural-grid__product-cell">
            {/* Level-1 seed invariant I8: a share of orders never get line
                enrichment (manual_order stays NULL), so productId is
                legitimately '' — not a bug. Each line is conditional so a
                missing ID doesn't leave a blank first line; '--' only when
                BOTH are empty. */}
            {/* GroupTable only styles the Line column's cell as primary/medium
                via `.odyssey-group-table__row td:first-child` — Product is the
                SECOND cell, so with no class it inherits the tertiary/regular
                default and looks lighter than Line. This class restates the
                same two properties explicitly so Product's ID matches Line's type. */}
            {p.productId && <span className="structural-grid__product-id">{p.productId}</span>}
            {p.description && <span className="text-label-xs-regular" style={{ color: 'var(--text-tertiary)' }}>{p.description}</span>}
            {!p.productId && !p.description && <span>--</span>}
          </div>
        ),
        faults: (
          <ul className="structural-grid__faults">
            {faults.map((s) => renderFault(p, line, s))}
          </ul>
        ),
        status: openCount === 0
          ? <Badge variant="green">Validated</Badge>
          : <Badge variant="red">{openCount} open</Badge>,
      },
    }
  }).filter(Boolean)

  return (
    <div className="structural-grid">
      <GroupTable flat columns={COLUMNS} groups={groups} />
    </div>
  )
}
