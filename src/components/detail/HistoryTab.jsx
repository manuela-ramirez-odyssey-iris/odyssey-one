export default function HistoryTab({ data }) {
  const entries = data?.entries
  // Use the newest entry as the reference point for relative times
  const refDate = entries?.length > 0 ? new Date(entries[0].timestamp) : new Date()
  if (!entries || entries.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3"
        style={{ padding: '48px 0', color: 'var(--text-placeholder)' }}
      >
        <div className="text-sm font-medium">No history available</div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 28 }}>
      {/* Vertical timeline line */}
      <div
        style={{
          position: 'absolute',
          left: 11,
          top: 8,
          bottom: 8,
          width: 1,
          background: 'var(--border-subtle)',
        }}
      />

      {entries.map((entry, i) => {
        const dotColor = getDotColor(entry.category)
        const badge = getBadge(entry.category)

        return (
          <div
            key={i}
            style={{
              position: 'relative',
              paddingBottom: i < entries.length - 1 ? 20 : 0,
            }}
          >
            {/* Dot */}
            <div
              style={{
                position: 'absolute',
                left: -21,
                top: 6,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: dotColor,
                boxShadow: `0 0 0 3px var(--bg-primary)`,
              }}
            />

            {/* Content */}
            <div style={{ minHeight: 28 }}>
              {/* Row 1: user + action badge + timestamp */}
              <div
                className="flex items-center"
                style={{ gap: 8, flexWrap: 'wrap' }}
              >
                <span
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-primary)',
                  }}
                >
                  {entry.user}
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: 'var(--font-primary)',
                    padding: '1px 7px',
                    borderRadius: 'var(--radius-full)',
                    background: badge.bg,
                    color: badge.fg,
                    lineHeight: '18px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.action}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-primary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {timeAgo(entry.timestamp, refDate)}
                </span>
              </div>

              {/* Row 2: details */}
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-primary)',
                  marginTop: 2,
                  lineHeight: 1.4,
                }}
              >
                {entry.details}
              </div>

              {/* Row 3: field change */}
              {entry.field && (
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-mono, "SF Mono", "Fira Code", "Cascadia Code", monospace)',
                    color: 'var(--text-tertiary)',
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {entry.field}:
                  </span>
                  <span style={{ textDecoration: 'line-through', opacity: 0.65 }}>
                    {entry.oldValue}
                  </span>
                  <span style={{ color: 'var(--text-placeholder)' }}>&rarr;</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {entry.newValue}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- Helpers ---

function getDotColor(category) {
  switch (category) {
    case 'create': return 'var(--badge-green-fg, #16a34a)'
    case 'tender': return 'var(--badge-blue-fg, #2563eb)'
    case 'update': return 'var(--badge-amber-fg, #d97706)'
    case 'completion': return 'var(--badge-purple-fg, #7c3aed)'
    default: return 'var(--text-tertiary)'
  }
}

function getBadge(category) {
  switch (category) {
    case 'create':
      return { bg: 'var(--badge-green-bg, #dcfce7)', fg: 'var(--badge-green-fg, #16a34a)' }
    case 'tender':
      return { bg: 'var(--badge-blue-bg, #dbeafe)', fg: 'var(--badge-blue-fg, #2563eb)' }
    case 'update':
      return { bg: 'var(--badge-amber-bg, #fef3c7)', fg: 'var(--badge-amber-fg, #d97706)' }
    case 'completion':
      return { bg: 'var(--badge-purple-bg, #ede9fe)', fg: 'var(--badge-purple-fg, #7c3aed)' }
    default:
      return { bg: 'var(--bg-tertiary)', fg: 'var(--text-secondary)' }
  }
}

function timeAgo(isoString, referenceDate) {
  const now = referenceDate || new Date()
  const date = new Date(isoString)
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) > 1 ? 's' : ''} ago`

  // Fallback: show short date
  const m = date.toLocaleString('en-US', { month: 'short' })
  const d = date.getDate()
  return `${m} ${d}`
}
