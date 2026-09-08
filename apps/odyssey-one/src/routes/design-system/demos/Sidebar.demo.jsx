import { useState } from 'react'
import { House, ClipboardList, Container, Route, Truck, UserCog, Handshake } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import { Sidebar } from '@odyssey/ui'

export const meta = {
  name: 'Sidebar',
  tier: 'organism',
  version: '0.3.0',
  createdVersion: '0.2.0',
  figmaNode: '5890:8098',
  normalizing: true,
  approved: true,
}

export const props = [
  { name: 'expanded', type: 'boolean', desc: 'false = the 64px icon rail; true = the 240px labelled rail with counts and submenus. Default false. (Figma: Expanded)' },
  { name: 'topItems', type: 'Array<Item>', desc: 'Domain group, above the hairline.' },
  { name: 'bottomItems', type: 'Array<Item>', desc: 'Account-level group, below the hairline.' },
  { name: 'activeId', type: 'string', desc: 'Id of the selected row. Also opens the submenu that contains it, and marks its ancestors selected.' },
  { name: 'onItemClick', type: '(id: string) => void', desc: 'Fired when a LEAF row is clicked. A row that owns children is a disclosure, not a destination — it opens its submenu or card and never reports here, so wiring this to setActiveId cannot fight the disclosure state.' },
  { name: 'renderItem', type: '(item, defaultNode, { active, level }) => ReactNode', desc: 'Render-prop escape hatch for LEAF rows only — lets a consumer wrap them in a router link without the package depending on a router. Rows that own children are disclosures, not links, and never reach it.' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the <aside>.' },
]

export const tokens = [
  { token: '--sidebar-width', resolves: '64px', usage: 'collapsed rail width' },
  { token: '--sidebar-width-expanded', resolves: '240px', usage: 'expanded rail width' },
  { token: '--deep-sea-neutral-200', resolves: 'DSN/200', usage: 'rail background' },
  { token: '--border-default', resolves: 'DSN/300', usage: 'group divider hairline' },
  { token: '--spacing-3', resolves: '12px', usage: 'rail padding + flyout offset' },
  { token: '--spacing-6', resolves: '24px', usage: 'inset around the divider' },
  { token: '--transition-panel', resolves: '220ms', usage: 'collapse/expand width transition' },
]

const TOP_ITEMS = [
  { id: 'home', icon: <House {...ICON_LG} />, label: 'Home' },
  { id: 'orders', icon: <ClipboardList {...ICON_LG} />, label: 'Orders' },
  { id: 'shipments', icon: <Container {...ICON_LG} />, label: 'Shipments' },
  { id: 'tracking', icon: <Route {...ICON_LG} />, label: 'Tracking', count: 3 },
  { id: 'carriers', icon: <Truck {...ICON_LG} />, label: 'Carriers' },
]

const BOTTOM_ITEMS = [
  {
    id: 'users',
    icon: <UserCog {...ICON_LG} />,
    label: 'User Management',
    items: [
      { id: 'users-accounts', label: 'Users Accounts' },
      {
        id: 'users-access',
        label: 'Access Management',
        items: [
          { id: 'access-domains', label: 'Domains' },
          { id: 'access-resources', label: 'Resources' },
          { id: 'access-user-sets', label: 'User Sets' },
          { id: 'access-roles', label: 'Roles' },
        ],
      },
    ],
  },
  { id: 'partners', icon: <Handshake {...ICON_LG} />, label: 'Partners' },
]

export default function SidebarDemo() {
  const [expanded, setExpanded] = useState(true)
  const [activeId, setActiveId] = useState('access-domains')

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Left navigation chrome, used across every Odyssey One route. It is a real flex child
        of the page row, not an overlay, so expanding it <em>pushes</em> the domain content.
        How deep a level is drawn depends on the room available: <strong>expanded</strong>,
        level 2 is an indented rail row and only level 3 floats;{' '}
        <strong>collapsed</strong>, nothing can indent, so the icon itself opens a floating{' '}
        <code>DropdownMenu</code> and each drill-in row chains the next card to its right.
        Cards open on <strong>hover</strong> as well as click, with a short grace period so
        the pointer can cross the gap into them. Router-agnostic: the DSM uses <code>activeId</code> +{' '}
        <code>onItemClick</code>; the app wraps leaf rows in a <code>NavLink</code> via{' '}
        <code>renderItem</code>.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start', gap: 24 }}>
          <div style={{ height: 520, display: 'flex' }}>
            <Sidebar
              expanded={expanded}
              topItems={TOP_ITEMS}
              bottomItems={BOTTOM_ITEMS}
              activeId={activeId}
              onItemClick={setActiveId}
            />
          </div>
          <div className="ds-demo-col" style={{ gap: 8 }}>
            <label className="ds-demo-label">
              <input
                type="checkbox"
                checked={expanded}
                onChange={(e) => setExpanded(e.target.checked)}
              />{' '}
              expanded
            </label>
            <span className="ds-demo-label">active: {activeId}</span>
            <span className="ds-demo-label" style={{ maxWidth: 260 }}>
              Click <strong>User Management</strong>, then <em>hover</em>{' '}
              <strong>Access Management</strong>. Untick <em>expanded</em> and do it again to
              see the same items as a chained card cascade off the icon. Note that clicking a
              disclosure never changes <code>active</code> — only destinations do.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
