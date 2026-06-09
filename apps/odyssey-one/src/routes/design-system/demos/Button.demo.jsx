import { Fragment } from 'react'
import { Button } from '@odyssey/ui'
import { Search, ArrowRight } from 'lucide-react'

export const meta = {
  name: 'Button',
  tier: 'atom',
  figmaNode: '1307:333',
  codeConnect: 'packages/ui/src/Button.figma.tsx',
}

export const props = [
  { name: 'variant', type: 'primary|secondary|outline|ghost|error|link', desc: 'Visual style. outline/ghost are dark-surface variants.' },
  { name: 'size', type: 'sm|md|lg', desc: 'Padding + label size. Default md.' },
  { name: 'disabled', type: 'boolean', desc: 'Native disabled; hover/active suppressed.' },
  { name: 'icon', type: 'ReactNode', desc: 'Leading icon slot (inherits currentColor).' },
  { name: 'iconRight', type: 'ReactNode', desc: 'Trailing icon slot.' },
  { name: 'children', type: 'ReactNode', desc: 'Button label.' },
  { name: 'type', type: 'string', desc: 'Native button type. Default "button".' },
]

export const tokens = [
  { token: '--deep-sea-neutral-900', resolves: 'DSN/900', usage: 'primary bg (idle/pressed)' },
  { token: '--deep-sea-neutral-600', resolves: 'DSN/600', usage: 'primary hover bg' },
  { token: '--deep-sea-neutral-700', resolves: 'DSN/700', usage: 'secondary label' },
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300', usage: 'secondary border / disabled label' },
  { token: '--bg-error', resolves: 'Bittersweet/100', usage: 'error idle bg' },
  { token: '--bittersweet-600', resolves: 'Bittersweet/600', usage: 'error label' },
  { token: '--text-link', resolves: 'Carolina Blue/500', usage: 'link label' },
  { token: '--shadow-sm', resolves: 'shadow/sm', usage: 'raised variants' },
]

const VARIANTS = ['primary', 'secondary', 'outline', 'ghost', 'error', 'link']
const SIZES = ['sm', 'md', 'lg']
const DARK = new Set(['outline', 'ghost'])

export default function ButtonDemo() {
  return (
    <div>
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Variants × sizes</h4>
        <div
          className="ds-demo-grid"
          style={{ gridTemplateColumns: `64px repeat(${VARIANTS.length}, minmax(0, 1fr))` }}
        >
          <div />
          {VARIANTS.map((v) => (
            <div key={`h-${v}`} className="ds-demo-label" style={{ textAlign: 'center' }}>{v}</div>
          ))}
          {SIZES.map((s) => (
            <Fragment key={s}>
              <div className="ds-demo-label" style={{ textAlign: 'right' }}>{s}</div>
              {VARIANTS.map((v) => (
                <div key={`${v}-${s}`} className={`ds-demo-cell${DARK.has(v) ? ' ds-demo-cell--dark' : ''}`}>
                  <Button variant={v} size={s}>Label</Button>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">States (hover · press · focus · disabled)</h4>
        <div
          className="ds-demo-grid"
          style={{ gridTemplateColumns: '80px repeat(4, minmax(0, 1fr))' }}
        >
          <div />
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Hover</div>
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Active</div>
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Focus</div>
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Disabled</div>
          {VARIANTS.map((v) => (
            <Fragment key={`row-${v}`}>
              <div className="ds-demo-label" style={{ textAlign: 'right' }}>{v}</div>
              {['Hover me', 'Click + hold', 'Tab here', 'Disabled'].map((label, i) => (
                <div key={label} className={`ds-demo-cell${DARK.has(v) ? ' ds-demo-cell--dark' : ''}`}>
                  <Button variant={v} disabled={i === 3}>{label}</Button>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Icon slots</h4>
        <div className="ds-demo-row">
          <Button icon={<Search size={20} />}>Search</Button>
          <Button iconRight={<ArrowRight size={20} />}>Continue</Button>
          <Button icon={<Search size={20} />} iconRight={<ArrowRight size={20} />}>Both slots</Button>
          <Button variant="link" iconRight={<ArrowRight size={16} />}>Go to Tracking</Button>
        </div>
      </div>
    </div>
  )
}
