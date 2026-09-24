import { createPortal } from 'react-dom'
import { Badge, Button, GroupTable, HeaderStrip, ModalMedium } from '@odyssey/ui'
import OrderChangeTenderDetails from '../../shipments/order-change/OrderChangeTenderDetails.jsx'
import { DiffValue, rowsToFlatGroups } from '../../shipments/order-change/comparisonHelpers.jsx'
import '../../shipments/order-change/order-change.css'

// LINX-15437 — "comparison view shall display Prior and New values side-by-
// side (refer LINX-14512)". VD 2107-12719 is the Direct review's Preview
// Tender Details section (Changed / Unchanged bands, purple diffs), fed
// THIS order's rows instead of the shipment's — reused via `bare` so the
// bands sit directly under this modal's own HeaderStrip with no nested card
// title/collapse (VD: no card chrome inside the modal). The VD's title reads
// "Planning Dates" (copy leftover from the sibling modal); "Order Changes"
// until the designer confirms (OC-open-9 / Q6).
//
// DEC-196 (Jana 2026-09-24): line-level fields render once per order line —
// "Line 001, Line 002…", each with its own changed marker. Lines come from
// the order's own record (productData); `linePairs` ({ prior, new } per
// line) overrides when the seed carries a line change (plan B3). Until then
// prior = new, which is the truth: no line change exists in the data.
const LINE_FIELDS = [
  { key: 'shipItem', label: 'Item Number' },
  { key: 'description', label: 'Item Description' },
  { key: 'hazmatUnNumber', label: 'Hazmat Code' },
  { key: 'hazmatClass', label: 'Hazmat Class' },
  { key: 'hazmatGroup', label: 'Hazmat Pkg Group' },
  { key: 'hazmatDescription', label: 'Hazmat Description' },
  { key: 'flashPoint', label: 'Flash Point' },
  { key: 'boilingPoint', label: 'Boiling Point' },
  { key: 'marinePollutant', label: 'Marine Pollutant' },
  { key: 'shippingClass', label: 'Shipping Class' },
  { key: 'tunnelCode', label: 'Tunnel Code' },
  { key: 'wgkClass', label: 'WGK Class' },
]
const LINE_COLS = [
  { key: 'field', label: 'Field', width: 200 },
  { key: 'prior', label: 'Prior', width: 300 },
  { key: 'new', label: 'New', width: 300 },
]

function LineBlock({ pair }) {
  const rows = LINE_FIELDS.map(({ key, label }) => ({
    field: label, prior: pair.prior?.[key], new: pair.new?.[key], changed: pair.prior?.[key] !== pair.new?.[key],
  }))
  const changed = rows.some((r) => r.changed)
  const line = pair.new?.lineNumber ?? pair.prior?.lineNumber ?? '--'
  return (
    <section aria-label={`Line ${line}`}>
      <HeaderStrip title={`Line ${line}`} badge={changed ? <Badge variant="purple">Changed</Badge> : null} />
      <GroupTable
        className="oc-tender-table"
        flat
        headerStyle="strip"
        columns={LINE_COLS}
        groups={rowsToFlatGroups(rows, LINE_COLS, (r, c) => (c.key === 'field' ? r.field : <DiffValue value={r[c.key]} changed={r.changed} />))}
      />
    </section>
  )
}

export default function OrderCompareModal({ orderId, rows = [], lines = [], linePairs, onClose }) {
  const pairs = linePairs ?? lines.map((l) => ({ prior: l, new: l }))
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
      <OrderChangeTenderDetails oc={{ comparison: rows, hazmat: [] }} bare />
      {pairs.map((p, i) => <LineBlock key={p.new?.lineNumber ?? i} pair={p} />)}
    </ModalMedium>,
    document.body,
  )
}
