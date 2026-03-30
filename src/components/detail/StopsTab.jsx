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
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {items.map((item, idx) => (
        <div
          key={item.label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '14px 20px',
            borderRight: idx < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-primary)',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--text-tertiary)',
              lineHeight: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-primary)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: '20px',
              whiteSpace: 'nowrap',
            }}
          >
            {item.value || '--'}
          </span>
        </div>
      ))}
    </div>
  )
}

function StopCard({ stop, isLast, pickupIndex, deliveryIndex }) {
  const isPickup = stop.type === 'pickup'
  const pdLabel = isPickup ? `P${pickupIndex}` : `D${deliveryIndex}`
  const badgeLabel = isPickup ? 'Pickup' : 'Delivery'

  // Node colors
  const nodeStyle = isPickup
    ? {
        borderColor: 'var(--caribbean-green-600)',
        background: 'var(--caribbean-green-100)',
        color: 'var(--caribbean-green-800)',
      }
    : {
        borderColor: 'var(--carolina-blue-600)',
        background: 'var(--bay-of-many-100)',
        color: 'var(--bay-of-many-950)',
      }

  // Badge colors
  const badgeStyle = isPickup
    ? { background: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' }
    : { background: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' }

  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      {/* Timeline track */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '32px',
          flexShrink: 0,
        }}
      >
        {/* Circle node */}
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-full)',
            border: '2px solid',
            ...nodeStyle,
            flexShrink: 0,
            marginTop: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-primary)',
              fontSize: '11px',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {pdLabel}
          </span>
        </div>
        {/* Vertical connector line */}
        {!isLast && (
          <div
            style={{
              width: '2px',
              flex: 1,
              background: 'var(--border-default)',
              minHeight: '16px',
            }}
          />
        )}
      </div>

      {/* Stop content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: '20px' }}>
        {/* Badge header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span
            style={{
              fontFamily: 'var(--font-primary)',
              fontSize: '12px',
              fontWeight: 600,
              lineHeight: '16px',
              padding: '2px 10px',
              borderRadius: 'var(--radius-sm)',
              ...badgeStyle,
            }}
          >
            {badgeLabel}
          </span>
        </div>

        {/* Detail fields grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px 20px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
          }}
        >
          <Field label="Location" value={stop.location} primary />
          <Field label="Date" value={stop.date} primary />
          <Field label="Appointment" value={stop.appointment} />
          <Field label="Order" value={stop.order} />
          <Field label="Address" value={stop.address} />
          <Field label="Weight" value={stop.weight} />
          <Field label="Volume" value={stop.volume} />
          <Field label="Package Count" value={stop.packageCount} />
          <Field label="Pickup No." value={stop.pickupNo} />
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, primary }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
      <span
        style={{
          fontFamily: 'var(--font-primary)',
          fontSize: '11px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          lineHeight: '14px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-primary)',
          fontSize: primary ? '14px' : '13px',
          fontWeight: primary ? 600 : 500,
          color: 'var(--text-primary)',
          lineHeight: '18px',
          wordBreak: 'break-word',
        }}
      >
        {value || '--'}
      </span>
    </div>
  )
}

export default function StopsTab({ data }) {
  if (!data)
    return (
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-placeholder)' }}>
        No stops data available.
      </div>
    )

  const { summary, stops } = data

  return (
    <div
      style={{
        margin: 'calc(-1 * var(--spacing-4)) calc(-1 * var(--spacing-5))',
      }}
    >
      <SummaryBar summary={summary} />
      <div
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {(() => {
          let pCount = 0, dCount = 0
          return stops.map((stop, idx) => {
            if (stop.type === 'pickup') pCount++
            else dCount++
            return (
              <StopCard
                key={stop.stopNumber}
                stop={stop}
                isLast={idx === stops.length - 1}
                pickupIndex={pCount}
                deliveryIndex={dCount}
              />
            )
          })
        })()}
      </div>
    </div>
  )
}
