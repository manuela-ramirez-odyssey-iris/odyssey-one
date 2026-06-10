import { Package, ArrowRight } from 'lucide-react'
import { Badge } from '@odyssey/ui'

export const meta = {
  name: 'Badge',
  tier: 'atom',
  figmaNode: '213:27',
  codeConnect: 'packages/ui/src/Badge.figma.tsx',
}

export const props = [
  { name: 'variant', type: 'amber|blue|green|red|purple|gray|notification|metric|count|favorite', desc: 'Color + shape preset. Default blue.' },
  { name: 'children', type: 'ReactNode', desc: 'Label text (not used by notification/favorite).' },
  { name: 'leftIcon', type: 'ReactNode', desc: 'Leading icon slot (ignored by metric variants).' },
  { name: 'rightIcon', type: 'ReactNode', desc: 'Trailing icon slot (ignored by metric variants).' },
  { name: 'statusDot', type: 'boolean', desc: 'Renders an animated 6px pulse dot before the label (ignored by metric).' },
]

export const tokens = [
  { token: '--badge-blue-bg', resolves: 'Carolina Blue/100', usage: 'blue variant background' },
  { token: '--badge-blue-text', resolves: 'Carolina Blue/700', usage: 'blue variant text/icon' },
  { token: '--badge-green-bg', resolves: 'Caribbean Green/100', usage: 'green variant background' },
  { token: '--badge-red-bg', resolves: 'Bittersweet/100', usage: 'red variant background' },
  { token: '--badge-gray-bg', resolves: 'DSN/100', usage: 'gray + metric background' },
  { token: '--bittersweet-600', resolves: 'Bittersweet/600', usage: 'notification bg' },
  { token: '--carolina-blue-400', resolves: 'Carolina Blue/400', usage: 'count bg' },
  { token: '--radius-sm', resolves: '4px', usage: 'standard badge radius' },
]

const TEXT_VARIANTS = ['amber', 'blue', 'green', 'red', 'purple', 'gray']

export default function BadgeDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Status labels, counters, and indicators. Text variants share a pill shape;{' '}
        <code>notification</code> and <code>count</code> are fixed 20×20 circles;{' '}
        <code>metric</code> uses <code>--radius-lg</code> for a softer pill.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Text variants</h4>
        <div className="ds-demo-row">
          {TEXT_VARIANTS.map((v) => (
            <div className="ds-demo-col" key={v} style={{ alignItems: 'center' }}>
              <Badge variant={v}>Label</Badge>
              <span className="ds-demo-label">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Circular / numeric presets</h4>
        <div className="ds-demo-row">
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="notification">3</Badge>
            <span className="ds-demo-label">notification</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="count">12</Badge>
            <span className="ds-demo-label">count</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="metric">142</Badge>
            <span className="ds-demo-label">metric</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="favorite" />
            <span className="ds-demo-label">favorite</span>
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Icon slots</h4>
        <div className="ds-demo-row">
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="blue" leftIcon={<Package size={12} />}>Shipment</Badge>
            <span className="ds-demo-label">leftIcon</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="green" rightIcon={<ArrowRight size={12} />}>Continue</Badge>
            <span className="ds-demo-label">rightIcon</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="purple" leftIcon={<Package size={12} />} rightIcon={<ArrowRight size={12} />}>Both</Badge>
            <span className="ds-demo-label">both slots</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="gray" leftIcon={<Package size={12} />}>Gray icon</Badge>
            <span className="ds-demo-label">gray (icon tertiary)</span>
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Status dot (animated pulse)</h4>
        <div className="ds-demo-row">
          {TEXT_VARIANTS.map((v) => (
            <div className="ds-demo-col" key={`dot-${v}`} style={{ alignItems: 'center' }}>
              <Badge variant={v} statusDot>Live</Badge>
              <span className="ds-demo-label">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
