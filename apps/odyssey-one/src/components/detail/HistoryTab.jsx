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
//
// DEC-81 (2026-08-10, user ruling): badge/dot color is driven by
// `entry.outcome` ('success'|'failure'|'update'|'neutral' — success→green,
// failure→red, update→blue, neutral→amber; contract owned by
// tools/generate.mjs, this file only renders it), NOT `entry.category` —
// user's verbatim mapping: "if a failure we can show it with red badges,
// success/completion green, updates in blue, Buy/Sell Shipment Out message
// successfully sent green, delivery failed in red." `category` stays on the
// data (still used for grouping/labels elsewhere), it just no longer drives
// color. The generator reseed that back-fills `outcome` onto existing seed
// rows is separately user-gated and has not run yet — see the missing-outcome
// fallback on BADGE_VARIANTS/getDotColor below.
//
// DEC-81 follow-up (2026-08-10, same-day): fourth value `'neutral'` added —
// the step completed successfully but the business result is unfavourable or
// non-advancing (e.g. a real carrier Decline: a response WAS received, but
// it's the event that lands the shipment in Review). User's verbatim call:
// "A fourth neutral/amber treatment." Not an error, not a good outcome.
//
// DEC-80 (2026-08-10): this component is a pure RENDERER of backend-emitted
// events — it does not author the event vocabulary, and this file needed NO
// structural change for the Shipment Trail rebuild (only `tools/generate.mjs`
// did). Two things worth flagging for the next person touching this file:
//   1. Every entry `tools/generate.mjs` now emits carries `source` (system or
//      integrated-application actor, e.g. `Net Native`) — the plain-user,
//      no-`source` branch below (`history-actor` without `--system`) has no
//      current producer. Left in place, not deleted: user-attributed entries
//      remain a legitimate SHAPE this renderer should display if a backend
//      ever sends one (DEC-80 doesn't forbid the shape, it just changes what
//      today's seed data emits).
//   2. Ditto for `entry.field`/`oldValue`/`newValue` (the diff row below) —
//      none of the MVP catalog's templates produce it, so it currently has
//      NO producer either. Whether the real backend will ever send
//      structured old/new pairs is an open question (shipment-trail.md
//      Open/TBD #2), not something we're deciding by deleting the render
//      path — kept intact deliberately.
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
                <div className="history-dot" style={{ background: getDotColor(entry.outcome) }} />
                <div className="history-content">
                  <div className="history-row1">
                    <span className={`history-actor${entry.source ? ' history-actor--system' : ''}`}>
                      {entry.user}
                    </span>
                    {/* DEC-70 introduced this "System" badge; user removed it 2026-08-10 —
                        every entry now carries `source`, which the actor's own
                        history-actor--system muted styling above already communicates,
                        making the badge redundant beside it. `entry.source` itself is
                        kept (drives that styling) — only the Badge render is gone. */}
                    <Badge variant={BADGE_VARIANTS[entry.outcome] || BADGE_VARIANTS.default}>{entry.action}</Badge>
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

// Action badge variant per entry OUTCOME (DEC-81, 2026-08-10, amber added in
// the same-day follow-up) — the @odyssey/ui Badge owns the bg/text token
// pair; red/green/blue/amber are real Badge variants (confirmed against
// packages/ui/src/Badge.jsx's `variants` map, not guessed — amber maps to
// the `--badge-yellow-*` tokens there). `default` is the missing-outcome
// fallback: the seed data won't carry `outcome` until a separately
// user-gated reseed runs, so an absent/unrecognized value must NOT crash or
// read as failure — gray is the existing neutral variant already used
// elsewhere in this file, one system, no competing category-keyed map left
// alive alongside it.
const BADGE_VARIANTS = {
  failure: 'red',
  success: 'green',
  update: 'blue',
  neutral: 'amber',
  default: 'gray',
}

// Timeline dot color — the matching badge TEXT token (no dedicated dot/status
// tokens exist yet; the badge text shade is the nearest saturated equivalent
// of the old hardcoded hexes). Keyed on `outcome`, same DEC-81 mapping and
// same neutral fallback as BADGE_VARIANTS above. `neutral` uses
// `--badge-yellow-text` since the Badge `amber` variant is itself backed by
// the yellow token pair (see packages/ui/src/Badge.jsx).
function getDotColor(outcome) {
  switch (outcome) {
    case 'failure': return 'var(--badge-red-text)'
    case 'success': return 'var(--badge-green-text)'
    case 'update': return 'var(--badge-blue-text)'
    case 'neutral': return 'var(--badge-yellow-text)'
    default: return 'var(--text-tertiary)'
  }
}
