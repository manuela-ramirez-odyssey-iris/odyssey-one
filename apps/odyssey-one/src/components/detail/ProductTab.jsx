import React, { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TriangleAlert, ChevronDown, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { Button } from '@odyssey/ui'
import { ICON_MD } from '@odyssey/tokens'

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

/* ── Styles matching prototype CSS exactly ── */

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: 'var(--font-primary)',
  fontSize: 13,
  color: 'var(--text-secondary)',
}

const theadStyle = {
  background: 'var(--bg-secondary)',
  position: 'sticky',
  top: 0,
  zIndex: 3,
  boxShadow: '0 1px 0 var(--border-subtle)',
}

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  borderBottom: '1px solid var(--border-subtle)',
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  height: 48,
  verticalAlign: 'middle',
}

const stickyCol0 = {
  position: 'sticky',
  left: 0,
  zIndex: 2,
  background: 'inherit',
}

const stickyCol1 = {
  position: 'sticky',
  left: 34,
  zIndex: 2,
  background: 'inherit',
}

const thExpandStyle = {
  ...thStyle,
  ...stickyCol0,
  width: 36,
  textAlign: 'center',
  paddingLeft: 8,
  paddingRight: 4,
  background: 'var(--bg-secondary)',
}

const tdStyle = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--bg-tertiary)',
  whiteSpace: 'nowrap',
  fontWeight: 400,
}

const tdExpandStyle = {
  ...tdStyle,
  ...stickyCol0,
  width: 36,
  textAlign: 'center',
  paddingLeft: 8,
  paddingRight: 4,
  borderBottom: 'none',
}

const thLineNumStyle = {
  ...thStyle,
  ...stickyCol1,
  background: 'var(--bg-secondary)',
  paddingLeft: 10,
  paddingRight: 10,
}

const tdLineNumStyle = {
  ...tdStyle,
  ...stickyCol1,
  paddingLeft: 10,
  paddingRight: 10,
  borderBottom: 'none',
  paddingRight: 20,
}

const expandBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-primary)',
  color: 'var(--text-tertiary)',
  cursor: 'pointer',
  flexShrink: 0,
  padding: 0,
  transition: 'background var(--transition-fast)',
}

const colPrimaryStyle = {
  ...tdStyle,
  fontWeight: 500,
  color: 'var(--text-primary)',
}

const hazmatBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(245, 158, 11, 0.12)',
  color: 'rgb(180, 110, 5)',
}

const ProductTab = React.memo(function ProductTab({ data }) {
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

  const toggleOrder = useCallback((orderId) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }))
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
            <table style={tableStyle}>
              <thead style={theadStyle}>
                <tr>
                  <th style={thExpandStyle}></th>
                  {COLUMNS.map((col) => (
                    <th key={col.key} style={col.key === 'lineNumber' ? thLineNumStyle : thStyle}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order, orderIdx) => {
                  const isExpanded = !!expandedOrders[order.orderId]
                  return (
                    <React.Fragment key={order.orderId}>
                      <OrderGroup
                        order={order}
                        isExpanded={isExpanded}
                        onToggle={() => toggleOrder(order.orderId)}
                        isFirst={orderIdx === 0}
                      />
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
})
export default ProductTab

function OrderGroup({ order, isExpanded, onToggle, isFirst }) {
  const isSingleLine = order.lines.length === 1
  const singleLine = isSingleLine ? order.lines[0] : null

  const orderLabel = (
    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {order.orderId}
    </span>
  )

  const topBorder = {}

  const stickyBottomBorder = { borderBottom: '1px solid var(--bg-tertiary)' }

  /* Single-line orders render inline with no expand button */
  if (isSingleLine) {
    return (
      <tr style={{ background: 'var(--bg-primary)', ...topBorder }}>
        <td style={{ ...tdExpandStyle, ...stickyBottomBorder }} />
        {COLUMNS.map((col) => (
          <td key={col.key} style={col.key === 'lineNumber' ? { ...tdLineNumStyle, ...stickyBottomBorder } : tdStyle}>
            {col.key === 'lineNumber' ? (
              <span style={{ display: 'flex', alignItems: 'center' }}>
                {orderLabel}
                <span style={{ margin: '0 4px', color: 'var(--text-placeholder)' }}>-</span>
                {singleLine[col.key] ?? '\u2014'}
              </span>
            ) : col.key === 'hazmat' ? (
              <HazmatTag value={singleLine.hazmat} hazmatClass={singleLine.hazmatClass} hazmatGroup={singleLine.hazmatGroup} />
            ) : (
              singleLine[col.key] ?? '\u2014'
            )}
          </td>
        ))}
      </tr>
    )
  }

  /* Multi-line orders: collapsible parent + child rows */
  return (
    <>
      {/* Parent row */}
      <tr
        style={{ background: 'var(--bg-primary)', cursor: 'pointer', ...topBorder }}
        onClick={onToggle}
      >
        <td style={{ ...tdExpandStyle, ...(!isExpanded ? stickyBottomBorder : {}) }}>
          <button
            style={expandBtnStyle}
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>
        <td style={{ ...tdLineNumStyle, ...(!isExpanded ? stickyBottomBorder : {}) }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {orderLabel}
            <span style={{ color: 'var(--text-placeholder)', marginLeft: 4 }}>({order.lineCount ?? order.lines.length})</span>
          </span>
        </td>
        <td colSpan={COLUMNS.length - 1} style={tdStyle}></td>
      </tr>

      {/* Child rows */}
      {isExpanded &&
        order.lines.map((line, idx) => (
          <tr
            key={`${order.orderId}-${idx}`}
            style={{ background: 'var(--bg-secondary)' }}
          >
            <td style={{ ...tdExpandStyle, boxShadow: 'inset 3px 0 0 var(--border-default)' }} />
            {COLUMNS.map((col) => (
              <td key={col.key} style={col.key === 'lineNumber' ? { ...tdLineNumStyle, paddingLeft: 30 } : tdStyle}>
                {col.key === 'hazmat' ? (
                  <HazmatTag value={line.hazmat} hazmatClass={line.hazmatClass} hazmatGroup={line.hazmatGroup} />
                ) : (
                  line[col.key] ?? '\u2014'
                )}
              </td>
            ))}
          </tr>
        ))}
    </>
  )
}

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
      <span ref={ref} onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)} style={hazmatBadgeStyle}>
        <TriangleAlert size={12} />
        Hazmat
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
