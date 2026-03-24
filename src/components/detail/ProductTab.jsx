import { useState, useCallback } from 'react'

const COLUMNS = [
  { key: 'lineNumber', label: 'Line #', width: 60 },
  { key: 'shipItem', label: 'Ship Item', width: 100 },
  { key: 'description', label: 'Description', width: 180 },
  { key: 'packageCount', label: 'Pkg Count', width: 100 },
  { key: 'grossWeight', label: 'Gross Wt', width: 100 },
  { key: 'volume', label: 'Volume', width: 80 },
  { key: 'hazmat', label: 'Hazmat', width: 70 },
  { key: 'tareWeight', label: 'Tare Wt', width: 90 },
  { key: 'netWeight', label: 'Net Wt', width: 90 },
  { key: 'hazmatClass', label: 'Hazmat Class', width: 100 },
  { key: 'hazmatGroup', label: 'Hazmat Grp', width: 90 },
  { key: 'productClass', label: 'Product Class', width: 110 },
  { key: 'shippingClass', label: 'Ship Class', width: 90 },
  { key: 'flashPoint', label: 'Flash Pt', width: 80 },
  { key: 'countryOfOrigin', label: 'Country', width: 80 },
  { key: 'declaredValue', label: 'Declared Value', width: 130 },
  { key: 'thirdPartRef', label: '3rd Party Ref', width: 100 },
  { key: 'batchLot', label: 'Batch/Lot', width: 100 },
  { key: 'length', label: 'Length', width: 70 },
  { key: 'width', label: 'Width', width: 70 },
  { key: 'height', label: 'Height', width: 70 },
]

const thStyle = {
  padding: '8px 10px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-placeholder)',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-subtle)',
  position: 'sticky',
  top: 0,
  zIndex: 2,
}

const tdStyle = {
  padding: '8px 10px',
  whiteSpace: 'nowrap',
  fontSize: 13,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--bg-tertiary)',
}

export default function ProductTab({ data }) {
  const [expandedOrders, setExpandedOrders] = useState(() => {
    if (!data?.orders) return {}
    const init = {}
    data.orders.forEach((o) => { init[o.orderId] = true })
    return init
  })

  const toggleOrder = useCallback((orderId) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }))
  }, [])

  if (!data?.orders) return <div className="text-sm" style={{ color: 'var(--text-placeholder)' }}>No product data available.</div>

  return (
    <div className="overflow-auto" style={{ maxHeight: '100%' }}>
      <table className="w-full border-collapse" style={{ minWidth: 1800, fontFamily: 'var(--font-primary)' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 40 }} />
            {COLUMNS.map((col) => (
              <th key={col.key} style={{ ...thStyle, width: col.width }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.orders.map((order) => {
            const isExpanded = expandedOrders[order.orderId]
            return (
              <OrderGroup
                key={order.orderId}
                order={order}
                isExpanded={isExpanded}
                onToggle={() => toggleOrder(order.orderId)}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function OrderGroup({ order, isExpanded, onToggle }) {
  return (
    <>
      {/* Parent row */}
      <tr
        style={{ background: 'var(--bg-secondary)', cursor: 'pointer' }}
        onClick={onToggle}
      >
        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 14, color: 'var(--text-tertiary)' }}>
          {isExpanded ? '\u2212' : '+'}
        </td>
        <td colSpan={COLUMNS.length} style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>
          {order.orderId}
          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-placeholder)' }}>
            ({order.lineCount} {order.lineCount === 1 ? 'line' : 'lines'})
          </span>
        </td>
      </tr>

      {/* Child rows */}
      {isExpanded &&
        order.lines.map((line, idx) => (
          <tr key={`${order.orderId}-${idx}`} style={{ background: 'var(--bg-primary)' }}>
            <td style={tdStyle} />
            {COLUMNS.map((col) => (
              <td key={col.key} style={tdStyle}>
                {col.key === 'hazmat' ? (
                  <HazmatBadge value={line.hazmat} />
                ) : (
                  line[col.key] ?? '--'
                )}
              </td>
            ))}
          </tr>
        ))}
    </>
  )
}

function HazmatBadge({ value }) {
  if (value === true || value === 'Yes') {
    return (
      <span
        className="text-xs font-semibold px-2 py-0.5"
        style={{
          borderRadius: 'var(--radius-sm)',
          background: 'var(--badge-red-bg)',
          color: 'var(--badge-red-text)',
        }}
      >
        Yes
      </span>
    )
  }
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5"
      style={{
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-tertiary)',
        color: 'var(--text-placeholder)',
      }}
    >
      No
    </span>
  )
}
