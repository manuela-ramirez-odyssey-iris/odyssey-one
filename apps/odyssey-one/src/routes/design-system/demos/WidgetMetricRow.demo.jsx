import { useState } from 'react'
import { WidgetMetricRow } from '@odyssey/ui'

export const meta = {
  name: 'WidgetMetricRow',
  tier: 'molecule',
  version: '0.2.0',
  figmaNode: '1814:7',
  codeConnect: 'packages/ui/src/WidgetMetricRow.figma.tsx',
}

export const props = [
  { name: 'label', type: 'string', desc: 'Row label text.' },
  { name: 'value', type: 'string | number', desc: 'Metric value rendered inside an inline Badge (metric variant).' },
  { name: 'showIndicator', type: 'boolean', desc: 'Shows a filled dot to the left of the label. Default false.' },
  { name: 'indicatorColor', type: 'string', desc: 'CSS color for the indicator dot. Pass a chart token e.g. "var(--chart-2)". Default var(--chart-1).' },
  { name: 'onClick', type: '() => void', desc: 'When provided the row renders as a <button> with hover + chevron highlight states.' },
]

export const tokens = [
  { token: '--chart-1', resolves: 'Chart/1', usage: 'default indicator dot color' },
  { token: '--chart-2', resolves: 'Chart/2', usage: 'segment 2 indicator dot color' },
  { token: '--chart-3', resolves: 'Chart/3', usage: 'segment 3 indicator dot color' },
  { token: '--chart-4', resolves: 'Chart/4', usage: 'segment 4 indicator dot color' },
  { token: '--text-secondary', resolves: 'Text/secondary', usage: 'row label text color' },
  { token: '--bg-secondary', resolves: 'BG/secondary', usage: 'interactive row hover background' },
]

const SEGMENT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
]

export default function WidgetMetricRowDemo() {
  const [lastClicked, setLastClicked] = useState(null)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Single data row inside a widget content area. Polymorphic — renders as{' '}
        <code>div</code> by default, <code>button</code> when <code>onClick</code> is
        provided. The indicator dot color should be a <code>--chart-N</code> token when
        the row is part of a multi-segment chart legend.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Static rows (no onClick)</h4>
        <div style={{ width: 320, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <WidgetMetricRow label="On-time delivery" value="94%" />
          <WidgetMetricRow label="Total shipments" value="1,204" />
          <WidgetMetricRow label="Exceptions" value="37" />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">With indicator dots (chart legend pattern)</h4>
        <div style={{ width: 320, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {['Active', 'In Transit', 'Delayed', 'Delivered'].map((label, i) => (
            <WidgetMetricRow
              key={label}
              label={label}
              value={[42, 28, 18, 12][i]}
              showIndicator
              indicatorColor={SEGMENT_COLORS[i]}
            />
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive rows (onClick — hover to see tint)</h4>
        {lastClicked && (
          <div style={{ marginBottom: 'var(--spacing-3)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
            Last clicked: <strong style={{ color: 'var(--text-secondary)' }}>{lastClicked}</strong>
          </div>
        )}
        <div style={{ width: 320, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {['On-time delivery', 'Total shipments', 'Exceptions'].map((label, i) => (
            <WidgetMetricRow
              key={label}
              label={label}
              value={['94%', '1,204', '37'][i]}
              showIndicator
              indicatorColor={SEGMENT_COLORS[i]}
              onClick={() => setLastClicked(label)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
