import React, { useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { PANEL_CONFIG } from '../../data/panelConfig'

function buildPanels(metrics) {
  return Object.entries(PANEL_CONFIG).map(([key, panel]) => ({
    key,
    title: panel.title,
    metrics: panel.categories.map(cat => ({
      label: cat.label,
      count: metrics[cat.badgeKey] ?? 0,
    })),
  }))
}

const MonitorPanels = React.memo(function MonitorPanels({ activePanel, onPanelSelect, metrics, collapsed: controlledCollapsed, onToggleCollapsed }) {
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const collapsed = controlledCollapsed ?? internalCollapsed
  const toggleCollapsed = onToggleCollapsed ?? (() => setInternalCollapsed(c => !c))
  const panels = buildPanels(metrics || {})

  return (
    <div>
      {/* Panel Cards */}
      <div
        className="flex gap-[22px]"
        style={{
          transition: 'max-height var(--transition-slow), opacity var(--transition-slow), margin var(--transition-slow)',
          maxHeight: collapsed ? 0 : 500,
          opacity: collapsed ? 0 : 1,
          overflow: collapsed ? 'hidden' : 'visible',
          marginBottom: collapsed ? 0 : 'var(--spacing-6)',
        }}
      >
        {panels.map((panel) => {
          const isSelected = activePanel === panel.key
          return (
            <div
              key={panel.key}
              className="flex-1 cursor-pointer"
              style={{
                borderRadius: 12,
                padding: 'var(--spacing-4)',
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-subtle)',
                opacity: isSelected ? 1 : 0.5,
                transition: 'border-color var(--transition-base)',
              }}
              onClick={() => onPanelSelect(panel.key)}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.opacity = '0.75' }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.opacity = '0.5' }}
            >
              <div className="text-sm font-semibold mb-3" style={{ color: 'var(--panel-heading)' }}>
                {panel.title}
              </div>
              {panel.metrics.map((m) => (
                <div
                  key={m.label}
                  className="flex justify-between gap-4 text-xs font-medium"
                  style={{ color: 'var(--text-tertiary)', padding: '4px 0' }}
                >
                  <span>{m.label}</span>
                  <span>{m.count}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Collapse/Expand Toggle */}
      <div className="flex items-center gap-3" style={{ marginTop: 0, marginBottom: 'var(--spacing-6)' }}>
        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
        <button
          className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer whitespace-nowrap"
          style={{ padding: '4px 8px' }}
          onClick={toggleCollapsed}
        >
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {collapsed ? 'Expand metrics' : 'Collapse metrics'}
          </span>
          <ChevronUp
            size={16}
            style={{
              color: 'var(--text-tertiary)',
              transition: 'transform var(--transition-slow)',
              transform: collapsed ? 'rotate(180deg)' : 'none',
            }}
          />
        </button>
        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
      </div>
    </div>
  )
})
export default MonitorPanels
