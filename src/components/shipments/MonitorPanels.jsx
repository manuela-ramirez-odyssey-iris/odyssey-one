import { useState } from 'react'
import { ChevronUp } from 'lucide-react'

function buildPanels(metrics) {
  return [
    {
      key: 'exceptions',
      title: 'Shipment Exceptions',
      metrics: [
        { label: 'Date Issues', count: metrics.dateIssues ?? 0 },
        { label: 'Routing Review', count: metrics.routingReview ?? 0 },
        { label: 'Tender Issues', count: metrics.tenderIssues ?? 0 },
        { label: 'Tender Review', count: metrics.tenderReview ?? 0 },
        { label: 'Bid Review', count: metrics.bidReview ?? 0 },
      ],
    },
    {
      key: 'monitoring',
      title: 'Monitoring',
      metrics: [
        { label: 'Hold', count: metrics.hold ?? 0 },
        { label: 'Consolidation', count: metrics.consolidation ?? 0 },
        { label: 'SpotBid', count: metrics.spotBid ?? 0 },
        { label: 'Approved', count: metrics.approved ?? 0 },
      ],
    },
    {
      key: 'pgipgr',
      title: 'PGI/PGR',
      metrics: [
        { label: 'PGI/PGR Errors', count: metrics.pgipgrErrors ?? 0 },
        { label: 'Rating Failure', count: metrics.ratingFailure ?? 0 },
        { label: 'Manual PGI/PGR', count: metrics.manualPgipgr ?? 0 },
        { label: 'Missed PGI/PGR', count: metrics.missedPgipgr ?? 0 },
      ],
    },
  ]
}

export default function MonitorPanels({ activePanel, onPanelSelect, metrics }) {
  const [collapsed, setCollapsed] = useState(false)
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
                border: `1px solid ${isSelected ? 'var(--deep-sea-neutral-400)' : 'var(--panel-border)'}`,
                opacity: isSelected ? 1 : 0.7,
                transition: 'opacity var(--transition-base), border-color var(--transition-base)',
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
      <div className="flex items-center gap-3" style={{ margin: 'var(--spacing-6) 0' }}>
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
              transition: 'transform var(--transition-slow)',
              transform: collapsed ? 'rotate(180deg)' : 'none',
            }}
          />
        </button>
        <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
      </div>
    </div>
  )
}
