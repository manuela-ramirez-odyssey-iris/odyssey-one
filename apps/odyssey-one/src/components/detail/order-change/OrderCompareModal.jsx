import { createPortal } from 'react-dom'
import { Button, HeaderStrip, ModalMedium } from '@odyssey/ui'
import OrderChangeTenderDetails from '../../shipments/order-change/OrderChangeTenderDetails.jsx'
import '../../shipments/order-change/order-change.css'

// LINX-15437 — "comparison view shall display Prior and New values side-by-
// side (refer LINX-14512)". VD 2107-12719 is the Direct review's Preview
// Tender Details section (Changed / Unchanged bands, purple diffs), fed
// THIS order's rows instead of the shipment's — reused via `bare` so the
// bands sit directly under this modal's own HeaderStrip with no nested card
// title/collapse (VD: no card chrome inside the modal). The VD's title reads
// "Planning Dates" (copy leftover from the sibling modal); "Order Changes"
// until the designer confirms (OC-open-9 / Q6).
export default function OrderCompareModal({ orderId, rows = [], onClose }) {
  // Portalled to document.body — the bottom bar's own box clips this modal
  // when the bar is partially open (user, 2026-09-09).
  return createPortal(
    <ModalMedium
      title="Order Changes"
      ariaLabel="Order Changes"
      onClose={onClose}
      scrollableContent
      footer={<Button variant="secondary" onClick={onClose}>Go Back</Button>}
    >
      <HeaderStrip title={`Order Number: ${orderId}`} />
      {/* ponytail: per-order hazmat lines are not seeded (orderComparisons
          carries tender rows only — generate.mjs buildConsolidationChange);
          the VD's Boiling Point / Flash Point rows stay unreachable until the
          seed grows a per-order hazmat pair. Logged as OC-open-12. */}
      <OrderChangeTenderDetails oc={{ comparison: rows, hazmat: [] }} bare />
    </ModalMedium>,
    document.body,
  )
}
