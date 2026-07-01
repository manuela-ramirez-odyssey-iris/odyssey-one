import { useState } from 'react'
import { RightPanel, MenuRowRadio, IconButtonGhost } from '@odyssey/ui'
import { EllipsisVertical } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'

export const meta = {
  name: 'RightPanel',
  tier: 'organism',
  normalizing: false,
  figmaNode: '3449:10701',
  codeConnect: 'packages/ui/src/RightPanel.figma.tsx',
}

export const props = [
  { name: 'open', type: 'boolean', desc: 'Optional. When provided, renders as an animated right-dock drawer that slides in/out from the window right edge. Omit → static card.' },
  { name: 'title', type: 'string', desc: 'Header title / name (controlled value).' },
  { name: 'subtitle', type: 'string', desc: 'Optional header subtitle (label/xs). Omit to hide.' },
  { name: 'editableTitle', type: 'boolean', desc: 'Shows the edit pencil next to the title (enables in-place rename).' },
  { name: 'editingTitle', type: 'boolean', desc: 'Controlled. When true, the title renders as an in-place input (caret right after the name); the shell keeps it focused while editing.' },
  { name: 'onEditTitle', type: '() => void', desc: 'Pencil clicked — the consumer sets editingTitle = true.' },
  { name: 'onTitleChange', type: '(next: string) => void', desc: 'Title input changed — the value lives in the consumer\'s variable.' },
  { name: 'onTitleCommit', type: '() => void', desc: 'Enter pressed in the title input.' },
  { name: 'onTitleCancel', type: '() => void', desc: 'Escape pressed in the title input.' },
  { name: 'onBack', type: '() => void', desc: 'Optional. When set, renders a back chevron-left (lg) on the header lead.' },
  { name: 'onClose', type: '() => void', desc: 'Close handler. The close X (lg) is always shown via ModalHeader on the header trail.' },
  { name: 'closeOnOutsideClick', type: 'boolean', desc: 'Opt-in. A mousedown outside the panel calls onClose (cancelling any in-progress title edit first). Inactive while the drawer is closed. Default false.' },
  { name: 'footer', type: 'boolean', desc: 'Toggles the baked footer (Cancel secondary + Save primary, space-between). Mirrors the Figma Footer BOOLEAN — NOT a content slot.' },
  { name: 'onCancel', type: '() => void', desc: 'Footer Cancel pressed.' },
  { name: 'onSave', type: '() => void', desc: 'Footer Save pressed.' },
  { name: 'cancelLabel', type: 'string', desc: "Footer Cancel label. Default 'Cancel'." },
  { name: 'saveLabel', type: 'string', desc: "Footer Save label. Default 'Save'." },
  { name: 'children', type: 'ReactNode', desc: 'Content slot. Brings its own padding (the shell adds none).' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the panel element.' },
  { name: 'ariaLabel', type: 'string', desc: 'Accessible label override. Defaults to title.' },
]

export const tokens = [
  { token: '--right-panel-width', resolves: '343px', usage: 'panel width (code-side layout token)' },
  { token: '--transition-drawer', resolves: '300ms ease-out-expo', usage: 'drawer slide-in (open)' },
  { token: '--shadow-panel', resolves: 'ring-1 + 2 drop shadows', usage: 'panel elevation' },
  { token: '--radius-md', resolves: '6px', usage: 'panel corner radius' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'header / footer dividers' },
  { token: '--bg-primary', resolves: 'Background/primary', usage: 'panel surface' },
  { token: '--text-primary', resolves: 'Text/primary', usage: 'title text' },
  { token: '--text-tertiary', resolves: 'Text/tertiary', usage: 'subtitle, back / edit icons, group labels' },
  { token: '--font-size-lg', resolves: '18px', usage: 'title (heading-lg-semibold)' },
  { token: '--letter-spacing-wide', resolves: '0.05em', usage: 'uppercase group labels' },
]

// ── Realistic slot content for the Playground: two preset groups of MenuRowRadio rows.
// (In the Schematic the slot is shown as an empty placeholder instead — see SlotPlaceholder.)
function GroupHeader({ label, action = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', height: 36, padding: 'var(--spacing-1) var(--spacing-2) var(--spacing-1) 0' }}>
      <span style={{ flex: '1 1 0', minWidth: 0, color: 'var(--text-tertiary)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-xs)', lineHeight: 'var(--line-height-xs)', fontWeight: 'var(--font-weight-medium)', letterSpacing: 'var(--letter-spacing-wide)', textTransform: 'uppercase' }}>
        {label}
      </span>
      {action && <IconButtonGhost icon={<EllipsisVertical {...ICON_LG} aria-hidden="true" />} onClick={() => {}} ariaLabel="Group actions" />}
    </div>
  )
}

function Group({ children, divider = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)', padding: 'var(--spacing-4) var(--spacing-6)', borderBottom: divider ? '1px solid var(--border-subtle)' : 'none' }}>
      {children}
    </div>
  )
}

function PresetContent() {
  const [selected, setSelected] = useState('Default Exceptions')
  const make = (label) => (
    <MenuRowRadio key={label} label={label} selected={selected === label} onSelect={() => setSelected(label)} onNavigate={() => {}} />
  )
  return (
    <>
      <Group divider>
        <GroupHeader label="Custom Presets" action />
        {make('Default Exceptions')}
        {make('Default Monitoring')}
      </Group>
      <Group>
        <GroupHeader label="Odyssey Presets" />
        {make('Logistics View')}
        {make('Financial View')}
        {make('Carrier View')}
      </Group>
    </>
  )
}

// ── Schematic ─────────────────────────────────────────────────────────────────────
// A static, non-interactive RightPanel with every region visible, the content slot shown
// as a pink dashed placeholder, and a legend that names each part. Composed @odyssey/ui
// children link (↗, new tab) to their own DSM entry via the `#comp-<Name>` deep-link.

// Slot-marker pink — a DSM annotation device (NOT a product design token; there is no pink
// in the palette). Kept local so it never reads as a real token.
const SLOT_BORDER = '#e85aad'
const SLOT_BG = 'rgba(232, 90, 173, 0.07)'
const SLOT_TEXT = '#b03b81'

function SlotPlaceholder() {
  return (
    <div style={{ margin: 'var(--spacing-4) var(--spacing-6)', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'var(--spacing-4)', border: `2px dashed ${SLOT_BORDER}`, borderRadius: 'var(--radius-md)', background: SLOT_BG, color: SLOT_TEXT, fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
      Slot (children)
      <br />
      your content renders here
    </div>
  )
}

// Atom link → the component's own DSM entry (deep-link, new tab). Underlined = clickable.
function ChildLink({ to, children }) {
  return (
    <a href={`#comp-${to}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)', textDecoration: 'underline', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap' }}>
      {children}
    </a>
  )
}

// Tier badge — neutral, token-based (atom / molecule / organism).
function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>
      {tier}
    </span>
  )
}

// Rows live in a 2-column grid (see the <ul>): the first column is `max-content`, so it
// auto-sizes to the widest label (e.g. IconButtonGhost); the 10px column-gap is the gutter.
// Each row is `display: contents` so its two cells drop straight into the grid.
function LegendRow({ part, tier, nested = false, children }) {
  const cell = { padding: 'var(--spacing-2) 0', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }
  return (
    <li style={{ display: 'contents' }}>
      <span style={{ ...cell, display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', whiteSpace: 'nowrap', paddingLeft: nested ? 'var(--spacing-6)' : 0, color: 'var(--text-primary)', fontWeight: nested ? 'var(--font-weight-medium)' : 'var(--font-weight-semibold)' }}>
        {nested && <span style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">└</span>}
        {part}
        {tier && <TierBadge tier={tier} />}
      </span>
      <span style={{ ...cell, color: 'var(--text-secondary)' }}>{children}</span>
    </li>
  )
}

function Schematic() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8)', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
      {/* Static annotated panel — no `open` (static card), no live handlers. */}
      <div style={{ flex: '0 0 auto' }}>
        <RightPanel
          title="Title"
          subtitle="Subtitle"
          editableTitle
          onBack={() => {}}
          onClose={() => {}}
          footer
          onCancel={() => {}}
          onSave={() => {}}
        >
          <SlotPlaceholder />
        </RightPanel>
      </div>

      {/* Legend — two layers: the Figma molecule regions (ModalHeader / ModalFooter, linked
          to Figma) and the real code atoms they contain (IconButtonGhost / Button, linked to
          their DSM entry). Bare parts (back / title / subtitle / slot) carry no component. */}
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part={<ChildLink to="ModalHeader">ModalHeader</ChildLink>} tier="molecule">
          The header band — a real molecule (composes IconButtonGhost + the back/title/edit/subtitle parts below).
        </LegendRow>
        <LegendRow part="back" nested>Back affordance: <code>chevron-left</code> (lg). Renders when <code>onBack</code> is set.</LegendRow>
        <LegendRow part="title" nested>Heading; <code>editableTitle</code> adds a <code>pencil</code> (md) → in-place rename.</LegendRow>
        <LegendRow part="subtitle" nested>Optional label/xs text under the title.</LegendRow>
        <LegendRow part={<ChildLink to="IconButtonGhost">IconButtonGhost</ChildLink>} tier="atom" nested>
          Close — wraps <code>x</code> (lg). Always shown; <code>onClose</code> is its handler.
        </LegendRow>

        <LegendRow part="Slot"><strong style={{ color: SLOT_TEXT }}>The pink region</strong> — your <code>children</code>, any content. The shell adds no padding.</LegendRow>

        <LegendRow part={<ChildLink to="ModalFooter">ModalFooter</ChildLink>} tier="molecule">
          The footer band — a real molecule (<code>type="confirm"</code>). Rendered when <code>footer</code> is true.
        </LegendRow>
        <LegendRow part={<ChildLink to="Button">Button</ChildLink>} tier="atom" nested>
          Cancel (secondary) + Save (primary), ×2.
        </LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ────────────────────────────────────────────────────────────────────
// One interactive panel exercising everything: back / subtitle / editable title / footer
// toggles, plus a Drawer switch that docks it right with an Open/Close button (the slide-in).

function Toggle({ label, value, set }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  )
}

function Playground() {
  const [showBack, setShowBack] = useState(true)
  const [showSubtitle, setShowSubtitle] = useState(true)
  const [editable, setEditable] = useState(true)
  const [footerOn, setFooterOn] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [open, setOpen] = useState(false)

  // Editable-title state (the value lives here; the shell owns the edit UI).
  const [name, setName] = useState('Default Exceptions')
  const [editing, setEditing] = useState(false)

  const panel = (
    <RightPanel
      open={drawer ? open : undefined}
      title={name}
      subtitle={showSubtitle ? 'Column Arrangement' : undefined}
      editableTitle={editable}
      editingTitle={editing}
      onEditTitle={() => setEditing(true)}
      onTitleChange={setName}
      onTitleCommit={() => setEditing(false)}
      onTitleCancel={() => setEditing(false)}
      onBack={showBack ? () => {} : undefined}
      onClose={drawer ? () => setOpen(false) : () => {}}
      closeOnOutsideClick={drawer}
      footer={footerOn || editing}
      onCancel={() => setEditing(false)}
      onSave={() => setEditing(false)}
    >
      <PresetContent />
    </RightPanel>
  )

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap' }}>
        <Toggle label="back" value={showBack} set={setShowBack} />
        <Toggle label="subtitle" value={showSubtitle} set={setShowSubtitle} />
        <Toggle label="editable title" value={editable} set={setEditable} />
        <Toggle label="footer" value={footerOn} set={setFooterOn} />
        <Toggle label="drawer (animated)" value={drawer} set={(v) => { setDrawer(v); setOpen(false) }} />
        {drawer && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{ padding: 'var(--spacing-1) var(--spacing-4)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}
          >
            Open drawer
          </button>
        )}
        {drawer && open && (
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
            open — click outside or the ✕ to close
          </span>
        )}
      </div>

      {/* Drawer mode docks right + clips the off-screen slide; static mode renders inline. */}
      <div style={{ height: 560, display: 'flex', justifyContent: drawer ? 'flex-end' : 'flex-start', overflow: 'hidden', background: 'var(--bg-secondary)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-md)' }}>
        {panel}
      </div>
    </div>
  )
}

export default function RightPanelDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        A right-side drawer / panel <strong>shell</strong>. The <strong>Schematic</strong> below shows its
        anatomy — where the slot is and which <code>@odyssey/ui</code> children it composes (click ↗ to open
        each). The <strong>Playground</strong> is the live thing: toggle the parts, rename the title in place,
        and flip on the drawer to see the slide-in.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy &amp; slot</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — test it fully</h4>
        <Playground />
      </div>
    </div>
  )
}
