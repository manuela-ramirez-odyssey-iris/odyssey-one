import { useState } from 'react'
import { Info, Package, ClipboardList, Plus, LayoutGrid, List } from 'lucide-react'
import { ICON_LG, ICON_MD } from '@odyssey/tokens'
import { Button, ButtonToggle, SubAccordion, TitleSubtitle } from '@odyssey/ui'
import { DemoControls, DemoControlGroup, DemoToggle, DemoSelect, DemoField } from '../demoControls.jsx'

export const meta = {
  name: 'SubAccordion',
  tier: 'molecule',
  version: '1.8.0',
  createdVersion: '0.6.0',
  normalizing: false,
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
  { name: 'allExpanded', type: 'boolean', desc: 'Whether ALL slot content is currently expanded — picks the action label/icon ("Collapse All" chevrons-down-up vs "Expand All" chevrons-up-down). Default false. Consumer-tracked.' },
  { name: 'buttonToggle', type: 'node', desc: 'Optional node — by convention a `ButtonToggle` — at the HEAD of the header\'s action cluster, before the expand-all control: a segmented toggle changes what the section SHOWS, so it reads before the actions that operate on it. A plain node like `action`, so the consumer owns its selected/onChange state; omit it to hide it. Static-only. (Figma: Show Button Toggle BOOLEAN, default false.)' },
  { name: 'onToggleAll', type: '(next: boolean) => void', desc: 'When provided, renders the expand-all control on the right of the header row (a sibling of the header toggle — clicks never bubble to it). Fires with !allExpanded. (Figma: Show Expand All BOOLEAN, default false.)' },
  { name: 'toggleAllVariant', type: "'link' | 'secondary'", default: "'link'", desc: 'Which control the expand-all action is: the historic `Button variant="link"`, or a `Button variant="secondary" size="sm"` for sections that need more weight. Label, icons, callback and Static-only placement are identical either way — only the chrome changes. (Figma: the `Show Expand All` and `Show Secondary Button` BOOLEANs — the same action drawn two ways, used instead of one another rather than together.)' },
  { name: 'action', type: 'node', desc: 'Static-only primary action rendered at the end of the header row, after the expand-all link — by convention a Button variant="primary" size="sm" (e.g. the Documents card’s "Add Document"). (Figma: Show Button BOOLEAN, default false.)' },
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
  const [allExpanded, setAllExpanded] = useState(false)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8)', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ flex: '1 1 420px', minWidth: 340, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        {/* Collapsible flavor — header toggle + chevron */}
        <SubAccordion title="Order Summary" defaultExpanded>
          <SlotPlaceholder />
        </SubAccordion>
        {/* Static flavor — the header actions (ButtonToggle + expand-all link + primary sm) */}
        <SubAccordion
          title="All Documents"
          showIcon={false}
          collapsible={false}
          buttonToggle={
            <ButtonToggle
              selected="first"
              onChange={() => {}}
              firstIcon={<List {...ICON_LG} />}
              secondIcon={<LayoutGrid {...ICON_LG} />}
              firstAriaLabel="List view"
              secondAriaLabel="Grid view"
            />
          }
          allExpanded={allExpanded}
          onToggleAll={setAllExpanded}
          action={<Button variant="primary" size="sm" icon={<Plus {...ICON_MD} />}>Add Document</Button>}
        >
          <SlotPlaceholder />
        </SubAccordion>
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="card" tier="molecule">Collapsible shell: <code>--bg-primary</code>, <code>--radius-2xl</code>, <code>--shadow-sm</code>, padding 16/24 — the simplified Accordion (no stepper).</LegendRow>
        <LegendRow part="header" nested>Full-width toggle button — title (<code>heading/lg semibold</code>) + optional info glyph left, chevron right.</LegendRow>
        <LegendRow part="header icon" nested>Swap slot (<code>icon</code>, default <code>lucide/info</code>), 20px, <code>--text-placeholder</code> — optional (<code>showIcon</code>). (Figma: Icon INSTANCE_SWAP, placeholder-20.)</LegendRow>
        <LegendRow part="chevron" nested><code>lucide/chevron-down</code>, 20px, <code>--text-tertiary</code>; rotates 180° on expand — collapsible states only.</LegendRow>
        <LegendRow part="buttonToggle" tier="molecule" nested>Static-only optional <code>ButtonToggle</code> at the head of the action cluster — renders when <code>buttonToggle</code> is passed.</LegendRow>
        <LegendRow part="expand-all action" tier="atom" nested>Static-only optional control right of the header row — <code>Button variant="link"</code> by default, or a Secondary Button via <code>toggleAllVariant</code> — renders when <code>onToggleAll</code> is provided; <code>allExpanded</code> flips "Expand All" <code>chevrons-up-down</code> ↔ "Collapse All" <code>chevrons-down-up</code> (16px). A SIBLING of the header heading, never nested in a button. (Figma: Show Expand All BOOLEAN.)</LegendRow>
        <LegendRow part="primary action" tier="atom" nested>Static-only optional <code>action</code> node at the end of the header row, after the expand-all link — by convention <code>Button variant="primary" size="sm"</code> (e.g. Documents "Add Document"). Both actions toggle independently. (Figma: Show Button BOOLEAN, S80.)</LegendRow>
        <LegendRow part="content slot" nested><code>children</code>, revealed via grid-rows 0fr→1fr; 24px gap under the header. (Figma: Content SLOT.)</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────

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
  const [showToggleAll, setShowToggleAll] = useState(true)
  const [showButtonToggle, setShowButtonToggle] = useState(false)
  const [view, setView] = useState('first')
  const [toggleAllVariant, setToggleAllVariant] = useState('link')
  const [allExpanded, setAllExpanded] = useState(false)
  const [showAction, setShowAction] = useState(false)

  return (
    <div>
      <DemoControls>
        <DemoControlGroup label="State">
          <DemoToggle label="collapsible" value={collapsible} onChange={setCollapsible} />
          <DemoToggle
            label="expanded"
            value={expanded}
            onChange={setExpanded}
            disabled={!collapsible}
            hint={!collapsible ? 'Static content is always revealed' : undefined}
          />
        </DemoControlGroup>

        <DemoControlGroup label="Header actions (Static only)">
          <DemoToggle
            label="buttonToggle"
            value={showButtonToggle}
            onChange={setShowButtonToggle}
            disabled={collapsible}
            hint={collapsible ? 'Header actions are Static-only' : undefined}
          />
          <DemoToggle
            label="onToggleAll"
            value={showToggleAll}
            onChange={setShowToggleAll}
            disabled={collapsible}
            hint={collapsible ? 'Header actions are Static-only' : undefined}
          />
          <DemoSelect
            label="toggleAllVariant"
            value={toggleAllVariant}
            onChange={setToggleAllVariant}
            options={['link', 'secondary']}
            disabled={collapsible || !showToggleAll}
            hint={collapsible ? 'Header actions are Static-only' : (!showToggleAll ? 'No expand-all control is rendered' : undefined)}
          />
          <DemoToggle
            label="action (primary sm)"
            value={showAction}
            onChange={setShowAction}
            disabled={collapsible}
            hint={collapsible ? 'Header actions are Static-only' : undefined}
          />
        </DemoControlGroup>

        <DemoControlGroup label="Content">
          <DemoField label="title" value={title} onChange={setTitle} />
          <DemoToggle label="showIcon" value={showIcon} onChange={setShowIcon} />
          <DemoSelect
            label="icon"
            value={iconKey}
            onChange={setIconKey}
            options={Object.keys(ICON_OPTIONS)}
            disabled={!showIcon}
            hint={!showIcon ? 'No icon is rendered while showIcon is off' : undefined}
          />
        </DemoControlGroup>
      </DemoControls>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)' }}>
        <SubAccordion
          title={title}
          showIcon={showIcon}
          icon={ICON_OPTIONS[iconKey]}
          collapsible={collapsible}
          expanded={collapsible ? expanded : undefined}
          onToggle={setExpanded}
          buttonToggle={showButtonToggle ? (
            <ButtonToggle
              selected={view}
              onChange={setView}
              firstIcon={<List {...ICON_LG} />}
              secondIcon={<LayoutGrid {...ICON_LG} />}
              firstAriaLabel="List view"
              secondAriaLabel="Grid view"
            />
          ) : undefined}
          allExpanded={allExpanded}
          onToggleAll={showToggleAll ? setAllExpanded : undefined}
          toggleAllVariant={toggleAllVariant}
          action={showAction ? <Button variant="primary" size="sm" icon={<Plus {...ICON_MD} />}>Add Document</Button> : undefined}
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
