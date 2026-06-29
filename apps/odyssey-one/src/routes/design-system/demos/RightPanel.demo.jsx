import { useState } from 'react'
import { RightPanel, MenuRowRadio, Button, IconButtonGhost } from '@odyssey/ui'
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
  { name: 'title', type: 'string', desc: 'Header title text.' },
  { name: 'subtitle', type: 'string', desc: 'Optional header subtitle (label/xs). Omit to hide.' },
  { name: 'onBack', type: '() => void', desc: 'Optional. When set, renders a back chevron-left (lg) on the header lead.' },
  { name: 'onEdit', type: '() => void', desc: 'Optional. When set, renders an edit pencil (md) next to the title.' },
  { name: 'onClose', type: '() => void', desc: 'Optional. When set, renders a close X (lg) via IconButtonGhost on the header trail.' },
  { name: 'footer', type: 'ReactNode', desc: 'Optional footer slot — rendered in a bordered footer region. Omit to hide.' },
  { name: 'children', type: 'ReactNode', desc: 'Content slot. Brings its own padding (the shell adds none).' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the panel element (e.g. to override width).' },
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

const CancelSave = (
  <>
    <Button variant="secondary" onClick={() => {}}>Cancel</Button>
    <Button variant="primary" onClick={() => {}}>Save</Button>
  </>
)

export default function RightPanelDemo() {
  // Playground toggles
  const [showBack, setShowBack] = useState(true)
  const [showEdit, setShowEdit] = useState(true)
  const [showSubtitle, setShowSubtitle] = useState(true)
  const [showFooter, setShowFooter] = useState(true)

  const toggle = (label, value, set) => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  )

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Self-contained right-side drawer / panel shell — header (optional back · title · optional edit ·
        optional subtitle · optional close) + content slot + optional footer. Presentational only: it has
        no overlay / ESC / positioning, so consumers place it (inline column, popover, slide-in) and wire
        dismissal via <code>onBack</code> / <code>onClose</code>. The content slot adds no padding; slotted
        content brings its own.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Full composition (Figma default content)</h4>
        <div style={{ height: 560, display: 'flex', background: 'var(--bg-secondary)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-md)' }}>
          <RightPanel
            title="Modal Title"
            subtitle="Modal SubTitle"
            onBack={() => {}}
            onEdit={() => {}}
            onClose={() => {}}
            footer={CancelSave}
          >
            <PresetContent />
          </RightPanel>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground</h4>
        <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)' }}>
          {toggle('back', showBack, setShowBack)}
          {toggle('edit', showEdit, setShowEdit)}
          {toggle('subtitle', showSubtitle, setShowSubtitle)}
          {toggle('footer', showFooter, setShowFooter)}
        </div>
        <div style={{ height: 560, display: 'flex', background: 'var(--bg-secondary)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-md)' }}>
          <RightPanel
            title="Modal Title"
            subtitle={showSubtitle ? 'Modal SubTitle' : undefined}
            onBack={showBack ? () => {} : undefined}
            onEdit={showEdit ? () => {} : undefined}
            onClose={() => {}}
            footer={showFooter ? CancelSave : undefined}
          >
            <PresetContent />
          </RightPanel>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Header-only (no footer, title + close)</h4>
        <div style={{ height: 320, display: 'flex', background: 'var(--bg-secondary)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-md)' }}>
          <RightPanel title="Settings" onClose={() => {}}>
            <Group>
              <GroupHeader label="General" />
              <MenuRowRadio label="Option A" selected onSelect={() => {}} onNavigate={() => {}} />
              <MenuRowRadio label="Option B" onSelect={() => {}} onNavigate={() => {}} />
            </Group>
          </RightPanel>
        </div>
      </div>
    </div>
  )
}
