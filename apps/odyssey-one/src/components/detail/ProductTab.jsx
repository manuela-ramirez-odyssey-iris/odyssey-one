import React, { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TriangleAlert, ChevronsUpDown } from 'lucide-react'
import { Button, Badge, GroupTable } from '@odyssey/ui'
import { ICON_MD } from '@odyssey/tokens'

// Column order per the Product pane mock (vault/00-inbox/Product.png): the 9
// mock columns first, then the remaining data columns — kept, reached via the
// GroupTable's horizontal scroll (the mock's last column clips).
const COLUMNS = [
  { key: 'lineNumber', label: 'Line #' },
  { key: 'shipItem', label: 'Ship Item' },
  { key: 'description', label: 'Description' },
  { key: 'packageCount', label: 'Package Count' },
  { key: 'grossWeight', label: 'Gross Weight' },
  { key: 'volume', label: 'Volume' },
  { key: 'hazmat', label: 'Hazardous' },
  { key: 'tareWeight', label: 'Tare Weight' },
  { key: 'netWeight', label: 'Net Weight' },
  { key: 'productClass', label: 'Product Class' },
  { key: 'shippingClass', label: 'Shipping Class' },
  { key: 'flashPoint', label: 'Flash Point' },
  { key: 'countryOfOrigin', label: 'Country of Origin' },
  { key: 'declaredValue', label: 'Declared Value' },
  { key: 'thirdPartRef', label: 'Third Part Ref #' },
  { key: 'batchLot', label: 'BatchLot #' },
  { key: 'length', label: 'Length' },
  { key: 'width', label: 'Width' },
  { key: 'height', label: 'Height' },
]

function renderProductCell(row, col) {
  if (col.key === 'hazmat') {
    return <HazmatTag value={row.hazmat} hazmatClass={row.hazmatClass} hazmatGroup={row.hazmatGroup} />
  }
  return row[col.key] ?? '—'
}

const ProductTab = React.memo(function ProductTab({ data }) {
  // Expanded map keyed by orderId — controlled into GroupTable so Expand All
  // and the per-group toggles share one source of truth.
  const [expandedOrders, setExpandedOrders] = useState(() => {
    if (!data?.orders) return {}
    const init = {}
    data.orders.forEach((order) => {
      init[order.orderId] = true
    })
    return init
  })

  useEffect(() => {
    if (!data?.orders) return
    const init = {}
    data.orders.forEach((order) => {
      init[order.orderId] = true
    })
    setExpandedOrders(init)
  }, [data])

  const toggleOrder = useCallback((orderId, next) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: next }))
  }, [])

  const allExpanded = data?.orders?.length > 0 && data.orders.every((o) => !!expandedOrders[o.orderId])

  const toggleAll = useCallback(() => {
    if (!data?.orders) return
    const next = !allExpanded
    const updated = {}
    data.orders.forEach((o) => { updated[o.orderId] = next })
    setExpandedOrders(updated)
  }, [data, allExpanded])

  if (!data?.orders) return <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-placeholder)' }}>No product data available.</div>

  const groups = data.orders.map((order) => ({
    id: order.orderId,
    label: order.orderId,
    rows: order.lines,
  }))

  return (
    <div className="pane-canvas">
      <div className="pane-col pane-col--wide">
        <div className="pane-card">
          <div className="pane-card__header">
            <span className="pane-card__title">Product</span>
            <Button
              variant="link"
              iconRight={<ChevronsUpDown {...ICON_MD} />}
              onClick={toggleAll}
            >
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </Button>
          </div>
          <div className="product-pane__table-scroll">
            <GroupTable
              columns={COLUMNS}
              groups={groups}
              renderCell={renderProductCell}
              expanded={expandedOrders}
              onToggle={toggleOrder}
              aria-label="Product lines by order"
            />
          </div>
        </div>
      </div>
    </div>
  )
})
export default ProductTab

function HazmatTag({ value, hazmatClass, hazmatGroup }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef(null)

  if (value !== true && value !== 'Yes') {
    return <span style={{ color: 'var(--text-placeholder)' }}>--</span>
  }

  const handleEnter = () => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 })
    setShow(true)
  }

  return (
    <>
      <span ref={ref} onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)} style={{ display: 'inline-flex' }}>
        <Badge variant="amber" leftIcon={<TriangleAlert size={12} />}>Hazmat</Badge>
      </span>
      {show && (hazmatClass || hazmatGroup) && createPortal(
        <div style={{
          position: 'fixed', top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)',
          background: 'var(--deep-sea-neutral-900, #1B2537)', color: 'var(--deep-sea-neutral-300, #D0D4DB)',
          borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 13, lineHeight: 1.6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)', zIndex: 99999, whiteSpace: 'nowrap',
        }}>
          {hazmatClass && <div>Class: <strong>{hazmatClass}</strong></div>}
          {hazmatGroup && <div>Group: <strong>{hazmatGroup}</strong></div>}
        </div>,
        document.body
      )}
    </>
  )
}
