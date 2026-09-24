// apps/odyssey-one/src/components/orders/audit-trail/AuditChangesModal.jsx
import { createPortal } from 'react-dom'
import { ModalMedium } from '@odyssey/ui'

// Local copy of auditTrailColumns.jsx's BLANK — not imported, to avoid a
// circular import (that file imports this component for the "+X more" chip).
const BLANK = '--'

/**
 * AuditChangesModal — the "+X more" destination (OIF & Audit Trail review,
 * 2026-09-16; user ruling 2026-09-23, Part 9). A save's `changes` list can run
 * past the row's 3-line stack preview; this shows every change, grouped by
 * line item: a change's OWN `lineItemId` when it carries one, else the row's
 * (a header-level row's changes all fall under one "Order" group). Today no
 * category ever mixes lines within one row's `changes` (Line Item Editing is
 * one line per save; the multi-line case — Partial Cancellation — carries no
 * `changes` at all, per BLANK_CHANGES in src/data/auditTrail.js), so this
 * always renders exactly one group — the grouping is generic on purpose so it
 * keeps working if a future row shape puts several lines' edits in one save.
 */
export default function AuditChangesModal({ row, onClose }) {
  const groups = new Map()
  for (const c of row.changes) {
    const lineId = c.lineItemId ?? row.lineItemId ?? null
    const label = lineId ? `Line ${lineId}` : 'Order'
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(c)
  }

  return createPortal(
    <ModalMedium title="All Changes" ariaLabel="All Changes" onClose={onClose} scrollableContent>
      <table className="audit-changes-modal__table">
        <thead>
          <tr>
            <th>Line ID</th>
            <th>Field</th>
            <th>Previous</th>
            <th>New</th>
          </tr>
        </thead>
        <tbody>
          {[...groups.entries()].flatMap(([label, changes]) =>
            changes.map((c, i) => (
              <tr key={`${label}-${c.field}-${i}`}>
                <td>{label}</td>
                <td>{c.field || BLANK}</td>
                <td>{c.oldValue || BLANK}</td>
                <td>{c.newValue || BLANK}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </ModalMedium>,
    document.body,
  )
}
