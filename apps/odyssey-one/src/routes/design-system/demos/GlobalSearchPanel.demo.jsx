import { useState } from 'react'
import { GlobalSearchPanel, GlobalSearchResults } from '@odyssey/ui'

export const meta = {
  name: 'GlobalSearchPanel',
  tier: 'organism',
  version: '0.13.0',
  createdVersion: '0.2.0',
  figmaNode: '2462:149',
  codeConnect: 'packages/ui/src/GlobalSearchPanel.figma.tsx',
  normalizing: false,
}

export const props = [
  { name: 'showHeader', type: 'boolean', desc: 'Render the header bar (back + title + close X). Hidden by default (the Results state has no header).' },
  { name: 'showBack', type: 'boolean', desc: 'Show the ChevronLeft back button inside the header (requires showHeader). Default false.' },
  { name: 'title', type: 'string', desc: "Header title text. Default 'Filters'." },
  { name: 'onBack', type: '() => void', desc: 'Called when the back button is clicked.' },
  { name: 'onClose', type: '() => void', desc: 'Shows a close X button in the header; called on click.' },
  { name: 'children', type: 'ReactNode', desc: 'Content slot — filled by <GlobalSearchResults>, <SearchFilters>, etc. per search state.' },
  { name: 'showLink', type: 'boolean', desc: 'Show the leading-left link button in the footer (e.g. Save Filters). Default false.' },
  { name: 'linkLabel', type: 'string', desc: "Footer link button label. Default 'Save Filters'." },
  { name: 'linkIcon', type: 'ReactNode', desc: 'Leading icon for the footer link button. Default <CirclePlus>.' },
  { name: 'onLink', type: '() => void', desc: 'Called when the footer link button is clicked.' },
  { name: 'linkDisabled', type: 'boolean', desc: "Disables the footer link, using Button's own disabled state. For consumers with nothing to act on (e.g. Save Filters with no field filled) — an unwired handler would read as enabled and broken instead. Default false." },
  { name: 'showSecondary', type: 'boolean', desc: 'Show the lead/left secondary button in the footer. Default true.' },
  { name: 'showTrailSecondary', type: 'boolean', desc: 'Show a second secondary button on the trail/right (Filters·All "Clear all" next to "Show N"). Default false.' },
  { name: 'secondaryLabel', type: 'string', desc: "Secondary button label. Default 'Clear all'." },
  { name: 'onClear', type: '() => void', desc: 'Called when any secondary button is clicked.' },
  { name: 'count', type: 'number', desc: 'Result count used to build the default primary label ("Show N results").' },
  { name: 'primaryLabel', type: 'string', desc: 'Override the primary button label entirely (skips the count-based default).' },
  { name: 'onShowResults', type: '() => void', desc: 'Called when the primary button is clicked.' },
  { name: 'primaryDisabled', type: 'boolean', desc: "Disables the primary button, using Button's own disabled state. For consumers with nothing to act on (e.g. the Saved tab with no profile selected) — an unwired handler would read as enabled and broken instead. Default false." },
]

export const tokens = [
  { token: '--shadow-2xl', resolves: 'shadow/2xl', usage: 'panel card elevation' },
  { token: '--bg-primary', resolves: 'white', usage: 'panel background' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'header and footer dividers' },
  { token: '--radius-xl', resolves: 'radius/xl (12px)', usage: 'panel corner radius' },
  { token: '--spacing-6', resolves: '24px', usage: 'header / footer horizontal padding' },
]

const MOCK = [
  { matchId: 'C814956', route: 'Allentown, PA → Henderson, KY', customer: 'Kemira Americas', carrier: 'CAPITAL TRANSPORTATION', bol: 'S378003JB3', source: { label: 'FourKites, Inc.', variant: 'blue' }, iconType: 'container' },
  { matchId: 'C7645814', route: 'Allentown, PA → Louisville, KY', customer: 'A Hartrodt', carrier: 'AACT - AAA COOPER', bol: 'TH545725', source: { label: 'EDI 214', variant: 'purple' }, iconType: 'package' },
  { matchId: 'C9021344', route: 'Chicago, IL → Dallas, TX', customer: 'Global Chem Partners', carrier: 'XPO LOGISTICS', bol: 'XP00291847', source: { label: 'FourKites, Inc.', variant: 'blue' }, iconType: 'handshake' },
]

// ── Schematic ───────────────────────────────────────────────────────────────
// Slot-marker pink — a DSM annotation device (NOT a product design token; there is no pink
// in the palette). Kept local so it never reads as a real token. (RightPanel convention.)
const SLOT_BORDER = '#e85aad'
const SLOT_BG = 'rgba(232, 90, 173, 0.07)'
const SLOT_TEXT = '#b03b81'

function SlotPlaceholder() {
  return (
    <div style={{ margin: 'var(--spacing-6)', minHeight: 140, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'var(--spacing-4)', border: `2px dashed ${SLOT_BORDER}`, borderRadius: 'var(--radius-md)', background: SLOT_BG, color: SLOT_TEXT, fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
      Slot (children)
      <span style={{ fontWeight: 'var(--font-weight-regular)' }}>&lt;GlobalSearchResults&gt; / &lt;SearchFilters&gt; render here</span>
    </div>
  )
}

function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>{tier}</span>
  )
}
function ChildLink({ to, children }) {
  return <a href={`#comp-${to}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)', textDecoration: 'underline', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap' }}>{children}</a>
}
function LegendRow({ part, tier, nested = false, children }) {
  const cell = { padding: 'var(--spacing-2) 0', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }
  return (
    <li style={{ display: 'contents' }}>
      <span style={{ ...cell, display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', whiteSpace: 'nowrap', paddingLeft: nested ? 'var(--spacing-6)' : 0, color: 'var(--text-primary)', fontWeight: nested ? 'var(--font-weight-medium)' : 'var(--font-weight-semibold)' }}>
        {nested && <span style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">└</span>}
        {part}{tier && <TierBadge tier={tier} />}
      </span>
      <span style={{ ...cell, color: 'var(--text-secondary)' }}>{children}</span>
    </li>
  )
}

function Schematic() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8)', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ flex: '1 1 460px', minWidth: 360 }}>
        <GlobalSearchPanel
          showHeader
          showBack
          title="Filters"
          onBack={() => {}}
          onClose={() => {}}
          showSecondary
          secondaryLabel="Clear all"
          count={40}
          onClear={() => {}}
          onShowResults={() => {}}
        >
          <SlotPlaceholder />
        </GlobalSearchPanel>
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="header" tier="molecule">Optional band (<code>showHeader</code>): back + title + close X.</LegendRow>
        <LegendRow part={<ChildLink to="IconButtonGhost">IconButtonGhost</ChildLink>} tier="atom" nested>back (<code>chevron-left</code>, gated by <code>showBack</code>) + close (<code>x</code>, gated by <code>onClose</code>), lg.</LegendRow>
        <LegendRow part="Slot"><strong style={{ color: SLOT_TEXT }}>The pink region</strong> — your <code>children</code> (GlobalSearchResults / SearchFilters), one per search state.</LegendRow>
        <LegendRow part="footer" tier="molecule">Baked bar: secondary on the lead; optional trail-secondary + primary on the trail.</LegendRow>
        <LegendRow part={<ChildLink to="Button">Button</ChildLink>} tier="atom" nested>secondary (Clear all) / primary (Show all N results).</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
function Toggle({ label, value, set }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  )
}

function Playground() {
  const [showHeader, setShowHeader] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [showSecondary, setShowSecondary] = useState(true)
  const [showTrailSecondary, setShowTrailSecondary] = useState(false)
  const [note, setNote] = useState(null)

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap' }}>
        <Toggle label="header" value={showHeader} set={setShowHeader} />
        <Toggle label="link (Save Filters)" value={showLink} set={setShowLink} />
        <Toggle label="secondary (lead)" value={showSecondary} set={setShowSecondary} />
        <Toggle label="trail secondary" value={showTrailSecondary} set={setShowTrailSecondary} />
      </div>
      <div style={{ maxWidth: 620 }}>
        {/* Playground fills the slot with the real GlobalSearchResults (not the placeholder). */}
        <GlobalSearchPanel
          showHeader={showHeader}
          showBack
          title="Filters"
          onBack={() => setNote('back')}
          onClose={() => setNote('close')}
          showLink={showLink}
          linkLabel="Save Filters"
          onLink={() => setNote('save filters')}
          showSecondary={showSecondary}
          showTrailSecondary={showTrailSecondary}
          secondaryLabel="Clear all"
          count={MOCK.length}
          onClear={() => setNote('clear all')}
          onShowResults={() => setNote('show results')}
        >
          <GlobalSearchResults
            matches={MOCK}
            onFiltersClick={() => setNote('filter more')}
            onMatchClick={(m) => setNote(m.matchId)}
          />
        </GlobalSearchPanel>
      </div>
      {note && (
        <p style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
          Last action: <strong style={{ color: 'var(--text-primary)' }}>{note}</strong>
        </p>
      )}
    </div>
  )
}

export default function GlobalSearchPanelDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Modal-pattern <strong>shell</strong> for the GlobalSearch panel — a fixed 720px card with an
        optional header (back + title + close), a single <code>children</code> content slot, and a
        baked footer (link + secondary on the lead; optional trail-secondary + primary on the trail).
        Each search state fills the slot with its own component — <code>GlobalSearchResults</code> or{' '}
        <code>SearchFilters</code>. The <strong>Schematic</strong> marks the slot in pink; the{' '}
        <strong>Playground</strong> fills it with a live <code>GlobalSearchResults</code>.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy &amp; slot</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — toggle header + footer parts (slot = live GlobalSearchResults)</h4>
        <Playground />
      </div>
    </div>
  )
}
