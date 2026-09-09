import { Button, GroupTable, ModalMedium } from '@odyssey/ui'
import { rowsToFlatGroups } from '../../shipments/order-change/comparisonHelpers.jsx'

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

export default function PlanningDatesModal({ orders = [], onClose }) {
  const rows = orders.map((o) => ({
    order: o.orderNumber,
    planningType: o.planningType ?? '--',
    earliestShip: o.earliestPickup,
    latestShip: o.latestPickup,
    earliestDelivery: o.earliestDelivery,
    latestDelivery: o.latestDelivery,
  }))
  return (
    <ModalMedium
      title="Planning Dates"
      ariaLabel="Planning Dates"
      onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>Go Back</Button>}
    >
      <GroupTable flat columns={COLUMNS} groups={rowsToFlatGroups(rows, COLUMNS, (r, c) => r[c.key] ?? '--')} />
    </ModalMedium>
  )
}
