import React, { useState, useEffect } from 'react'
import { Lock, ChevronsUpDown } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Tab, Button, SummaryStrip, GroupTable } from '@odyssey/ui'

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

// Child charge lines from the order VM fields (the rows of a GroupTable group).
function chargeLines(order) {
  return [
    { label: 'Base',     ap: order.apBase,     ar: order.arBase },
    { label: 'Fuel',     ap: order.apFuel,     ar: order.arFuel },
    { label: 'Discount', ap: order.apDiscount, ar: order.arDiscount },
    { label: 'HZC',      ap: order.apHzc,      ar: order.arHzc },
    { label: 'SOC',      ap: order.apSoc,      ar: order.arSoc },
  ].filter(line => line.ap !== '--' || line.ar !== '--')
}

// ── sub-components ────────────────────────────────────────────────────────────

function DiffCell({ value }) {
  const positive = diffIsPositive(value)
  let cls = 'cost-table__diff'
  if (positive === true) cls += ' cost-table__diff--positive'
  if (positive === false) cls += ' cost-table__diff--negative'
  return <span className={cls}>{value || '--'}</span>
}

// ── Compare AP/AR (GroupTable, staging S79e) ─────────────────────────────────

const COST_COLUMNS = [
  { key: 'label', label: 'Order' },
  { key: 'ap',    label: 'AP (Carrier)',  align: 'right' },
  { key: 'ar',    label: 'AR (Customer)', align: 'right' },
  { key: 'diff',  label: 'Diff',          align: 'right' },
]

function renderCostCell(row, col) {
  if (col.key === 'diff') return <DiffCell value={computeDiff(row.ap, row.ar)} />
  return row[col.key] ?? '--'
}

/**
 * The Compare AP/AR table — a GroupTable: one group per order (label = the
 * order id), charge lines as child rows, TOTAL (order-level AP/AR sums,
 * Diff = AR − AP) as the bold footer row.
 */
function CompareTable({ orders, expanded, onToggle }) {
  const totalAp = orders.reduce((sum, o) => sum + (parseDollar(o.apCost) ?? 0), 0)
  const totalAr = orders.reduce((sum, o) => sum + (parseDollar(o.arCost) ?? 0), 0)
  const totalDiff = totalAr - totalAp

  const groups = orders.map((order) => {
    // Per-order header values: AP/AR from the order VM's top-level cost fields;
    // Diff = AR − AP, shown on the group header row (visible collapsed + expanded).
    const orderApStr = order.apCost ?? '--'
    const orderArStr = order.arCost ?? '--'
    const orderDiffStr = computeDiff(orderApStr, orderArStr)
    return {
      id: order.orderId,
      label: order.orderId,
      rows: chargeLines(order),
      values: {
        ap: orderApStr,
        ar: orderArStr,
        diff: <DiffCell value={orderDiffStr} />,
      },
    }
  })

  const footerRow = {
    label: 'TOTAL',
    ap: `${fmtDollar(totalAp)} USD`,
    ar: `${fmtDollar(totalAr)} USD`,
    diff: <DiffCell value={(totalDiff >= 0 ? '+' : '') + fmtDollar(totalDiff)} />,
  }

  return (
    <GroupTable
      columns={COST_COLUMNS}
      groups={groups}
      renderCell={renderCostCell}
      footerRow={footerRow}
      expanded={expanded}
      onToggle={onToggle}
      aria-label="Compare AP/AR by order"
    />
  )
}

// ── main component ────────────────────────────────────────────────────────────

const CostAllocationTab = React.memo(function CostAllocationTab({ data }) {
  const [subTab, setSubTab] = useState('planned')
  // Expanded map keyed by orderId — controlled into GroupTable so Expand All
  // and the per-order row toggles share one source of truth. Starts collapsed.
  const [expandedOrders, setExpandedOrders] = useState({})

  useEffect(() => {
    setExpandedOrders({})
  }, [data])

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
  const orders = planned?.orders ?? []
  const allExpanded = orders.length > 0 && orders.every((o) => !!expandedOrders[o.orderId])

  const toggleAll = () => {
    const next = !allExpanded
    const updated = {}
    orders.forEach((o) => { updated[o.orderId] = next })
    setExpandedOrders(updated)
  }

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
          {/* Row 2: full-width KPI band (SummaryStrip staging, S79e — Figma `Overview` 4178:8365) */}
          {planned?.summary && (
            <SummaryStrip
              aria-label="Cost summary"
              items={[
                { label: 'Base',         value: planned.summary.base },
                { label: 'Discount',     value: planned.summary.discount, tone: 'negative' },
                { label: 'Fuel (FSC)',   value: planned.summary.fuel },
                { label: 'Accessorials', value: planned.summary.accessorials },
                { label: 'AP Total',     value: planned.summary.apTotal },
                { label: 'AR Total',     value: planned.summary.arTotal },
                { label: 'Margin',       value: planned.summary.margin, tone: 'positive' },
              ]}
            />
          )}

          {/* Row 3: narrow card with Compare AP/AR table */}
          <div className="pane-col pane-col--narrow">
            <div className="pane-card">
              <div className="pane-card__header">
                <h2 className="pane-card__title">Compare AP/AR</h2>
                {orders.length > 0 && (
                  <Button
                    variant="link"
                    iconRight={<ChevronsUpDown {...ICON_MD} />}
                    onClick={toggleAll}
                    aria-pressed={allExpanded}
                  >
                    {allExpanded ? 'Collapse All' : 'Expand All'}
                  </Button>
                )}
              </div>

              {orders.length > 0 ? (
                <CompareTable
                  orders={orders}
                  expanded={expandedOrders}
                  onToggle={(orderId, next) =>
                    setExpandedOrders((prev) => ({ ...prev, [orderId]: next }))
                  }
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
