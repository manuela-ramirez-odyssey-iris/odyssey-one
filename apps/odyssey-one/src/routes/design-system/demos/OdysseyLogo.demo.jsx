import { OdysseyLogo } from '@odyssey/ui'

export const meta = {
  name: 'OdysseyLogo',
  tier: 'atom',
  version: '0.2.0',
  // No figma.tsx for OdysseyLogo
}

export const props = [
  { name: 'variant', type: 'light|dark', desc: 'Color scheme. light = white wordmark (use on dark surfaces); dark = DSN/900 wordmark (use on light surfaces). Default light.' },
  { name: 'width', type: 'number', desc: 'SVG width in px. Default 172.' },
  { name: 'height', type: 'number', desc: 'SVG height in px. Default 24.' },
]

export const tokens = [
  { token: '--white', resolves: 'white', usage: 'light variant wordmark fill' },
  { token: '--deep-sea-neutral-900', resolves: 'DSN/900', usage: 'dark variant wordmark fill' },
  { token: '--carolina-blue-400', resolves: 'CB/400', usage: '"One" suffix fill — both variants' },
]

export default function OdysseyLogoDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        SVG logotype with two variants: <code>light</code> (white wordmark for dark surfaces)
        and <code>dark</code> (DSN/900 wordmark for light surfaces). The "One" suffix uses{' '}
        Carolina Blue regardless of variant.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Variants — surface contrast</h4>
        <div className="ds-demo-row">
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <div className="ds-demo-cell ds-demo-cell--dark">
              <OdysseyLogo variant="light" />
            </div>
            <span className="ds-demo-label">light — on dark surface</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <div className="ds-demo-cell">
              <OdysseyLogo variant="dark" />
            </div>
            <span className="ds-demo-label">dark — on light surface</span>
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Size scale</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-end' }}>
          {[{ w: 86, h: 12, label: '86 × 12' }, { w: 172, h: 24, label: '172 × 24 (default)' }, { w: 258, h: 36, label: '258 × 36' }].map(({ w, h, label }) => (
            <div className="ds-demo-col" key={w} style={{ alignItems: 'center' }}>
              <div className="ds-demo-cell ds-demo-cell--dark">
                <OdysseyLogo variant="light" width={w} height={h} />
              </div>
              <span className="ds-demo-label">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
