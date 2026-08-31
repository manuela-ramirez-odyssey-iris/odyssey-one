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

// Table mode's key/value column pair. No header text — GroupTable renders
// whatever `col.label` says, and a KV block's own rows already carry the
// field name in the `label` column.
export const KV_COLUMNS = [{ key: 'label', width: 180 }, { key: 'value' }]
