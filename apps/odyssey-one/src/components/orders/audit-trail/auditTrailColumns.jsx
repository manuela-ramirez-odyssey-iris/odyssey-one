// apps/odyssey-one/src/components/orders/audit-trail/auditTrailColumns.jsx
import { createColumnHelper } from '@tanstack/react-table'
import { Badge } from '@odyssey/ui'

/**
 * Audit Trail columns (LINX-8091 / LINX-9128 §I, ORD-27). Order ID is NOT a
 * column — the trail is per order, so it repeats on every row; it lives in the
 * page header. Only Date & Timestamp sorts (AC remarks name it and Order ID;
 * the other seven are not sortable). Blank cells render '--' under a header
 * that still shows (AC legend).
 */
const col = createColumnHelper()
const BLANK = '--'

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
 * One cell of the three value columns. `changes` is the row's LIST (AC Notes §1
 * — one row per save, all fields listed; Q-AT-1). Rendered as a vertical stack
 * so the three columns align line-for-line; a one-field change is a one-line
 * stack. Old = gray, New = purple, NO icon — a change is not a fault (S144
 * StopBadge rule; user 2026-09-14).
 */
export function ChangeStack({ changes, part }) {
  if (!changes?.length) return BLANK
  return (
    <ul className="audit-stack">
      {changes.map((c, i) => (
        <li key={`${c.field}-${i}`}>
          {part === 'field'
            ? c.field
            : <Badge variant={part === 'oldValue' ? 'gray' : 'purple'}>{c[part] || BLANK}</Badge>}
        </li>
      ))}
    </ul>
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
    cell: ({ getValue }) => <Badge variant={getValue() === 'Order Action' ? 'blue' : 'gray'}>{getValue()}</Badge>,
  }),
  col.accessor('changeCategory', { header: 'Change Category', enableSorting: false }),
  col.accessor('lineItemId', { header: 'Line Item ID', enableSorting: false, cell: ({ getValue }) => getValue() ?? BLANK }),
  col.display({ id: 'field', header: 'Field Name', enableSorting: false, cell: ({ row }) => <ChangeStack changes={row.original.changes} part="field" /> }),
  col.display({ id: 'oldValue', header: 'Old Value', enableSorting: false, cell: ({ row }) => <ChangeStack changes={row.original.changes} part="oldValue" /> }),
  col.display({ id: 'newValue', header: 'New Value', enableSorting: false, cell: ({ row }) => <ChangeStack changes={row.original.changes} part="newValue" /> }),
]
