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
  { name: 'onClose', type: '() => void', desc: 'Optional. When set, renders a close X (lg) via IconButtonGhost on the header trail.' },
  { name: 'footer', type: 'ReactNode', desc: 'Optional footer slot — rendered in a bordered footer region. Omit to hide.' },
  { name: 'children', type: 'ReactNode', desc: 'Content slot. Brings its own padding (the shell adds none).' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the panel element.' },
  { name: 'ariaLabel', type: 'string', desc: 'Accessible label override. Defaults to title.' },
]

export const tokens = [
  { token: '--right-panel-width', resolves: '343px', usage: 'panel width (code-side layout token)' },
  { token: '--shadow-panel', resolves: 'ring-1 + 2 drop shadows', usage: 'panel elevation' },
  { token: '--radius-md', resolves: '6px', usage: 'panel corner radius' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'header / footer dividers' },
  { token: '--bg-primary', resolves: 'Background/primary', usage: 'panel surface' },
  { token: '--text-primary', resolves: 'Text/primary', usage: 'title text' },
  { token: '--text-tertiary', resolves: 'Text/tertiary', usage: 'subtitle, back / edit icons, group labels' },
  { token: '--font-size-lg', resolves: '18px', usage: 'title (heading-lg-semibold)' },
  { token: '--letter-spacing-wide', resolves: '0.05em', usage: 'uppercase group labels' },
]

// Faithful replica of the Figma default Slot content: two preset groups of MenuRowRadio
// rows. The first group carries a ⋮ overflow action in its header.
function GroupHeader({ label, action = false }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-3)',
        height: 36,
        padding: 'var(--spacing-1) var(--spacing-2) var(--spacing-1) 0',
      }}
    >
      <span
        style={{
          flex: '1 1 0',
          minWidth: 0,
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-primary)',
          fontSize: 'var(--font-size-xs)',
          lineHeight: 'var(--line-height-xs)',
          fontWeight: 'var(--font-weight-medium)',
          letterSpacing: 'var(--letter-spacing-wide)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      {action && (
        <IconButtonGhost
          icon={<EllipsisVertical {...ICON_LG} aria-hidden="true" />}
          onClick={() => {}}
          ariaLabel="Group actions"
        />
      )}
    </div>
  )
}

function Group({ children, divider = false }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-1)',
        padding: 'var(--spacing-4) var(--spacing-6)',
        borderBottom: divider ? '1px solid var(--border-subtle)' : 'none',
      }}
    >
      {children}
    </div>
  )
}

function PresetContent() {
  const [selected, setSelected] = useState('Default Exceptions')
  const make = (label) => (
    <MenuRowRadio
      key={label}
      label={label}
      selected={selected === label}
      onSelect={() => setSelected(label)}
      onNavigate={() => {}}
    />
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

export default function RightPanelDemo() {
  // Playground toggles
  const [showBack, setShowBack] = useState(true)
  const [showSubtitle, setShowSubtitle] = useState(true)
  const [showFooter, setShowFooter] = useState(true)

  // Editable-title example (shell owns the edit UI; the value lives here).
  const [name, setName] = useState('Default Exceptions')
  const [editing, setEditing] = useState(false)

  // Drawer (open) example.
  const [open, setOpen] = useState(false)

  const toggle = (label, value, set) => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  )

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Right-side drawer / panel shell — header (optional back · title · optional editable name · optional
        subtitle · optional close) + content slot + optional footer. The shell owns the slide-in animation
        (<code>open</code>) and the in-place editable title (<code>editableTitle</code>/<code>editingTitle</code>,
        value via <code>onTitleChange</code>). Omit <code>open</code> for a static card. The content slot adds
        no padding; slotted content brings its own.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Full composition — editable title (pencil → rename in place)</h4>
        <div style={{ height: 560, display: 'flex', background: 'var(--bg-secondary)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-md)' }}>
          <RightPanel
            title={name}
            subtitle="Column Arrangement"
            editableTitle
            editingTitle={editing}
            onEditTitle={() => setEditing(true)}
            onTitleChange={setName}
            onTitleCommit={() => setEditing(false)}
            onTitleCancel={() => setEditing(false)}
            onBack={() => {}}
            onClose={() => {}}
            footer={editing}
            onCancel={() => setEditing(false)}
            onSave={() => setEditing(false)}
          >
            <PresetContent />
          </RightPanel>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Drawer — slide-in from the right (<code>open</code>)</h4>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{ marginBottom: 'var(--spacing-3)', padding: 'var(--spacing-2) var(--spacing-4)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}
        >
          {open ? 'Close' : 'Open'} drawer
        </button>
        <div style={{ height: 560, display: 'flex', justifyContent: 'flex-end', overflow: 'hidden', background: 'var(--bg-secondary)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-md)' }}>
          <RightPanel open={open} title="Fixed columns" subtitle="Column Arrangement" onClose={() => setOpen(false)}>
            <PresetContent />
          </RightPanel>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground (static card)</h4>
        <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)' }}>
          {toggle('back', showBack, setShowBack)}
          {toggle('subtitle', showSubtitle, setShowSubtitle)}
          {toggle('footer', showFooter, setShowFooter)}
        </div>
        <div style={{ height: 560, display: 'flex', background: 'var(--bg-secondary)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-md)' }}>
          <RightPanel
            title="Modal Title"
            subtitle={showSubtitle ? 'Modal SubTitle' : undefined}
            onBack={showBack ? () => {} : undefined}
            onClose={() => {}}
            footer={showFooter}
            onCancel={() => {}}
            onSave={() => {}}
          >
            <PresetContent />
          </RightPanel>
        </div>
      </div>
    </div>
  )
}
