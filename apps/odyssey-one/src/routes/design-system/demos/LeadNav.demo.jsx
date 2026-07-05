import { useState } from 'react'
import { LeadNav } from '@odyssey/ui'

export const meta = {
  name: 'LeadNav',
  tier: 'molecule',
  version: '0.2.0',
  createdVersion: '0.2.0',
  figmaNode: '639:564',
  codeConnect: 'packages/ui/src/LeadNav.figma.tsx',
}

export const props = [
  { name: 'logo', type: 'ReactNode', desc: 'Logo slot. Defaults to <OdysseyLogo /> — a light-colored SVG, so render on a dark surface.' },
  { name: 'onMenuClick', type: '() => void', desc: 'Called when the hamburger icon button is clicked.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-500', resolves: 'DSN/500', usage: 'hamburger icon color' },
  { token: '--spacing-4', resolves: '16px', usage: 'gap between hamburger and logo' },
  { token: '--spacing-2', resolves: '8px', usage: 'icon button padding' },
  { token: '--icon-lg', resolves: '20px', usage: 'hamburger icon size (ICON_LG spread)' },
]

export default function LeadNavDemo() {
  const [clickCount, setClickCount] = useState(0)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Navbar leading section — hamburger toggle + logo. The default{' '}
        <code>OdysseyLogo</code> is a light-colored SVG designed for dark surfaces;
        always render LeadNav inside a dark cell.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Default (OdysseyLogo slot)</h4>
        <div className="ds-demo-cell ds-demo-cell--dark">
          <LeadNav onMenuClick={() => setClickCount((n) => n + 1)} />
        </div>
        {clickCount > 0 && (
          <p style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
            onMenuClick fired {clickCount}×
          </p>
        )}
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Custom logo slot</h4>
        <div className="ds-demo-cell ds-demo-cell--dark">
          <LeadNav
            logo={
              <span
                style={{
                  fontFamily: 'var(--font-primary)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-inverse)',
                  letterSpacing: 'var(--letter-spacing-wide)',
                }}
              >
                ODYSSEY
              </span>
            }
            onMenuClick={() => {}}
          />
        </div>
      </div>
    </div>
  )
}
