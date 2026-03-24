const PANEL_TABS = {
  exceptions: [
    { key: 'all', label: 'All (Exceptions)' },
    { key: 'date-issues', label: 'Date Issues', badge: 4 },
    { key: 'routing-review', label: 'Routing Review', badge: 4 },
    { key: 'tender-issues', label: 'Tender Issues' },
    { key: 'tender-review', label: 'Tender Review' },
    { key: 'bid-review', label: 'Bid Review' },
  ],
  monitoring: [
    { key: 'all', label: 'All (Monitoring)' },
    { key: 'hold', label: 'Hold' },
    { key: 'consolidation', label: 'Consolidation' },
    { key: 'spotbid', label: 'SpotBid' },
    { key: 'approved', label: 'Approved' },
  ],
  pgipgr: [
    { key: 'all', label: 'All (PGI/PGR)' },
    { key: 'pgipgr-errors', label: 'PGI/PGR Errors' },
    { key: 'rating-failure', label: 'Rating Failure' },
    { key: 'manual-pgipgr', label: 'Manual PGI/PGR' },
    { key: 'missed-pgipgr', label: 'Missed PGI/PGR' },
  ],
}

export default function ShipmentTabs({ activePanel, activeTab, onTabSelect }) {
  const tabs = PANEL_TABS[activePanel] || PANEL_TABS.exceptions

  return (
    <div className="flex gap-6" style={{ borderBottom: '1px solid var(--border-subtle)', marginBottom: 12 }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key
        return (
          <button
            key={tab.key}
            className="flex items-center gap-1.5 whitespace-nowrap bg-transparent border-none cursor-pointer text-sm font-bold"
            style={{
              color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
              borderBottom: `2px solid ${isActive ? 'var(--text-tertiary)' : 'transparent'}`,
              padding: '8px 0',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
            onClick={() => onTabSelect(tab.key)}
          >
            {tab.label}
            {tab.badge != null && (
              <span
                className="text-xs font-bold"
                style={{
                  color: 'var(--text-primary)',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '2px 10px',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
