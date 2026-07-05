import { useState } from 'react'
import { WidgetCtaRow } from '@odyssey/ui'
import { Truck, BarChart2, AlertTriangle, FileText, Package } from 'lucide-react'

export const meta = {
  name: 'WidgetCtaRow',
  tier: 'molecule',
  version: '0.2.0',
  createdVersion: '0.2.0',
  figmaNode: '1927:84',
  codeConnect: 'packages/ui/src/WidgetCtaRow.figma.tsx',
}

export const props = [
  { name: 'icon', type: 'ReactNode', desc: '20px icon rendered inside the 40×40 carolina-blue icon container.' },
  { name: 'label', type: 'string', desc: 'CTA label text.' },
  { name: 'onClick', type: '() => void', desc: 'When provided the row renders as a <button> with a three-step hover/pressed state ladder.' },
]

export const tokens = [
  { token: '--carolina-blue-50', resolves: 'Carolina Blue/50', usage: 'icon container bg — idle' },
  { token: '--carolina-blue-100', resolves: 'Carolina Blue/100', usage: 'icon container bg — hover/pressed' },
  { token: '--bg-secondary', resolves: 'BG/secondary', usage: 'row background — hover' },
  { token: '--bg-tertiary', resolves: 'BG/tertiary', usage: 'row background — pressed' },
  { token: '--text-soft', resolves: 'Text/soft', usage: 'chevron color — idle' },
  { token: '--text-primary', resolves: 'Text/primary', usage: 'chevron color — hover' },
]

const CTA_ITEMS = [
  { icon: <Truck size={20} />, label: 'View active shipments' },
  { icon: <BarChart2 size={20} />, label: 'Open performance report' },
  { icon: <AlertTriangle size={20} />, label: 'Review exceptions' },
]

export default function WidgetCtaRowDemo() {
  const [lastClicked, setLastClicked] = useState(null)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Single call-to-action link row used inside a Widget 3xCta layout.
        Anatomy: 40×40 icon container (carolina-blue bg) + label + trailing chevron.
        Pass <code>onClick</code> to make it interactive — three-step state ladder
        on hover and press.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Static (no onClick)</h4>
        <div style={{ width: 340, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <WidgetCtaRow icon={<FileText size={20} />} label="View shipment summary" />
          <WidgetCtaRow icon={<Package size={20} />} label="Browse carriers" />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive rows (hover to see tint + chevron lift)</h4>
        {lastClicked && (
          <div style={{ marginBottom: 'var(--spacing-3)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
            Last clicked: <strong style={{ color: 'var(--text-secondary)' }}>{lastClicked}</strong>
          </div>
        )}
        <div style={{ width: 340, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {CTA_ITEMS.map(({ icon, label }) => (
            <WidgetCtaRow
              key={label}
              icon={icon}
              label={label}
              onClick={() => setLastClicked(label)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
