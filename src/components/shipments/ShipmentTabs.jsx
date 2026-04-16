import React from 'react'
import { PANEL_CONFIG } from '../../data/panelConfig'

const PANEL_TABS = Object.fromEntries(
  Object.entries(PANEL_CONFIG).map(([key, panel]) => [
    key,
    [
      { key: 'all', label: `All (${panel.title})` },
      ...panel.categories,
    ],
  ])
)

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
