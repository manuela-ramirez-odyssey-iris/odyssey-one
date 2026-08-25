import { useState } from 'react'
import { TrailNav } from '@odyssey/ui'

export const meta = {
  name: 'TrailNav',
  tier: 'molecule',
  version: '0.2.0',
  createdVersion: '0.2.0',
  figmaNode: '1565:648',
  codeConnect: 'packages/ui/src/TrailNav.figma.tsx',
  normalizing: true,
  approved: true,
  ported: true,
}

export const props = [
  { name: 'mode', type: "'profile' | 'editor'", desc: "Layout mode. 'profile' shows avatar/name/role + bell + chevron. 'editor' shows Cancel/Save buttons + help and close icons. Default 'profile'." },
  { name: 'name', type: 'string', desc: '[profile] User display name.' },
  { name: 'role', type: 'string', desc: '[profile] User role label shown below name.' },
  { name: 'avatar', type: 'ReactNode', desc: '[profile] Avatar element (img, initials div, etc.). Clipped to 32×32 with lg radius.' },
  { name: 'notificationCount', type: 'number', desc: '[profile] Badge count on the bell icon. Default 0.' },
  { name: 'showNotification', type: 'boolean', desc: '[profile] Force-show/hide the notification badge independent of count.' },
  { name: 'showBell', type: 'boolean', desc: '[profile] Show the Notifications (bell) icon button. Default true — false removes the whole button, not just the badge (that\'s showNotification).' },
  { name: 'showCustomers', type: 'boolean', desc: '[profile] Show the Customers (handshake) icon button. Default true.' },
  { name: 'customersActive', type: 'boolean', desc: '[profile] Active state for the customers button.' },
  { name: 'dropdownOpen', type: 'boolean', desc: '[profile] Swaps chevron direction (down→up) when profile dropdown is open.' },
  { name: 'onMenuClick', type: '() => void', desc: '[profile] Hamburger click handler (unused in TrailNav — lives in LeadNav).' },
  { name: 'onCustomersClick', type: '() => void', desc: '[profile] Customers icon click handler.' },
  { name: 'onNotificationClick', type: '() => void', desc: '[profile] Bell icon click handler.' },
  { name: 'onProfileClick', type: '() => void', desc: '[profile] Profile button click handler.' },
  { name: 'showPrimaryButton', type: 'boolean', desc: "[editor] Show the primary (ghost) button. Default true. Label set via primaryButtonLabel ('Cancel')." },
  { name: 'primaryButtonLabel', type: 'string', desc: "[editor] Label for the primary button. Default 'Cancel'." },
  { name: 'onPrimaryButtonClick', type: '() => void', desc: '[editor] Primary button click handler.' },
  { name: 'showSecondaryButton', type: 'boolean', desc: "[editor] Show the secondary (outline) button. Default true. Label set via secondaryButtonLabel ('Save')." },
  { name: 'secondaryButtonLabel', type: 'string', desc: "[editor] Label for the secondary button. Default 'Save'." },
  { name: 'onSecondaryButtonClick', type: '() => void', desc: '[editor] Secondary button click handler.' },
  { name: 'showHelpIcon', type: 'boolean', desc: '[editor] Show the help icon slot. Default true.' },
  { name: 'helpIcon', type: 'ReactNode', desc: '[editor] Override for the help icon. Default CircleHelp.' },
  { name: 'onHelpClick', type: '() => void', desc: '[editor] Help icon click handler.' },
  { name: 'showRightIcon', type: 'boolean', desc: '[editor] Show the right icon slot. Default true.' },
  { name: 'rightIcon', type: 'ReactNode', desc: '[editor] Override for the right icon. Default X (close).' },
  { name: 'onRightIconClick', type: '() => void', desc: '[editor] Right icon click handler.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300', usage: 'profile name text color' },
  { token: '--deep-sea-neutral-400', resolves: 'DSN/400', usage: 'profile role text color' },
  { token: '--deep-sea-neutral-500', resolves: 'DSN/500', usage: 'icon button color (bell, customers, chevron, editor icons)' },
  { token: '--deep-sea-neutral-700', resolves: 'DSN/700', usage: 'divider between bell/customers area and profile section' },
  { token: '--spacing-4', resolves: '16px', usage: 'gap between icon buttons' },
  { token: '--spacing-5', resolves: '20px', usage: 'left padding of the profile section from divider' },
  { token: '--radius-lg', resolves: '12px', usage: 'avatar border-radius' },
]

// Stable avatar element — a colored initials square
const AVATAR = (
  <div
    style={{
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-lg)',
      background: 'var(--deep-sea-neutral-600)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-inverse)',
      fontFamily: 'var(--font-primary)',
      fontSize: 'var(--font-size-xs)',
      fontWeight: 'var(--font-weight-semibold)',
      flexShrink: 0,
    }}
  >
    MR
  </div>
)

export default function TrailNavDemo() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(3)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Navbar trailing section — two modes controlled by the <code>mode</code> prop.
        Both render on the dark navbar surface; always show inside a dark cell.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">mode = "profile" — interactive (toggle dropdown, fire bell)</h4>
        <div className="ds-demo-cell ds-demo-cell--dark">
          <TrailNav
            mode="profile"
            name="Manuela Ramirez"
            role="Designer"
            avatar={AVATAR}
            notificationCount={notifCount}
            dropdownOpen={dropdownOpen}
            onProfileClick={() => setDropdownOpen((o) => !o)}
            onNotificationClick={() => setNotifCount(0)}
          />
        </div>
        <p style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
          Click profile to toggle chevron direction. Click bell to clear badge.
        </p>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">mode = "profile" — customers active + no notification</h4>
        <div className="ds-demo-cell ds-demo-cell--dark">
          <TrailNav
            mode="profile"
            name="David Johns"
            role="Operations"
            avatar={AVATAR}
            notificationCount={0}
            customersActive
            onCustomersClick={() => {}}
            onProfileClick={() => {}}
          />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">mode = "profile" — no bell, no customers (external Navbar context)</h4>
        <div className="ds-demo-cell ds-demo-cell--dark">
          <TrailNav
            mode="profile"
            name="Carrier Co."
            role="Carrier"
            avatar={AVATAR}
            showBell={false}
            showCustomers={false}
            onProfileClick={() => {}}
          />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">mode = "editor"</h4>
        <div className="ds-demo-cell ds-demo-cell--dark">
          <TrailNav
            mode="editor"
            onPrimaryButtonClick={() => {}}
            onSecondaryButtonClick={() => {}}
            onHelpClick={() => {}}
            onRightIconClick={() => {}}
          />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">mode = "editor" — custom labels, icons hidden</h4>
        <div className="ds-demo-cell ds-demo-cell--dark">
          <TrailNav
            mode="editor"
            primaryButtonLabel="Discard"
            secondaryButtonLabel="Publish"
            showHelpIcon={false}
            showRightIcon={false}
            onPrimaryButtonClick={() => {}}
            onSecondaryButtonClick={() => {}}
          />
        </div>
      </div>
    </div>
  )
}
