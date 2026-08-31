import { GroupTable, HeaderStrip } from '@odyssey/ui'
import ComparisonPreviewCard from './ComparisonPreviewCard.jsx'
import { DiffValue, KVField, rowsToFlatGroups, val } from './comparisonHelpers.jsx'

// "Preview Hazardous Material Information" (LINX-14509…14515). oc.hazmat is
// an array of { prior, new } OrderChangeHazmatLineVM pairs (api/types/
// shipmentDetail.ts). `line` is identity — always shown, never itself a
// "difference" — the five remaining fields are what gets compared.
const HAZMAT_FIELDS = [
  { key: 'boilingPoint', label: 'Boiling Point' },
  { key: 'hazmatClass', label: 'Hazmat Class' },
  { key: 'hazmatDescription', label: 'Hazmat Description' },
  { key: 'itemDescription', label: 'Item Description' },
  { key: 'marinePollutant', label: 'Marine Pollutant' },
]
const LIST_COLUMNS = [{ key: 'line', label: 'Line' }, ...HAZMAT_FIELDS]

// Per-pair change map, one bool per HAZMAT_FIELDS entry — mirrors
// OrderChangeTenderLists' changedFieldsFor split so both sections read the
// same way. Today's seed always makes prior/new identical per pair
// (generate.mjs ~line 2413, "Differences (0)" in the mock); computed
// properly rather than hardcoded so a future seed change surfaces real
// diffs immediately.
function changedFieldsFor(pair) {
  const out = {}
  for (const { key } of HAZMAT_FIELDS) out[key] = pair.prior?.[key] !== pair.new?.[key]
  return out
}

/**
 * The unique set of fields that differ across ANY line — the 'Differences
 * (N)' badges. Exported for the same reason computeTenderDiffs is: testable
 * without mounting the component.
 */
export function computeHazmatDiffs(pairs = []) {
  const tags = new Set()
  for (const pair of pairs) {
    const changed = changedFieldsFor(pair)
    for (const { key, label } of HAZMAT_FIELDS) if (changed[key]) tags.add(label)
  }
  // Stable order (HAZMAT_FIELDS' own), not Set insertion order.
  return HAZMAT_FIELDS.filter((f) => tags.has(f.label)).map((f) => f.label)
}

// FILTERING RULE — same shape as OrderChangeTenderLists: a filter narrows
// the field/column dimension, never drops a line. `line` is identity, always
// shown.
function visibleColumns(filter) {
  if (!filter) return LIST_COLUMNS
  return LIST_COLUMNS.filter((c) => c.key === 'line' || c.label === filter)
}
function visibleFields(filter) {
  if (!filter) return HAZMAT_FIELDS
  return HAZMAT_FIELDS.filter((f) => f.label === filter)
}

function renderListCell(row, col) {
  if (col.key === 'line') return val(row.line)
  return <DiffValue value={row[col.key]} changed={row._changed[col.key]} />
}

/**
 * Table mode's side (S134, Figma 1931-9497): a HeaderStrip band ("Prior
 * Tender"/"New Tender") composed directly, then one entry block PER LINE —
 * a bold "Line {n}" label (measured: unlike Tender List, the mock DOES show
 * this per-entity header) above a 3-COLUMN KV grid of the five hazmat
 * fields. Not a GroupTable row for the same reason as OrderChangeTenderLists'
 * TableModeSide: the fields are three-per-row with label above value, which
 * GroupTable's rows flavor can't express without an unwanted hairline
 * between every field.
 */
function TableModeSide({ title, pairs, side, fields }) {
  return (
    <div className="comparison-preview__panel">
      <HeaderStrip title={title} />
      {pairs.map((p, i) => {
        const changed = changedFieldsFor(p)
        const line = p[side]
        return (
          <div key={`${line.line}-${i}`} className="comparison-preview__entry">
            <div className="text-label-base-semibold comparison-preview__entry-label">Line {line.line}</div>
            <div className="comparison-preview__kv-grid comparison-preview__kv-grid--3col">
              {fields.map(({ key, label }) => (
                <KVField key={key} label={label}>
                  <DiffValue value={line[key]} changed={changed[key]} />
                </KVField>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function OrderChangeHazmat({ oc }) {
  const pairs = oc?.hazmat ?? []
  const tags = computeHazmatDiffs(pairs)

  return (
    <ComparisonPreviewCard title="Preview Hazardous Material Information" differences={tags}>
      {(mode, filter) => {
        if (mode === 'list') {
          const columns = visibleColumns(filter)
          const priorRows = pairs.map((p) => ({ ...p.prior, _changed: changedFieldsFor(p) }))
          const newRows = pairs.map((p) => ({ ...p.new, _changed: changedFieldsFor(p) }))
          // S134: each hazmat line is its own FLAT row (GroupTable `flat`),
          // the list's name moved to the `header={{ title }}` strip — same
          // conversion as OrderChangeTenderLists' ListModeTable.
          return (
            <div className="comparison-preview__stack">
              <GroupTable
                header={{ title: 'Prior Tender List' }}
                columns={columns}
                groups={rowsToFlatGroups(priorRows, columns, renderListCell)}
                flat
              />
              <GroupTable
                header={{ title: 'New Tender List' }}
                columns={columns}
                groups={rowsToFlatGroups(newRows, columns, renderListCell)}
                flat
              />
            </div>
          )
        }
        const fields = visibleFields(filter)
        return (
          <div className="comparison-preview__grid">
            <TableModeSide title="Prior Tender" pairs={pairs} side="prior" fields={fields} />
            <TableModeSide title="New Tender" pairs={pairs} side="new" fields={fields} />
          </div>
        )
      }}
    </ComparisonPreviewCard>
  )
}
