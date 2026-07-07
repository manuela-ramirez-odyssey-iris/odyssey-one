import React from 'react'
import { Badge, SummaryStrip, Timeline } from '@odyssey/ui'
import PaneEmpty from './PaneEmpty'

// Stops pane — All Stops card per Figma 4273:15227 (S80 redesign, sourced
// from Tracking's old-library screen): @odyssey/ui Timeline (StopBadge rail +
// animated progress fill) with per-stop 3×3 field grids. Copy icons from the
// mock intentionally dropped (not needed in Shipments). KPI band stays
// (SummaryStrip, S79e).

// ── KPI strip (SummaryStrip staging, S79e — Figma `Overview` 4178:8365) ─────
function KpiStrip({ summary }) {
  const items = [
    { label: 'Distance',         value: summary.distance },
    { label: 'Gross Weight',     value: summary.grossWeight },
    { label: 'Volume',           value: summary.volume },
    { label: 'Accepted Carrier', value: summary.acceptedCarrier },
    { label: 'Seed Equipment',   value: summary.seedEquipment },
    { label: 'Utilization',      value: summary.utilization },
  ]
  return <SummaryStrip items={items} aria-label="Shipment KPIs" />
}

// ── Field (label + value pair) ─────────────────────────────────────────────
function Field({ label, value }) {
  return (
    <div className="stops-field">
      <span className="stops-field__label">{label}:</span>
      <span className="stops-field__value">{value || '--'}</span>
    </div>
  )
}

// ── Per-stop content block (right of the Timeline rail) ────────────────────
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

// ── Main export ────────────────────────────────────────────────────────────
const StopsTab = React.memo(function StopsTab({ data }) {
  if (!data) return <PaneEmpty message="No stops data available." col="medium" />

  const { summary, stops } = data

  // Timeline items — P/D labels from sequential counters; stop status comes
  // from Tracking when wired ('completed' | 'issue' | 'pending'); the
  // generator has no per-stop status yet, so default is completed (mock).
  let pCount = 0
  let dCount = 0
  const items = stops.map((stop, idx) => {
    const isPickup = stop.type === 'pickup'
    if (isPickup) pCount++
    else dCount++
    return {
      key: stop.stopNumber ?? idx,
      label: isPickup ? `P${pCount}` : `D${dCount}`,
      status: stop.status || 'completed',
      content: <StopContent stop={stop} />,
    }
  })

  return (
    <div className="pane-canvas">
      {/* Full-width KPI strip — sits on canvas, outside .pane-col */}
      <KpiStrip summary={summary} />

      {/* Centered medium-tier column */}
      <div className="pane-col pane-col--medium">
        {/* All Stops card */}
        <div className="pane-card">
          <div className="pane-card__header">
            <h2 className="pane-card__title">All Stops</h2>
          </div>

          <Timeline animate items={items} className="stops-timeline" aria-label="All stops" />
        </div>
      </div>
    </div>
  )
})

export default StopsTab
