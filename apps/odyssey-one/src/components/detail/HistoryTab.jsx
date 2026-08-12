import React from 'react'
import { Badge, SubAccordion } from '@odyssey/ui'
import { formatDateTimeMDYHM } from '../../lib/dates'
import PaneEmpty from './PaneEmpty'
import TooltipTrigger from '../ui/TooltipTrigger'

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
//
// 2026-08-11 (user request, direct verbatim ask — not a stakeholder ruling):
// human authorship is back as a rendered SHAPE. Row 1 is re-laid-out
// (badge leads, timestamp+author trail on the right — was actor-leads before)
// and entries may now carry `entry.author = { name, email, kind }` alongside
// the existing `source`/`user` fields. This PARTIALLY REVISITS DEC-80's "MVP
// actor is system" position: DEC-80 never said human authorship couldn't
// exist, only that no producer emitted it — `tools/generate.mjs` now emits a
// minority of entries with a human `author` (see its own comment for the
// split). Recording this per the traceability rule, not re-litigating DEC-80
// — the user asked for it directly. System entries are UNCHANGED: no
// `author`, no tooltip, same muted `history-actor--system` treatment as
// before. Author tooltip reuses the existing `TooltipTrigger` +
// `@odyssey/ui` `Tooltip` idiom (see RoutingGuideTab.jsx's CostTooltip / the
// ShipmentTable OrdersTooltip) rather than inventing a new hover mechanism.
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
                    {/* DEC-70 introduced a "System" badge beside the actor; user removed
                        it 2026-08-10 — `entry.source`'s muted actor styling already said
                        "not a human". 2026-08-11: badge now LEADS the row (was actor-then-
                        badge-then-timestamp); timestamp + author trail on the right. */}
                    <Badge variant={BADGE_VARIANTS[entry.outcome] || BADGE_VARIANTS.default}>{entry.action}</Badge>
                    <span className="history-row1-right">
                      <span className="history-timestamp">
                        {formatDateTimeMDYHM(new Date(entry.timestamp))}
                      </span>
                      <HistoryAuthor entry={entry} />
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

// HistoryAuthor — the right-hand author label. `entry.author` (human:
// { name, email, kind }) is a NEW, not-yet-reseeded shape (see 2026-08-11
// header note) — the seeded Neon rows and generated JSONs won't carry it
// until a separately user-gated reseed runs, so this must degrade to
// TODAY'S system rendering (source text, no tooltip, no crash) whenever
// `author` is absent. Human authors get a hover tooltip (full name + email,
// via the existing TooltipTrigger/@odyssey/ui Tooltip idiom); system authors
// don't — a source string isn't a person to look up.
function HistoryAuthor({ entry }) {
  if (entry.author) {
    return (
      <TooltipTrigger
        asSpan
        tooltipProps={{ label: entry.author.name, groups: [{ content: entry.author.email }] }}
      >
        <span className="history-actor">{entry.author.name}</span>
      </TooltipTrigger>
    )
  }
  return (
    <span className={`history-actor${entry.source ? ' history-actor--system' : ''}`}>
      {entry.user}
    </span>
  )
}

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
