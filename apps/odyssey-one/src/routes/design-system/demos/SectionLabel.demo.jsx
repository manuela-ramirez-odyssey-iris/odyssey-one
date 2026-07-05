import { useState } from 'react'
import { SectionLabel } from '@odyssey/ui'

export const meta = {
  name: 'SectionLabel',
  tier: 'atom',
  version: '0.2.0',
  createdVersion: '0.2.0',
  figmaNode: '2198:308',
  codeConnect: 'packages/ui/src/SectionLabel.figma.tsx',
}

export const props = [
  { name: 'label', type: 'string', desc: 'Section title text.' },
  { name: 'mode', type: 'default|edit', desc: 'default = transparent surface, label only. edit = DSN/100 surface + pencil/trash actions. Default default.' },
  { name: 'onEdit', type: '() => void', desc: 'Called when the pencil action is clicked. Only rendered in edit mode.' },
  { name: 'onDelete', type: '() => void', desc: 'Called when the trash action is clicked. Only rendered in edit mode.' },
  { name: 'className', type: 'string', desc: 'Additional CSS classes for the root element.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-100', resolves: 'DSN/100', usage: 'edit-mode surface background' },
  { token: '--text-primary', resolves: 'Text/primary', usage: 'label color' },
  { token: '--text-tertiary', resolves: 'Text/tertiary', usage: 'action icon color' },
  { token: '--radius-lg', resolves: 'Radius/lg', usage: 'container corner rounding' },
  { token: '--spacing-3', resolves: '12px', usage: 'gap between action icons' },
]

export default function SectionLabelDemo() {
  const [lastAction, setLastAction] = useState(null)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Full-width header row for a Home widget section. Two Figma modes:{' '}
        <code>default</code> (label only, transparent surface) and{' '}
        <code>edit</code> (DSN/100 surface with pencil + trash action buttons).
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">mode = default</h4>
        <div style={{ width: 360 }}>
          <SectionLabel label="Recent Shipments" mode="default" />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">mode = edit — interactive actions</h4>
        <div style={{ width: 360 }}>
          <SectionLabel
            label="Recent Shipments"
            mode="edit"
            onEdit={() => setLastAction('edit')}
            onDelete={() => setLastAction('delete')}
          />
        </div>
        {lastAction && (
          <p style={{ marginTop: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Last action: <strong>{lastAction}</strong>
          </p>
        )}
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Side by side</h4>
        <div className="ds-demo-col" style={{ width: 360, gap: 'var(--spacing-2)' }}>
          <SectionLabel label="Carriers Overview" mode="default" />
          <SectionLabel
            label="Carriers Overview"
            mode="edit"
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </div>
      </div>
    </div>
  )
}
