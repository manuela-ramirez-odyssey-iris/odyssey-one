import { GroupTable } from '@odyssey/ui'
import ComparisonPreviewCard from './ComparisonPreviewCard.jsx'
import { DiffValue, KV_COLUMNS, val } from './comparisonHelpers.jsx'

// "Preview Tender List" (LINX-14510/14511, Figma 1794-5544). Fields, in the
// AC's own order, for List mode's columnar table (one row per carrier).
const LIST_COLUMNS = [
  { key: 'rank', label: 'Rank', align: 'center' },
  { key: 'routeRank', label: 'Route Rank', align: 'center' },
  { key: 'scac', label: 'SCAC' },
  { key: 'carrierName', label: 'Carrier Name' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'cost', label: 'AP Cost', align: 'right' },
  { key: 'status', label: 'Tender Status' },
  { key: 'pickupDateTime', label: 'Pickup Date/Time' },
  { key: 'deliveryDateTime', label: 'Delivery Date/Time' },
]

// Table mode's key/value block order — the mock's OWN order for a carrier
// card, which reshuffles List mode's order (Carrier Name/SCAC lead, Route
// Rank moves after them, Tender Status moves to the end) rather than reusing
// LIST_COLUMNS verbatim.
const KV_FIELDS = [
  { key: 'rank', label: 'Rank' },
  { key: 'carrierName', label: 'Carrier Name' },
  { key: 'scac', label: 'SCAC' },
  { key: 'routeRank', label: 'Route Rank' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'cost', label: 'AP Cost' },
  { key: 'pickupDateTime', label: 'Pickup Date/Time' },
  { key: 'deliveryDateTime', label: 'Delivery Date/Time' },
  { key: 'status', label: 'Tender Status' },
]

const matchKey = (o) => `${o.scac}|${o.equipment}`

/**
 * Matches oc.priorTenderList/newTenderList rows by scac+equipment — identity
 * is NOT array position, since re-routing can and does re-order (LINX-14511
 * "Rank Order Change" is exactly a carrier's rank moving) — and returns, per
 * matched pair, which of the two watched facts changed: rank/routeRank, and
 * cost. A carrier present on only one side (LINX-14511 "not-returned": prior
 * carrier absent from the new list) has nothing to diff against and is
 * skipped — it isn't itself a "change", the option is just gone.
 *
 * ONE map drives both the tag list (computeTenderDiffs, below) and every
 * cell's own highlight decision, so they can never disagree about what
 * changed.
 */
function buildChangeMap(priorList, newList) {
  const newByKey = new Map(newList.map((o) => [matchKey(o), o]))
  const map = new Map()
  for (const p of priorList) {
    const n = newByKey.get(matchKey(p))
    if (!n) continue
    map.set(matchKey(p), {
      rank: p.rank !== n.rank,
      routeRank: p.routeRank !== n.routeRank,
      cost: p.cost !== n.cost,
    })
  }
  return map
}

const NO_CHANGE = { rank: false, routeRank: false, cost: false }
const changedFieldsFor = (row, changeMap) => changeMap.get(matchKey(row)) || NO_CHANGE

/**
 * The unique set of "Differences" badges this shipment's re-route produced:
 * 'Rank Order Change' when a matched carrier's rank OR route rank moved,
 * 'AP Cost' when its cost moved. Exported so the tag logic is unit-testable
 * without mounting the component.
 */
export function computeTenderDiffs(priorList = [], newList = []) {
  const changeMap = buildChangeMap(priorList, newList)
  const tags = new Set()
  for (const c of changeMap.values()) {
    if (c.rank || c.routeRank) tags.add('Rank Order Change')
    if (c.cost) tags.add('AP Cost')
  }
  return [...tags]
}

// Which fields each difference badge concerns — drives the "click a badge to
// filter" narrowing below. SCAC/Carrier Name/Equipment are identity, always
// shown regardless of filter (without them a filtered row/block can't be
// told apart from its neighbors).
const IDENTITY_FIELDS = ['scac', 'carrierName', 'equipment']
const TAG_FIELDS = {
  'Rank Order Change': ['rank', 'routeRank'],
  'AP Cost': ['cost'],
}

// FILTERING RULE (mock doesn't specify one — this is a decision, not an
// accident): a filter narrows the FIELD dimension only — the columns shown
// in List mode, the KV rows shown per carrier in Table mode — to identity +
// the fields the active tag concerns. It never drops a carrier/row: the
// badges are facts about the shipment's changed fields, not about which
// carriers are interesting, so every carrier stays visible, just narrower.
function visibleKeys(filter) {
  if (!filter) return null
  return new Set([...IDENTITY_FIELDS, ...(TAG_FIELDS[filter] || [])])
}

function renderListCell(row, col, changeMap) {
  const changed = changedFieldsFor(row, changeMap)
  if (col.key === 'rank') return <DiffValue value={row.rank} changed={changed.rank} />
  if (col.key === 'routeRank') return <DiffValue value={row.routeRank} changed={changed.routeRank} />
  if (col.key === 'cost') return <DiffValue value={row.cost} changed={changed.cost} />
  return val(row[col.key])
}

function kvRowsFor(carrier, changeMap, fields) {
  const changed = changedFieldsFor(carrier, changeMap)
  return fields.map(({ key, label }) => {
    let value
    if (key === 'rank') value = <DiffValue value={carrier.rank} changed={changed.rank} asBadge />
    else if (key === 'routeRank') value = <DiffValue value={carrier.routeRank} changed={changed.routeRank} />
    else if (key === 'cost') value = <DiffValue value={carrier.cost} changed={changed.cost} />
    else value = val(carrier[key])
    return { label, value }
  })
}

/**
 * List mode's ONE static band per side. `expandable: false` + a body renders
 * the band unconditionally with no chevron (GroupTable 0.16.0, D7 2026-08-30
 * — added for exactly this: its own docblock cites "Prior Tender List" as
 * the worked example). The band's LABEL carries the list's name; there is no
 * separate `header` strip here, unlike Table mode below, because one static
 * group already says everything a header strip would.
 */
function ListModeTable({ label, rows, columns, changeMap }) {
  return (
    <GroupTable
      columns={columns}
      groups={[{ id: label, label, rows, expandable: false }]}
      renderCell={(row, col) => renderListCell(row, col, changeMap)}
    />
  )
}

/**
 * Table mode's side: one `expandable: false` KV group PER CARRIER (no single
 * group can carry the list's own name here, since there are N of them) — so
 * the list's name goes through GroupTable's `header` strip instead, the
 * mechanism this mode actually needs it for.
 */
function TableModeSide({ title, carriers, changeMap, fields }) {
  const groups = carriers.map((c, i) => ({
    id: `${c.scac}-${c.equipment}-${i}`,
    label: c.carrierName || c.scac,
    expandable: false,
    rows: kvRowsFor(c, changeMap, fields),
  }))
  return <GroupTable header={{ title }} columns={KV_COLUMNS} groups={groups} />
}

export default function OrderChangeTenderLists({ oc }) {
  const priorList = oc?.priorTenderList ?? []
  const newList = oc?.newTenderList ?? []
  const changeMap = buildChangeMap(priorList, newList)
  const tags = computeTenderDiffs(priorList, newList)

  return (
    <ComparisonPreviewCard title="Preview Tender List" differences={tags}>
      {(mode, filter) => {
        const keys = visibleKeys(filter)
        if (mode === 'list') {
          const columns = keys ? LIST_COLUMNS.filter((c) => keys.has(c.key)) : LIST_COLUMNS
          return (
            <div className="comparison-preview__stack">
              <ListModeTable label="Prior Tender List" rows={priorList} columns={columns} changeMap={changeMap} />
              <ListModeTable label="New Tender List" rows={newList} columns={columns} changeMap={changeMap} />
            </div>
          )
        }
        const fields = keys ? KV_FIELDS.filter((f) => keys.has(f.key)) : KV_FIELDS
        return (
          <div className="comparison-preview__grid">
            <TableModeSide title="Prior Tender List" carriers={priorList} changeMap={changeMap} fields={fields} />
            <TableModeSide title="New Tender List" carriers={newList} changeMap={changeMap} fields={fields} />
          </div>
        )
      }}
    </ComparisonPreviewCard>
  )
}
