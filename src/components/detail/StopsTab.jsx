function SummaryBar({ summary }) {
  const items = [
    { label: 'Distance', value: summary.distance },
    { label: 'Gross Weight', value: summary.grossWeight },
    { label: 'Volume', value: summary.volume },
    { label: 'Accepted Carrier', value: summary.acceptedCarrier },
    { label: 'Seed Equipment', value: summary.seedEquipment },
    { label: 'Utilization', value: summary.utilization },
  ]

  return (
    <div
      className="flex items-center gap-6 flex-wrap"
      style={{
        padding: '10px 16px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 20,
      }}
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>
            {item.label}:
          </span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {item.value || '--'}
          </span>
        </div>
      ))}
    </div>
  )
}

function StopNode({ stop, isLast }) {
  const isPickup = stop.type === 'pickup'
  const nodeColor = isPickup ? 'var(--caribbean-green-600)' : 'var(--carolina-blue-600)'
  const nodeBg = isPickup ? 'var(--caribbean-green-100)' : 'var(--bay-of-many-100)'
  const badgeLabel = isPickup ? 'Pickup' : 'Delivery'

  return (
    <div className="flex gap-4" style={{ position: 'relative', paddingBottom: isLast ? 0 : 24 }}>
      {/* Timeline line + node */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 32 }}>
        <div
          className="flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-full)',
            background: nodeBg,
            color: nodeColor,
            border: `2px solid ${nodeColor}`,
          }}
        >
          {stop.stopNumber}
        </div>
        {!isLast && (
          <div
            className="flex-1"
            style={{ width: 2, background: 'var(--border-subtle)', minHeight: 24 }}
          />
        )}
      </div>

      {/* Stop content */}
      <div className="flex-1 pb-2" style={{ minWidth: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-xs font-semibold px-2 py-0.5"
            style={{
              borderRadius: 'var(--radius-sm)',
              background: nodeBg,
              color: nodeColor,
            }}
          >
            {badgeLabel}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>
            Stop {stop.stopNumber}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-x-6 gap-y-2">
          <Field label="Order" value={stop.order} />
          <Field label="Location" value={stop.location} />
          <Field label="Address" value={stop.address} />
          <Field label="Date" value={stop.date} />
          <Field label="Appointment" value={stop.appointment} />
          <Field label="Weight" value={stop.weight} />
          <Field label="Volume" value={stop.volume} />
          <Field label="Package Count" value={stop.packageCount} />
          <Field label="Pickup No" value={stop.pickupNo} />
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--text-placeholder)', marginBottom: 1 }}>
        {label}
      </div>
      <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {value || '--'}
      </div>
    </div>
  )
}

export default function StopsTab({ data }) {
  if (!data) return <div className="text-sm" style={{ color: 'var(--text-placeholder)' }}>No stops data available.</div>

  const { summary, stops } = data

  return (
    <div>
      <SummaryBar summary={summary} />
      <div>
        {stops.map((stop, idx) => (
          <StopNode key={stop.stopNumber} stop={stop} isLast={idx === stops.length - 1} />
        ))}
      </div>
    </div>
  )
}
