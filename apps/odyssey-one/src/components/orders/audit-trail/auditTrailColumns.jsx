// apps/odyssey-one/src/components/orders/audit-trail/auditTrailColumns.jsx
import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Badge, Button } from '@odyssey/ui'
import AuditChangesModal from './AuditChangesModal.jsx'

/**
 * Audit Trail columns (LINX-8091 / LINX-9128 §I, ORD-27). Order ID is NOT a
 * column — the trail is per order, so it repeats on every row; it lives in the
 * page header. Only Date & Timestamp sorts (AC remarks name it and Order ID;
 * the other seven are not sortable). Blank cells render '--' under a header
 * that still shows (AC legend).
 */
const col = createColumnHelper()
export const BLANK = '--'
// A row's Field / Old / New stacks show at most this many changes before
// folding the rest behind a "+X more" chip (Part 9, 2026-09-23, "OIF & Audit
// Trail review" 2026-09-16).
const MAX_STACK = 3

// The line id(s) a row touched, for the "Line Item ID" cell. Most rows carry
// a single `lineItemId` (or null, header-level); `lineItemIds` (Part 9,
// 2026-09-23) is only ever present when one save touched more than one real
// order line (today: a multi-line Partial Cancellation — src/data/auditTrail.js).
function lineIdsOf(row) {
  if (row.lineItemIds?.length) return row.lineItemIds
  return row.lineItemId != null ? [row.lineItemId] : []
}

// AC: "Date in MM/DD/YYYY & Time in HH:MM 24-hour format". The zone is ours
// (the AC has none) — same abbreviation the order's createdTimeZoneCode carries.
export function formatAuditTimestamp(iso, zone) {
  if (!iso) return BLANK
  const [d, t = ''] = iso.split('T')
  const [y, m, day] = d.split('-')
  const hm = t.slice(0, 5)
  return [`${m}/${day}/${y} ${hm}`, zone].filter(Boolean).join(' ')
}

/**
 * One cell of the three value columns. `row` is the full audit row (not just
 * its `changes`) — the "+X more" chip below needs the whole row for the modal
 * (id, lineItemId, every change). Rendered as a vertical stack so the three
 * columns align line-for-line; a one-field change is a one-line stack. Old =
 * gray, New = purple, NO icon — a change is not a fault (S144 StopBadge rule;
 * user 2026-09-14).
 *
 * "+X more" (Part 9, 2026-09-23): only the first `MAX_STACK` changes render as
 * stack lines; the rest fold behind a chip that opens `AuditChangesModal`. The
 * chip itself renders ONLY in the `newValue` column (one interactive element
 * per row, not three) — the other two columns get a blank filler line of the
 * same height so all three stacks keep aligning line-for-line. Each column
 * cell owns its own modal-open state; only the `newValue` instance ever flips
 * it, so there's exactly one modal per row regardless of which cell renders it.
 */
export function ChangeStack({ row, part }) {
  const [open, setOpen] = useState(false)
  const changes = row.changes
  if (!changes?.length) return BLANK
  const shown = changes.slice(0, MAX_STACK)
  const remaining = changes.length - shown.length
  return (
    <>
      <ul className="audit-stack">
        {shown.map((c, i) => (
          <li key={`${c.field}-${i}`}>
            {part === 'field'
              ? c.field
              : <Badge variant={part === 'oldValue' ? 'gray' : 'purple'}>{c[part] || BLANK}</Badge>}
          </li>
        ))}
        {remaining > 0 && (
          <li className="audit-stack__more">
            {part === 'newValue'
              ? <Button variant="link" size="sm" onClick={() => setOpen(true)}>+{remaining} more</Button>
              : ' '}
          </li>
        )}
      </ul>
      {open && <AuditChangesModal row={row} onClose={() => setOpen(false)} />}
    </>
  )
}

export const AUDIT_TRAIL_COLUMNS = [
  col.accessor('timestamp', {
    id: 'timestamp',
    header: 'Date & Timestamp',
    cell: ({ row }) => formatAuditTimestamp(row.original.timestamp, row.original.timeZoneCode),
    meta: { cellClass: 'odyssey-table__cell--title text-label-sm-medium' },
  }),
  col.accessor('changedBy', { header: 'Change Made By', enableSorting: false }),
  col.accessor('source', { header: 'Source', enableSorting: false }),
  col.accessor('changeType', {
    header: 'Change Type',
    enableSorting: false,
    // Colour-coded by WHO acted (`changedBy`), not by the `changeType` label
    // (Part 9, 2026-09-23, "OIF & Audit Trail review" 2026-09-16) — mirrors
    // Shipments' HistoryTab.jsx precedent (DEC-81/DEC-87: the badge is driven
    // by the row's real actor/outcome field, not its category), reduced to
    // Orders' two-actor model instead of Shipments' five outcomes. The prior
    // `changeType === 'Order Action' ? blue : gray` mapping looked right on
    // every seeded row but was keying off the wrong field: audit-trail.md §3
    // confirms `Order Event · Applied on Hold · User` is a LEGAL row (a user
    // act filed under the Event family), which the old rule would have
    // colored gray — reading as system-driven when a person did it.
    cell: ({ row }) => (
      <Badge variant={CHANGE_TYPE_BADGE[row.original.changedBy] ?? 'gray'}>{row.original.changeType}</Badge>
    ),
  }),
  col.accessor('changeCategory', { header: 'Change Category', enableSorting: false }),
  col.accessor('lineItemId', {
    header: 'Line Item ID',
    enableSorting: false,
    // Line count badge (Part 9, 2026-09-23): when a save's `lineItemIds`
    // shows more than one real line was touched, the cell reads "N lines"
    // instead of a single id — see lineIdsOf() above.
    cell: ({ row }) => {
      const ids = lineIdsOf(row.original)
      return ids.length > 1 ? <Badge variant="gray">{`${ids.length} lines`}</Badge> : (ids[0] ?? BLANK)
    },
  }),
  col.display({ id: 'field', header: 'Field Name', enableSorting: false, cell: ({ row }) => <ChangeStack row={row.original} part="field" /> }),
  col.display({ id: 'oldValue', header: 'Old Value', enableSorting: false, cell: ({ row }) => <ChangeStack row={row.original} part="oldValue" /> }),
  col.display({ id: 'newValue', header: 'New Value', enableSorting: false, cell: ({ row }) => <ChangeStack row={row.original} part="newValue" /> }),
]

// Blue = the acting party is a User; gray = System (LINX/ERP/UI). Two-value
// analogue of Shipments' HistoryTab.jsx BADGE_VARIANTS map.
const CHANGE_TYPE_BADGE = { User: 'blue', System: 'gray' }
