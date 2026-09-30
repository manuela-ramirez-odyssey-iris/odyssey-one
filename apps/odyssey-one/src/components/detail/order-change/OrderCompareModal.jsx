import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, GroupTable, ModalMedium, Tab } from '@odyssey/ui'
import OrderChangeTenderDetails from '../../shipments/order-change/OrderChangeTenderDetails.jsx'
import { DiffValue, rowsToFlatGroups } from '../../shipments/order-change/comparisonHelpers.jsx'
import '../../shipments/order-change/order-change.css'

// LINX-15437 — "comparison view shall display Prior and New values side-by-
// side (refer LINX-14512)". VD 2107-12719 is the Direct review's Preview
// Tender Details section (Changed / Unchanged bands, purple diffs), fed
// THIS order's rows instead of the shipment's — reused via `bare` so the
// bands sit directly in the Order tab with no nested card
// title/collapse (VD: no card chrome inside the modal). The VD's title reads
// "Planning Dates" (copy leftover from the sibling modal); "Order Changes"
// until the designer confirms (OC-open-9 / Q6).
//
// DEC-196 (Jana 2026-09-24, amended S164 — layout: tabs): line-level fields
// render once per order line — "Line 001, Line 002…". Jana 09-29 @00:20/@01:16:
// the order number moves into the title, and the Order block + one block per
// line become tabs, each with its changed-field count (no HeaderStrips). Lines come from
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

const lineRows = (pair) => LINE_FIELDS.map(({ key, label }) => ({
  field: label, prior: pair.prior?.[key], new: pair.new?.[key], changed: pair.prior?.[key] !== pair.new?.[key],
}))
const lineNo = (pair) => pair.new?.lineNumber ?? pair.prior?.lineNumber ?? '--'

function LineTable({ rows }) {
  return (
    <GroupTable
      className="oc-tender-table"
      flat
      headerStyle="strip"
      columns={LINE_COLS}
      groups={rowsToFlatGroups(rows, LINE_COLS, (r, c) => (c.key === 'field' ? r.field : <DiffValue value={r[c.key]} changed={r.changed} />))}
    />
  )
}

export default function OrderCompareModal({ orderId, rows = [], lines = [], linePairs, onClose }) {
  const pairs = linePairs ?? lines.map((l) => ({ prior: l, new: l }))
  // Tab 0 = Order (today's bare bands), then one per line. count = changed fields.
  const tabs = [
    { id: 'order', label: 'Order', count: rows.filter((r) => r.changed).length,
      body: <OrderChangeTenderDetails oc={{ comparison: rows, hazmat: [] }} bare /> },
    ...pairs.map((p, i) => {
      const lr = lineRows(p)
      return { id: `line-${i}`, label: `Line ${lineNo(p)}`, count: lr.filter((r) => r.changed).length, body: <LineTable rows={lr} /> }
    }),
  ]
  // Opens on the first tab with a change, else Order.
  const [active, setActive] = useState(() => Math.max(0, tabs.findIndex((t) => t.count > 0)))
  const cur = tabs[Math.min(active, tabs.length - 1)]
  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : step != null ? (active + step + tabs.length) % tabs.length : null
    if (to == null) return
    e.preventDefault()
    setActive(to)
    e.currentTarget.querySelectorAll('[role="tab"]')[to]?.focus()
  }
  const title = `Order Changes ${orderId}`
  // Portalled to document.body — the bottom bar's own box clips this modal
  // when the bar is partially open (user, 2026-09-09).
  return createPortal(
    <ModalMedium
      title={title}
      ariaLabel={title}
      onClose={onClose}
      scrollableContent
      footer={<Button variant="secondary" onClick={onClose}>Go Back</Button>}
    >
      <div className="tab-group" role="tablist" aria-label="Order Changes sections" onKeyDown={onKeyDown}>
        {tabs.map((t, i) => (
          <Tab
            key={t.id}
            label={t.label}
            count={t.count > 0 ? t.count : undefined}
            current={t === cur}
            onClick={() => setActive(i)}
            role="tab"
            id={`occ-tab-${t.id}`}
            aria-pressed={undefined}
            aria-selected={t === cur}
            aria-controls="occ-panel"
            tabIndex={t === cur ? 0 : -1}
          />
        ))}
      </div>
      <div role="tabpanel" id="occ-panel" aria-labelledby={`occ-tab-${cur.id}`}>{cur.body}</div>
    </ModalMedium>,
    document.body,
  )
}
