import { GroupTable, HeaderStrip } from '@odyssey/ui'
import ComparisonPreviewCard from './ComparisonPreviewCard.jsx'
import { DiffValue, KVField, rowsToFlatGroups } from './comparisonHelpers.jsx'

// "Preview Tender Details" (LINX-14512). oc.comparison rows carry { field,
// source, prior, new, changed } — OrderChangeComparisonRowVM (api/types/
// shipmentDetail.ts), matched verbatim against generate.mjs's `comparison`
// builder. Rendered in the array's OWN order — S134 dropped the earlier
// changed-first sort along with the Changed/Unchanged split: Figma 1931-8797
// shows changed fields (Pick Up Date/Time, Distance, Package Count)
// scattered through the block in plain domain order, not grouped at the
// top, so re-sorting would itself be a deviation from the mock.
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

export default function OrderChangeTenderDetails({ oc }) {
  const comparison = oc?.comparison ?? []
  const tags = comparison.filter((r) => r.changed).map((r) => r.field)

  return (
    <ComparisonPreviewCard title="Preview Tender Details" differences={tags}>
      {(mode, filter) => {
        const rows = filterRows(comparison, filter)
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
