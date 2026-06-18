import { useState } from 'react'
import { House, ClipboardList, Container, Route, Truck, UserCog, Handshake } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import { Sidebar } from '@odyssey/ui'

export const meta = {
  name: 'Sidebar',
  tier: 'organism',
  figmaNode: '597:514',
}

export const props = [
  { name: 'topItems', type: 'Array<{ id, icon, label }>', desc: 'Upper nav group. Each renders a 40×40 SidebarButton; icon is a ReactNode.' },
  { name: 'bottomItems', type: 'Array<{ id, icon, label }>', desc: 'Lower nav group, separated from the top group by a hairline divider.' },
  { name: 'activeId', type: 'string', desc: 'Id of the selected item (default rendering). Sets the SidebarButton selected state.' },
  { name: 'onItemClick', type: '(id: string) => void', desc: 'Fired when an item is clicked (default rendering).' },
  { name: 'renderItem', type: '(item, defaultNode, { active }) => ReactNode', desc: 'Render-prop escape hatch — lets a consumer wrap each item (e.g. react-router NavLink) without the package depending on a router.' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the <aside> element.' },
]

export const tokens = [
  { token: '--sidebar-width', resolves: '64px', usage: 'rail width' },
  { token: '--deep-sea-neutral-200', resolves: 'DSN/200', usage: 'rail background' },
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300', usage: 'group divider hairline + selected button fill' },
  { token: '--spacing-3', resolves: '12px', usage: 'rail padding' },
  { token: '--spacing-2', resolves: '8px', usage: 'gap between buttons' },
  { token: '--spacing-6', resolves: '24px', usage: 'top/bottom group inset around the divider' },
]

const TOP_ITEMS = [
  { id: 'home', icon: <House {...ICON_LG} />, label: 'Home' },
  { id: 'orders', icon: <ClipboardList {...ICON_LG} />, label: 'Orders' },
  { id: 'shipments', icon: <Container {...ICON_LG} />, label: 'Shipments' },
  { id: 'tracking', icon: <Route {...ICON_LG} />, label: 'Tracking' },
]

const BOTTOM_ITEMS = [
  { id: 'carriers', icon: <Truck {...ICON_LG} />, label: 'Carriers' },
  { id: 'users', icon: <UserCog {...ICON_LG} />, label: 'User Management' },
  { id: 'partners', icon: <Handshake {...ICON_LG} />, label: 'Partners' },
]

export default function SidebarDemo() {
  const [activeId, setActiveId] = useState('shipments')

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Left navigation chrome used across every Odyssey One route — a fixed 64px rail of
        icon buttons split into a top group and a bottom group by a hairline. Router-agnostic:
        the DSM uses <code>activeId</code> + <code>onItemClick</code>; the app wraps each item in
        a <code>NavLink</code> via the <code>renderItem</code> render-prop. Fills its container
        height (the AppShell flex row owns the viewport math).
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive — click an item to select</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ height: 420, display: 'flex' }}>
            <Sidebar
              topItems={TOP_ITEMS}
              bottomItems={BOTTOM_ITEMS}
              activeId={activeId}
              onItemClick={setActiveId}
            />
          </div>
          <span className="ds-demo-label">active: {activeId}</span>
        </div>
      </div>
    </div>
  )
}
