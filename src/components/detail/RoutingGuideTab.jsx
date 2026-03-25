import { useState } from 'react'

const STATUS_STYLES = {
  Accepted: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  Pending: { bg: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' },
  Rejected: { bg: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' },
  Declined: { bg: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' },
}

const COLUMNS = [
  { key: 'rank', label: 'Rank', primary: true },
  { key: 'scac', label: 'SCAC' },
  { key: 'carrierName', label: 'Carrier Name', primary: true },
  { key: 'rate', label: 'Rate' },
  { key: 'cost', label: 'Cost' },
  { key: 'status', label: 'Status' },
  { key: 'pickupDateTime', label: 'Pickup Date / Time' },
  { key: 'pickupTz', label: 'Pickup TZ' },
  { key: 'pickupOrgHours', label: 'Pickup Org Hours' },
  { key: 'pickupOrgDay', label: 'Pickup Org Day' },
  { key: 'deliveryDateTime', label: 'Delivery Date / Time' },
  { key: 'deliveryOrgHours', label: 'Delivery Org Hours' },
  { key: 'deliveryTz', label: 'Delivery TZ' },
  { key: 'transit', label: 'Transit' },
  { key: 'distance', label: 'Distance' },
  { key: 'sl', label: 'SL' },
  { key: 'linehaul', label: 'Linehaul' },
  { key: 'routeGroup', label: 'Route Group' },
  { key: 'api', label: 'API' },
  { key: 'notifyDateTime', label: 'Notify Date / Time' },
  { key: 'responseMethod', label: 'Response Method' },
  { key: 'responseDateTime', label: 'Response Date / Time' },
  { key: 'carrierPickup', label: 'Carrier Pickup #' },
  { key: 'deliveryNum', label: 'Delivery #' },
  { key: 'transitTimeSource', label: 'Transit Time Source' },
  { key: 'description', label: 'Description' },
]

/* Mirrors .product-table th from prototype */
const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-subtle)',
  position: 'sticky',
  top: 0,
  zIndex: 2,
}

/* Mirrors .product-table td from prototype */
const tdStyle = {
  padding: '10px 14px',
  whiteSpace: 'nowrap',
  fontSize: '14px',
  fontWeight: 400,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--bg-tertiary)',
}

/* Mirrors .col-routing-select from prototype */
const selectThStyle = {
  ...thStyle,
  width: '40px',
  textAlign: 'center',
  paddingLeft: '12px',
  paddingRight: '4px',
}

const selectTdStyle = {
  ...tdStyle,
  width: '40px',
  textAlign: 'center',
  paddingLeft: '12px',
  paddingRight: '4px',
}

export default function RoutingGuideTab({ data }) {
  const [selectedRank, setSelectedRank] = useState(() => {
    if (!data?.options) return null
    const accepted = data.options.find((o) => o.status === 'Accepted')
    return accepted ? accepted.rank : null
  })

  if (!data?.options) return <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-placeholder)' }}>No routing data available.</div>

  const handleRowClick = (rank) => {
    setSelectedRank(rank)
  }

  return (
    <div
      style={{
        margin: 'calc(-1 * var(--spacing-4)) calc(-1 * var(--spacing-5))',
        overflow: 'auto',
        height: 'calc(100% + var(--spacing-4) * 2)',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'var(--font-primary)',
          fontSize: '14px',
          color: 'var(--text-secondary)',
        }}
      >
        <thead>
          <tr>
            <th style={selectThStyle} />
            {COLUMNS.map((col) => (
              <th key={col.key} style={thStyle}>
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
                onClick={() => handleRowClick(option.rank)}
                style={{
                  cursor: 'pointer',
                  background: isSelected ? 'var(--badge-blue-bg)' : 'var(--bg-primary)',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-primary)' }}
              >
                <td style={selectTdStyle}>
                  <input
                    type="radio"
                    name="routingOption"
                    checked={isSelected}
                    onChange={() => handleRowClick(option.rank)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      accentColor: 'var(--border-focus)',
                      width: '15px',
                      height: '15px',
                      cursor: 'pointer',
                    }}
                  />
                </td>
                {COLUMNS.map((col) => {
                  const isPrimary = col.primary
                  const cellStyle = {
                    ...tdStyle,
                    ...(isSelected ? { fontWeight: 500 } : {}),
                    ...(isPrimary ? { fontWeight: 500, color: 'var(--text-primary)' } : {}),
                  }
                  return (
                    <td key={col.key} style={cellStyle}>
                      {col.key === 'status' ? (
                        <StatusBadge status={option.status} />
                      ) : (
                        option[col.key] ?? '--'
                      )}
                    </td>
                  )
                })}
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
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-primary)',
        fontSize: '12px',
        fontWeight: 600,
        padding: '1px 8px',
        borderRadius: 'var(--radius-sm)',
        background: style.bg,
        color: style.color,
      }}
    >
      {status}
    </span>
  )
}
