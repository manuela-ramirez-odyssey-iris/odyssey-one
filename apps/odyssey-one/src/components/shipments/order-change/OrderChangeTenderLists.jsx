import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Badge, Button, GroupTable, HeaderStrip } from '@odyssey/ui'
import DroppedCarriersModal from './DroppedCarriersModal.jsx'
import ComparisonPreviewCard from './ComparisonPreviewCard.jsx'
import { DiffValue, KVField, rowsToFlatGroups, val } from './comparisonHelpers.jsx'

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
 * scac+equipment is NOT a unique key across a whole list — the same carrier
 * can legitimately appear twice at different ranks — so it is used only to
 * build a per-key QUEUE of new-list candidates, never as the map's own
 * identity. Each prior row shifts the next unconsumed candidate off its
 * queue (pairing duplicates in list order) and the verdict is keyed by the
 * ROW OBJECTS themselves (both p and its matched n), which are always
 * distinct references even when their scac+equipment collide — so two
 * "ODFL/Van" rows at different ranks get independent verdicts instead of
 * silently overwriting one shared map entry (found in review: a
 * string-keyed map collapsed them, and the unchanged duplicate rendered a
 * false-positive "changed" badge).
 *
 * ONE map drives both the tag list (computeTenderDiffs, below) and every
 * cell's own highlight decision, so they can never disagree about what
 * changed.
 */
function buildChangeMap(priorList, newList) {
  const newQueues = new Map()
  for (const n of newList) {
    const k = matchKey(n)
    if (!newQueues.has(k)) newQueues.set(k, [])
    newQueues.get(k).push(n)
  }
  const map = new Map()
  for (const p of priorList) {
    const queue = newQueues.get(matchKey(p))
    const n = queue && queue.length ? queue.shift() : null
    if (!n) continue
    const changed = {
      rank: p.rank !== n.rank,
      routeRank: p.routeRank !== n.routeRank,
      cost: p.cost !== n.cost,
    }
    map.set(p, changed)
    map.set(n, changed)
  }
  return map
}

const NO_CHANGE = { rank: false, routeRank: false, cost: false }
const changedFieldsFor = (row, changeMap) => changeMap.get(row) || NO_CHANGE

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

function kvValue(carrier, key, changed) {
  if (key === 'rank') return <DiffValue value={carrier.rank} changed={changed.rank} asBadge />
  if (key === 'routeRank') return <DiffValue value={carrier.routeRank} changed={changed.routeRank} />
  if (key === 'cost') return <DiffValue value={carrier.cost} changed={changed.cost} />
  return val(carrier[key])
}

/**
 * List mode's ONE table per side: every carrier is its own FLAT row (S134 —
 * GroupTable's `flat` mode, one plain white row per group via `values`,
 * replacing the old `expandable: false` band whose child rows tinted like
 * striped bands). The list's NAME moves to the `header={{ title }}` strip —
 * flat mode has no group-header row of its own to carry it.
 */
function ListModeTable({ label, rows, columns, changeMap, trail }) {
  const groups = rowsToFlatGroups(rows, columns, (row, col) => renderListCell(row, col, changeMap))
  return <GroupTable header={{ title: label, trail }} columns={columns} groups={groups} flat />
}

/**
 * Table mode's side (S134, Figma 1931-7398): a HeaderStrip band ("Prior
 * Tender List"/"New Tender List") composed DIRECTLY — not GroupTable's
 * `header` prop — because the mock's header is ONE row of two half-width
 * cells sitting ABOVE BOTH sides (see OrderChangeTenderLists' own
 * `comparison-preview__grid`, order-change.css), not a band nested inside
 * each side's own table. Below it, one plain entry block PER CARRIER — no
 * bold carrier-name header (measured: the mock shows no such label, Carrier
 * Name is just one of the nine KV fields) — each a 2-column KV grid via
 * `KVField` (comparisonHelpers.jsx), NOT a GroupTable row: the mock's fields
 * are two-per-row with label ABOVE value, a shape GroupTable's rows flavor
 * (one field per <tr>, unconditional hairline under every row) can't express
 * without either losing the pairing or adding a hairline between every
 * field instead of only between carriers.
 */
function TableModeSide({ title, carriers, changeMap, fields, trail }) {
  return (
    <div className="comparison-preview__panel">
      <HeaderStrip title={title} trail={trail} />
      {carriers.map((c, i) => {
        const changed = changedFieldsFor(c, changeMap)
        return (
          <div key={`${c.scac}-${c.equipment}-${i}`} className="comparison-preview__entry">
            <div className="comparison-preview__kv-grid">
              {fields.map(({ key, label }) => (
                <KVField key={key} label={label}>
                  {kvValue(c, key, changed)}
                </KVField>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Header-strip signal for dropped carriers (S135, designer — replaces both
 * earlier treatments, the quiet note and the standalone accordion): when this
 * version's routing dropped carriers, the New Tender List's header strip
 * carries an amber warning badge RIGHT NEXT TO the title (designer, S135) and
 * a trailing secondary button that opens them in a modal. New-version drops only — the prior
 * version's are history, present on ~90% of seeded rows, and would put a
 * warning badge on nearly every shipment.
 */
function NewListTitle({ dropped }) {
  return (
    <span className="comparison-preview__dropped-title">
      New Tender List
      {dropped.length > 0 && (
        <Badge variant="amber" leftIcon={<TriangleAlert size={12} aria-hidden="true" />}>
          Dropped from this version
        </Badge>
      )}
    </span>
  )
}

export default function OrderChangeTenderLists({ oc }) {
  const priorList = oc?.priorTenderList ?? []
  const newList = oc?.newTenderList ?? []
  const newDropped = oc?.droppedCarriers?.new ?? []
  const changeMap = buildChangeMap(priorList, newList)
  const tags = computeTenderDiffs(priorList, newList)
  const [droppedOpen, setDroppedOpen] = useState(false)
  const newListTitle = <NewListTitle dropped={newDropped} />
  const droppedTrail = newDropped.length ? (
    <Button variant="secondary" size="sm" onClick={() => setDroppedOpen(true)}>Preview Dropped Carriers</Button>
  ) : null

  return (
    <>
      <ComparisonPreviewCard title="Preview Tender List" differences={tags}>
        {(mode, filter) => {
          const keys = visibleKeys(filter)
          if (mode === 'list') {
            const columns = keys ? LIST_COLUMNS.filter((c) => keys.has(c.key)) : LIST_COLUMNS
            return (
              <div className="comparison-preview__stack">
                <ListModeTable label="Prior Tender List" rows={priorList} columns={columns} changeMap={changeMap} />
                <ListModeTable label={newListTitle} rows={newList} columns={columns} changeMap={changeMap} trail={droppedTrail} />
              </div>
            )
          }
          const fields = keys ? KV_FIELDS.filter((f) => keys.has(f.key)) : KV_FIELDS
          return (
            <div className="comparison-preview__grid">
              <TableModeSide title="Prior Tender List" carriers={priorList} changeMap={changeMap} fields={fields} />
              <TableModeSide title={newListTitle} carriers={newList} changeMap={changeMap} fields={fields} trail={droppedTrail} />
            </div>
          )
        }}
      </ComparisonPreviewCard>
      {droppedOpen && <DroppedCarriersModal dropped={newDropped} onClose={() => setDroppedOpen(false)} />}
    </>
  )
}
