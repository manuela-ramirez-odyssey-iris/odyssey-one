import { AddSectionDivider } from '@odyssey/ui'

export const meta = {
  name: 'AddSectionDivider',
  tier: 'atom',
  version: '0.2.0',
  figmaNode: '2203:297',
  codeConnect: 'packages/ui/src/AddSectionDivider.figma.tsx',
}

export const props = [
  { name: 'label', type: 'string', desc: 'Centered label text overlaid on the dashed divider line. Default "Add Section".' },
  { name: 'className', type: 'string', desc: 'Additional CSS classes for the root element.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-400', resolves: 'DSN/400', usage: 'dashed top-border color and label text color' },
]

export default function AddSectionDividerDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Purely decorative row separator shown in Home edit mode above the{' '}
        <code>AddSectionButton</code>. Not interactive — no hover or click states.
        Uses a dashed DSN/400 top border with a centered label.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Default label</h4>
        <div style={{ width: 360 }}>
          <AddSectionDivider />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Custom label</h4>
        <div style={{ width: 360 }}>
          <AddSectionDivider label="Insert section here" />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Paired with AddSectionButton (typical usage)</h4>
        <div style={{ width: 360 }}>
          <AddSectionDivider />
          {/* AddSectionButton would follow here in real use */}
          <p style={{ margin: 'var(--spacing-2) 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
            ↓ AddSectionButton sits directly below
          </p>
        </div>
      </div>
    </div>
  )
}
