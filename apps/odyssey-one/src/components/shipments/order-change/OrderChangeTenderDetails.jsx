import { GroupTable } from '@odyssey/ui'
import TooltipTrigger from '../../ui/TooltipTrigger.jsx'
import ComparisonPreviewCard from './ComparisonPreviewCard.jsx'
import { DiffValue, rowsToFlatGroups } from './comparisonHelpers.jsx'

// "Preview Tender Details" (LINX-14512). oc.comparison rows carry { field,
// source, prior, new, changed } — OrderChangeComparisonRowVM (api/types/
// shipmentDetail.ts), matched verbatim against generate.mjs's `comparison`
// builder.
//
// S137 (designer, three rulings in one pass):
//   1. "make sure their [Changed/Unchanged Fields] columns are aligned" —
//      see TENDER_COL_WIDTHS below.
//   2. "bring hazardous material to the Preview Tender Details, merge it...
//      to differentiate the fields we can add our tooltip hover
//      functionality" — the separate "Preview Hazardous Material
//      Information" card (OrderChangeHazmat.jsx) is DELETED; its rows join
//      this section's own two tables (see flattenHazmat below). Every row
//      (tender AND hazmat) now carries a `source` used to hover-differentiate
//      it — see ListSegment's field-cell TooltipTrigger.
//   3. the filter chips + List/Table ButtonToggle are gone screen-wide
//      (ComparisonPreviewCard, rewritten by another agent) — this file drops
//      TABLE MODE and the render-prop `(mode, filter) => node` shape that
//      went with it. List mode (below) is the only form left.
//
// Superseded: S134/S135's Table-mode KV-panel construction (TableModeSide,
// comparison-preview__grid) and S135's filterRows are gone with the toggle
// that drove them — kept only in git history, not as dead code here.
//
// Ordering: changed fields render FIRST, then unchanged — LINX-14512's own
// Business Rules ("These fields to be listed on the top of the list
// followed by fields which didn't undergo the change"). With Table mode
// gone this is now trivially the JSX order of the two ListSegments below
// (Changed Fields table, then Unchanged Fields table) — no separate sort
// step is needed once there is no single merged block to order (the old
// `orderByChanged` existed only for Table mode's one undivided KV block;
// deleted with it).

// S137 — the two segment tables (Changed Fields / Unchanged Fields) are
// independent GroupTables; each sizes its own columns from its own content
// unless told otherwise, which is exactly why they drifted apart (the
// designer's complaint). Fix: one shared width per column, passed to BOTH
// tables' `columns[].width` (GroupTable.jsx applies it as an inline style on
// the <th> — see `col.width != null ? { width: col.width } : undefined`).
// Chosen from the REAL seeded content (generate.mjs ~2434-2480), not
// guessed: the widest field labels are "Order Requested Date"/"Delivery
// Appointment" (21 chars); the widest values are full addresses ("1234 ...
// St, Charlotte, NC, 28202, US") and "SSD, 01/07/2026 09:00 CST" — long
// enough that the value columns need more room than the field column, and
// long enough that some values will still wrap even at this width. GroupTable
// child-row cells are `white-space: nowrap` by default (components.css
// `.odyssey-group-table__row td`), which would silently defeat these widths
// under `table-layout: auto` (a nowrap cell forces its column at least as
// wide as its unwrapped content, no matter what `width` says) — order-change
// .css's `.oc-tender-table` rule (appended, S137) turns wrapping back on for
// just these two tables.
const TENDER_COL_WIDTHS = { field: 200, prior: 300, new: 300 }

const listColumns = (segmentLabel) => [
  { key: 'field', label: segmentLabel, width: TENDER_COL_WIDTHS.field },
  { key: 'prior', label: 'Prior Tender', width: TENDER_COL_WIDTHS.prior },
  { key: 'new', label: 'New Tender', width: TENDER_COL_WIDTHS.new },
]

// S137 — ported from the deleted OrderChangeHazmat.jsx (its list, order, AND
// labels kept verbatim — Jana's own list, mock deck p5; the six after
// Boiling Point were missing until S135, so the section showed 5 of 11).
// `line` is identity (used below to build the differentiating tooltip
// source), never itself a compared field, so it is deliberately NOT in this
// list.
const HAZMAT_FIELDS = [
  { key: 'boilingPoint', label: 'Boiling Point' },
  { key: 'flashPoint', label: 'Flash Point' },
  { key: 'hazmatClass', label: 'Hazmat Class' },
  { key: 'hazmatCode', label: 'Hazmat Code' },
  { key: 'hazmatDescription', label: 'Hazmat Description' },
  { key: 'hazmatPkgGroup', label: 'Hazmat Pkg Group' },
  { key: 'itemDescription', label: 'Item Description' },
  { key: 'marinePollutant', label: 'Marine Pollutant' },
  { key: 'shippingClass', label: 'Shipping Class' },
  { key: 'tunnelCode', label: 'Tunnel Code' },
  { key: 'wgkClass', label: 'WGK Class' },
]

/**
 * Flattens oc.hazmat's `[{ prior, new }]` LINE pairs into comparison-shaped
 * rows — one row per (line, field) — so a hazmat value can join the SAME
 * changed/unchanged split, ordering, and count as an ordinary tender
 * comparison row, with no special-casing downstream (S137: "merge it").
 * `source` is what differentiates a hazmat row on hover once merged: which
 * LINE it came from, since the same field label (e.g. "Flash Point") repeats
 * once per hazmat line and needs its own identity.
 */
function flattenHazmat(pairs = []) {
  return pairs.flatMap((pair) =>
    HAZMAT_FIELDS.map(({ key, label }) => ({
      field: label,
      source: `Hazardous Material · Line ${pair.prior?.line ?? pair.new?.line ?? '—'}`,
      prior: pair.prior?.[key],
      new: pair.new?.[key],
      changed: pair.prior?.[key] !== pair.new?.[key],
    })),
  )
}

/**
 * The unique set of hazmat fields that differ across ANY line — ported from
 * OrderChangeHazmat.jsx's identically-named export, kept for its own
 * de-duping intent (a field changed on one line must count ONCE, not once
 * per line) and because OrderChangeHazmat.test.jsx exercised it directly.
 * Not used by the merged `differences` count below (which de-dupes the same
 * way via a Set over the full merged row list) — kept as a small, testable
 * unit in its own right.
 */
export function computeHazmatDiffs(pairs = []) {
  const tags = new Set()
  for (const row of flattenHazmat(pairs)) if (row.changed) tags.add(row.field)
  return HAZMAT_FIELDS.filter((f) => tags.has(f.label)).map((f) => f.label)
}

/**
 * One list-mode segment — a flat `GroupTable` (one plain white row per
 * comparison/hazmat field) whose first column header names the segment.
 *
 * S137: a segment with NO rows no longer vanishes (`if (!rows.length) return
 * null`, S135) — designer: "if there are no differences you can show (No
 * Differences) in subaccordions". It renders its header strip with one
 * legible "(No Differences)" row instead, so "Changed Fields" still shows
 * its own header even on a shipment where nothing changed. This is the
 * SEGMENT's own empty state — distinct from the CARD-level "(No
 * Differences)" ComparisonPreviewCard already puts on the accordion title.
 *
 * Every row's field cell carries a hover TooltipTrigger naming its `source`
 * (S137, "to differentiate the fields... we can add our tooltip hover
 * functionality") — the existing tender `source` ("Routing"/"Order"/
 * "Shipment"/"Order or entered in Shipment") was carried on every comparison
 * row already but never surfaced anywhere; hazmat rows get the same
 * treatment via their synthesized `source` (which LINE). One tooltip idiom
 * for every row, rather than a hazmat-only visual special case.
 *
 * `headerStyle="strip"` gives the column-header row the HeaderStrip look the
 * mock draws (GroupTable, 2026-08-31 — Figma's `Header strip style` boolean).
 */
function ListSegment({ label, rows }) {
  const columns = listColumns(label)
  if (!rows.length) {
    return (
      <GroupTable
        className="oc-tender-table"
        columns={columns}
        groups={[{ id: 'empty', values: { field: '(No Differences)' } }]}
        flat
        headerStyle="strip"
      />
    )
  }
  const groups = rowsToFlatGroups(rows, columns, (row, col) => {
    if (col.key !== 'field') return <DiffValue value={row[col.key]} changed={row.changed} />
    return (
      <TooltipTrigger tooltipProps={{ groups: [{ subtitle: 'Source', content: row.source }] }}>
        <span>{row.field}</span>
      </TooltipTrigger>
    )
  })
  return <GroupTable className="oc-tender-table" columns={columns} groups={groups} flat headerStyle="strip" />
}

export default function OrderChangeTenderDetails({ oc }) {
  const rows = [...(oc?.comparison ?? []), ...flattenHazmat(oc?.hazmat ?? [])]
  // Distinct changed FIELDS, not one entry per hazmat line (a field changed
  // on one of several lines must count once) — a Set over the merged list
  // does this for free; tender fields are already unique among themselves,
  // so this only actually de-dupes the hazmat side.
  const tags = [...new Set(rows.filter((r) => r.changed).map((r) => r.field))]

  return (
    <ComparisonPreviewCard title="Preview Tender Details" differences={tags} defaultExpanded={false}>
      <div className="comparison-preview__stack">
        <ListSegment label="Changed Fields" rows={rows.filter((r) => r.changed)} />
        <ListSegment label="Unchanged Fields" rows={rows.filter((r) => !r.changed)} />
      </div>
    </ComparisonPreviewCard>
  )
}
