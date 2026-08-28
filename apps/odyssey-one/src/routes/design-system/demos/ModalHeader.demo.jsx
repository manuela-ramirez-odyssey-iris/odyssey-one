import { useState } from 'react'
import { Badge, ModalHeader } from '@odyssey/ui'

export const meta = {
  name: 'ModalHeader',
  tier: 'molecule',
  version: '1.5.0',
  createdVersion: '0.5.0',
  normalizing: false,
  figmaNode: '3447:7661',
  codeConnect: 'packages/ui/src/ModalHeader.figma.tsx',
}

export const props = [
  { name: 'title', type: 'string', desc: 'Header title / name (controlled value). (Figma: Title TEXT prop.)' },
  { name: 'subtitle', type: 'string', desc: 'Optional editable subtitle (label-xs). Provide to show, omit to hide. (Figma: Subtitle TEXT, gated by the Show Subtitle boolean.)' },
  { name: 'onBack', type: '() => void', desc: 'Optional. Set → back chevron-left (lg). (Figma: Show Back boolean.)' },
  { name: 'editableTitle', type: 'boolean', desc: 'Shows the edit pencil (md). (Figma: Editable boolean.)' },
  { name: 'editingTitle', type: 'boolean', desc: 'Controlled. Title → in-place input, focused once on enter.' },
  { name: 'onEditTitle', type: '() => void', desc: 'Pencil pressed — the consumer sets editingTitle = true.' },
  { name: 'onTitleChange', type: '(next: string) => void', desc: 'Title input changed (each keystroke).' },
  { name: 'onTitleCommit', type: '() => void', desc: 'Enter pressed in the title input.' },
  { name: 'onTitleCancel', type: '() => void', desc: 'Escape pressed in the title input.' },
  { name: 'onClose', type: '() => void', desc: 'Close handler. The close X (lg, via IconButtonGhost) is always shown — no visibility boolean.' },
  { name: 'trail', type: 'ReactNode', desc: 'Optional node on the trail edge, immediately BEFORE the close X. For status that must stay legible while the body scrolls (SpotBid puts its live "closes in" countdown here).' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the header element.' },
  { name: 'ariaLabel', type: 'string', desc: 'Optional accessible label on the header region.' },
]

export const tokens = [
  { token: '--spacing-6', resolves: '24px', usage: 'horizontal padding' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'bottom divider' },
  { token: '--text-primary', resolves: 'Text/primary', usage: 'title' },
  { token: '--text-tertiary', resolves: 'Text/tertiary', usage: 'subtitle, back / edit icons' },
  { token: '--font-size-lg', resolves: '18px', usage: 'title (heading-lg-semibold)' },
  { token: '--font-size-xs', resolves: '12px', usage: 'subtitle (label-xs)' },
]

// Frame the header in a panel-like container so the full-width band + divider read correctly.
function Frame({ children }) {
  return (
    <div style={{ width: 360, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {children}
    </div>
  )
}

function Toggle({ label, value, set }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  )
}

export default function ModalHeaderDemo() {
  const [name, setName] = useState('Default Exceptions')
  const [editing, setEditing] = useState(false)
  const [showBack, setShowBack] = useState(true)
  const [editable, setEditable] = useState(true)
  const [showSub, setShowSub] = useState(true)
  const [showTrail, setShowTrail] = useState(true)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        The header band for modal / panel shells — back · title · edit pencil · subtitle · close. Its Figma
        props (<code>Title</code>/<code>Subtitle</code> TEXT + <code>Show Back</code>/<code>Show Subtitle</code>/
        <code>Editable</code> BOOLEANs) map to <code>onBack</code> / <code>editableTitle</code> /{' '}
        <code>subtitle</code>; the close X is always shown. Composes the <strong>IconButtonGhost</strong> atom +
        Lucide <code>chevron-left</code>/<code>pencil</code>/<code>x</code>. Composed by RightPanel.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — toggle the parts; pencil renames the title in place</h4>
        <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap' }}>
          <Toggle label="back" value={showBack} set={setShowBack} />
          <Toggle label="editable title" value={editable} set={setEditable} />
          <Toggle label="subtitle" value={showSub} set={setShowSub} />
          <Toggle label="trail slot" value={showTrail} set={setShowTrail} />
        </div>
        <Frame>
          <ModalHeader
            title={name}
            subtitle={showSub ? 'Column Arrangement' : undefined}
            onBack={showBack ? () => {} : undefined}
            editableTitle={editable}
            editingTitle={editing}
            onEditTitle={() => setEditing(true)}
            onTitleChange={setName}
            onTitleCommit={() => setEditing(false)}
            onTitleCancel={() => setEditing(false)}
            onClose={() => {}}
            trail={showTrail ? <Badge variant="green">04:12</Badge> : undefined}
          />
        </Frame>
      </div>
    </div>
  )
}
