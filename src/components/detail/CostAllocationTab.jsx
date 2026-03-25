import { useState, useCallback } from 'react'
import { Lock } from 'lucide-react'

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 600,
  color: 'var(--text-placeholder)',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-subtle)',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  position: 'sticky',
  top: 0,
  zIndex: 2,
}

const tdStyle = {
  padding: '10px 14px',
  whiteSpace: 'nowrap',
  fontSize: 13,
  fontWeight: 400,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--bg-tertiary)',
}

function isNegative(val) {
  return typeof val === 'string' && val.includes('-')
}

function CostValue({ value }) {
  if (!value || value === '--') return <span>--</span>
  if (isNegative(value)) return <span style={{ color: 'var(--text-error)' }}>{value}</span>
  return <span>{value}</span>
}

export default function CostAllocationTab({ data }) {
  const [subTab, setSubTab] = useState('planned')
  const [expandedOrders, setExpandedOrders] = useState(() => {
    if (!data?.planned?.orders) return {}
    const init = {}
    data.planned.orders.forEach((o) => { init[o.orderId] = true })
    return init
  })

  const toggleOrder = useCallback((orderId) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }))
  }, [])

  if (!data) return <div className="text-sm" style={{ color: 'var(--text-placeholder)' }}>No cost data available.</div>

  const planned = data.planned

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', margin: 'calc(-1 * var(--spacing-4)) calc(-1 * var(--spacing-5))' }}>
      {/* Header: Cost Information label + pill tab group */}
      <div
        className="flex items-center shrink-0"
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          gap: 'var(--spacing-6)',
        }}
      >
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Cost Information
        </span>
        <div
          className="flex"
          style={{
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setSubTab('planned')}
            className="border-none cursor-pointer"
            style={{
              padding: '6px 16px',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--font-primary)',
              background: subTab === 'planned' ? 'var(--bg-inverse)' : 'var(--bg-primary)',
              color: subTab === 'planned' ? 'var(--text-inverse)' : 'var(--text-tertiary)',
              borderRight: '1px solid var(--border-default)',
              transition: 'background var(--transition-fast), color var(--transition-fast)',
            }}
          >
            Planned Cost
          </button>
          <button
            onClick={() => setSubTab('completed')}
            className="border-none cursor-pointer"
            style={{
              padding: '6px 16px',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--font-primary)',
              background: subTab === 'completed' ? 'var(--bg-inverse)' : 'var(--bg-primary)',
              color: subTab === 'completed' ? 'var(--text-inverse)' : 'var(--text-tertiary)',
              transition: 'background var(--transition-fast), color var(--transition-fast)',
            }}
          >
            Completed Cost
          </button>
        </div>
      </div>

      {subTab === 'completed' ? (
        <div
          className="flex flex-col items-center justify-center gap-3 flex-1"
          style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}
        >
          <Lock size={32} style={{ color: 'var(--text-placeholder)' }} />
          <p>Available after PGI/PGR is received</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Summary bar */}
          {planned?.summary && (
            <div
              className="flex shrink-0"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <SummaryCell label="BASE" value={planned.summary.base} />
              <SummaryCell label="DISCOUNT" value={planned.summary.discount} negative />
              <SummaryCell label="FUEL (FSC)" value={planned.summary.fuel} />
              <SummaryCell label="ACCESSORIALS" value={planned.summary.accessorials} />
              <SummaryCell label="AP TOTAL" value={planned.summary.apTotal} total />
              <SummaryCell label="AR TOTAL" value={planned.summary.arTotal} total />
              <SummaryCell label="MARGIN" value={planned.summary.margin} success last />
            </div>
          )}

          {/* Cost table */}
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table className="w-full border-collapse" style={{ fontFamily: 'var(--font-primary)', fontSize: 13, color: 'var(--text-secondary)' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 36, paddingLeft: 8, paddingRight: 4 }} />
                  <th style={thStyle}>Order #</th>
                  <th style={thStyle}>Direct Cost</th>
                  <th style={thStyle}>AP Cost</th>
                  <th style={thStyle}>AR Cost</th>
                  <th style={thStyle}>Margin</th>
                  <th style={thStyle}>Base</th>
                  <th style={thStyle}>Fuel Charge</th>
                  <th style={thStyle}>Discount</th>
                  <th style={thStyle}>Stop Off (HZC)</th>
                  <th style={thStyle}>Stop Off (SOC)</th>
                </tr>
              </thead>
              <tbody>
                {planned?.orders?.map((order) => (
                  <CostOrderGroup
                    key={order.orderId}
                    order={order}
                    isExpanded={!!expandedOrders[order.orderId]}
                    onToggle={() => toggleOrder(order.orderId)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCell({ label, value, negative, total, success, last }) {
  let valueColor = 'var(--text-primary)'
  if (negative || isNegative(value)) valueColor = 'var(--text-error)'
  if (success) valueColor = 'var(--caribbean-green-600)'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '12px 20px',
        borderRight: last ? 'none' : '1px solid var(--border-subtle)',
        background: total ? 'var(--bg-secondary)' : 'transparent',
      }}
    >
      <span style={{
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        lineHeight: '14px',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 'var(--font-size-sm)',
        fontWeight: 600,
        color: valueColor,
        lineHeight: '20px',
        whiteSpace: 'nowrap',
      }}>
        {value || '--'}
      </span>
    </div>
  )
}

function CostOrderGroup({ order, isExpanded, onToggle }) {
  const hasLoads = order.loads && order.loads.length > 0

  return (
    <>
      <tr
        style={{ background: 'var(--bg-primary)', cursor: hasLoads ? 'pointer' : 'default' }}
        onClick={hasLoads ? onToggle : undefined}
      >
        <td style={{ ...tdStyle, textAlign: 'center', paddingLeft: 8, paddingRight: 4 }}>
          {hasLoads && (
            <button
              className="inline-flex items-center justify-center"
              style={{
                width: 22, height: 22,
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                background: isExpanded ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                color: isExpanded ? 'var(--text-primary)' : 'var(--text-tertiary)',
                cursor: 'pointer',
                lineHeight: 1,
                fontFamily: 'var(--font-primary)',
              }}
              onClick={(e) => { e.stopPropagation(); onToggle() }}
            >
              {isExpanded ? '\u2212' : '+'}
            </button>
          )}
        </td>
        <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text-primary)' }}>{order.orderId}</td>
        <td style={tdStyle}>{order.directCost}</td>
        <td style={tdStyle}>{order.apCost}</td>
        <td style={tdStyle}>{order.arCost}</td>
        <td style={{ ...tdStyle, color: 'var(--caribbean-green-600)', fontWeight: 600 }}>{order.margin}</td>
        <td style={tdStyle}>{order.base}</td>
        <td style={tdStyle}>{order.fuel}</td>
        <td style={tdStyle}><CostValue value={order.discount} /></td>
        <td style={tdStyle}><CostValue value={order.hzc} /></td>
        <td style={tdStyle}><CostValue value={order.soc} /></td>
      </tr>
      {isExpanded && order.loads?.map((load, idx) => (
        <tr key={idx} style={{ background: 'var(--bg-secondary)' }}>
          <td style={tdStyle} />
          <td style={{ ...tdStyle, paddingLeft: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>
            {load.loadLabel}
          </td>
          <td style={tdStyle}>{load.directCost}</td>
          <td style={tdStyle}>{load.apCost}</td>
          <td style={tdStyle}>{load.arCost}</td>
          <td style={{ ...tdStyle, color: 'var(--caribbean-green-600)', fontWeight: 600 }}>{load.margin}</td>
          <td style={tdStyle}>{load.base}</td>
          <td style={tdStyle}>{load.fuel}</td>
          <td style={tdStyle}><CostValue value={load.discount} /></td>
          <td style={tdStyle}><CostValue value={load.hzc} /></td>
          <td style={tdStyle}><CostValue value={load.soc} /></td>
        </tr>
      ))}
    </>
  )
}
