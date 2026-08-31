import { GroupTable } from '@odyssey/ui'
import ComparisonPreviewCard from './ComparisonPreviewCard.jsx'
import { DiffValue, KV_COLUMNS, rowsToFlatGroups } from './comparisonHelpers.jsx'

// "Preview Tender Details" (LINX-14512, Figma 1794-5544). oc.comparison rows
// carry { field, source, prior, new, changed } — OrderChangeComparisonRowVM
// (api/types/shipmentDetail.ts), matched verbatim against generate.mjs's
// `comparison` builder. No blank/label header on the field column, same
// "no header text" idiom as KV_COLUMNS — the group band above already names
// the block ("Changed Fields" / "Unchanged Fields").
const LIST_COLUMNS = [
  { key: 'field' },
  { key: 'prior', label: 'Prior Tender' },
  { key: 'new', label: 'New Tender' },
]

function renderListCell(row, col) {
  if (col.key === 'field') return row.field
  return <DiffValue value={row[col.key]} changed={row.changed} />
}

/**
 * FILTERING RULE — this section's badges don't map onto Tender List's rule
 * (narrow the COLUMN set, keep every row) because here each badge IS a row:
 * one difference badge per changed comparison field, not a shared column set
 * across many carrier rows. So filtering narrows to just the ONE matching
 * row instead, in both List and Table mode. A badge is only ever born from a
 * changed row, so a filtered List mode always leaves the Unchanged Fields
 * band empty underneath its own static label (GroupTable's `expandable:
 * false` band renders unconditionally regardless of row count).
 */
function filterRows(rows, filter) {
  return filter ? rows.filter((r) => r.field === filter) : rows
}

// Table mode's side: ONE static KV group per side (every comparison field is
// its own row), so — same reasoning as ListModeTable's sibling counterpart —
// there is no separate `header` strip: the group's own label already says
// "Prior Tender"/"New Tender". A `header` strip here would duplicate that
// exact text (measured — GroupTable renders both).
//
// NOT converted to `flat` (S134): every comparison field is its own KV row,
// several of them under ONE static label — the same "N rows under one
// per-entity header" shape ListModeTable's Table-mode sibling has, and flat
// only ever renders one row per group. See that file's comment for the full
// reasoning; it applies here unchanged.
//
// `striped={false}` (S134, Figma 1931-8797): the mock's Prior/New KV blocks
// are white with hairlines, not tinted bands — same fix as TenderLists'
// TableModeSide, no structural change.
function TableModeSide({ title, rows, side }) {
  const kvRows = rows.map((r) => ({ label: r.field, value: <DiffValue value={r[side]} changed={r.changed} /> }))
  return (
    <GroupTable
      columns={KV_COLUMNS}
      groups={[{ id: title, label: title, expandable: false, rows: kvRows }]}
      striped={false}
    />
  )
}

/**
 * List mode's ONE table per band ("Changed Fields" / "Unchanged Fields"):
 * every comparison field is its own FLAT row (S134), same conversion as
 * OrderChangeTenderLists' ListModeTable — the band's former group-header
 * label moves to the `header={{ title }}` strip, and flat mode renders every
 * field as a plain white row instead of a tinted child band. Two SIBLING
 * tables, stacked, rather than one table with two groups: flat's `header` is
 * one strip per TABLE, and there are two distinct band names to carry, the
 * exact reason ListModeTable already renders Prior/New as two tables.
 */
function ListSection({ title, rows }) {
  const groups = rowsToFlatGroups(rows, LIST_COLUMNS, renderListCell)
  return <GroupTable header={{ title }} columns={LIST_COLUMNS} groups={groups} flat />
}

export default function OrderChangeTenderDetails({ oc }) {
  const comparison = oc?.comparison ?? []
  const changed = comparison.filter((r) => r.changed)
  const unchanged = comparison.filter((r) => !r.changed)
  const tags = changed.map((r) => r.field)

  return (
    <ComparisonPreviewCard title="Preview Tender Details" differences={tags}>
      {(mode, filter) => {
        if (mode === 'list') {
          return (
            <div className="comparison-preview__stack">
              <ListSection title="Changed Fields" rows={filterRows(changed, filter)} />
              <ListSection title="Unchanged Fields" rows={filterRows(unchanged, filter)} />
            </div>
          )
        }
        const ordered = filterRows([...changed, ...unchanged], filter)
        return (
          <div className="comparison-preview__grid">
            <TableModeSide title="Prior Tender" rows={ordered} side="prior" />
            <TableModeSide title="New Tender" rows={ordered} side="new" />
          </div>
        )
      }}
    </ComparisonPreviewCard>
  )
}
