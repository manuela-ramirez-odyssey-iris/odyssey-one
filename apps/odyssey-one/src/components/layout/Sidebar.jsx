import { House, ClipboardList, Container, Route, Truck, UserCog, Handshake, Workflow } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Sidebar as OdysseySidebar } from '@odyssey/ui'
import { B2B_EDI_DASHBOARD_URL } from '../../externalLinks'

// App chrome: maps Odyssey One's routes onto the router-agnostic @odyssey/ui
// Sidebar. Leaf rows are wrapped in a react-router <NavLink> via `renderItem`
// so the library stays dependency-free while the app keeps <a> semantics;
// rows that own children are disclosures and never reach renderItem.
//
// SpotBid is deliberately absent — the domain is out of scope for phase 1
// (user, S142). Its /spotbid routes are still live, just not reachable here,
// so putting the row back is a one-line change when the work resumes.
const topItems = [
  { id: 'home',      icon: <House {...ICON_LG} />,         label: 'Home',      to: '/' },
  { id: 'orders',    icon: <ClipboardList {...ICON_LG} />, label: 'Orders',    to: '/orders' },
  { id: 'shipments', icon: <Container {...ICON_LG} />,     label: 'Shipments', to: '/shipments' },
  { id: 'tracking',  icon: <Route {...ICON_LG} />,         label: 'Tracking',  to: '/tracking' },
  { id: 'carriers',  icon: <Truck {...ICON_LG} />,         label: 'Carriers',  to: '/carriers' },
  // External (Boomi), not a route — must never participate in active-route
  // highlighting, so it deliberately carries no `to`. Opened via `external`,
  // handled below in `renderItem` instead of the NavLink branch.
  {
    id: 'edi-dashboard',
    icon: <Workflow {...ICON_LG} />,
    label: 'EDI Dashboard',
    external: B2B_EDI_DASHBOARD_URL,
  },
]

const bottomItems = [
  {
    id: 'users',
    icon: <UserCog {...ICON_LG} />,
    label: 'User Management',
    items: [
      // No flyout until we know what sits behind its chevron in the mock.
      { id: 'users-accounts', label: 'Users Accounts', to: '/users/accounts' },
      {
        id: 'users-access',
        label: 'Access Management',
        items: [
          { id: 'access-domains',   label: 'Domains',   to: '/users/access/domains' },
          { id: 'access-resources', label: 'Resources', to: '/users/access/resources' },
          { id: 'access-user-sets', label: 'User Sets', to: '/users/access/user-sets' },
          { id: 'access-roles',     label: 'Roles',     to: '/users/access/roles' },
        ],
      },
    ],
  },
  { id: 'partners', icon: <Handshake {...ICON_LG} />, label: 'Partners', to: '/partners' },
]

// Flatten every routable row once so the active id is a longest-prefix lookup
// rather than a parallel list that drifts from the nav above.
const ROUTABLE = [...topItems, ...bottomItems].flatMap((i) => [
  ...(i.to ? [i] : []),
  ...(i.items || []).flatMap((s) => [...(s.to ? [s] : []), ...(s.items || [])]),
])

function activeIdFor(pathname) {
  const match = ROUTABLE
    .filter((i) => (i.to === '/' ? pathname === '/' : pathname.startsWith(i.to)))
    .sort((a, b) => b.to.length - a.to.length)[0]
  return match?.id
}

const Sidebar = React.memo(function Sidebar({ expanded = false, onHoverChange }) {
  const { pathname } = useLocation()

  return (
    <OdysseySidebar
      expanded={expanded}
      onHoverChange={onHoverChange}
      topItems={topItems}
      bottomItems={bottomItems}
      activeId={activeIdFor(pathname)}
      // Every routable row is wrapped in a NavLink below, so navigation is the
      // link's job — onItemClick is left to the library's default rendering.
      renderItem={(item, node) => {
        if (item.to) {
          return (
            <NavLink to={item.to} end={item.to === '/'} title={item.label}>
              {node}
            </NavLink>
          )
        }
        // External link (e.g. EDI Dashboard): no route to navigate to, so it
        // opens in a new tab instead of going through NavLink.
        if (item.external) {
          return React.cloneElement(node, {
            onClick: (e) => {
              node.props.onClick?.(e)
              window.open(item.external, '_blank', 'noopener,noreferrer')
            },
            title: item.label,
          })
        }
        return node
      }}
    />
  )
})

export default Sidebar
