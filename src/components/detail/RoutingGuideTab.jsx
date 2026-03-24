import { useState } from 'react'

const STATUS_STYLES = {
  Accepted: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  Pending: { bg: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' },
  Rejected: { bg: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' },
  Declined: { bg: 'var(--bg-tertiary)', color: 'var(--text-placeholder)' },
}

const COLUMNS = [
  { key: 'rank', label: '#', width: 40 },
  { key: 'routeRank', label: 'Route Rank', width: 80 },
  { key: 'scac', label: 'SCAC', width: 70 },
  { key: 'carrierName', label: 'Carrier Name', width: 180 },
  { key: 'rate', label: 'Rate', width: 100 },
  { key: 'cost', label: 'Cost', width: 110 },
  { key: 'status', label: 'Status', width: 100 },
  { key: 'pickupDateTime', label: 'Pickup Date/Time', width: 160 },
  { key: 'pickupOrgHours', label: 'Pickup Org Hours', width: 130 },
  { key: 'pickupOrgDay', label: 'Pickup Org Day', width: 100 },
  { key: 'deliveryDateTime', label: 'Delivery Date/Time', width: 160 },
  { key: 'deliveryOrgHours', label: 'Del. Org Hours', width: 130 },
  { key: 'transit', label: 'Transit', width: 80 },
  { key: 'distance', label: 'Distance', width: 100 },
  { key: 'sl', label: 'SL', width: 60 },
  { key: 'linehaul', label: 'Linehaul', width: 100 },
  { key: 'routeGroup', label: 'Route Group', width: 100 },
  { key: 'api', label: 'API', width: 70 },
  { key: 'notifyDateTime', label: 'Notify Date/Time', width: 160 },
  { key: 'responseMethod', label: 'Response Method', width: 140 },
  { key: 'responseDateTime', label: 'Response Date/Time', width: 160 },
  { key: 'carrierPickup', label: 'Carrier Pickup', width: 120 },
  { key: 'deliveryNum', label: 'Delivery Num', width: 120 },
  { key: 'transitTimeSource', label: 'Transit Source', width: 110 },
  { key: 'description', label: 'Description', width: 180 },
]

const thStyle = {
  padding: '8px 10px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-placeholder)',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-subtle)',
  position: 'sticky',
  top: 0,
  zIndex: 2,
}

const tdStyle = {
  padding: '8px 10px',
  whiteSpace: 'nowrap',
  fontSize: 13,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--bg-tertiary)',
}

export default function RoutingGuideTab({ data }) {
  const [selectedRank, setSelectedRank] = useState(() => {
    if (!data?.options) return null
    const accepted = data.options.find((o) => o.status === 'Accepted')
    return accepted ? accepted.rank : null
  })

  if (!data?.options) return <div className="text-sm" style={{ color: 'var(--text-placeholder)' }}>No routing data available.</div>

  return (
    <div className="overflow-auto" style={{ maxHeight: '100%' }}>
      <table className="w-full border-collapse" style={{ minWidth: 2400, fontFamily: 'var(--font-primary)' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 40 }} />
            {COLUMNS.map((col) => (
              <th key={col.key} style={{ ...thStyle, width: col.width }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.options.map((option) => {
            const isSelected = selectedRank === option.rank
            return (
              <tr
                key={option.rank}
                onClick={() => setSelectedRank(option.rank)}
                className="cursor-pointer"
                style={{
                  background: isSelected ? 'var(--badge-blue-bg)' : 'var(--bg-primary)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'var(--badge-blue-bg)' : 'var(--bg-primary)' }}
              >
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <input
                    type="radio"
                    name="routing-selection"
                    checked={isSelected}
                    onChange={() => setSelectedRank(option.rank)}
                    style={{ accentColor: 'var(--border-focus)', cursor: 'pointer' }}
                  />
                </td>
                {COLUMNS.map((col) => (
                  <td key={col.key} style={tdStyle}>
                    {col.key === 'status' ? (
                      <StatusBadge status={option.status} />
                    ) : (
                      option[col.key] ?? '--'
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Declined
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5"
      style={{ borderRadius: 'var(--radius-sm)', background: style.bg, color: style.color }}
    >
      {status}
    </span>
  )
}
