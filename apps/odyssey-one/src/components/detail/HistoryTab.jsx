import React from 'react'
import { Badge, SubAccordion, Tab, TitleSubtitle } from '@odyssey/ui'
import { ArrowRight, Merge } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { formatDateTimeMDYHM } from '../../lib/dates'
import PaneEmpty from './PaneEmpty'
import TooltipTrigger from '../ui/TooltipTrigger'
import { useShipmentDetail } from '../../api/queries/useShipmentDetail'
import { DepthDot, LineageTab, LineageTree, findPath, labelOf } from './LineageTree'

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

// The entry-row renderer — extracted so the lineage preview tab reuses it
// (S164); the DEC comments below travel with the markup unchanged. Sorts here
// (newest first, 2026-08-17) so every caller gets the same reading order.
function HistoryEntries({ entries }) {
  return (
    <div className="history-list">
      {orderNewestFirst(entries).map((entry, i) => (
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
  )
}

// `lineage` (S164 / CNS-22) is the detail's consolidation ancestry and `shipment`
// the list row. User ruling 2026-09-30 (S164): "we should show the summary in
// all just to make them consistent" — every shipment gets the lineage layout;
// no sources = band reads "Created as a new shipment" and no Lineage Tree tab.
// The static card below survives only as a defensive no-`shipment` fallback.
const HistoryTab = React.memo(function HistoryTab({ data, lineage, shipment }) {
  const raw = data?.entries
  const empty = !raw || raw.length === 0

  if (shipment) {
    // key = reset tab state when the shipment changes (spec §4)
    return <LineageHistory key={shipment.sellShipment} entries={empty ? null : raw} lineage={lineage} shipment={shipment} />
  }

  if (empty) {
    return <PaneEmpty message="No history available." />
  }

  return (
    <div className="pane-canvas">
      <div className="pane-col pane-col--narrow">
        {/* Static SubAccordion card — no disclosure, no info icon (Figma
            State=Static, same idiom as DocumentsTab's "All Documents" card) */}
        <SubAccordion title="Shipment History" collapsible={false}>
          <HistoryEntries entries={raw} />
        </SubAccordion>
      </div>
    </div>
  )
})
export default HistoryTab

// --- Lineage view (S164 / CNS-22) ---

// Odyssey ids carry the prefix (S148): C = consolidated, O = one order.
const isConsolidated = (n) => /^C/.test(labelOf(n))
const kickerOf = (n) => (isConsolidated(n) ? 'Consolidated Shipment' : 'Shipment')
const PREVIEW_TAB = (sell) => `preview:${sell}`

// Summary card + band + event history. The band says how THIS shipment came to
// be (user 2026-09-30 (S164)), from the shown node's own sources — never the
// ancestry path: C = "Merged from" its direct sources (Merge separators), O with
// sources = "Deconsolidated from" original → C (arrows = time), O without = created new.
// `depth` = the node's depth in the tree; its source chips sit one level below.
function HistoryPanel({ node, customer, depth, onOpen, entries, status }) {
  const isC = isConsolidated(node)
  const sources = node.sources ?? []
  // timeline order for an O: the original shipment first, then the C it left
  const chips = !sources.length ? [] : isC ? sources : [...sources.filter((n) => !isConsolidated(n)), ...sources.filter(isConsolidated)]
  const label = !chips.length ? 'Created as a new shipment' : isC ? 'Merged from:' : 'Deconsolidated from:'
  const Sep = isC ? Merge : ArrowRight
  return (
    <div className="history-panel">
      <div className="history-summary">
        <div className="history-summary__top">
          <div className="history-summary__main">
            <div className="history-summary__kicker text-label-xs-medium-uppercase">
              {kickerOf(node)}
            </div>
            <div className="history-summary__id text-heading-lg-semibold">{labelOf(node)}</div>
          </div>
          <div className="history-summary__cells">
            <TitleSubtitle subtitle="Customer" title={customer || '—'} />
            <TitleSubtitle subtitle="Origin" title={node.origin || '—'} />
            <TitleSubtitle subtitle="Destination" title={node.destination || '—'} />
          </div>
        </div>
        <div className="history-band">
          <span className="history-band__label text-label-xs-regular">{label}</span>
          {chips.map((n, i) => (
            <React.Fragment key={`${n.sellShipment}-${i}`}>
              {i > 0 && <Sep {...ICON_MD} className="history-band__sep" aria-hidden="true" />}
              <button type="button" className="history-chip text-label-sm-semibold" onClick={() => onOpen(n, false)}>
                <DepthDot depth={depth + 1} />
                {labelOf(n)}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="history-events">
        <div className="history-events__head">
          <span className="history-events__title text-label-xs-medium-uppercase">Event History</span>
          {entries && <span className="history-events__count text-label-xs-regular">{entries.length} events</span>}
        </div>
        {status ? <p className="history-empty">{status}</p> : <HistoryEntries entries={entries} />}
      </div>
    </div>
  )
}

// A hidden shipment's own trail, fetched by sell id (works for hidden shells in
// both mock and live — spec §4). keepPreviousData would otherwise show the
// PREVIOUS shipment's trail while this one loads, so placeholder = loading.
function PreviewPanel({ tab, customer, onOpen }) {
  const { data, isPending, isPlaceholderData, isError } = useShipmentDetail(tab.node.sellShipment)
  const entries = data?.historyData?.entries
  const status = isError ? 'Could not load this shipment’s history.'
    : isPending || isPlaceholderData ? 'Loading history…'
    : !entries?.length ? 'No history available.' : null
  return (
    <HistoryPanel
      node={tab.node}
      customer={customer} depth={tab.path.length - 1} onOpen={onOpen}
      entries={status ? null : entries} status={status}
    />
  )
}

function LineageHistory({ entries, lineage, shipment }) {
  const root = {
    sellShipment: shipment.sellShipment,
    odysseyShipmentIdentifier: shipment.odysseyShipmentIdentifier,
    origin: shipment.origin,
    destination: shipment.destination,
    hidden: false,
    sources: lineage?.sources ?? [],
  }
  const hasTree = root.sources.length > 0 // no ancestry → nothing to draw (2026-09-30 ruling)
  const [previews, setPreviews] = React.useState([]) // { node, path }
  const [active, setActive] = React.useState('history') // 'history' | 'tree' | preview id
  const [expanded, setExpanded] = React.useState(() => new Set()) // root starts collapsed (VD 3113)

  const open = (node, isRoot) => {
    if (isRoot) return setActive('history')
    const id = PREVIEW_TAB(node.sellShipment)
    // already open → focus it, never a duplicate
    setPreviews((prev) => prev.some((t) => t.id === id) ? prev : [...prev, { id, node, path: findPath(root, node.sellShipment) ?? [root, node] }])
    setActive(id)
  }
  const close = (id) => {
    const order = ['history', ...(hasTree ? ['tree'] : []), ...previews.map((t) => t.id)]
    const at = order.indexOf(id)
    setPreviews((prev) => prev.filter((t) => t.id !== id))
    // closing the current tab falls back to the one on its left
    if (active === id) setActive(order[at - 1])
  }
  const toggle = (key) => setExpanded((prev) => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  const toggleAll = (open, keys) => setExpanded(open ? new Set(keys) : new Set())

  // The list row carries the name (ROW_COLUMNS customerName); a hidden source
  // always shares the root's customer, so previews reuse it.
  const customer = shipment.customerName ?? shipment.customerId
  const activePreview = previews.find((t) => t.id === active)

  return (
    <div className="pane-canvas">
      <div className="pane-col pane-col--medium">
        {/* Headerless static SubAccordion = the card surface (user, S164) */}
        <SubAccordion collapsible={false}>
          <div className="history-tabs">
            <Tab label="Shipment History" current={active === 'history'} onClick={() => setActive('history')} />
            {hasTree && <Tab label="Lineage Tree" current={active === 'tree'} onClick={() => setActive('tree')} />}
            {previews.map((t) => (
              <LineageTab
                key={t.id}
                label={labelOf(t.node)}
                current={active === t.id}
                onSelect={() => setActive(t.id)}
                onClose={() => close(t.id)}
              />
            ))}
          </div>
          <div className="history-tabs__body">
            {active === 'history' && (
              <HistoryPanel
                node={root}
                customer={customer}
                depth={0}
                onOpen={open}
                entries={entries}
                status={entries ? null : 'No history available.'}
              />
            )}
            {active === 'tree' && (
              <LineageTree root={root} expanded={expanded} onToggle={toggle} onToggleAll={toggleAll} onOpen={open} />
            )}
            {activePreview && (
              <PreviewPanel key={activePreview.id} tab={activePreview} customer={customer} onOpen={open} />
            )}
          </div>
        </SubAccordion>
      </div>
    </div>
  )
}

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
