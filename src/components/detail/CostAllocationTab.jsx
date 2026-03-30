import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Lock, X } from 'lucide-react'

const BADGE_COLORS = ['amber', 'blue', 'green', 'red', 'purple']

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

function parseDollar(val) {
  if (!val || val === '--') return null
  return parseFloat(val.replace(/[^0-9.\-]/g, ''))
}

function fmtDollar(n) {
  if (n == null) return '--'
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `-$${formatted}` : `$${formatted}`
}

const BADGE_BG = {
  amber: 'rgba(245, 158, 11, 0.12)',
  blue: 'rgba(59, 130, 246, 0.12)',
  green: 'rgba(16, 185, 129, 0.12)',
  red: 'rgba(239, 68, 68, 0.12)',
  purple: 'rgba(139, 92, 246, 0.12)',
}

const BADGE_TEXT = {
  amber: 'rgb(180, 110, 5)',
  blue: 'rgb(37, 99, 235)',
  green: 'rgb(5, 150, 105)',
  red: 'rgb(220, 38, 38)',
  purple: 'rgb(109, 40, 217)',
}

export default function CostAllocationTab({ data, selectedOrderIdx = 0 }) {
  const [subTab, setSubTab] = useState('planned')
  const [compareOpen, setCompareOpen] = useState(false)

  if (!data) return <div className="text-sm" style={{ color: 'var(--text-placeholder)' }}>No cost data available.</div>

  const planned = data.planned

  const apColumns = [
    { key: 'orderId', label: 'Order #' },
    { key: 'directCost', label: 'Direct Cost' },
    { key: 'apBase', label: 'Base' },
    { key: 'apFuel', label: 'Fuel Charge' },
    { key: 'apDiscount', label: 'Discount' },
    { key: 'apHzc', label: 'Stop Off (HZC)' },
    { key: 'apSoc', label: 'Stop Off (SOC)' },
    { key: 'apCost', label: 'AP Total' },
  ]

  const arColumns = [
    { key: 'orderId', label: 'Order #' },
    { key: 'arBase', label: 'Base' },
    { key: 'arFuel', label: 'Fuel Charge' },
    { key: 'arDiscount', label: 'Discount' },
    { key: 'arHzc', label: 'Stop Off (HZC)' },
    { key: 'arSoc', label: 'Stop Off (SOC)' },
    { key: 'arCost', label: 'AR Total' },
  ]

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
          {/* Summary bar with Compare button */}
          {planned?.summary && (
            <div
              className="flex shrink-0"
              style={{ borderBottom: '1px solid var(--border-subtle)', alignItems: 'stretch' }}
            >
              <SummaryCell label="BASE" value={planned.summary.base} />
              <SummaryCell label="DISCOUNT" value={planned.summary.discount} negative />
              <SummaryCell label="FUEL (FSC)" value={planned.summary.fuel} />
              <SummaryCell label="ACCESSORIALS" value={planned.summary.accessorials} />
              <SummaryCell label="AP TOTAL" value={planned.summary.apTotal} total />
              <SummaryCell label="AR TOTAL" value={planned.summary.arTotal} total />
              <SummaryCell label="MARGIN" value={planned.summary.margin} success />
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', marginLeft: 'auto' }}>
                <button
                  onClick={() => setCompareOpen(true)}
                  className="border-none cursor-pointer"
                  style={{
                    padding: '6px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: 'var(--font-primary)',
                    background: 'transparent',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                    transition: 'background 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  Compare AP/AR
                </button>
              </div>
            </div>
          )}

          {/* Both tables stacked vertically */}
          <div style={{ overflow: 'auto', flex: 1 }}>
            {/* AP Breakdown */}
            <div style={{ padding: '16px 20px 4px 20px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                AP Breakdown (Carrier Cost)
              </span>
            </div>
            <CostTable columns={apColumns} orders={planned?.orders} />

            {/* AR Breakdown */}
            <div style={{ padding: '20px 20px 4px 20px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                AR Breakdown (Customer Cost)
              </span>
            </div>
            <CostTable columns={arColumns} orders={planned?.orders} />
          </div>
        </div>
      )}

      {/* Compare AP/AR Modal */}
      {compareOpen && planned?.orders && createPortal(
        <CompareModal
          orders={planned.orders}
          defaultOrderIdx={selectedOrderIdx}
          onClose={() => setCompareOpen(false)}
        />,
        document.body,
      )}
    </div>
  )
}

function CostTable({ columns, orders }) {
  return (
    <table className="w-full border-collapse" style={{ fontFamily: 'var(--font-primary)', fontSize: 13, color: 'var(--text-secondary)' }}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} style={thStyle}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {orders?.map((order) => (
          <tr key={order.orderId} style={{ background: 'var(--bg-primary)' }}>
            {columns.map((col) => {
              const val = order[col.key]
              if (col.key === 'orderId') {
                return <td key={col.key} style={{ ...tdStyle, fontWeight: 500, color: 'var(--text-primary)' }}>{val}</td>
              }
              if (col.key === 'apCost' || col.key === 'arCost') {
                return <td key={col.key} style={{ ...tdStyle, fontWeight: 600 }}>{val}</td>
              }
              if (col.key === 'apDiscount' || col.key === 'arDiscount' || col.key === 'apHzc' || col.key === 'apSoc' || col.key === 'arHzc' || col.key === 'arSoc') {
                return <td key={col.key} style={tdStyle}><CostValue value={val} /></td>
              }
              return <td key={col.key} style={tdStyle}>{val}</td>
            })}
          </tr>
        ))}
      </tbody>
    </table>
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

function CompareModal({ orders, defaultOrderIdx, onClose }) {
  const [activeIdx, setActiveIdx] = useState(
    defaultOrderIdx < orders.length ? defaultOrderIdx : 0
  )

  const order = orders[activeIdx]

  const components = [
    { label: 'Base', apKey: 'apBase', arKey: 'arBase' },
    { label: 'Fuel', apKey: 'apFuel', arKey: 'arFuel' },
    { label: 'Discount', apKey: 'apDiscount', arKey: 'arDiscount' },
    { label: 'HZC', apKey: 'apHzc', arKey: 'arHzc' },
    { label: 'SOC', apKey: 'apSoc', arKey: 'arSoc' },
  ]

  const apTotal = parseDollar(order.apCost)
  const arTotal = parseDollar(order.arCost)
  const marginVal = parseDollar(order.margin)
  const marginPct = apTotal && apTotal > 0 ? ((marginVal / apTotal) * 100).toFixed(1) : '0.0'

  const compareTh = {
    padding: '8px 14px',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 600,
    color: 'var(--text-placeholder)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    borderBottom: '1px solid var(--border-subtle)',
  }

  const compareTd = {
    padding: '8px 14px',
    whiteSpace: 'nowrap',
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--bg-tertiary)',
    textAlign: 'right',
  }

  const rows = components.map(({ label, apKey, arKey }) => {
    const ap = parseDollar(order[apKey])
    const ar = parseDollar(order[arKey])
    const bothEmpty = ap == null && ar == null
    const diff = bothEmpty ? null : (ar || 0) - (ap || 0)
    return { label, ap: order[apKey], ar: order[arKey], diff, bothEmpty }
  })

  const totalDiff = arTotal != null && apTotal != null ? arTotal - apTotal : null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        background: 'rgba(0,0,0,0.3)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          padding: 24,
          width: 520,
          fontFamily: 'var(--font-primary)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Compare AP / AR</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center bg-transparent border-none cursor-pointer"
            style={{ color: 'var(--text-placeholder)', padding: 0, transition: 'color 0.15s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-placeholder)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Order tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {orders.map((ord, i) => {
            const isActive = i === activeIdx
            const color = BADGE_COLORS[i % BADGE_COLORS.length]
            return (
              <button
                key={ord.orderId}
                onClick={() => setActiveIdx(i)}
                className="border-none cursor-pointer"
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: 'var(--font-primary)',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? BADGE_BG[color] : 'var(--bg-secondary)',
                  color: isActive ? BADGE_TEXT[color] : 'var(--text-tertiary)',
                  border: isActive ? `1px solid ${BADGE_TEXT[color]}30` : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = BADGE_BG[color]
                    e.currentTarget.style.color = BADGE_TEXT[color]
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--bg-secondary)'
                    e.currentTarget.style.color = 'var(--text-tertiary)'
                  }
                }}
              >
                {ord.orderId}
              </button>
            )
          })}
        </div>

        {/* Margin */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--caribbean-green-600)' }}>
            Margin: {fmtDollar(marginVal)} ({marginPct}%)
          </span>
        </div>

        {/* Table */}
        <table className="w-full border-collapse" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...compareTh, textAlign: 'left' }}>Component</th>
              <th style={compareTh}>AP (Carrier)</th>
              <th style={compareTh}>AR (Customer)</th>
              <th style={compareTh}>Diff</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td style={{ ...compareTd, textAlign: 'left', fontWeight: 500, color: 'var(--text-primary)' }}>{row.label}</td>
                <td style={compareTd}><CostValue value={row.ap} /></td>
                <td style={compareTd}><CostValue value={row.ar} /></td>
                <td style={compareTd}>
                  {row.bothEmpty ? (
                    <span>--</span>
                  ) : (
                    <span style={{ color: row.diff >= 0 ? 'var(--caribbean-green-600)' : 'var(--text-error)' }}>
                      {row.diff >= 0 ? '+' : ''}{fmtDollar(row.diff)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr>
              <td style={{ ...compareTd, textAlign: 'left', fontWeight: 700, color: 'var(--text-primary)', borderTop: '2px solid var(--border-default)', borderBottom: 'none' }}>Total</td>
              <td style={{ ...compareTd, fontWeight: 700, borderTop: '2px solid var(--border-default)', borderBottom: 'none' }}>{order.apCost}</td>
              <td style={{ ...compareTd, fontWeight: 700, borderTop: '2px solid var(--border-default)', borderBottom: 'none' }}>{order.arCost}</td>
              <td style={{ ...compareTd, fontWeight: 700, borderTop: '2px solid var(--border-default)', borderBottom: 'none' }}>
                {totalDiff != null ? (
                  <span style={{ color: totalDiff >= 0 ? 'var(--caribbean-green-600)' : 'var(--text-error)' }}>
                    {totalDiff >= 0 ? '+' : ''}{fmtDollar(totalDiff)}
                  </span>
                ) : '--'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
