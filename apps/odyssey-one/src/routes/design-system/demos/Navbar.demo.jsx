import { useState } from 'react'
import { Navbar, LeadNav, GlobalSearch, TrailNav } from '@odyssey/ui'

export const meta = {
  name: 'Navbar',
  tier: 'organism',
  version: '0.2.0',
  createdVersion: '0.2.0',
  figmaNode: '1661:206',
  codeConnect: 'packages/ui/src/Navbar.figma.tsx',
}

export const props = [
  { name: 'lead', type: 'ReactNode', desc: 'Leading slot — typically <LeadNav> (hamburger + logo).' },
  { name: 'search', type: 'ReactNode', desc: 'Center slot — typically <GlobalSearch>.' },
  { name: 'trail', type: 'ReactNode', desc: 'Trailing slot — typically <TrailNav>.' },
  { name: 'trailRef', type: 'React.Ref', desc: 'Ref forwarded to the trail wrapper div (e.g. to anchor a profile dropdown).' },
  { name: 'compact', type: 'boolean', desc: 'Shaves 2px off each vertical padding (14→12px) to accommodate taller editor-mode trail buttons. Default false.' },
]

export const tokens = [
  { token: '--navbar-bg', resolves: 'DSN/900 (deep-sea-neutral-900)', usage: 'navbar background — always dark' },
  { token: '--spacing-6', resolves: '24px', usage: 'trailing horizontal padding' },
  { token: '--spacing-4', resolves: '16px', usage: 'leading horizontal padding' },
  { token: '--deep-sea-neutral-500', resolves: 'DSN/500', usage: 'hamburger + trail icon color' },
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300', usage: 'profile name label color' },
  { token: '--deep-sea-neutral-700', resolves: 'DSN/700', usage: 'profile section divider' },
  { token: '--text-inverse', resolves: 'white', usage: 'search input text color' },
]

export default function NavbarDemo() {
  const [searchValue, setSearchValue] = useState('')

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Top navigation shell. A stateless layout organism: three named slots
        (<code>lead</code>, <code>search</code>, <code>trail</code>) rendered on the
        dark <code>--navbar-bg</code> surface. Compose real slot children — the
        examples below use <code>LeadNav</code>, <code>GlobalSearch</code>, and{' '}
        <code>TrailNav</code> exactly as the production app does.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Profile mode (default) — interactive search bar</h4>
        <div
          className="ds-demo-cell ds-demo-cell--dark"
          style={{ padding: 0, display: 'block', overflow: 'visible' }}
        >
          <Navbar
            lead={<LeadNav onMenuClick={() => {}} />}
            search={
              <GlobalSearch
                mode="search"
                value={searchValue}
                onChange={setSearchValue}
                onClear={() => setSearchValue('')}
                onBack={() => {}}
                onForward={() => {}}
                placeholder="Search Shipments…"
                minWidth={400}
                maxWidth={640}
              />
            }
            trail={
              <TrailNav
                mode="profile"
                name="Manuela Ramirez"
                role="Designer"
                notificationCount={3}
                onProfileClick={() => {}}
                onNotificationClick={() => {}}
              />
            }
          />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Editor mode + compact — title center + edit trail</h4>
        <div
          className="ds-demo-cell ds-demo-cell--dark"
          style={{ padding: 0, display: 'block' }}
        >
          <Navbar
            compact
            lead={<LeadNav onMenuClick={() => {}} />}
            search={
              <GlobalSearch
                mode="title"
                title="Edit Dashboard"
                minWidth={400}
                maxWidth={640}
              />
            }
            trail={
              <TrailNav
                mode="editor"
                primaryButtonLabel="Cancel"
                secondaryButtonLabel="Save"
                onPrimaryButtonClick={() => {}}
                onSecondaryButtonClick={() => {}}
              />
            }
          />
        </div>
      </div>
    </div>
  )
}
