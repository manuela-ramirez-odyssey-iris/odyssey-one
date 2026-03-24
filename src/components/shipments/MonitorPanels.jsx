import { useState } from 'react'
import { ChevronUp } from 'lucide-react'

const PANELS = [
  {
    key: 'exceptions',
    title: 'Shipment Exceptions',
    metrics: [
      { label: 'Date Issues', count: 5 },
      { label: 'Routing Review', count: 5 },
      { label: 'Tender Issues', count: 5 },
      { label: 'Tender Review', count: 5 },
      { label: 'Bid Review', count: 5 },
    ],
  },
  {
    key: 'monitoring',
    title: 'Monitoring',
    metrics: [
      { label: 'Hold', count: 5 },
      { label: 'Consolidation', count: 5 },
      { label: 'SpotBid', count: 5 },
      { label: 'Approved', count: 5 },
    ],
  },
  {
    key: 'pgipgr',
    title: 'PGI/PGR',
    metrics: [
      { label: 'PGI/PGR Errors', count: 5 },
      { label: 'Rating Failure', count: 5 },
      { label: 'Manual PGI/PGR', count: 5 },
      { label: 'Missed PGI/PGR', count: 5 },
    ],
  },
]

export default function MonitorPanels({ activePanel, onPanelSelect }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div>
      {/* Panel Cards */}
      <div
        className="flex gap-[22px]"
        style={{
          transition: 'max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease',
          maxHeight: collapsed ? 0 : 500,
          opacity: collapsed ? 0 : 1,
          overflow: collapsed ? 'hidden' : 'visible',
        }}
      >
        {PANELS.map((panel) => {
          const isSelected = activePanel === panel.key
          return (
            <div
              key={panel.key}
              className="flex-1 cursor-pointer"
              style={{
                borderRadius: 12,
                padding: 16,
                background: 'var(--panel-bg)',
                border: `1px solid ${isSelected ? 'var(--deep-sea-neutral-400)' : 'var(--panel-border)'}`,
                opacity: isSelected ? 1 : 0.7,
                transition: 'opacity 0.2s ease, border-color 0.2s ease',
              }}
              onClick={() => onPanelSelect(panel.key)}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.opacity = isSelected ? '1' : '0.7' }}
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
      <div className="flex items-center gap-3" style={{ margin: '24px 0' }}>
        <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
        <button
          className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer whitespace-nowrap"
          style={{ padding: '4px 8px' }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {collapsed ? 'Expand metrics' : 'Collapse metrics'}
          </span>
          <ChevronUp
            size={16}
            style={{
              color: 'var(--text-tertiary)',
              transition: 'transform 0.3s ease',
              transform: collapsed ? 'rotate(180deg)' : 'none',
            }}
          />
        </button>
        <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
      </div>
    </div>
  )
}
