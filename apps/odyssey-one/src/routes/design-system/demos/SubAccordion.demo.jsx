import { useState } from 'react'
import { Info, Package, ClipboardList } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import { SubAccordion, TitleSubtitle } from '@odyssey/ui'

export const meta = {
  name: 'SubAccordion',
  tier: 'molecule',
  version: '0.6.0',
  createdVersion: '0.6.0',
  figmaNode: '4083:5044',
  codeConnect: 'packages/ui/src/SubAccordion.figma.tsx',
}

export const props = [
  { name: 'title', type: 'string', desc: 'The section title, heading/lg semibold. (Figma: Title TEXT prop.)' },
  { name: 'showIcon', type: 'boolean', desc: 'Renders the trailing header icon (20px, DSN/400, non-interactive) beside the title. Default true. (Figma: Show Icon BOOLEAN.)' },
  { name: 'icon', type: 'node', desc: 'Swaps the header icon. Defaults to lucide/info. (Figma: Icon INSTANCE_SWAP, placeholder-20 default.)' },
  { name: 'collapsible', type: 'boolean', desc: 'Default true. False renders the NON-COLLAPSIBLE flavor: plain heading row (no button/chevron/aria-expanded), content always revealed. (Figma: State=Static.)' },
  { name: 'expanded', type: 'boolean', desc: 'Controlled expansion. Omit for uncontrolled (defaultExpanded). Ignored when collapsible={false}. (Figma: State VARIANT Collapsed|Expanded|Static.)' },
  { name: 'defaultExpanded', type: 'boolean', desc: 'Uncontrolled initial state. Default false.' },
  { name: 'onToggle', type: '(next: boolean) => void', desc: 'Fires on header click with the next expansion state.' },
  { name: 'children', type: 'node', desc: 'The section body, revealed on expand. (Figma: Content SLOT.)' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the root element.' },
]

export const tokens = [
  { token: '--bg-primary', resolves: 'white', usage: 'card background' },
  { token: '--radius-2xl', resolves: '16px', usage: 'card corner radius' },
  { token: '--shadow-sm', resolves: '0 1 2 / 5%', usage: 'card elevation' },
  { token: '--spacing-4 / --spacing-6', resolves: '16 / 24', usage: 'card padding (v/h) + header↔content gap' },
  { token: 'text-heading-lg-semibold', resolves: '18 / 24 / 600', usage: 'title typography' },
  { token: '--text-placeholder', resolves: 'DSN/400', usage: 'info glyph' },
  { token: '--text-tertiary', resolves: 'DSN/500', usage: 'chevron (→ --text-primary on header hover)' },
  { token: '--transition-reveal', resolves: 'reveal easing', usage: 'grid-rows expand + chevron rotation' },
]

// ── Schematic ───────────────────────────────────────────────────────────────
// Slot-marker pink — a DSM annotation device (NOT a product design token; there is no pink
// in the palette). Kept local so it never reads as a real token. (RightPanel convention.)
const SLOT_BORDER = '#e85aad'
const SLOT_BG = 'rgba(232, 90, 173, 0.07)'
const SLOT_TEXT = '#b03b81'

function SlotPlaceholder() {
  return (
    <div style={{ minHeight: 96, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'var(--spacing-4)', border: `2px dashed ${SLOT_BORDER}`, borderRadius: 'var(--radius-md)', background: SLOT_BG, color: SLOT_TEXT, fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
      Slot (children)
      <span style={{ fontWeight: 'var(--font-weight-regular)' }}>section body renders here (e.g. an orders summary)</span>
    </div>
  )
}

function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>{tier}</span>
  )
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
      <div style={{ flex: '1 1 420px', minWidth: 340 }}>
        <SubAccordion title="Order Summary" defaultExpanded>
          <SlotPlaceholder />
        </SubAccordion>
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="card" tier="molecule">Collapsible shell: <code>--bg-primary</code>, <code>--radius-2xl</code>, <code>--shadow-sm</code>, padding 16/24 — the simplified Accordion (no stepper).</LegendRow>
        <LegendRow part="header" nested>Full-width toggle button — title (<code>heading/lg semibold</code>) + optional info glyph left, chevron right.</LegendRow>
        <LegendRow part="header icon" nested>Swap slot (<code>icon</code>, default <code>lucide/info</code>), 20px, <code>--text-placeholder</code> — optional (<code>showIcon</code>). (Figma: Icon INSTANCE_SWAP, placeholder-20.)</LegendRow>
        <LegendRow part="chevron" nested><code>lucide/chevron-down</code>, 20px, <code>--text-tertiary</code>; rotates 180° on expand — always present.</LegendRow>
        <LegendRow part="content slot" nested><code>children</code>, revealed via grid-rows 0fr→1fr; 24px gap under the header. (Figma: Content SLOT.)</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
function Toggle({ label, value, set, disabled }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} disabled={disabled} />
      {label}
    </label>
  )
}
function Field({ label, value, set }) {
  return (
    <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
      {label}
      <input value={value} onChange={(e) => set(e.target.value)} style={{ padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }} />
    </label>
  )
}

// Real slot content echoing Efrain's usage mock (4077:3120): a "General"
// sub-heading + a TitleSubtitle field row.
function ExampleBody() {
  const fields = [
    ['Owning Organization', 'ABC Corp'],
    ['Freight Term', 'Prepaid'],
    ['Ship Direction', 'Outbound'],
    ['Consolidatable', 'Yes'],
  ]
  return (
    <div>
      <div className="text-label-base-semibold" style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-3)' }}>General</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-4)', flexWrap: 'wrap' }}>
        {fields.map(([subtitle, title]) => (
          <div key={subtitle} style={{ width: 180 }}>
            <TitleSubtitle subtitle={subtitle} title={title} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Icon swap options — exercises the Figma `Icon` INSTANCE_SWAP slot.
const ICON_OPTIONS = {
  'info (default)': undefined,
  'package': <Package {...ICON_LG} />,
  'clipboard-list': <ClipboardList {...ICON_LG} />,
}

function Playground() {
  const [title, setTitle] = useState('Order Summary')
  const [showIcon, setShowIcon] = useState(true)
  const [iconKey, setIconKey] = useState('info (default)')
  const [collapsible, setCollapsible] = useState(true)
  const [expanded, setExpanded] = useState(true)

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Field label="title" value={title} set={setTitle} />
        <Toggle label="showIcon" value={showIcon} set={setShowIcon} />
        <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
          icon
          <select value={iconKey} onChange={(e) => setIconKey(e.target.value)} style={{ padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }}>
            {Object.keys(ICON_OPTIONS).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <Toggle label="collapsible" value={collapsible} set={setCollapsible} />
        <Toggle label="expanded" value={expanded} set={setExpanded} disabled={!collapsible} />
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)' }}>
        <SubAccordion
          title={title}
          showIcon={showIcon}
          icon={ICON_OPTIONS[iconKey]}
          collapsible={collapsible}
          expanded={collapsible ? expanded : undefined}
          onToggle={setExpanded}
        >
          <ExampleBody />
        </SubAccordion>
      </div>
    </div>
  )
}

export default function SubAccordionDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Simplified <code>Accordion</code> — a collapsible white card without the stepper,
        for big read-only information sections (e.g. a created-orders summary in the
        Shipments orders tab). Header row (title + optional swappable icon + 20px chevron)
        over a <code>children</code> content slot; same grid-rows reveal mechanics as
        Accordion. Renamed from <code>SubSectionHeader</code> when it grew the shell.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — edit title, swap the icon, toggle expansion</h4>
        <Playground />
      </div>
    </div>
  )
}
