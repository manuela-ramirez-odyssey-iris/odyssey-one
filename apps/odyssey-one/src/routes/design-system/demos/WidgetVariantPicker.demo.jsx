import { useState } from 'react'
import { WidgetVariantPicker } from '@odyssey/ui'
import { Package } from 'lucide-react'

export const meta = {
  name: 'WidgetVariantPicker',
  tier: 'organism',
  figmaNode: '2005:554',
  codeConnect: 'packages/ui/src/WidgetVariantPicker.figma.tsx',
}

export const props = [
  { name: 'variant', type: '1x|2x|3x|3xChart', desc: 'Currently displayed widget size. Controls which Widget variant renders in the preview slot.' },
  { name: 'onVariantChange', type: '(nextVariant: string) => void', desc: 'Fired when the user clicks an arrow or a dot. Consumer owns the variant state.' },
  { name: 'widgetProps', type: 'object', desc: 'Forwarded to the inner Widget — title, domainIcon, value, label, rows, chartSegments, etc.' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the root element.' },
]

export const tokens = [
  { token: '--bg-secondary', resolves: 'Background/secondary', usage: 'picker container background' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'picker border' },
  { token: '--text-tertiary', resolves: 'Text/tertiary', usage: 'variant label text' },
  { token: '--deep-sea-neutral-900', resolves: 'DSN/900', usage: 'active dot fill' },
  { token: '--border-default', resolves: 'Border/default', usage: 'inactive dot stroke' },
  { token: '--radius-lg', resolves: 'Radius/lg', usage: 'picker corner radius' },
  { token: '--spacing-5', resolves: '20px', usage: 'picker internal padding' },
  { token: '--font-size-xs', resolves: '12px', usage: 'variant label (label-xs-regular)' },
]

const SHIPMENTS_WIDGET_PROPS = {
  title: 'Active Shipments',
  domainIcon: <Package size={16} aria-hidden="true" />,
  value: '1,247',
  label: 'In transit',
  percentage: '74%',
  rows: [
    { label: 'On time', value: '923', indicatorColor: 'var(--chart-1)' },
    { label: 'At risk', value: '198', indicatorColor: 'var(--chart-2)' },
    { label: 'Delayed', value: '126', indicatorColor: 'var(--chart-3)' },
  ],
  chartSegments: [
    { value: 923, color: 'var(--chart-1)' },
    { value: 198, color: 'var(--chart-2)' },
    { value: 126, color: 'var(--chart-3)' },
  ],
}

export default function WidgetVariantPickerDemo() {
  const [variant, setVariant] = useState('1x')

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Carousel that lets users step through all four widget sizes (Small, Wide, Tall, Tall with chart).
        Chevron arrows wrap end-to-end; dots below are also clickable. Consumer owns the <code>variant</code>{' '}
        state and receives updates via <code>onVariantChange</code>. The inner{' '}
        <code>widgetProps</code> are forwarded verbatim to the <code>Widget</code> molecule.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive carousel — click arrows or dots to step through variants</h4>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: 'var(--spacing-6) var(--spacing-4)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <WidgetVariantPicker
            variant={variant}
            onVariantChange={setVariant}
            widgetProps={SHIPMENTS_WIDGET_PROPS}
          />
        </div>
        <div style={{ marginTop: 'var(--spacing-3)', display: 'flex', justifyContent: 'center' }}>
          <span className="ds-demo-label">current variant: {variant}</span>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">All four variants — static, no widgetProps (bare titles)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--spacing-5)' }}>
          {['1x', '2x', '3x', '3xChart'].map((v) => (
            <div className="ds-demo-col" key={v} style={{ alignItems: 'center' }}>
              <div
                style={{
                  padding: 'var(--spacing-5) var(--spacing-4)',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <WidgetVariantPicker
                  variant={v}
                  onVariantChange={() => {}}
                  widgetProps={{ title: 'Widget', value: '0', label: 'label' }}
                />
              </div>
              <span className="ds-demo-label">variant = {v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
