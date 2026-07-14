import React, { useEffect, useState } from 'react'
import { ListChevronsUpDown, ListChevronsDownUp } from 'lucide-react'
import { Button, Tab } from '@odyssey/ui'
import PaneEmpty from './PaneEmpty'
import {
  DASH,
  GeneralInfoCard,
  PickupDeliveryCard,
  ProductInfoCard,
  SpecialServicesCard,
  parseLocation,
} from '../orders/summary/OrderPaneSections'

// Orders tab pane — mirrors Order Creation (Figma wireframe 1210:36974,
// vault/00-inbox/OrdersTab.png): order-number Tabs + Expand/Collapse All over
// four SubAccordion cards (General Information, Pickup and Delivery, Product
// Information 🚧, Special Services). Replaced the old 4-column grid (S79).
// Section internals restyled to the 2026-07 mocks (Figma 4292:17658 General,
// 4292:17716 Pickup/Delivery, 4292:17948 Special Services): TitleSubtitle
// fields, ruled sub-blocks, static party headers.
// S82: the four cards extracted VERBATIM to orders/summary/OrderPaneSections
// (shared with the Order Summary page, Figma 4317:20483) — DOM unchanged.

const SECTIONS = ['general', 'pickup', 'product', 'services']

const OrderTab = React.memo(function OrderTab({
  data,
  orders = [],
  selectedOrderIndex = 0,
  onSelectOrder,
  instructions = [],
  productLines = [],
  // When true (customer-identity cell click), force General Information open
  // regardless of the user's last collapsed state (S82 cell-tab mapping).
  expandGeneral = false,
}) {
  // All four cards open by default (the wireframe renders the pane expanded).
  const [open, setOpen] = useState(() => Object.fromEntries(SECTIONS.map((k) => [k, true])))

  useEffect(() => {
    if (expandGeneral) setOpen((o) => ({ ...o, general: true }))
  }, [expandGeneral])
  const allOpen = SECTIONS.every((k) => open[k])
  const setSection = (key) => (next) => setOpen((o) => ({ ...o, [key]: next }))
  const toggleAll = () => setOpen(Object.fromEntries(SECTIONS.map((k) => [k, !allOpen])))

  if (!data) return <PaneEmpty message="No order data available." col="medium" />

  const d = data

  // Wireframe References table ← the order's reference fields; only populated
  // rows render (all-dash reference lists collapse to a single placeholder row).
  const references = [
    ['Sales Order Number', d.salesOrder],
    ['Delivery Number', d.deliveryNumber],
    ['PO Number', d.poNumber],
    ['Pro/Booking Number', d.proBooking],
    ['Pickup Number', d.pickupNumber],
    ['Confirmation Number', d.confirmationNumber],
  ].filter(([, v]) => v && v !== DASH)

  // specialServices is an array of {code, desc} objects from the mapper.
  const services = Array.isArray(d.specialServices) ? d.specialServices : []

  // Info band text — "Origin City, ST → Dest City, ST - WEIGHT" per the mock.
  const from = parseLocation(d.shipFrom?.location)
  const to = parseLocation(d.shipTo?.location)
  const origin = from.city && from.region ? `${from.city}, ${from.region}` : DASH
  const dest = to.city && to.region ? `${to.city}, ${to.region}` : DASH
  const routeText = `${origin} → ${dest}${d.grossWeight ? ` - ${d.grossWeight}` : ''}`

  return (
    <div className="pane-canvas">
      {/* Full-width bands (Figma 4270:15081) — order tabs over a white fade,
          then the route/weight + Expand All row. Content aligns to the medium
          column via __band-inner; the bands' rules span the whole bar. */}
      {orders.length > 0 && (
        <div className="pane-tabs-band">
          {/* Tab exposes aria-pressed (filter-tab convention) — no tablist role,
              matching the other .tab-group rows in the app */}
          <div className="order-pane__band-inner tab-group" aria-label="Orders on this shipment">
            {orders.map((ord, i) => (
              <Tab
                key={ord}
                label={ord}
                current={i === selectedOrderIndex}
                onClick={() => onSelectOrder?.(i)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="order-pane__info-band">
        <div className="order-pane__band-inner order-pane__info-row">
          <span className="order-pane__info-title">{routeText}</span>
          <Button variant="link" iconRight={allOpen ? <ListChevronsDownUp size={16} /> : <ListChevronsUpDown size={16} />} onClick={toggleAll}>
            {allOpen ? 'Collapse All' : 'Expand All'}
          </Button>
        </div>
      </div>

    <div className="pane-col pane-col--medium">
    <div className="order-pane">
      <GeneralInfoCard
        d={d}
        references={references}
        instructions={instructions}
        expanded={open.general}
        onToggle={setSection('general')}
      />

      <PickupDeliveryCard
        d={d}
        expanded={open.pickup}
        onToggle={setSection('pickup')}
      />

      <ProductInfoCard
        d={d}
        productLines={productLines}
        expanded={open.product}
        onToggle={setSection('product')}
      />

      <SpecialServicesCard
        services={services}
        expanded={open.services}
        onToggle={setSection('services')}
      />
    </div>
    </div>
    </div>
  )
})
export default OrderTab
