import React, { useState } from 'react'
import { Lock, ChevronRight, ChevronDown } from 'lucide-react'
import { Tab, Button } from '@odyssey/ui'

// ── helpers ──────────────────────────────────────────────────────────────────

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

/**
 * Diff = AR − AP.  Returns a formatted string with sign prefix (+/-) or '--'.
 */
function computeDiff(apStr, arStr) {
  const ap = parseDollar(apStr)
  const ar = parseDollar(arStr)
  if (ap == null && ar == null) return '--'
  const diff = (ar ?? 0) - (ap ?? 0)
  return (diff >= 0 ? '+' : '') + fmtDollar(diff)
}

function diffIsPositive(diffStr) {
  if (!diffStr || diffStr === '--') return null
  return !diffStr.startsWith('-')
}

// ── sub-components ────────────────────────────────────────────────────────────

function KpiCell({ label, value, modifier }) {
  return (
    <div className="pane-kpis__cell">
      <span className="pane-kpis__label">{label}</span>
      <span className={['pane-kpis__value', modifier].filter(Boolean).join(' ')}>
        {value || '--'}
      </span>
    </div>
  )
}

function DiffCell({ value }) {
  const positive = diffIsPositive(value)
  let cls = 'cost-table__diff'
  if (positive === true) cls += ' cost-table__diff--positive'
  if (positive === false) cls += ' cost-table__diff--negative'
  return <span className={cls}>{value || '--'}</span>
}

/**
 * A single expandable order row + its charge-line children.
 */
function OrderRow({ order, expanded, onToggle, isFirst }) {
  const diff = computeDiff(order.apCost, order.arCost)

  // Build child charge lines from the order VM fields
  const chargeLines = [
    { label: 'Base',     ap: order.apBase,     ar: order.arBase },
    { label: 'Fuel',     ap: order.apFuel,     ar: order.arFuel },
    { label: 'Discount', ap: order.apDiscount, ar: order.arDiscount },
    { label: 'HZC',      ap: order.apHzc,      ar: order.arHzc },
    { label: 'SOC',      ap: order.apSoc,      ar: order.arSoc },
  ].filter(line => line.ap !== '--' || line.ar !== '--')

  return (
    <>
      {/* Parent (order) row */}
      <tr
        className={`cost-table__order-row${isFirst ? ' cost-table__order-row--first' : ''}`}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <td className="cost-table__cell cost-table__cell--order">
          <span className="cost-table__chevron" aria-hidden="true">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          {order.orderId}
        </td>
        <td className="cost-table__cell cost-table__cell--num">{order.apCost}</td>
        <td className="cost-table__cell cost-table__cell--num">{order.arCost}</td>
        <td className="cost-table__cell cost-table__cell--num">
          <DiffCell value={diff} />
        </td>
      </tr>

      {/* Child charge-line rows */}
      {expanded && chargeLines.map((line, i) => {
        const childDiff = computeDiff(line.ap, line.ar)
        return (
          <tr key={line.label} className={`cost-table__charge-row${i % 2 === 0 ? ' cost-table__charge-row--stripe' : ''}`}>
            <td className="cost-table__cell cost-table__cell--charge">{line.label}</td>
            <td className="cost-table__cell cost-table__cell--num cost-table__cell--muted">{line.ap}</td>
            <td className="cost-table__cell cost-table__cell--num cost-table__cell--muted">{line.ar}</td>
            <td className="cost-table__cell cost-table__cell--num cost-table__cell--muted">
              <DiffCell value={childDiff} />
            </td>
          </tr>
        )
      })}
    </>
  )
}

/**
 * The full Compare AP/AR table: order parent rows + charge-line children + TOTAL.
 */
function CompareTable({ orders, allExpanded }) {
  const [expandedSet, setExpandedSet] = useState(new Set())

  // Sync allExpanded toggle: derive actual expanded state
  const isExpanded = (orderId) => allExpanded || expandedSet.has(orderId)

  const toggle = (orderId) => {
    setExpandedSet(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  // TOTAL row: sum AP and AR across all orders; Diff = AR − AP
  const totalAp = orders.reduce((sum, o) => {
    const n = parseDollar(o.apCost)
    return sum + (n ?? 0)
  }, 0)
  const totalAr = orders.reduce((sum, o) => {
    const n = parseDollar(o.arCost)
    return sum + (n ?? 0)
  }, 0)
  const totalDiff = totalAr - totalAp

  return (
    <table className="cost-table" role="table">
      <thead>
        <tr className="cost-table__head-row">
          <th className="cost-table__th cost-table__th--order">Order</th>
          <th className="cost-table__th cost-table__th--num">AP (Carrier)</th>
          <th className="cost-table__th cost-table__th--num">AR (Customer)</th>
          <th className="cost-table__th cost-table__th--num">Diff</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order, i) => (
          <OrderRow
            key={order.orderId}
            order={order}
            expanded={isExpanded(order.orderId)}
            onToggle={() => toggle(order.orderId)}
            isFirst={i === 0}
          />
        ))}
        {/* TOTAL row */}
        <tr className="cost-table__total-row">
          <td className="cost-table__cell cost-table__cell--total-label">TOTAL</td>
          <td className="cost-table__cell cost-table__cell--num cost-table__cell--total">{fmtDollar(totalAp)} USD</td>
          <td className="cost-table__cell cost-table__cell--num cost-table__cell--total">{fmtDollar(totalAr)} USD</td>
          <td className="cost-table__cell cost-table__cell--num cost-table__cell--total">
            <DiffCell value={(totalDiff >= 0 ? '+' : '') + fmtDollar(totalDiff)} />
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// ── main component ────────────────────────────────────────────────────────────

const CostAllocationTab = React.memo(function CostAllocationTab({ data }) {
  const [subTab, setSubTab] = useState('planned')
  const [allExpanded, setAllExpanded] = useState(false)

  if (!data) return (
    <div className="pane-canvas">
      <div className="pane-col pane-col--narrow">
        <span style={{ color: 'var(--text-placeholder)', fontSize: 'var(--font-size-sm)' }}>
          No cost data available.
        </span>
      </div>
    </div>
  )

  const planned = data.planned

  return (
    <div className="pane-canvas cost-pane">
      {/* Row 1: underline Tab group */}
      <div className="cost-pane__tab-row">
        <div className="tab-group" role="tablist" aria-label="Cost view">
          <Tab
            label="Planned Cost"
            current={subTab === 'planned'}
            onClick={() => setSubTab('planned')}
            aria-selected={subTab === 'planned'}
            role="tab"
          />
          <Tab
            label="Completed Cost"
            current={subTab === 'completed'}
            onClick={() => setSubTab('completed')}
            aria-selected={subTab === 'completed'}
            role="tab"
          />
        </div>
      </div>

      {subTab === 'completed' ? (
        /* Completed — locked state */
        <div className="cost-pane__locked" role="status">
          <Lock size={32} aria-hidden="true" style={{ color: 'var(--text-placeholder)' }} />
          <p>Available after PGI/PGR is received</p>
        </div>
      ) : (
        <>
          {/* Row 2: full-width KPI band */}
          {planned?.summary && (
            <div className="pane-kpis" role="region" aria-label="Cost summary">
              <KpiCell label="BASE"          value={planned.summary.base} />
              <KpiCell label="DISCOUNT"      value={planned.summary.discount}    modifier="pane-kpis__value--negative" />
              <KpiCell label="FUEL (FSC)"    value={planned.summary.fuel} />
              <KpiCell label="ACCESSORIALS"  value={planned.summary.accessorials} />
              <KpiCell label="AP TOTAL"      value={planned.summary.apTotal} />
              <KpiCell label="AR TOTAL"      value={planned.summary.arTotal} />
              <KpiCell label="MARGIN"        value={planned.summary.margin}       modifier="pane-kpis__value--positive" />
            </div>
          )}

          {/* Row 3: narrow card with Compare AP/AR table */}
          <div className="pane-col pane-col--narrow">
            <div className="pane-card">
              <div className="pane-card__header">
                <h2 className="pane-card__title">Compare AP/AR</h2>
                {planned?.orders?.length > 0 && (
                  <Button
                    variant="link"
                    onClick={() => setAllExpanded(v => !v)}
                    aria-pressed={allExpanded}
                  >
                    {allExpanded ? 'Collapse All' : 'Expand All'}
                  </Button>
                )}
              </div>

              {planned?.orders?.length > 0 ? (
                <CompareTable
                  orders={planned.orders}
                  allExpanded={allExpanded}
                />
              ) : (
                <p style={{ color: 'var(--text-placeholder)', fontSize: 'var(--font-size-sm)' }}>
                  No order cost data available.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
})

export default CostAllocationTab
