import { Badge, Button, GroupTable, ModalMedium } from '@odyssey/ui'
import { DiffValue, rowsToFlatGroups } from '../../shipments/order-change/comparisonHelpers.jsx'

// LINX-15438 View Routing — VD 2108-14708. New above Prior (canon §7, same
// ordering as the Direct review's OrderChangeTenderLists), the Tender tab's
// 8 columns, AP Cost badged purple when it differs from the same carrier's
// prior row. The AC also lists Dropped Carriers — the VD omits them; a third
// table renders the new version's drops (DroppedCarriersModal is the closest
// existing precedent for that column set, reduced to what the AC asks for
// here: SCAC / Carrier Name / Reason). The three costs the AC lists already
// sit in the Stops-tab card head and are not repeated here.
const COLS = [
  { key: 'routeRank', label: 'Route Rank' },
  { key: 'rank', label: 'Rank' },
  { key: 'scac', label: 'SCAC' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'cost', label: 'AP Cost' },
  { key: 'status', label: 'Tender Status' },
  { key: 'pickupDateTime', label: 'Pickup Date/Time' },
  { key: 'deliveryDateTime', label: 'Delivery Date/Time' },
]
// 'Carrier SCAC' (not bare 'SCAC') so this header text doesn't collide with
// the tender tables' own SCAC column when both render on the same page —
// same value, distinguishable label.
const DROP_COLS = [
  { key: 'scac', label: 'Carrier SCAC' },
  { key: 'carrierName', label: 'Carrier Name' },
  { key: 'reason', label: 'Reason' },
]
// ponytail: only the two statuses the VD calls out are speced (Sent=blue,
// Cancelled=gray); extend this map if a real status needs its own color.
const STATUS_VARIANT = { Sent: 'blue', Cancelled: 'gray' }

function TenderTable({ title, rows, priorCostByScac }) {
  const cell = (r, c) => {
    if (c.key === 'cost') {
      const changed = !!priorCostByScac && r.scac in priorCostByScac && priorCostByScac[r.scac] !== r.cost
      return <DiffValue value={r.cost} changed={changed} />
    }
    if (c.key === 'status') return r.status ? <Badge variant={STATUS_VARIANT[r.status] ?? 'gray'}>{r.status}</Badge> : ''
    return r[c.key] ?? '--'
  }
  return <GroupTable flat header={{ title }} columns={COLS} groups={rowsToFlatGroups(rows, COLS, cell)} />
}

export default function ViewRoutingModal({ orderChange: oc, onClose }) {
  const priorList = oc?.priorTenderList ?? []
  const newList = oc?.newTenderList ?? []
  const dropped = oc?.droppedCarriers?.new ?? []
  const priorCostByScac = Object.fromEntries(priorList.map((o) => [o.scac, o.cost]))

  return (
    <ModalMedium
      title="View Routing"
      ariaLabel="View Routing"
      onClose={onClose}
      scrollableContent
      className="view-routing-modal"
      footer={<Button variant="secondary" onClick={onClose}>Go Back</Button>}
    >
      <TenderTable title="New" rows={newList} priorCostByScac={priorCostByScac} />
      <TenderTable title="Prior" rows={priorList} />
      <GroupTable
        flat
        header={{ title: 'Dropped Carriers' }}
        columns={DROP_COLS}
        groups={rowsToFlatGroups(dropped, DROP_COLS, (r, c) => r[c.key] ?? '--')}
      />
    </ModalMedium>
  )
}
