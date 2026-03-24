import { useState, useCallback } from 'react'
import { Lock } from 'lucide-react'

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

function isNegative(val) {
  return typeof val === 'string' && val.includes('-')
}

function isMargin(val) {
  return typeof val === 'string' && val.startsWith('$') && !val.includes('-')
}

function CostValue({ value }) {
  if (!value || value === '--') return <span>--</span>
  if (isNegative(value)) return <span style={{ color: 'var(--text-error)' }}>{value}</span>
  if (isMargin(value)) return <span style={{ color: 'var(--text-success)' }}>{value}</span>
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
    <div>
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setSubTab('planned')}
          className="border-none cursor-pointer text-xs font-medium"
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            background: subTab === 'planned' ? 'var(--tab-active-bg)' : 'transparent',
            color: subTab === 'planned' ? 'var(--tab-active-text)' : 'var(--tab-inactive-text)',
          }}
        >
          Planned Cost
        </button>
        <button
          onClick={() => setSubTab('completed')}
          className="border-none cursor-pointer text-xs font-medium"
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            background: subTab === 'completed' ? 'var(--tab-active-bg)' : 'transparent',
            color: subTab === 'completed' ? 'var(--tab-active-text)' : 'var(--tab-inactive-text)',
          }}
        >
          Completed Cost
        </button>
      </div>

      {subTab === 'completed' ? (
        <div
          className="flex flex-col items-center justify-center gap-3"
          style={{ padding: '48px 0', color: 'var(--text-placeholder)' }}
        >
          <Lock size={32} />
          <div className="text-sm font-medium">Completed cost not yet available</div>
          <div className="text-xs">Cost data will appear after shipment delivery is confirmed.</div>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          {planned?.summary && (
            <div
              className="flex items-center gap-6 flex-wrap"
              style={{
                padding: '10px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 16,
              }}
            >
              <SummaryItem label="Base" value={planned.summary.base} />
              <SummaryItem label="Discount" value={planned.summary.discount} negative />
              <SummaryItem label="Fuel" value={planned.summary.fuel} />
              <SummaryItem label="Accessorials" value={planned.summary.accessorials} />
              <div style={{ width: 1, height: 24, background: 'var(--border-subtle)' }} />
              <SummaryItem label="AP Total" value={planned.summary.apTotal} bold />
              <SummaryItem label="AR Total" value={planned.summary.arTotal} bold />
              <SummaryItem label="Margin" value={planned.summary.margin} bold success />
            </div>
          )}

          {/* Cost table */}
          <div className="overflow-auto">
            <table className="w-full border-collapse" style={{ fontFamily: 'var(--font-primary)' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 40 }} />
                  <th style={thStyle}>Order / Load</th>
                  <th style={thStyle}>Direct Cost</th>
                  <th style={thStyle}>AP Cost</th>
                  <th style={thStyle}>AR Cost</th>
                  <th style={thStyle}>Margin</th>
                  <th style={thStyle}>Base</th>
                  <th style={thStyle}>Fuel</th>
                  <th style={thStyle}>Discount</th>
                  <th style={thStyle}>HZC</th>
                  <th style={thStyle}>SOC</th>
                </tr>
              </thead>
              <tbody>
                {planned?.orders?.map((order) => {
                  const isExpanded = expandedOrders[order.orderId]
                  return (
                    <CostOrderGroup
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
        </>
      )}
    </div>
  )
}

function SummaryItem({ label, value, negative, bold, success }) {
  let color = 'var(--text-secondary)'
  if (negative || isNegative(value)) color = 'var(--text-error)'
  if (success) color = 'var(--text-success)'

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>{label}:</span>
      <span className="text-xs" style={{ color, fontWeight: bold ? 700 : 600 }}>{value || '--'}</span>
    </div>
  )
}

function CostOrderGroup({ order, isExpanded, onToggle }) {
  return (
    <>
      <tr style={{ background: 'var(--bg-secondary)', cursor: 'pointer' }} onClick={onToggle}>
        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 14, color: 'var(--text-tertiary)' }}>
          {isExpanded ? '\u2212' : '+'}
        </td>
        <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>{order.orderId}</td>
        <td style={tdStyle}><CostValue value={order.directCost} /></td>
        <td style={tdStyle}><CostValue value={order.apCost} /></td>
        <td style={tdStyle}><CostValue value={order.arCost} /></td>
        <td style={{ ...tdStyle, color: 'var(--text-success)', fontWeight: 600 }}>{order.margin}</td>
        <td style={tdStyle}>{order.base}</td>
        <td style={tdStyle}>{order.fuel}</td>
        <td style={tdStyle}><CostValue value={order.discount} /></td>
        <td style={tdStyle}>{order.hzc || '--'}</td>
        <td style={tdStyle}>{order.soc || '--'}</td>
      </tr>
      {isExpanded && order.loads?.map((load, idx) => (
        <tr key={idx} style={{ background: 'var(--bg-primary)' }}>
          <td style={tdStyle} />
          <td style={{ ...tdStyle, paddingLeft: 28, color: 'var(--text-tertiary)', fontSize: 12 }}>{load.loadLabel}</td>
          <td style={tdStyle}><CostValue value={load.directCost} /></td>
          <td style={tdStyle}><CostValue value={load.apCost} /></td>
          <td style={tdStyle}><CostValue value={load.arCost} /></td>
          <td style={{ ...tdStyle, color: 'var(--text-success)', fontWeight: 600 }}>{load.margin}</td>
          <td style={tdStyle}>{load.base}</td>
          <td style={tdStyle}>{load.fuel}</td>
          <td style={tdStyle}><CostValue value={load.discount} /></td>
          <td style={tdStyle}>{load.hzc || '--'}</td>
          <td style={tdStyle}>{load.soc || '--'}</td>
        </tr>
      ))}
    </>
  )
}
