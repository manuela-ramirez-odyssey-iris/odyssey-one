import React, { useState } from 'react'
import { TriangleAlert, ArrowRight } from 'lucide-react'
import { Badge, Button, HeaderStrip, SummaryStrip, Timeline, TitleSubtitle } from '@odyssey/ui'
import { ICON_MD } from '@odyssey/tokens'
import PaneEmpty from './PaneEmpty'
import TooltipTrigger from '../ui/TooltipTrigger.jsx'
import { DiffValue } from '../shipments/order-change/comparisonHelpers.jsx'
import PlanningDatesModal from './order-change/PlanningDatesModal.jsx'
import ViewRoutingModal from './order-change/ViewRoutingModal.jsx'
import OrderCompareModal from './order-change/OrderCompareModal.jsx'

// Stops pane — All Stops card per Figma 4273:15227 (S80 redesign, sourced
// from Tracking's old-library screen): @odyssey/ui Timeline (StopBadge rail +
// animated progress fill) with per-stop 3×3 field grids. Copy icons from the
// mock intentionally dropped (not needed in Shipments). KPI band stays
// (SummaryStrip, S79e).
//
// S142/LINX-15435/15436: when a consolidated order change is under review
// (`orderChange.consolidation` set and `orderChange.resolution` still null),
// this same tab becomes the review screen for that plan (Laura's VD, Figma
// `x38TOJGsNryYl3LsKhCtSc` node 1910-31512): KPI cells grow Prior/New pairs
// for changed values, the All Stops card gains an actions/cost head row, and
// each stop badges its changed fields + lists its Affected Orders. Once
// `resolution` is set (or there's no consolidation at all) the tab renders
// exactly as before — plain-mode markup below is untouched.

// Warning-triangle DiffValue — the Stops-tab review's own diff signal on top
// of the Direct review's shared purple-badge helper (comparisonHelpers.jsx).
const Changed = ({ children }) => (
  <DiffValue value={children} changed leftIcon={<TriangleAlert {...ICON_MD} aria-hidden="true" />} />
)

const ComingSoon = ({ children }) => (
  <TooltipTrigger tooltipProps={{ groups: [{ content: 'Coming soon' }] }}>{children}</TooltipTrigger>
)

// ── KPI strip (SummaryStrip staging, S79e — Figma `Overview` 4178:8365) ─────
function KpiStrip({ summary, changes }) {
  // LINX-15435: "Distance, Gross Weight, and Volume shall display Prior and
  // New values when changed. If a value has not changed, only the current
  // value shall be displayed."
  const cell = (key, label, value) => {
    const c = changes?.[key]
    if (!c) return { label, value }
    return {
      label,
      value: (
        <span className="stops-kpi__pair">
          <span className="stops-kpi__pair-row"><Badge variant="gray">Prior</Badge>{c.prior}</span>
          <span className="stops-kpi__pair-row"><Badge variant="purple">New</Badge>{c.new}</span>
        </span>
      ),
    }
  }
  const items = [
    cell('distance', 'Distance', summary.distance),
    cell('grossWeight', 'Gross Weight', summary.grossWeight),
    cell('volume', 'Volume', summary.volume),
    { label: 'Accepted Carrier', value: summary.acceptedCarrier },
    { label: 'Seed Equipment', value: summary.seedEquipment },
    { label: 'Utilization', value: summary.utilization },
  ]
  return <SummaryStrip items={items} aria-label="Shipment KPIs" />
}

// ── Field (label + value pair) — plain mode only, untouched ─────────────────
function Field({ label, value }) {
  return (
    <div className="stops-field">
      <span className="stops-field__label">{label}:</span>
      <span className="stops-field__value">{value || '--'}</span>
    </div>
  )
}

// ── Review-mode field (TitleSubtitle; badges the value when changed) ───────
// `change.prior` is intentionally not rendered here — the prior value lives
// in the KPI band per the VD, not repeated on every per-stop field.
function ReviewField({ label, value, change }) {
  return change
    ? <TitleSubtitle subtitle={label} badge={<Changed>{change.new}</Changed>} />
    : <TitleSubtitle subtitle={label} title={value || '--'} />
}

// Order cell lists every order id on the stop; changed ids (per
// consolidation.stopChanges[stop].changedOrderIds) badge, the rest stay plain.
function OrderField({ orderIds, changedIds }) {
  const ids = orderIds?.length ? orderIds : ['--']
  return (
    <TitleSubtitle
      subtitle="Order"
      title={ids.map((id, i) => (
        <React.Fragment key={id}>
          {i > 0 && ', '}
          {changedIds?.includes(id) ? <Changed>{id}</Changed> : <span>{id}</span>}
        </React.Fragment>
      ))}
    />
  )
}

// ── Per-stop content block (right of the Timeline rail) — plain mode ───────
function StopContent({ stop }) {
  const isPickup = stop.type === 'pickup'
  return (
    <>
      {/* Header: "stop N" + type badge — both types green per the mock */}
      <div className="stops-item__header">
        <span className="stops-item__stop-label">stop {stop.stopNumber}</span>
        <Badge variant="green">{isPickup ? 'Pickup' : 'Delivery'}</Badge>
      </div>

      {/* 3-col field grid, rows: Location/Date/Appointment · Order/Address/
          Weight · Volume/PackageCount/PickupNo (mock order) */}
      <div className="stops-item__fields">
        <Field label="Location"      value={stop.location} />
        <Field label="Date"          value={stop.date} />
        <Field label="Appointment"   value={stop.appointment} />
        <Field label="Order"         value={stop.order} />
        <Field label="Address"       value={stop.address} />
        <Field label="Weight"        value={stop.weight} />
        <Field label="Volume"        value={stop.volume} />
        <Field label="Package Count" value={stop.packageCount} />
        {isPickup && <Field label="Pickup No." value={stop.pickupNo} />}
      </div>
    </>
  )
}

// ── Per-stop content block — review mode: stop card + 227px "Affected
// Orders" aside (LINX-15435/15436). ───────────────────────────────────────
function ReviewStopContent({ stop, stopChange, onOpenOrder }) {
  const isPickup = stop.type === 'pickup'
  const fields = stopChange?.fields || {}
  const changedIds = stopChange?.changedOrderIds || []
  const affected = (stop.orderIds || []).filter((id) => changedIds.includes(id))

  return (
    <div className="stops-item">
      <div className="stops-item__main">
        <HeaderStrip title={`Stop ${stop.stopNumber}`} badge={<Badge variant="green">{isPickup ? 'Pickup' : 'Delivery'}</Badge>} />
        <div className="stops-item__fields">
          <ReviewField label="Location"      value={stop.location} change={fields.location} />
          <ReviewField label="Date"          value={stop.date} change={fields.date} />
          <ReviewField label="Appointment"   value={stop.appointment} />
          <OrderField orderIds={stop.orderIds} changedIds={changedIds} />
          <ReviewField label="Address"       value={stop.address} />
          <ReviewField label="Weight"        value={stop.weight} change={fields.weight} />
          <ReviewField label="Volume"        value={stop.volume} change={fields.volume} />
          <ReviewField label="Package Count" value={stop.packageCount} change={fields.packageCount} />
          {isPickup && <ReviewField label="PickUp no." value={stop.pickupNo} />}
        </div>
      </div>
      <div className="stops-item__affected">
        <HeaderStrip title="Affected Orders" />
        {affected.length > 0 ? (
          <div className="stops-item__order-list">
            {affected.map((id) => (
              <div className="stops-item__affected-row" key={id}>
                <Button variant="link" iconRight={<ArrowRight {...ICON_MD} />} onClick={() => onOpenOrder(id)}>{id}</Button>
              </div>
            ))}
          </div>
        ) : (
          <span className="stops-item__affected-empty">--</span>
        )}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────
const StopsTab = React.memo(function StopsTab({ data, orderChange, orderDetails = [], shipment }) {
  const [modal, setModal] = useState(null) // 'planning' | 'routing' | { order: id }
  if (!data) return <PaneEmpty message="No stops data available." col="medium" />

  const { summary, stops } = data
  const c = orderChange?.consolidation
  // Review mode: only while a consolidation plan is pending a decision — once
  // resolved (or there never was one) the tab is the plain read-only pane.
  const review = !!c && !orderChange?.resolution
  const routingBlocked = review && c.locationChange // LINX-15438

  // Timeline items — P/D labels from sequential counters; stop status comes
  // from Tracking when wired ('completed' | 'issue' | 'pending'); the
  // generator has no per-stop status yet, so default is completed (mock).
  // In review mode a stop carrying a change surfaces as 'issue' on the rail.
  let pCount = 0
  let dCount = 0
  const items = stops.map((stop, idx) => {
    const isPickup = stop.type === 'pickup'
    if (isPickup) pCount++
    else dCount++
    const stopChange = review ? c.stopChanges?.[String(stop.stopNumber)] : null
    return {
      key: stop.stopNumber ?? idx,
      label: isPickup ? `P${pCount}` : `D${dCount}`,
      status: stopChange ? 'issue' : (stop.status || 'completed'),
      content: review
        ? <ReviewStopContent stop={stop} stopChange={stopChange} onOpenOrder={(id) => setModal({ order: id })} />
        : <StopContent stop={stop} />,
    }
  })

  return (
    <div className="pane-canvas">
      {/* Full-width KPI strip — sits on canvas, outside .pane-col */}
      <KpiStrip summary={summary} changes={review ? c.summaryChanges : null} />

      {/* Centered medium-tier column */}
      <div className="pane-col pane-col--medium">
        {/* All Stops card */}
        <div className="pane-card">
          <div className="pane-card__header">
            <h2 className="pane-card__title">All Stops</h2>
            {review && (
              <div className="stops-review__actions">
                {/* Part 2 — Edit Shipment Stops; on hold pending a VD — Approve Plan */}
                <ComingSoon><Button variant="secondary" disabled>Edit Shipment Stops</Button></ComingSoon>
                <ComingSoon><Button variant="primary" disabled>Approve Plan</Button></ComingSoon>
              </div>
            )}
          </div>

          {review && (
            <div className="stops-review__head">
              <div className="stops-review__costs">
                <TitleSubtitle subtitle="Prior Cost" title={c.costs?.prior} />
                <TitleSubtitle subtitle="New Direct Cost" title={c.costs?.newDirect} />
                <TitleSubtitle subtitle="New Consolidated Cost" title={c.costs?.newConsolidated} />
              </div>
              <div className="stops-review__actions">
                <Button variant="secondary" onClick={() => setModal('planning')}>View Planning Dates</Button>
                {routingBlocked ? (
                  <TooltipTrigger tooltipProps={{ groups: [{ content: 'Finalize stop changes in Edit Shipment Stops first' }] }}>
                    <Button variant="secondary" disabled>View Routing</Button>
                  </TooltipTrigger>
                ) : (
                  <Button variant="secondary" onClick={() => setModal('routing')}>View Routing</Button>
                )}
              </div>
            </div>
          )}

          <Timeline animate items={items} className={`stops-timeline${review ? ' stops-timeline--review' : ''}`} aria-label="All stops" />
        </div>
      </div>

      {/* Test-observable marker for which modal is open. */}
      {modal && <div hidden data-open-modal={typeof modal === 'string' ? modal : `order:${modal.order}`} />}
      {modal === 'planning' && <PlanningDatesModal orders={orderDetails} onClose={() => setModal(null)} />}
      {modal === 'routing' && <ViewRoutingModal orderChange={orderChange} onClose={() => setModal(null)} />}
      {modal?.order && <OrderCompareModal orderId={modal.order} rows={c?.orderComparisons?.[modal.order] ?? []} onClose={() => setModal(null)} />}
    </div>
  )
})

export default StopsTab
