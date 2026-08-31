import { GroupTable, HeaderStrip } from '@odyssey/ui'
import ComparisonPreviewCard from './ComparisonPreviewCard.jsx'
import { DiffValue, KVField, rowsToFlatGroups } from './comparisonHelpers.jsx'

// "Preview Tender Details" (LINX-14512). oc.comparison rows carry { field,
// source, prior, new, changed } — OrderChangeComparisonRowVM (api/types/
// shipmentDetail.ts), matched verbatim against generate.mjs's `comparison`
// builder. Changed fields render FIRST, then unchanged — LINX-14512's own
// Business Rules ("These fields to be listed on the top of the list
// followed by fields which didn't undergo the change"), echoed by the
// domain expert in grooming ("anything highlighted... should be moved to
// the top"). This is a written AC, not a mock detail: the Table-mode mock
// (Figma 1931-8797) happens to render its sample data in plain domain
// order, but a Jira AC outrights a mock's sample data in this project — the
// mock isn't evidence the ordering rule was withdrawn, it's just
// illustrative data. The band LABELS ("Changed Fields"/"Unchanged Fields")
// are still gone (S134, designer ruling, independent of this ordering
// rule) — purple marks which fields changed, clustered at the top, with no
// labelled separator between the two runs.
//
// LIST MODE (S135 — Figma 1703-156564, the node the designer pointed at):
// TWO stacked 3-column tables — field | Prior Tender | New Tender — one row
// per comparison field. The segmentation lives in the COLUMN-HEADER ROW: the
// first column's label is "Changed Fields" on the top table and "Unchanged
// Fields" on the one below, which is what separates the two runs. (This
// reinstates the Changed/Unchanged wording the S134 ruling had removed —
// designer, S135 — but as header-row labels, not as extra band rows.)
const listColumns = (segmentLabel) => [
  { key: 'field', label: segmentLabel },
  { key: 'prior', label: 'Prior Tender' },
  { key: 'new', label: 'New Tender' },
]

/**
 * FILTERING RULE — same as Preview Tender List's: a filter narrows the FIELD
 * dimension, i.e. the columns shown. Here each badge IS one comparison field,
 * so an active filter leaves exactly one column standing on both sides.
 */
function filterRows(rows, filter) {
  return filter ? rows.filter((r) => r.field === filter) : rows
}

/**
 * One list-mode segment — a flat `GroupTable` (one plain white row per
 * comparison field) whose first column header names the segment. Rendered
 * only when the segment has rows, so a filter that leaves one run empty
 * drops that table rather than showing a headed but bodyless one.
 *
 * `headerStyle="strip"` gives the column-header row the HeaderStrip look the
 * mock draws (GroupTable, 2026-08-31 — Figma's `Header strip style` boolean);
 * it is independent of `flat`, so it has to be asked for explicitly.
 */
function ListSegment({ label, rows }) {
  if (!rows.length) return null
  const columns = listColumns(label)
  const groups = rowsToFlatGroups(rows, columns, (row, col) =>
    col.key === 'field' ? row.field : <DiffValue value={row[col.key]} changed={row.changed} />,
  )
  return <GroupTable columns={columns} groups={groups} flat headerStyle="strip" />
}

/**
 * Table mode's side — IDENTICAL in construction to OrderChangeTenderLists'
 * and OrderChangeHazmat's (S135, designer: don't drift from the format those
 * two use): a HeaderStrip band composed directly, then an entry block whose
 * fields are a label-above-value KV grid, inside `comparison-preview__grid`
 * so the two sides touch and the seam is the first panel's own right border.
 * Only one entry here — Tender Details has no repeating carrier/line
 * identity — so the inter-entry hairline never shows.
 */
function TableModeSide({ title, rows, side }) {
  return (
    <div className="comparison-preview__panel">
      <HeaderStrip title={title} />
      <div className="comparison-preview__entry">
        <div className="comparison-preview__kv-grid">
          {rows.map((r) => (
            <KVField key={r.field} label={r.field}>
              <DiffValue value={r[side]} changed={r.changed} />
            </KVField>
          ))}
        </div>
      </div>
    </div>
  )
}

// Changed-first, LINX-14512's own order (see file header) — `sort` is
// stable (ES2019+), so within each partition the source array's own order
// survives untouched. List mode splits the same two runs into its two
// labelled tables; Table mode (one undivided KV block per side) relies on
// this ordering alone.
function orderByChanged(rows) {
  return [...rows].sort((a, b) => Number(b.changed) - Number(a.changed))
}

export default function OrderChangeTenderDetails({ oc }) {
  const comparison = oc?.comparison ?? []
  const tags = comparison.filter((r) => r.changed).map((r) => r.field)
  const ordered = orderByChanged(comparison)

  return (
    <ComparisonPreviewCard title="Preview Tender Details" differences={tags} defaultExpanded={false}>
      {(mode, filter) => {
        const rows = filterRows(ordered, filter)
        if (mode === 'table') {
          return (
            <div className="comparison-preview__grid">
              <TableModeSide title="Prior Tender" rows={rows} side="prior" />
              <TableModeSide title="New Tender" rows={rows} side="new" />
            </div>
          )
        }
        return (
          <div className="comparison-preview__stack">
            <ListSegment label="Changed Fields" rows={rows.filter((r) => r.changed)} />
            <ListSegment label="Unchanged Fields" rows={rows.filter((r) => !r.changed)} />
          </div>
        )
      }}
    </ComparisonPreviewCard>
  )
}
