import { createPortal } from 'react-dom'
import { Badge, Button, GroupTable, ModalMedium } from '@odyssey/ui'
import { TriangleAlert } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { rowsToFlatGroups, val } from '../../shipments/order-change/comparisonHelpers.jsx'

// LINX-15435 "Planning information shall be displayed for all orders in the
// shipment (data will be from order)" — VD 2102-10502. Planning Type is the
// ORDER's own RDD/SSD (OrderDetailVM.planningType — not the shipment-level
// roll-up); the four bounds are the earliest/latest pickup/delivery already
// mapped for the Orders tab, so this modal and that tab can't disagree.
// First column = Order number (the VD shows a 01/02 row index; user ruling
// 2026-09-08: rows are orders, not product lines).
const COLUMNS = [
  { key: 'order', label: 'Order' },
  { key: 'planningType', label: 'Planning Type' },
  { key: 'earliestShip', label: 'Earliest Ship' },
  { key: 'latestShip', label: 'Latest Ship' },
  { key: 'earliestDelivery', label: 'Earliest Delivery' },
  { key: 'latestDelivery', label: 'Latest Delivery' },
]

// DEC-199: the bound a stop date misses is badged (never edited — the
// order's window is the customer's reference).
const MISSED = { 'pickup:early': 'earliestShip', 'pickup:late': 'latestShip', 'delivery:early': 'earliestDelivery', 'delivery:late': 'latestDelivery' }

export default function PlanningDatesModal({ orders = [], violations = [], onClose }) {
  const missed = new Set(violations.map((v) => `${v.orderId}:${MISSED[`${v.type}:${v.side}`]}`))
  const rows = orders.map((o) => ({
    order: o.orderNumber,
    planningType: o.planningType,
    earliestShip: o.earliestPickup,
    latestShip: o.latestPickup,
    earliestDelivery: o.earliestDelivery,
    latestDelivery: o.latestDelivery,
  }))
  // Portalled to document.body — the bottom bar's own box clips this modal
  // when the bar is partially open (user, 2026-09-09).
  return createPortal(
    <ModalMedium
      title="Planning Dates"
      ariaLabel="Planning Dates"
      onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>Go Back</Button>}
    >
      <GroupTable flat columns={COLUMNS} groups={rowsToFlatGroups(rows, COLUMNS, (r, c) => (missed.has(`${r.order}:${c.key}`)
        ? <Badge variant="amber" leftIcon={<TriangleAlert {...ICON_MD} aria-hidden="true" />}>{val(r[c.key])}</Badge>
        : val(r[c.key])))} />
    </ModalMedium>,
    document.body,
  )
}
