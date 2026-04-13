import React, { useState, useCallback, useEffect } from 'react'
import { TriangleAlert } from 'lucide-react'

const COLUMNS = [
  { key: 'lineNumber', label: 'Line #' },
  { key: 'shipItem', label: 'Ship Item' },
  { key: 'description', label: 'Description' },
  { key: 'packageCount', label: 'Package Count' },
  { key: 'grossWeight', label: 'Gross Weight' },
  { key: 'volume', label: 'Volume' },
  { key: 'hazmat', label: 'Hazmat' },
  { key: 'tareWeight', label: 'Tare Weight' },
  { key: 'netWeight', label: 'Net Weight' },
  { key: 'hazmatClass', label: 'Hazmat Class' },
  { key: 'hazmatGroup', label: 'Hazmat Group' },
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

const wrapperStyle = {
  overflow: 'auto',
  height: '100%',
}

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
  zIndex: 1,
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
}

const thExpandStyle = {
  ...thStyle,
  width: 36,
  textAlign: 'center',
  paddingLeft: 8,
  paddingRight: 4,
}

const tdStyle = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--bg-tertiary)',
  whiteSpace: 'nowrap',
  fontWeight: 400,
}

const tdExpandStyle = {
  ...tdStyle,
  width: 36,
  textAlign: 'center',
  paddingLeft: 8,
  paddingRight: 4,
}

const expandBtnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-primary)',
  fontFamily: 'var(--font-primary)',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  cursor: 'pointer',
  transition: 'background 0.15s ease, color 0.15s ease',
  lineHeight: 1,
  padding: 0,
}

const expandBtnExpanded = {
  ...expandBtnBase,
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
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

  if (!data?.orders) return <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-placeholder)' }}>No product data available.</div>

  return (
    <div style={{ ...wrapperStyle, marginTop: 'var(--spacing-3)' }}>
      <table style={tableStyle}>
        <thead style={theadStyle}>
          <tr>
            <th style={thExpandStyle}></th>
            {COLUMNS.map((col) => (
              <th key={col.key} style={thStyle}>
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
                {/* Order separator row */}
                <tr>
                  <td
                    colSpan={COLUMNS.length + 1}
                    style={{
                      padding: orderIdx === 0 ? '8px 14px 6px' : '16px 14px 6px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      background: 'var(--bg-primary)',
                      borderBottom: '2px solid var(--border-default)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {order.orderId}
                  </td>
                </tr>
                <OrderGroup
                  order={order}
                  isExpanded={isExpanded}
                  onToggle={() => toggleOrder(order.orderId)}
                />
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
})
export default ProductTab

function OrderGroup({ order, isExpanded, onToggle }) {
  const isSingleLine = order.lines.length === 1
  const singleLine = isSingleLine ? order.lines[0] : null

  /* Single-line orders render inline with no expand button */
  if (isSingleLine) {
    return (
      <tr style={{ background: 'var(--bg-primary)' }}>
        <td style={tdExpandStyle} />
        {COLUMNS.map((col) => (
          <td key={col.key} style={tdStyle}>
            {col.key === 'hazmat' ? (
              <HazmatTag value={singleLine.hazmat} />
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
        style={{ background: 'var(--bg-primary)', cursor: 'pointer' }}
        onClick={onToggle}
      >
        <td style={tdExpandStyle}>
          <button
            style={isExpanded ? expandBtnExpanded : expandBtnBase}
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '\u2212' : '+'}
          </button>
        </td>
        <td style={tdStyle}>{order.lineCount ?? order.lines.length} lines</td>
        <td colSpan={COLUMNS.length - 1} style={tdStyle}></td>
      </tr>

      {/* Child rows */}
      {isExpanded &&
        order.lines.map((line, idx) => (
          <tr
            key={`${order.orderId}-${idx}`}
            style={{ background: 'var(--bg-secondary)' }}
          >
            <td style={tdExpandStyle} />
            {COLUMNS.map((col) => (
              <td key={col.key} style={tdStyle}>
                {col.key === 'hazmat' ? (
                  <HazmatTag value={line.hazmat} />
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

function HazmatTag({ value }) {
  if (value === true || value === 'Yes') {
    return (
      <span style={hazmatBadgeStyle}>
        <TriangleAlert size={12} />
        Hazmat
      </span>
    )
  }
  return <span style={{ color: 'var(--text-placeholder)' }}>--</span>
}
