import { useState } from 'react'
import { LeadNav } from '@odyssey/ui'

export const meta = {
  name: 'LeadNav',
  tier: 'molecule',
  version: '1.6.0',
  createdVersion: '0.2.0',
  figmaNode: '5902:1145',
  codeConnect: 'packages/ui/src/LeadNav.figma.tsx',
  normalizing: true,
  approved: true,
}

export const props = [
  { name: 'logo', type: 'ReactNode', desc: 'Logo slot. Defaults to <OdysseyLogo /> — a light-colored SVG, so render on a dark surface.' },
  { name: 'onMenuClick', type: '() => void', desc: 'Called when the hamburger icon button is clicked.' },
  { name: 'showMenu', type: 'boolean', desc: 'Show the hamburger icon button. Default true — false removes the button from the DOM (and a11y tree) entirely, e.g. the external Navbar context.' },
  { name: 'active', type: 'boolean', desc: 'The toggle is ON — the Sidebar rail is expanded. Icon goes Carolina Blue/400 and the button reports aria-pressed. Default false. (Figma: Menu state)' },
]

export const tokens = [
  { token: '--deep-sea-neutral-500', resolves: 'DSN/500', usage: 'hamburger icon color at rest (Menu state=Off)' },
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300', usage: 'hamburger icon color on hover (code-only state)' },
  { token: '--carolina-blue-400', resolves: 'Carolina Blue/400', usage: 'hamburger icon color when active (Menu state=On)' },
  { token: '--spacing-4', resolves: '16px', usage: 'gap between hamburger and logo' },
  { token: '--spacing-2', resolves: '8px', usage: 'icon button padding' },
  { token: '--icon-lg', resolves: '20px', usage: 'hamburger icon size (ICON_LG spread)' },
]

export default function LeadNavDemo() {
  const [clickCount, setClickCount] = useState(0)
  const [menuOn, setMenuOn] = useState(false)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Navbar leading section — hamburger toggle + logo. The default{' '}
        <code>OdysseyLogo</code> is a light-colored SVG designed for dark surfaces;
        always render LeadNav inside a dark cell. The hamburger is a real toggle for the
        Sidebar rail, so <code>active</code> is a persistent ON state (Carolina Blue/400), not
        a press — hover only lightens the OFF icon.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Toggle state — click the hamburger</h4>
        <div className="ds-demo-cell ds-demo-cell--dark">
          <LeadNav active={menuOn} onMenuClick={() => setMenuOn((v) => !v)} />
        </div>
        <span className="ds-demo-label">active: {String(menuOn)} — hover the OFF icon to see it lighten</span>
      </div>

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
        <h4 className="ds-demo-section__title">showMenu = false — no hamburger</h4>
        <div className="ds-demo-cell ds-demo-cell--dark">
          <LeadNav showMenu={false} />
        </div>
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
