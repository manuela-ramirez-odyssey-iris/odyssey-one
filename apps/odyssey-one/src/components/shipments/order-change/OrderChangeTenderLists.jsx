import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Badge, Button, GroupTable } from '@odyssey/ui'
import DroppedCarriersModal from './DroppedCarriersModal.jsx'
import ComparisonPreviewCard from './ComparisonPreviewCard.jsx'
import { DiffValue, rowsToFlatGroups, val } from './comparisonHelpers.jsx'
import { fmtDollar, parseDollar } from '../../../utils/money'

// "Preview Tender List" (LINX-14510/14511, Figma 1794-5544). Fields, in the
// AC's own order, for the columnar table (one row per carrier).
//
// S137 (Jana/designer): this section is now list form ONLY — the Table/KV
// layout, its own field order, and the mode toggle are gone, along with the
// "Differences:" filter chips (ComparisonPreviewCard dropped its sub-header
// row entirely; see that file's own docblock). Every column always shows.
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
 * without mounting the component. Still feeds ComparisonPreviewCard's
 * `differences` prop, which rides the title as a purple "(N)" (S135) — the
 * one thing S137 kept from the removed sub-header row.
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

/**
 * S137 (designer/user, 2026-09-02) — "new Cost selected will update the base
 * cost": the New Tender List's AP Cost cell for the PRIOR carrier's row shows
 * what that carrier will actually be tendered at once Select Cost
 * (OrderChangeActionsCard) has picked a base rate.
 *
 * UNIT MISMATCH, verified against tools/generate.mjs (do not skip this when
 * touching either number again): `oc.prior.apCost`/`newOption.apCost` — what
 * Select Cost's radios show and what `selectedCost.amount` carries — are
 * `rateDetails.baseRate` (generate.mjs:2490/2498). This column's `cost`
 * field is `totalCostAmount`, i.e. `baseRate + sum(additionalCharges)`
 * (generate.mjs:977, mapped `${fmtDollar(totalCostAmount)} USD` at
 * mapSellShipmentOutToDetail.ts:345/mapRoutingOption). Those are different
 * figures for the same carrier — echoing the selected BASE rate straight
 * into an AP-TOTAL column would understate the row (and read as "the cost
 * dropped" when nothing did) whenever that carrier carries any additional
 * charges. `apTotalFor` below re-derives the total the same way the seed
 * does, from the row's OWN `rateDetails.additionalCharges` (survives
 * mapRoutingOption), so the override lands in the column's actual unit.
 *
 * Returns a Map from the matched row's own reference (so renderListCell can
 * key off object identity, same idiom buildChangeMap already uses) to the
 * formatted display string and whether the recomputed total differs from
 * that row's own routed cost — NOT from the prior list's cost, which is a
 * different comparison (buildChangeMap's, feeding the Differences count)
 * that this override doesn't touch.
 *
 * No-op (returns null) when the prior carrier isn't in the new list at all
 * — the `not-returned` scenario, where the prior carrier was dropped by
 * re-routing. There's no row to update, and inventing one isn't this
 * function's job.
 */
function apTotalFor(row, baseAmount) {
  const chargeTotal = (row.rateDetails?.additionalCharges ?? []).reduce((s, c) => s + (c.amount ?? 0), 0)
  return Math.round((baseAmount + chargeTotal) * 100) / 100
}

function buildCostOverride(newList, priorScac, selectedCost) {
  if (!priorScac || !selectedCost || selectedCost.amount == null) return null
  const row = newList.find((o) => o.scac === priorScac)
  if (!row) return null
  const recomputed = apTotalFor(row, selectedCost.amount)
  const changed = recomputed !== parseDollar(row.cost)
  return new Map([[row, { display: `${fmtDollar(recomputed)} USD`, changed }]])
}

function renderListCell(row, col, changeMap, costOverride) {
  if (col.key === 'cost' && costOverride?.has(row)) {
    const { display, changed } = costOverride.get(row)
    return <DiffValue value={display} changed={changed} />
  }
  const changed = changedFieldsFor(row, changeMap)
  if (col.key === 'rank') return <DiffValue value={row.rank} changed={changed.rank} />
  if (col.key === 'routeRank') return <DiffValue value={row.routeRank} changed={changed.routeRank} />
  if (col.key === 'cost') return <DiffValue value={row.cost} changed={changed.cost} />
  return val(row[col.key])
}

/**
 * List mode's ONE table per side: every carrier is its own FLAT row (S134 —
 * GroupTable's `flat` mode, one plain white row per group via `values`,
 * replacing the old `expandable: false` band whose child rows tinted like
 * striped bands). The list's NAME moves to the `header={{ title }}` strip —
 * flat mode has no group-header row of its own to carry it.
 */
function ListModeTable({ label, rows, changeMap, trail, costOverride }) {
  const groups = rowsToFlatGroups(rows, LIST_COLUMNS, (row, col) => renderListCell(row, col, changeMap, costOverride))
  return <GroupTable header={{ title: label, trail }} columns={LIST_COLUMNS} groups={groups} flat />
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

export default function OrderChangeTenderLists({ oc, selectedCost }) {
  const priorList = oc?.priorTenderList ?? []
  const newList = oc?.newTenderList ?? []
  const newDropped = oc?.droppedCarriers?.new ?? []
  const changeMap = buildChangeMap(priorList, newList)
  const tags = computeTenderDiffs(priorList, newList)
  const costOverride = buildCostOverride(newList, oc?.prior?.scac, selectedCost)
  const [droppedOpen, setDroppedOpen] = useState(false)
  const newListTitle = <NewListTitle dropped={newDropped} />
  const droppedTrail = newDropped.length ? (
    <Button variant="secondary" size="sm" onClick={() => setDroppedOpen(true)}>Preview Dropped Carriers</Button>
  ) : null

  return (
    <>
      <ComparisonPreviewCard title="Preview Tender List" differences={tags}>
        <div className="comparison-preview__stack">
          <ListModeTable label="Prior Tender List" rows={priorList} changeMap={changeMap} />
          <ListModeTable label={newListTitle} rows={newList} changeMap={changeMap} trail={droppedTrail} costOverride={costOverride} />
        </div>
      </ComparisonPreviewCard>
      {droppedOpen && <DroppedCarriersModal dropped={newDropped} onClose={() => setDroppedOpen(false)} />}
    </>
  )
}
