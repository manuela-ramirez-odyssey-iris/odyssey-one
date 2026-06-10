import { useState } from 'react'
import { SidebarButton } from '@odyssey/ui'
import { Home, Package, Truck } from 'lucide-react'

export const meta = {
  name: 'SidebarButton',
  tier: 'atom',
  figmaNode: '514:2479',
  codeConnect: 'packages/ui/src/SidebarButton.figma.tsx',
}

export const props = [
  { name: 'icon', type: 'ReactNode', desc: 'Icon rendered inside the 40×40 hit area. Pass a Lucide icon at 20px (ICON_LG).' },
  { name: 'state', type: 'default|hover|selected', desc: 'Visual state. hover = text-primary tint; selected = DSN/300 background fill. Default default.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300', usage: 'selected-state background fill' },
  { token: '--text-primary', resolves: 'Text/primary', usage: 'icon color when hover or selected' },
  { token: '--text-tertiary', resolves: 'Text/tertiary', usage: 'icon color at default rest state' },
  { token: '--radius-lg', resolves: 'Radius/lg', usage: 'button corner rounding' },
]

const STATES = ['default', 'hover', 'selected']
const ICONS = [
  { icon: <Home size={20} />, label: 'home' },
  { icon: <Package size={20} />, label: 'package' },
  { icon: <Truck size={20} />, label: 'truck' },
]

export default function SidebarButtonDemo() {
  const [active, setActive] = useState('home')

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        40×40 icon button used in the left sidebar. Three Figma appearance states:{' '}
        <code>default</code> (muted icon), <code>hover</code> (brighter icon, no fill),{' '}
        <code>selected</code> (DSN/300 fill). Hover and focus are code-only CSS pseudo-classes.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive — click to select</h4>
        <div className="ds-demo-row">
          {ICONS.map(({ icon, label }) => (
            <div className="ds-demo-col" key={label} style={{ alignItems: 'center' }}>
              <SidebarButton
                icon={icon}
                state={active === label ? 'selected' : 'default'}
                onClick={() => setActive(label)}
              />
              <span className="ds-demo-label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Appearance states (static)</h4>
        <div className="ds-demo-row">
          {STATES.map((state, i) => (
            <div className="ds-demo-col" key={state} style={{ alignItems: 'center' }}>
              <SidebarButton icon={ICONS[i % ICONS.length].icon} state={state} />
              <span className="ds-demo-label">{state}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
