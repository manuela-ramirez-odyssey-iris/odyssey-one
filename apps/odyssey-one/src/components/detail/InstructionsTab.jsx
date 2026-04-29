import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

function InstructionGroup({ order }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div style={{ marginBottom: 'var(--spacing-5)' }}>
      {/* Order header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-2)',
          marginBottom: expanded ? 'var(--spacing-2)' : 0,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <button
          type="button"
          aria-label="Toggle"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-primary)',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            flexShrink: 0,
            padding: 0,
            transition: 'background var(--transition-fast)',
          }}
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {order.orderId}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 400,
            color: 'var(--text-placeholder)',
          }}
        >
          {order.instructions.length} {order.instructions.length === 1 ? 'instruction' : 'instructions'}
        </span>
      </div>

      {/* Instruction list */}
      {expanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            paddingLeft: 'var(--spacing-1)',
          }}
        >
          {order.instructions.map((instr) => (
            <div
              key={`${order.orderId}-${instr.seq}`}
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                padding: 'var(--spacing-2) var(--spacing-3)',
                background: 'var(--bg-secondary)',
                borderLeft: '3px solid var(--border-default)',
                borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-primary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-placeholder)',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-full)',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                {instr.seq}
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-primary)',
                  fontSize: '13px',
                  fontWeight: 400,
                  color: 'var(--text-secondary)',
                  lineHeight: '19px',
                  margin: 0,
                }}
              >
                {instr.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const InstructionsTab = React.memo(function InstructionsTab({ data }) {
  if (!data?.orders?.length) {
    return (
      <div
        style={{
          padding: 'var(--spacing-5) var(--spacing-6)',
          fontFamily: 'var(--font-primary)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-placeholder)',
        }}
      >
        No instructions available.
      </div>
    )
  }

  return (
    <div
      style={{
        padding: 'var(--spacing-5) var(--spacing-6)',
        overflowY: 'auto',
        height: '100%',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-primary)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: 'var(--text-primary)',
          letterSpacing: '0.04em',
          paddingBottom: 'var(--spacing-3)',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 'var(--spacing-4)',
        }}
      >
        Instructions
      </div>
      {data.orders.map((order) => (
        <InstructionGroup key={order.orderId} order={order} />
      ))}
    </div>
  )
})
export default InstructionsTab
