import React from 'react'
import { Tab, ButtonToggle, PillTab, WidgetMini } from '@odyssey/ui'
import { PANEL_CONFIG } from '../../data/panelConfig'

// Shipments panel header — replaces the retired MonitorPanels + ShipmentTabs.
// Two rows, per Efrain's 2026-07-04 Shipments redesign (Figma usage frames
// MainTabs 4094:3602 + SecondaryTabs 4094:3608, composed from normalized
// Tab / ButtonToggle / PillTab / WidgetMini):
//   1. Panel tabs (underline Tab, count = panel total) + the
//      "Pill tabs mode / Widget mode" ButtonToggle.
//   2. Category row for the active panel — an "All" entry + one per category,
//      rendered as PillTabs (pill mode) or WidgetMini cards (widget mode).
// WidgetMini percentage = the category's share of the panel total (the Figma
// mock's uniform 24% is a placeholder).
//
// Zero-count hiding (S79c decision 8): while committed search criteria exist,
// the route passes `visiblePanels` (zero-total panels dropped, PGI/PGR always
// kept — demo) and `hideZeroCategories` (zero-count pills/widgets dropped, All
// stays with count = panel total). No search → both default to showing all.
// Selection fallbacks for hidden panel/category live in the route, next to the
// state they adjust. Pills stay non-deselectable: clicking the selected one
// re-sets the same key (decision 9).
const ShipmentsPanelTabs = React.memo(function ShipmentsPanelTabs({
  activePanel,
  onPanelSelect,
  activeTab,
  onTabSelect,
  metrics,
  viewMode = 'pills',
  onViewModeChange,
  visiblePanels = null,
  hideZeroCategories = false,
}) {
  const counts = metrics || {}
  const panelTotal = (key) =>
    (PANEL_CONFIG[key]?.categories ?? []).reduce((sum, c) => sum + (counts[c.badgeKey] ?? 0), 0)

  const panelEntries = Object.entries(PANEL_CONFIG)
    .filter(([key]) => !visiblePanels || visiblePanels.includes(key))

  const categories = PANEL_CONFIG[activePanel]?.categories ?? []
  const total = panelTotal(activePanel)
  const rows = [
    { key: 'all', label: 'All', count: total },
    ...categories.map(c => ({ key: c.key, label: c.label, count: counts[c.badgeKey] ?? 0 })),
  ].filter(row => !hideZeroCategories || row.key === 'all' || row.count > 0)

  return (
    <div style={{ marginBottom: 'var(--spacing-4)' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-4)' }}>
        <div className="flex items-center" style={{ gap: 'var(--spacing-6)' }}>
          {panelEntries.map(([key, panel]) => (
            <Tab
              key={key}
              label={panel.title}
              count={panelTotal(key)}
              current={activePanel === key}
              onClick={() => onPanelSelect(key)}
            />
          ))}
        </div>
        <ButtonToggle
          firstLabel="Pill tabs mode"
          secondLabel="Widget mode"
          selected={viewMode === 'widgets' ? 'second' : 'first'}
          onChange={(next) => onViewModeChange?.(next === 'second' ? 'widgets' : 'pills')}
          firstAriaLabel="Show categories as pill tabs"
          secondAriaLabel="Show categories as widgets"
        />
      </div>
      {viewMode === 'widgets' ? (
        <div className="flex" style={{ gap: 'var(--spacing-3)' }}>
          {rows.map(row => (
            <WidgetMini
              key={row.key}
              style={{ flex: 1, minWidth: 0 }}
              value={row.count}
              label={row.label}
              percentage={total > 0 ? (row.count / total) * 100 : 0}
              selected={activeTab === row.key}
              onClick={() => onTabSelect(row.key)}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center" style={{ gap: 'var(--spacing-3)' }}>
          {rows.map(row => (
            <PillTab
              key={row.key}
              label={row.label}
              count={row.count}
              selected={activeTab === row.key}
              onClick={() => onTabSelect(row.key)}
            />
          ))}
        </div>
      )}
    </div>
  )
})

export default ShipmentsPanelTabs
