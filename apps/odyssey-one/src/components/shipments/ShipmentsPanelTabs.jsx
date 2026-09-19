import React from 'react'
import { Container } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import { Tab, ButtonToggle, PillTab, Widget, WidgetMini } from '@odyssey/ui'
import { PANEL_CONFIG } from '../../data/panelConfig'
import { PGIPGR_WIDGETS, widgetTotal } from '../../data/pgipgrWidgets'

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
  hideViewToggle = false,
}) {
  const counts = metrics || {}
  const panelTotal = (key) =>
    (PANEL_CONFIG[key]?.categories ?? []).reduce((sum, c) => sum + (counts[c.badgeKey] ?? 0), 0)

  const panelEntries = Object.entries(PANEL_CONFIG)
    .filter(([key]) => !visiblePanels || visiblePanels.includes(key))

  const categories = PANEL_CONFIG[activePanel]?.categories ?? []
  const total = panelTotal(activePanel)
  const allTotal = PGIPGR_WIDGETS.reduce((sum, w) => sum + (counts[w.badgeKey] || widgetTotal(w)), 0)
  const rows = [
    { key: 'all', label: 'All', count: total },
    ...categories.map(c => ({ key: c.key, label: c.label, count: counts[c.badgeKey] ?? 0 })),
  ].filter(row => !hideZeroCategories || row.key === 'all' || row.count > 0)

  return (
    <div>
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
        {!hideViewToggle && (
          <ButtonToggle
            firstLabel="Pill tabs mode"
            secondLabel="Widget mode"
            selected={viewMode === 'widgets' ? 'second' : 'first'}
            onChange={(next) => onViewModeChange?.(next === 'second' ? 'widgets' : 'pills')}
            firstAriaLabel="Show categories as pill tabs"
            secondAriaLabel="Show categories as widgets"
          />
        )}
      </div>
      {viewMode === 'widgets' && activePanel === 'pgipgr' ? (
        // PGI/PGR's three subtabs each carry a breakdown the other panels have
        // no equivalent for, so in widget mode they render as full 3xChart
        // widgets (donut + legend) rather than the WidgetMini strip (user,
        // 2026-09-18). Counts are hardcoded — nothing in the corpus is on this
        // panel; see pgipgrWidgets.js.
        //
        // The WHOLE card selects its subtab, and none of the four carries a
        // footer Go-to link or a row handler (user, 2026-09-18: "turn off
        // button link on all four widget instances we dont need them"). That
        // is also what lets Widget give the card `role="button"` — with no
        // interactive children there is no button nested inside a button — so
        // these are keyboard-operable and announce their pressed state.
        <div className="flex" style={{ gap: 'var(--spacing-3)', alignItems: 'stretch' }}>
          {/* "All" keeps its place at the head of the category row. Its donut
              is the three CATEGORIES against each other — one colour each —
              where the cards beside it break each category down internally.
              Its rows are read-only: the three cards next to it already are
              the way into each subtab. */}
          <Widget
            variant="3xChart"
            selected={activeTab === 'all'}
            onSelect={() => onTabSelect('all')}
            style={{ flex: 1, minWidth: 0 }}
            title="All"
            domainIcon={<Container {...ICON_LG} />}
            value={allTotal}
            label="PGI/PGR shipments"
            rows={PGIPGR_WIDGETS.map(w => ({
              label: w.title,
              value: counts[w.badgeKey] || widgetTotal(w),
              indicatorColor: w.rollupColor,
            }))}
            chartSegments={PGIPGR_WIDGETS.map(w => ({
              value: counts[w.badgeKey] || widgetTotal(w),
              color: w.rollupColor,
            }))}
          />
          {PGIPGR_WIDGETS.map((w, i) => (
            <Widget
              key={w.key}
              variant="3xChart"
              selected={activeTab === w.key}
              onSelect={() => onTabSelect(w.key)}
              style={{ flex: 1, minWidth: 0 }}
              title={w.title}
              domainIcon={<Container {...ICON_LG} />}
              value={counts[w.badgeKey] || widgetTotal(w)}
              label={w.metricLabel}
              rows={w.slices.map(s => ({ label: s.label, value: s.value, indicatorColor: s.color }))}
              chartSegments={w.slices.map(s => ({ value: s.value, color: s.color }))}
              chartDelayMs={i * 90}
            />
          ))}
        </div>
      ) : viewMode === 'widgets' ? (
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
