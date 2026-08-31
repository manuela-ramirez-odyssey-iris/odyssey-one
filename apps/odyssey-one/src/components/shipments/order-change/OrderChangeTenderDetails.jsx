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
// List mode's own field|value column pair — one comparison field per row,
// its PRIOR or NEW value in the second column depending on which side's
// table this is (`side`, below). No header text on the field column: the
// `header={{ title }}` strip above already names the side.
const LIST_COLUMNS = [{ key: 'field' }, { key: 'value' }]

function renderListCell(row, col, side) {
  if (col.key === 'field') return row.field
  return <DiffValue value={row[side]} changed={row.changed} />
}

/**
 * FILTERING RULE — this section's badges don't map onto Tender List's rule
 * (narrow the COLUMN set, keep every row) because here each badge IS a row:
 * one difference badge per changed comparison field, not a shared column set
 * across many carrier rows. So filtering narrows to just the ONE matching
 * row instead, in both List and Table mode.
 */
function filterRows(rows, filter) {
  return filter ? rows.filter((r) => r.field === filter) : rows
}

/**
 * Table mode's side (S134, Figma 1931-8797): a HeaderStrip band ("Prior
 * Tender"/"New Tender") composed directly, then ONE entry block holding
 * every comparison field as a 2-column KV grid (`KVField`,
 * comparisonHelpers.jsx) — not a GroupTable row, for the same reason as
 * OrderChangeTenderLists' TableModeSide: the mock's fields are two-per-row
 * with label above value, which GroupTable's rows flavor can't express
 * without an unwanted hairline under every single field. Unlike Tender
 * List/Hazmat there is only one entry (no repeating carrier/line identity
 * here), so no inter-entry hairline is needed either.
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

/**
 * List mode's ONE table per side ("Prior Tender List" / "New Tender List",
 * S134) — the same sibling shape OrderChangeTenderLists/OrderChangeHazmat's
 * List mode already use, replacing the old single 3-column table (field |
 * Prior Tender | New Tender) and its "Changed Fields" / "Unchanged Fields"
 * band split. Every comparison field is its own FLAT row (GroupTable
 * `flat`), the side name carried by the `header={{ title }}` strip. Purple
 * (`DiffValue`) is the only signal for "this changed" now — no redundant
 * band label.
 */
function ListSection({ title, rows, side }) {
  const groups = rowsToFlatGroups(rows, LIST_COLUMNS, (row, col) => renderListCell(row, col, side))
  return <GroupTable header={{ title }} columns={LIST_COLUMNS} groups={groups} flat />
}

// Changed-first, LINX-14512's own order (see file header) — `sort` is
// stable (ES2019+), so within each partition the source array's own order
// survives untouched.
function orderByChanged(rows) {
  return [...rows].sort((a, b) => Number(b.changed) - Number(a.changed))
}

export default function OrderChangeTenderDetails({ oc }) {
  const comparison = oc?.comparison ?? []
  const tags = comparison.filter((r) => r.changed).map((r) => r.field)
  const ordered = orderByChanged(comparison)

  return (
    <ComparisonPreviewCard title="Preview Tender Details" differences={tags}>
      {(mode, filter) => {
        const rows = filterRows(ordered, filter)
        if (mode === 'list') {
          return (
            <div className="comparison-preview__stack">
              <ListSection title="Prior Tender List" rows={rows} side="prior" />
              <ListSection title="New Tender List" rows={rows} side="new" />
            </div>
          )
        }
        return (
          <div className="comparison-preview__grid">
            <TableModeSide title="Prior Tender" rows={rows} side="prior" />
            <TableModeSide title="New Tender" rows={rows} side="new" />
          </div>
        )
      }}
    </ComparisonPreviewCard>
  )
}
