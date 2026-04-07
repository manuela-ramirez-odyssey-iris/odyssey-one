import React from 'react'

const PANEL_TABS = {
  exceptions: [
    { key: 'all', label: 'All (Exceptions)' },
    { key: 'date-issues', label: 'Date Issues', badgeKey: 'dateIssues' },
    { key: 'routing-review', label: 'Routing Review', badgeKey: 'routingReview' },
    { key: 'tender-issues', label: 'Tender Issues', badgeKey: 'tenderIssues' },
    { key: 'tender-review', label: 'Tender Review', badgeKey: 'tenderReview' },
    { key: 'bid-review', label: 'Bid Review', badgeKey: 'bidReview' },
  ],
  monitoring: [
    { key: 'all', label: 'All (Monitoring)' },
    { key: 'hold', label: 'Hold', badgeKey: 'hold' },
    { key: 'consolidation', label: 'Consolidation', badgeKey: 'consolidation' },
    { key: 'sent', label: 'Sent', badgeKey: 'sent' },
    { key: 'spotbid', label: 'SpotBid', badgeKey: 'spotBid' },
    { key: 'approved', label: 'Approved', badgeKey: 'approved' },
  ],
  pgipgr: [
    { key: 'all', label: 'All (PGI/PGR)' },
    { key: 'pgipgr-errors', label: 'PGI/PGR Errors', badgeKey: 'pgipgrErrors' },
    { key: 'rating-failure', label: 'Rating Failure', badgeKey: 'ratingFailure' },
    { key: 'manual-pgipgr', label: 'Manual PGI/PGR', badgeKey: 'manualPgipgr' },
  ],
}

const ShipmentTabs = React.memo(function ShipmentTabs({ activePanel, activeTab, onTabSelect, badgeCounts }) {
  const tabs = PANEL_TABS[activePanel] || PANEL_TABS.exceptions
  const counts = badgeCounts || {}

  return (
    <div className="flex gap-6" style={{ borderBottom: '1px solid var(--border-subtle)', marginBottom: 'var(--spacing-3)' }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key
        const badge = tab.badgeKey ? counts[tab.badgeKey] : undefined
        return (
          <button
            key={tab.key}
            className="flex items-center gap-1.5 whitespace-nowrap bg-transparent border-none cursor-pointer text-sm font-bold"
            style={{
              color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
              borderBottom: `2px solid ${isActive ? 'var(--text-tertiary)' : 'transparent'}`,
              padding: '8px 0',
              transition: 'color var(--transition-fast), border-color var(--transition-fast)',
            }}
            onClick={() => onTabSelect(tab.key)}
          >
            {tab.label}
            {badge != null && badge > 0 && (
              <span
                className="text-xs font-bold"
                style={{
                  color: 'var(--text-primary)',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '2px 10px',
                }}
              >
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
})
export default ShipmentTabs
