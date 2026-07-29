import { useState } from 'react'
import {
  DASH,
  GeneralInfoCard,
  PickupDeliveryCard,
  ProductInfoCard,
  SpecialServicesCard,
} from './OrderPaneSections'
import './order-summary.css'

// Shared Order Summary body (Figma 4317:20483) — the DSN/100 info band
// (Order Number · Order Date · Shipment Mode · Payment terms) plus the
// four-card SubAccordion stack. Two consumers:
//   • OrderSummaryRoute (/orders/:orderId) — summary by navigation, no alert
//   • create-flow ConfirmationView — same view with the success/info Alert
//     slotted into the band (mock "Confirmation Page - Long Creation -
//     Success Message" shows it above the KV strip, on the same column).
// `vm` is the mapFormVmToOrderPane shape; `alert` is an optional node.

const SECTIONS = ['general', 'pickup', 'product', 'services']

function KV({ label, value }) {
  return (
    <div className="order-summary__kv">
      <span className="order-summary__kv-label text-label-xs-regular">{label}</span>
      <span className="order-summary__kv-value">{value || DASH}</span>
    </div>
  )
}

export default function OrderSummaryView({ vm, alert = null }) {
  // All cards open by default — the mock renders the page fully expanded.
  const [open, setOpen] = useState(() => Object.fromEntries(SECTIONS.map((k) => [k, true])))
  const setSection = (key) => (next) => setOpen((o) => ({ ...o, [key]: next }))

  return (
    <>
      <div className="order-summary__band">
        {alert && <div className="order-summary__alert">{alert}</div>}
        <div className="order-summary__strip">
          <KV label="Order Number" value={vm.strip.orderNumber} />
          <KV label="Order Date" value={vm.strip.orderDate} />
          <KV label="Shipment Mode" value={vm.strip.shipmentMode} />
          {/* mock says "Payment terms" — title-cased to match sibling labels
              (copy convention: Efrain's layouts outrank, his English doesn't) */}
          <KV label="Payment Terms" value={vm.strip.paymentTerms} />
        </div>
      </div>

      <div className="order-summary__content">
        <div className="order-summary__col">
          <div className="order-pane">
            <GeneralInfoCard
              d={vm.d}
              references={vm.references}
              instructions={vm.instructions}
              expanded={open.general}
              onToggle={setSection('general')}
            />
            <PickupDeliveryCard
              d={vm.d}
              expanded={open.pickup}
              onToggle={setSection('pickup')}
            />
            <ProductInfoCard
              d={vm.d}
              productLines={vm.productLines}
              expanded={open.product}
              onToggle={setSection('product')}
            />
            <SpecialServicesCard
              services={vm.services}
              expanded={open.services}
              onToggle={setSection('services')}
            />
          </div>
        </div>
      </div>
    </>
  )
}
