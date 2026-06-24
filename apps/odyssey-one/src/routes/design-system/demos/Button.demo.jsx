import { Fragment } from 'react'
import { Button } from '@odyssey/ui'
import { Search, ArrowRight, Plus, MoreHorizontal } from 'lucide-react'

export const meta = {
  name: 'Button',
  tier: 'atom',
  version: '0.3.0',
  figmaNode: '1307:333',
  codeConnect: 'packages/ui/src/Button.figma.tsx',
}

export const props = [
  { name: 'variant', type: 'primary|secondary|outline|ghost|error|link|icon', desc: 'Visual style. outline/ghost are dark-surface variants. icon = icon-only, Secondary-styled (sm).' },
  { name: 'size', type: 'sm|md|lg', desc: 'Padding + label size. Default md.' },
  { name: 'disabled', type: 'boolean', desc: 'Native disabled; hover/active suppressed.' },
  { name: 'icon', type: 'ReactNode', desc: 'Leading icon slot (inherits currentColor).' },
  { name: 'iconRight', type: 'ReactNode', desc: 'Trailing icon slot.' },
  { name: 'children', type: 'ReactNode', desc: 'Button label.' },
  { name: 'type', type: 'string', desc: 'Native button type. Default "button".' },
]

export const tokens = [
  { token: '--deep-sea-neutral-900', resolves: 'DSN/900', usage: 'primary bg (idle/pressed/disabled)' },
  { token: '--deep-sea-neutral-600', resolves: 'DSN/600', usage: 'primary hover bg; primary disabled text + border' },
  { token: '--deep-sea-neutral-700', resolves: 'DSN/700', usage: 'secondary label' },
  { token: '--deep-sea-neutral-400', resolves: 'DSN/400', usage: 'outline + ghost disabled text/border' },
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300', usage: 'secondary/icon/error disabled border + label' },
  { token: '--bg-error', resolves: 'Bittersweet/100', usage: 'error idle + disabled bg' },
  { token: '--bittersweet-600', resolves: 'Bittersweet/600', usage: 'error label' },
  { token: '--bittersweet-300', resolves: 'Bittersweet/300', usage: 'error disabled label' },
  { token: '--text-link', resolves: 'Carolina Blue/500', usage: 'link label' },
  { token: '--shadow-sm', resolves: 'shadow/sm', usage: 'raised variants + all disabled' },
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
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Link tones (variant="link")</h4>
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Default = carolina-blue (hover lightens to CB/400, press → DSN/900). Black tone
          (<code>.btn--link-black</code>, Figma ButtonLink <code>Variant=Black</code>) = underlined
          neutral ladder DSN/900 → DSN/500 (hover) → DSN/950 (press). Hover/press each to compare.
        </p>
        <div className="ds-demo-row">
          <Button variant="link" iconRight={<ArrowRight size={16} />}>Go to Tracking</Button>
          <Button variant="link" className="btn--link-black" iconRight={<ArrowRight size={16} />}>Click here</Button>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">
          variant="icon" — icon-only (sm), Secondary treatment
        </h4>
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Icon-only button. Shares Secondary's bg/border/shadow ladder; the icon adopts
          Secondary's text color per state via <code>currentColor</code> — DSN/700 idle &amp;
          hover, DSN/400 pressed, DSN/300 disabled. Pass <code>aria-label</code> (no text label).
          Hover &amp; press one to see the icon track the color.
        </p>
        <div className="ds-demo-row">
          <Button variant="icon" size="sm" icon={<Plus size={20} />} aria-label="Add" />
          <Button variant="icon" size="sm" icon={<Search size={20} />} aria-label="Search" />
          <Button variant="icon" size="sm" icon={<MoreHorizontal size={20} />} aria-label="More" />
          <Button variant="icon" size="sm" icon={<Plus size={20} />} aria-label="Add" disabled />
        </div>
      </div>
    </div>
  )
}
