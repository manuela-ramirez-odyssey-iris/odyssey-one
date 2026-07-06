import React from 'react'
import { Check } from 'lucide-react'
import { SummaryStrip } from '@odyssey/ui'

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
function Field({ label, value, primary }) {
  return (
    <div className="stops-field">
      <span className="stops-field__label">{label}</span>
      <span className={`stops-field__value${primary ? ' stops-field__value--primary' : ''}`}>
        {value || '--'}
      </span>
    </div>
  )
}

// ── Single stop card ───────────────────────────────────────────────────────
function StopItem({ stop, isLast, pickupIndex, deliveryIndex }) {
  const isPickup = stop.type === 'pickup'
  const pdLabel  = isPickup ? `P${pickupIndex}` : `D${deliveryIndex}`

  return (
    <div className="stops-item">
      {/* Timeline track: node + optional connector */}
      <div className="stops-item__track" aria-hidden="true">
        <div className={`stops-item__node stops-item__node--${isPickup ? 'pickup' : 'delivery'}`}>
          <span className="stops-item__node-label">{pdLabel}</span>
          <Check size={10} strokeWidth={3} aria-hidden="true" />
        </div>
        {!isLast && <div className="stops-item__connector" />}
      </div>

      {/* Content */}
      <div className="stops-item__content">
        {/* Header: "stop N" + type badge */}
        <div className="stops-item__header">
          <span className="stops-item__stop-label">stop {stop.stopNumber}</span>
          <span className={`stops-item__badge stops-item__badge--${isPickup ? 'pickup' : 'delivery'}`}>
            {isPickup ? 'Pickup' : 'Delivery'}
          </span>
        </div>

        {/* 3-col field grid */}
        <div className="stops-item__fields">
          <Field label="Location"      value={stop.location}     primary />
          <Field label="Date"          value={stop.date}          primary />
          <Field label="Appointment"   value={stop.appointment} />
          <Field label="Order"         value={stop.order} />
          <Field label="Address"       value={stop.address} />
          <Field label="Weight"        value={stop.weight} />
          <Field label="Volume"        value={stop.volume} />
          <Field label="Package Count" value={stop.packageCount} />
          {isPickup && <Field label="Pickup No." value={stop.pickupNo} />}
        </div>
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────
const StopsTab = React.memo(function StopsTab({ data }) {
  if (!data)
    return (
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-placeholder)', padding: 'var(--spacing-4)' }}>
        No stops data available.
      </div>
    )

  const { summary, stops } = data

  // Sequential counters for P/D labels
  let pCount = 0
  let dCount = 0

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

          <div className="stops-timeline" role="list" aria-label="All stops">
            {stops.map((stop, idx) => {
              if (stop.type === 'pickup') pCount++
              else dCount++
              return (
                <div key={stop.stopNumber} role="listitem">
                  <StopItem
                    stop={stop}
                    isLast={idx === stops.length - 1}
                    pickupIndex={pCount}
                    deliveryIndex={dCount}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
})

export default StopsTab
