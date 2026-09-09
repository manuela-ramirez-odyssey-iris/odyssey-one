import { Button, HeaderStrip, ModalMedium } from '@odyssey/ui'
import OrderChangeTenderDetails from '../../shipments/order-change/OrderChangeTenderDetails.jsx'
import '../../shipments/order-change/order-change.css'

// LINX-15437 — "comparison view shall display Prior and New values side-by-
// side (refer LINX-14512)". VD 2107-12719 is the Direct review's Preview
// Tender Details section (Changed / Unchanged bands, purple diffs, hazmat
// merged), fed THIS order's rows instead of the shipment's — reused via
// `bare` so the bands sit directly under this modal's own HeaderStrip with
// no nested card title/collapse (VD: no card chrome inside the modal). The
// VD's title reads "Planning Dates" (copy leftover from the sibling modal);
// "Order Changes" until the designer confirms (OC-open-9 / Q6).
export default function OrderCompareModal({ orderId, rows = [], onClose }) {
  return (
    <ModalMedium
      title="Order Changes"
      ariaLabel="Order Changes"
      onClose={onClose}
      scrollableContent
      className="order-compare-modal"
      footer={<Button variant="secondary" onClick={onClose}>Go Back</Button>}
    >
      <HeaderStrip title={`Order Number: ${orderId}`} />
      <OrderChangeTenderDetails oc={{ comparison: rows, hazmat: [] }} bare />
    </ModalMedium>
  )
}
