// VD 2143-11775 ("Should Be In A ToolTip") through the canon Tooltip: header
// label + subtitle/content groups. `leg` = the stop's type when hovered on a
// stop row; undefined on a pending row (both dates). The VD's "Details" strip
// has no Tooltip counterpart and is dropped (DEC-142).
const val = (v) => (v == null || v === '' ? '--' : v)

export function orderTooltipProps(order, leg, fallbackId) {
  const label = `Order Number: ${order?.orderNumber ?? fallbackId ?? ''}`
  if (!order) return { label, groups: [] }
  const date = leg === 'pickup'
    ? { subtitle: 'Pickup Date Time', content: val(order.earliestPickup) }
    : leg === 'delivery'
      ? { subtitle: 'Delivery Date Time', content: val(order.earliestDelivery) }
      : { subtitle: 'Pickup / Delivery Date Time', content: `${val(order.earliestPickup)} / ${val(order.earliestDelivery)}` }
  return {
    label,
    groups: [
      { subtitle: 'Planning Type', content: val(order.planningType) },
      date,
      // Jana's deck (2026-08-12, slide 9) lists Gross weight in the tooltip; the VD dropped it. Domain content → kept.
      { subtitle: 'Gross Weight', content: val(order.grossWeight) },
      { subtitle: 'Volume', content: val(order.totalVolume) },
      { subtitle: 'Origin', content: val(order.shipFrom?.location) },
      { subtitle: 'Destination', content: val(order.shipTo?.location) },
    ],
  }
}
