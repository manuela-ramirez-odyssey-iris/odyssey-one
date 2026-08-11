import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import PaneEmpty from './PaneEmpty'

// LINX-12071 (audit 2026-08-10) — the default was `useState(true)` unconditionally,
// so it applied identically to every InstructionGroup instance and EVERY order
// rendered expanded. AC requires only the first order open by default, the rest
// closed. `defaultOpen` is index-derived by the parent (index === 0) and used
// only as the useState SEED — each group still owns its own independent toggle
// afterwards, so expanding/collapsing one group never affects another.
function InstructionGroup({ order, defaultOpen }) {
  const [expanded, setExpanded] = useState(defaultOpen)

  const headingId = `instr-group-heading-${order.orderId}`
  // LINX-12070/12071 — Order Header must show the instruction count, formatted
  // "OXU6IOCR7 (4 instructions)" per the AC. The AC's only example is plural;
  // English still requires the singular "(1 instruction)" for a count of
  // exactly one, so that case is handled explicitly (a deliberate deviation
  // from the literal example, not an oversight). An empty list reads
  // "(0 instructions)" — plural, matching normal English usage for zero.
  const count = order.instructions.length
  const countLabel = count === 1 ? '1 instruction' : `${count} instructions`

  return (
    <div className="instr-group">
      {/* Group header — chevron left of orderId, hairline bottom */}
      <div
        className="instr-group__header"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`instr-group-body-${order.orderId}`}
        id={headingId}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
      >
        <span className="instr-group__chevron" aria-hidden="true">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span className="instr-group__id">{order.orderId} ({countLabel})</span>
      </div>

      {/* Mini-table — hidden when collapsed */}
      {expanded && order.instructions.length > 0 && (
        <table
          className="instr-table"
          id={`instr-group-body-${order.orderId}`}
          aria-labelledby={headingId}
        >
          <thead>
            <tr>
              <th className="instr-table__seq-col" scope="col">#</th>
              <th scope="col">Instruction Description</th>
            </tr>
          </thead>
          <tbody>
            {order.instructions.map((instr) => (
              <tr key={`${order.orderId}-${instr.seq}`}>
                <td className="instr-table__seq-cell">{instr.seq}</td>
                <td>{instr.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Empty collapsed-but-shown state when the group has no instructions */}
      {expanded && order.instructions.length === 0 && (
        <p className="instr-empty">No instructions for this order.</p>
      )}
    </div>
  )
}

const InstructionsTab = React.memo(function InstructionsTab({ data }) {
  if (!data?.orders?.length) {
    return <PaneEmpty message="No instructions available." col="medium" />
  }

  return (
    <div className="pane-canvas">
      <div className="pane-col pane-col--medium">
        <div className="pane-card">
          <div className="pane-card__header">
            <span className="pane-card__title">Instructions</span>
          </div>
          {data.orders.map((order, i) => (
            <InstructionGroup key={order.orderId} order={order} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </div>
  )
})

export default InstructionsTab
