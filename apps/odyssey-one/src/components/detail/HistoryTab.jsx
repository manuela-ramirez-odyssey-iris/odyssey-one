import React from 'react'
import { Badge, SubAccordion } from '@odyssey/ui'
import { formatDateTimeMDYHM } from '../../lib/dates'
import PaneEmpty from './PaneEmpty'

// Shipment History = an audit trail ("who changed what and when", Jana Mar 25
// — vault/10-domains/shipments/domain-analysis.md §9), rendered as an entry
// timeline with a category-dot rail. Order-domain precedent (LINX-8091) uses
// a tabular Field/Old/New audit log — deliberately NOT followed here; the
// timeline anatomy is our own call for Shipments (see decision-log DEC-70).
// What LINX-8091 IS reused verbatim: the User|System actor split and the
// MM/DD/YYYY HH:MM (24h) timestamp format.
const HistoryTab = React.memo(function HistoryTab({ data }) {
  const entries = data?.entries
  if (!entries || entries.length === 0) {
    return <PaneEmpty message="No history available." />
  }

  return (
    <div className="pane-canvas">
      <div className="pane-col pane-col--narrow">
        {/* Static SubAccordion card — no disclosure, no info icon (Figma
            State=Static, same idiom as DocumentsTab's "All Documents" card) */}
        <SubAccordion title="Shipment History" collapsible={false} showIcon={false}>
          <div className="history-list">
            {entries.map((entry, i) => (
              <div className="history-entry" key={i}>
                <div className="history-dot" style={{ background: getDotColor(entry.category) }} />
                <div className="history-content">
                  <div className="history-row1">
                    <span className={`history-actor${entry.source ? ' history-actor--system' : ''}`}>
                      {entry.user}
                    </span>
                    {entry.source && <Badge variant="gray">System</Badge>}
                    <Badge variant={BADGE_VARIANTS[entry.category] || 'gray'}>{entry.action}</Badge>
                    <span className="history-timestamp">
                      {formatDateTimeMDYHM(new Date(entry.timestamp))}
                    </span>
                  </div>

                  <div className="history-details">{entry.details}</div>

                  {entry.field && (
                    <div className="history-diff">
                      <span className="history-diff-field">{entry.field}:</span>
                      <span className="history-diff-old">{entry.oldValue}</span>
                      <span className="history-diff-arrow">&rarr;</span>
                      <span className="history-diff-new">{entry.newValue}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SubAccordion>
      </div>
    </div>
  )
})
export default HistoryTab

// --- Helpers ---

// Action badge variant per entry category — the @odyssey/ui Badge owns the
// bg/text token pair. "update" maps to the amber variant (--badge-yellow-*
// tokens — the design system has no amber-named tokens; nearest match).
const BADGE_VARIANTS = {
  create: 'green',
  tender: 'blue',
  update: 'amber',
  completion: 'purple',
}

// Timeline dot color — the matching badge TEXT token (no dedicated dot/status
// tokens exist yet; the badge text shade is the nearest saturated equivalent
// of the old hardcoded hexes).
function getDotColor(category) {
  switch (category) {
    case 'create': return 'var(--badge-green-text)'
    case 'tender': return 'var(--badge-blue-text)'
    case 'update': return 'var(--badge-yellow-text)'
    case 'completion': return 'var(--badge-purple-text)'
    default: return 'var(--text-tertiary)'
  }
}
