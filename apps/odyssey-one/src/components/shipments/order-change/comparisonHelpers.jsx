import { Badge } from '@odyssey/ui'

// Shared by all three "Additional Changes Preview" sections (Task 10a/10b,
// LINX-14509…14515) — extracted out of OrderChangeTenderLists.jsx once a
// second and third section needed the same null-normalizer, changed-value
// Badge wrapper, and unlabeled KV column pair, so the three don't drift.

// A value that differs between prior and new renders inside a purple Badge;
// unchanged values render as plain text. `asBadge` additionally forces a
// (gray, unless changed) Badge even when unchanged — used for Rank in
// OrderChangeTenderLists' Table mode, where the mock shows Rank as a badge
// unconditionally.
export const val = (v) => (v === null || v === undefined || v === '' ? '--' : v)

export function DiffValue({ value, changed, asBadge = false }) {
  const display = val(value)
  if (changed) return <Badge variant="purple">{display}</Badge>
  return asBadge ? <Badge variant="gray">{display}</Badge> : <span>{display}</span>
}

// Table mode's entry KV grid (S134, Figma 1931-7398/8797/9497): a plain
// "Term over Text" cell — label small/gray above, value medium/dark below —
// laid out N-per-row by the CSS grid the caller wraps these in
// (`.comparison-preview__kv-grid[--3col]`). This is NOT a GroupTable row:
// the mock's entry blocks are two/three fields wide per row with no table
// semantics, a shape GroupTable's rows flavor (one field per <tr>) can't
// express without either losing the pairing or forcing an unwanted hairline
// between every field (GroupTable child rows always carry their own
// border-bottom — see GroupTable.jsx `.odyssey-group-table__row td`). Same
// "Term"/"Text" idiom OrderChangeActionsCard's ComparisonField already uses
// for its own Prior|New panel, kept as a separate component (not imported
// from that file) so the two preview surfaces don't reach into each other's
// internals — this one owns its own `comparison-preview__field*` classes.
export function KVField({ label, children }) {
  return (
    <div className="comparison-preview__field">
      <div className="text-label-sm-regular comparison-preview__field-label">{label}</div>
      <div className="text-label-sm-medium comparison-preview__field-value">{children}</div>
    </div>
  )
}

/**
 * Turns a flat array of data rows into GroupTable `flat`-mode groups: one
 * group PER ROW, each carrying `values` pre-rendered by `cellFn(row, col)`
 * for every column (flat mode reads `group.values`, not `renderCell` — see
 * GroupTable's `flat` docblock). Used by the three preview sections wherever
 * a former "one static band + N child rows" shape converts to flat rows
 * under a `header={{ title }}` strip (S134) — the list/band NAME moves to
 * the strip, so nothing here needs a `group.label` fallback.
 *
 * @param {object[]} rows
 * @param {Array<{key:string}>} columns
 * @param {(row:object, col:object) => *} cellFn
 * @returns {Array<{id:number, values:object}>}
 */
export function rowsToFlatGroups(rows, columns, cellFn) {
  return rows.map((row, i) => ({
    id: i,
    values: Object.fromEntries(columns.map((col) => [col.key, cellFn(row, col)])),
  }))
}
