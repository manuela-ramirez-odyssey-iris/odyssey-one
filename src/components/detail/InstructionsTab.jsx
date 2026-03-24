import { useState } from 'react'

const TYPE_STYLES = {
  BOL:  { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  MISC: { bg: 'var(--badge-purple-bg)', color: 'var(--badge-purple-text)' },
  TRA:  { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  ADC:  { bg: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' },
  ZD02: { bg: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' },
  SPC:  { bg: 'var(--badge-purple-bg)', color: 'var(--badge-purple-text)' },
}

function TypeBadge({ type }) {
  const style = TYPE_STYLES[type] || { bg: 'var(--bg-tertiary)', color: 'var(--text-placeholder)' }
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 shrink-0"
      style={{ borderRadius: 'var(--radius-sm)', background: style.bg, color: style.color }}
    >
      {type}
    </span>
  )
}

function InstructionGroup({ order }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Group header */}
      <div
        className="flex items-center gap-3"
        style={{
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: expanded ? 8 : 0,
        }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center border-none cursor-pointer shrink-0"
          style={{
            width: 22,
            height: 22,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-tertiary)',
            lineHeight: 1,
          }}
        >
          {expanded ? '\u2212' : '+'}
        </button>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {order.orderId}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>
          {order.instructions.length} {order.instructions.length === 1 ? 'instruction' : 'instructions'}
        </span>
      </div>

      {/* Instruction list */}
      {expanded && (
        <div className="flex flex-col gap-2" style={{ paddingLeft: 16 }}>
          {order.instructions.map((instr) => (
            <div
              key={`${order.orderId}-${instr.seq}`}
              className="flex items-start gap-3"
              style={{
                padding: '10px 12px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span
                className="flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {instr.seq}
              </span>
              <TypeBadge type={instr.type} />
              <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {instr.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function InstructionsTab({ data }) {
  if (!data?.orders?.length) {
    return <div className="text-sm" style={{ color: 'var(--text-placeholder)' }}>No instructions available.</div>
  }

  return (
    <div>
      {data.orders.map((order) => (
        <InstructionGroup key={order.orderId} order={order} />
      ))}
    </div>
  )
}
