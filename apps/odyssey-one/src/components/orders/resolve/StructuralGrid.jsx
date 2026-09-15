import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Badge, Button, GroupTable } from '@odyssey/ui'
import { STRUCTURAL_DRAFT_KEYS } from './interfaceErrors.js'
import StructuralFixModal from './StructuralFixModal.jsx'

/**
 * Is this structural error actually fixed by `fix`?
 *
 * EXPORTED ON PURPOSE — the composing panel (later task) must call THIS, not
 * re-derive the rule. The plan originally left the equality check to the panel
 * and had the grid paint "Validated" on `fixes[id] != null`, which would show a
 * green row for a WRONG weight. The check lives here instead, and the panel
 * reuses it, so the badge, the grid, and `applyFixes` can never disagree.
 *
 *   extra-schedule    — at least one schedule was nominated for removal
 *                       (`fix.removeSchedules`, an array of ids)
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
    case 'extra-schedule': return (fix.removeSchedules?.length ?? 0) > 0
    case 'quantity-mismatch':
      return fix.grossWeight != null && fix.grossWeight !== '' &&
        String(fix.grossWeight) === String(scheduleValue?.grossWeight ?? '')
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

/**
 * StructuralGrid — Step 1 (LINX-16049) faults INSIDE a line (rules 1, 2, 4).
 * Only the offending lines render (Level-1 review §2.1 "grouped by defect
 * class"), ONE ROW PER LINE (user ruling, 2026-09-14: `GroupTable flat`, not
 * the hand-rolled table this replaced — "we don't need that many columns" is
 * also why this isn't DataTable). A line's faults are listed in the Faults
 * cell; the actual fix controls live in `StructuralFixModal`, opened by the
 * pinned Action column's button. Controlled via `fixes` {errorId → fix} +
 * `onFix(errorId, fix)` — keyed by ERROR id (`s1`), the same key space
 * `applyFixes(src, picks, structuralFixes)` expects. `disabled` = read-only
 * look-back (button reads "View", modal controls inert).
 *
 * A FIXED fault stays editable in the modal: the planner may change their
 * mind before submitting, and nothing is committed until the panel calls
 * `applyFixes`. Only `disabled` freezes the controls.
 *
 * `line` is 1-based over `values.products` — same indexing `applyErrors` /
 * `applyFixes` use (`draft.products[s.line - 1]`), verified in interfaceErrors.js.
 */
export default function StructuralGrid({ products = [], structural = [], fixes = {}, onFix, disabled = false }) {
  const [openLine, setOpenLine] = useState(null)

  const lines = [...new Set(structural.map((s) => s.line))].sort((a, b) => a - b)

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
            {p.productId && <span className="text-label-sm-medium">{p.productId}</span>}
            {p.description && <span className="text-label-xs-regular" style={{ color: 'var(--text-tertiary)' }}>{p.description}</span>}
            {!p.productId && !p.description && <span className="text-label-sm-medium">--</span>}
          </div>
        ),
        faults: (
          <ul className="structural-grid__faults">
            {faults.map((s) => {
              const fixed = isStructuralFixed(p, s, fixes[s.id])
              return (
                <li key={s.id}>
                  <div className={`text-label-sm-medium${fixed ? ' structural-grid__field--fixed' : ''}`}>
                    {fixed && <Check {...ICON_MD} />}
                    {s.field}
                  </div>
                  {!fixed && (
                    <div className="structural-grid__message text-label-xs-regular">{s.message}</div>
                  )}
                </li>
              )
            })}
          </ul>
        ),
        status: openCount === 0
          ? <Badge variant="green">Validated</Badge>
          : <Badge variant="red">{openCount} open</Badge>,
      },
      action: (
        <Button
          variant="secondary"
          size="sm"
          aria-label={disabled ? `View line ${line}` : `Fix line ${line}`}
          onClick={() => setOpenLine(line)}
        >
          {disabled ? 'View' : 'Fix'}
        </Button>
      ),
    }
  }).filter(Boolean)

  const openProduct = openLine != null ? products[openLine - 1] : null
  const openFaults = openLine != null ? structural.filter((s) => s.line === openLine) : []

  // The open line's faults can empty out from under the modal (e.g. `structural`
  // itself changes) — closing it here, not mid-render, keeps this a plain effect.
  useEffect(() => {
    if (openLine != null && openFaults.length === 0) setOpenLine(null)
  }, [openLine, openFaults.length])

  return (
    <div className="structural-grid">
      <GroupTable flat stickyActions actionsHeader="Action" columns={COLUMNS} groups={groups} />
      {openLine != null && openProduct && (
        <StructuralFixModal
          line={openLine}
          product={openProduct}
          faults={openFaults}
          fixes={fixes}
          onFix={onFix}
          disabled={disabled}
          onClose={() => setOpenLine(null)}
        />
      )}
    </div>
  )
}
