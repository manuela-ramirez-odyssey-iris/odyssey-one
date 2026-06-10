import { useState } from 'react'
import { MenuDropdown, MenuRow } from '@odyssey/ui'

export const meta = {
  name: 'MenuDropdown',
  tier: 'molecule',
  figmaNode: '1981:79',
  codeConnect: 'packages/ui/src/MenuDropdown.figma.tsx',
}

export const props = [
  { name: 'title', type: 'string', desc: 'Group header label. Rendered in uppercase label style.' },
  { name: 'expanded', type: 'boolean', desc: 'Controls whether children are visible. Default true.' },
  { name: 'onToggle', type: '() => void', desc: 'Called when the header button is clicked — consumer manages state.' },
  { name: 'children', type: 'ReactNode', desc: 'Slot content. Typically one or more MenuRow instances.' },
]

export const tokens = [
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'header bottom divider' },
  { token: '--spacing-2', resolves: 'Spacing/2', usage: 'header vertical padding' },
  { token: '--spacing-3', resolves: 'Spacing/3', usage: 'header top padding (group separation)' },
  { token: '--spacing-4', resolves: 'Spacing/4', usage: 'header horizontal padding' },
  { token: '--text-label-xs-medium-uppercase', resolves: 'Type/label-xs-medium-uppercase', usage: 'header title text style' },
]

export default function MenuDropdownDemo() {
  const [metricsOpen, setMetricsOpen] = useState(true)
  const [carriersOpen, setCarriersOpen] = useState(false)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Collapsible group inside a left-menu. The header is a <code>button</code> that
        calls <code>onToggle</code> — the consumer owns <code>expanded</code> state.
        Children (typically <code>MenuRow</code>) are unmounted when collapsed.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive — click header to toggle</h4>
        <div style={{
          width: 240,
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          <MenuDropdown
            title="Metrics"
            expanded={metricsOpen}
            onToggle={() => setMetricsOpen((o) => !o)}
          >
            <MenuRow label="Total Orders" />
            <MenuRow label="On-time Delivery" />
            <MenuRow label="Shipment Exceptions" />
          </MenuDropdown>

          <MenuDropdown
            title="Carriers"
            expanded={carriersOpen}
            onToggle={() => setCarriersOpen((o) => !o)}
          >
            <MenuRow label="Top Performers" />
            <MenuRow label="Cost Breakdown" />
          </MenuDropdown>
        </div>
        <div style={{ marginTop: 'var(--spacing-3)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
          "Metrics" starts expanded; "Carriers" starts collapsed — both toggle independently.
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">expanded = true vs false (static)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <div className="ds-demo-col">
            <span className="ds-demo-label">expanded</span>
            <div style={{
              width: 220,
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}>
              <MenuDropdown title="Widgets" expanded={true}>
                <MenuRow label="Total Orders" />
                <MenuRow label="On-time Delivery" />
              </MenuDropdown>
            </div>
          </div>
          <div className="ds-demo-col">
            <span className="ds-demo-label">collapsed</span>
            <div style={{
              width: 220,
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}>
              <MenuDropdown title="Widgets" expanded={false}>
                <MenuRow label="Total Orders" />
                <MenuRow label="On-time Delivery" />
              </MenuDropdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
