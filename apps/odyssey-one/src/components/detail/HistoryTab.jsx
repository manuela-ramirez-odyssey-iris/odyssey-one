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
// DEC-87 (2026-08-12, user ruling): green was overused — 11 of 15 catalog
// events defaulted to 'success', so a normal shipment's trail was a wall of
// green and green stopped signalling anything. User's verbatim problem
// report: "there are too many greens (overused means false user flags for
// important things)." Green ('success') is now RESERVED for exactly three
// milestones (Tender Response Received/Accepted, PGI Response Received/
// clean, Shipment Planning Completed); a fifth value, `'info'` (gray), is
// added for outbound messaging that asserts nothing about the shipment's own
// state (Planned Shipment Sent, Shipment Update Notification's
// "successfully sent" variant). `'update'` (blue) now covers most
// lifecycle-advancing steps that used to default to bare 'success'. Full
// per-event mapping lives in tools/generate.mjs's outcome contract comment
// (search `` `outcome` added 2026-08-10 ``) — this file only renders it.
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
// human authorship is back as a rendered SHAPE. Entries may now carry
// `entry.author = { name, email, kind }` alongside the existing
// `source`/`user` fields. This PARTIALLY REVISITS DEC-80's "MVP actor is
// system" position: DEC-80 never said human authorship couldn't exist, only
// that no producer emitted it. Recording this per the traceability rule, not
// re-litigating DEC-80 — the user asked for it directly. Author tooltip
// reuses the existing `TooltipTrigger` + `@odyssey/ui` `Tooltip` idiom (see
// RoutingGuideTab.jsx's CostTooltip / the ShipmentTable OrdersTooltip)
// rather than inventing a new hover mechanism.
//
// 2026-08-12, two corrections to the above, both direct verbatim user asks:
//   1. LAYOUT: row 1 is `badge · author ———— date` (user, verbatim: "badge
//      author ----------- date"). Two prior passes were rejected: the first
//      pinned the author far right next to the timestamp (cramped), the
//      second put the author FIRST and the badge second. The badge leads;
//      the author sits immediately right of it with room to fill; the
//      timestamp keeps `margin-left: auto` alone so it pins hard right.
//      There is no `.history-row1-right` wrapper — author and timestamp are
//      not grouped.
//   2. DATA MODEL: system entries were previously NOT authors — they had no
//      `entry.author` and fell back to rendering bare `entry.source` text.
//      User: "system authors also exists so we need bot human nad system."
//      Every entry (`tools/generate.mjs`) now emits `entry.author` with a
//      `kind` of `'internal' | 'external' | 'system'` — system authors carry
//      `{ name: <source>, kind: 'system' }`, no email, no tooltip, same
//      muted `history-actor--system` styling as before; internal/external
//      are unchanged (email + tooltip). The entirely-absent-`author` branch
//      stays alive in `HistoryAuthor` below ONLY as backward compatibility
//      for pre-reseed seed data (Neon rows generated before this change) —
//      it is not a third semantic category, just a degrade path.
// 2026-08-17 (user asks, all three display-only):
//   • Newest first. Sorted HERE rather than trusted from the producer —
//     `tools/generate.mjs` emits lifecycle (oldest-first) order and a real
//     backend may emit either, so reading order is the renderer's to guarantee.
//   • Two events read under different names. This is a LABEL, not a change to
//     the event vocabulary — which belongs to the backend (DEC-80) and is
//     seeded into Neon, so renaming at the generator would additionally mean a
//     reseed before anything changed in live mode. Mapped at render instead;
//     `entry.action` keeps its wire value for badge/outcome/category logic.
//     ("Execution", not the ask's "Excecution" — normalized spelling.)
export const ACTION_LABELS = {
  'Shipment Created': 'Shipment Creation',
  'Routing Completed': 'Routing Execution',
}

/** Newest-first copy of the entries — never sorts the caller's array in place. */
export function orderNewestFirst(entries = []) {
  return [...entries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

const HistoryTab = React.memo(function HistoryTab({ data }) {
  const raw = data?.entries
  if (!raw || raw.length === 0) {
    return <PaneEmpty message="No history available." />
  }
  const entries = orderNewestFirst(raw)

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
                        "not a human". Row order is `badge · author ———— date`, the user's
                        verbatim 2026-08-12 spec. Two earlier passes got it wrong and are
                        recorded so nobody re-tries them: (1) author pinned far right next
                        to the timestamp — rejected, a long name/email was cramped there;
                        (2) author leading with the badge second — also rejected, the badge
                        leads. The stable part across all three: the author sits BESIDE the
                        badge with room to fill, and the timestamp keeps margin-left:auto so
                        it pins hard right on its own. */}
                    <Badge variant={BADGE_VARIANTS[entry.outcome] || BADGE_VARIANTS.default}>
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </Badge>
                    <HistoryAuthor entry={entry} />
                    {/* UTC, labelled (user ruling 2026-08-12). The trail is an
                        audit log read by people in different zones — rendering
                        it in each viewer's local clock means two of them
                        disagree about when the same event happened. The `UTC`
                        suffix is deliberate and matches how the rest of the app
                        stamps a zone (`04/15/2026 09:00 CDT` on the stops); an
                        unlabelled UTC time is indistinguishable from a local
                        one, which is the failure this ruling exists to fix. */}
                    <span className="history-timestamp">
                      {formatDateTimeMDYHM(new Date(entry.timestamp), { utc: true })} UTC
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

// HistoryAuthor — the row-leading author label. `entry.author` is a NEW,
// not-yet-reseeded shape (2026-08-11) — the seeded Neon rows won't carry it
// until a separately user-gated reseed runs, so this must degrade to
// TODAY'S rendering (source text, no tooltip, no crash) whenever `author` is
// absent entirely.
//
// 2026-08-12 correction: EVERY entry is now an author, human or system —
// user's verbatim ruling ("system authors also exists so we need bot human
// nad system") replaces the old two-branch model (author = human only,
// system fell back to bare `source` text with no author object at all).
// `author.kind` is the discriminator:
//   - 'internal' | 'external' — has an email, gets a hover tooltip (full
//     name + email, via the existing TooltipTrigger/@odyssey/ui Tooltip
//     idiom already used elsewhere in this file).
//   - 'system' — no email, no tooltip (a source string isn't a person to
//     look up), same muted `history-actor--system` styling as before.
// The no-`author`-at-all branch is kept ALIVE (not deleted) specifically for
// backward compatibility with pre-reseed seed data/JSONs — see header note.
function HistoryAuthor({ entry }) {
  const author = entry.author

  if (author && author.kind !== 'system') {
    return (
      <TooltipTrigger
        asSpan
        tooltipProps={{ label: author.name, groups: [{ content: author.email }] }}
      >
        {/* --hoverable is the ONLY branch with a tooltip, so it is the only
            one that gets the pointer cursor (user, 2026-08-12). A system
            author is plain text with nothing to reveal — giving it the same
            cursor would promise an interaction it doesn't have. */}
        <span className="history-actor history-actor--hoverable">{author.name}</span>
      </TooltipTrigger>
    )
  }

  // author.kind === 'system' (new shape) OR author is entirely absent
  // (reseed-pending fallback, degrades to entry.user/entry.source exactly
  // as it did before this correction).
  //
  // 2026-08-12 user ruling: EVERY system actor reads `System (OdysseyOne)`,
  // not the emitting service (`ERP`, `Linx`, `Net Native`, `Legacy TMS`).
  // Deliberately a RENDER-time substitution, not a generator change: the
  // emitting service stays on the data as `entry.source` — it is real
  // provenance a backend would send and a future surface may want — this only
  // stops the trail from asking the user to care which internal service
  // happened to emit a row. Doing it here also means it applies to rows
  // seeded BEFORE the ruling, with no reseed.
  const isSystem = author ? true : Boolean(entry.source)
  const label = isSystem ? SYSTEM_AUTHOR_LABEL : entry.user
  return (
    <span className={`history-actor${isSystem ? ' history-actor--system' : ''}`}>
      {label}
    </span>
  )
}

// The single name every system-emitted entry is attributed to (user, verbatim
// 2026-08-12: `All System authors is "System OdysseyOne"`).
const SYSTEM_AUTHOR_LABEL = 'System (OdysseyOne)'

// Action badge variant per entry OUTCOME (DEC-81, 2026-08-10, amber added in
// the same-day follow-up; `info` added by DEC-87, 2026-08-12) — the
// @odyssey/ui Badge owns the bg/text token pair; red/green/blue/amber/gray
// are real Badge variants (confirmed against packages/ui/src/Badge.jsx's
// `variants` map, not guessed — amber maps to the `--badge-yellow-*` tokens,
// gray maps to the `--badge-gray-*` tokens there). `info` reuses the same
// `gray` variant as `default` — same visual treatment, distinct semantic
// meaning (an intentional outbound-message outcome vs. a missing-outcome
// fallback). `default` is the missing-outcome fallback: the seed data won't
// carry `outcome` until a separately user-gated reseed runs, so an
// absent/unrecognized value must NOT crash or read as failure — gray is the
// existing neutral variant already used elsewhere in this file, one system,
// no competing category-keyed map left alive alongside it.
const BADGE_VARIANTS = {
  failure: 'red',
  success: 'green',
  update: 'blue',
  neutral: 'amber',
  info: 'gray',
  default: 'gray',
}

// Timeline dot color — the matching badge TEXT token (no dedicated dot/status
// tokens exist yet; the badge text shade is the nearest saturated equivalent
// of the old hardcoded hexes). Keyed on `outcome`, same DEC-81 mapping and
// same neutral fallback as BADGE_VARIANTS above. `neutral` uses
// `--badge-yellow-text` since the Badge `amber` variant is itself backed by
// the yellow token pair (see packages/ui/src/Badge.jsx). `info` (DEC-87,
// 2026-08-12) uses `--badge-gray-text` — the same token the Badge `gray`
// variant is backed by — kept distinct from the `default` (missing-outcome)
// fallback below, which uses `--text-tertiary` rather than the gray badge
// token itself.
function getDotColor(outcome) {
  switch (outcome) {
    case 'failure': return 'var(--badge-red-text)'
    case 'success': return 'var(--badge-green-text)'
    case 'update': return 'var(--badge-blue-text)'
    case 'neutral': return 'var(--badge-yellow-text)'
    case 'info': return 'var(--badge-gray-text)'
    default: return 'var(--text-tertiary)'
  }
}
