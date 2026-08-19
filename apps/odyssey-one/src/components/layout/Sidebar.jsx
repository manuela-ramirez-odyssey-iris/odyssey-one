import { House, ClipboardList, Container, Route, Truck, UserCog, Handshake, Gavel } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import React from 'react'
import { NavLink } from 'react-router-dom'
import { Sidebar as OdysseySidebar, SidebarButton } from '@odyssey/ui'

// App chrome: maps Odyssey One's routes onto the router-agnostic @odyssey/ui Sidebar.
// `renderItem` wraps each item in a react-router <NavLink> so the library stays
// dependency-free while the app keeps NavLink's isActive + <a> semantics.
const topItems = [
  { id: 'home',      icon: <House {...ICON_LG} />,         label: 'Home',      to: '/' },
  { id: 'orders',    icon: <ClipboardList {...ICON_LG} />, label: 'Orders',    to: '/orders' },
  { id: 'shipments', icon: <Container {...ICON_LG} />,     label: 'Shipments', to: '/shipments' },
  { id: 'spotbid',   icon: <Gavel {...ICON_LG} />,         label: 'SpotBid',   to: '/spotbid' },
  { id: 'tracking',  icon: <Route {...ICON_LG} />,         label: 'Tracking',  to: '/tracking' },
]

const bottomItems = [
  { id: 'carriers', icon: <Truck {...ICON_LG} />,     label: 'Carriers',        to: '/carriers' },
  { id: 'users',    icon: <UserCog {...ICON_LG} />,   label: 'User Management', to: '/users' },
  { id: 'partners', icon: <Handshake {...ICON_LG} />, label: 'Partners',        to: '/partners' },
]

const Sidebar = React.memo(function Sidebar() {
  return (
    <OdysseySidebar
      topItems={topItems}
      bottomItems={bottomItems}
      renderItem={(item) => (
        <NavLink to={item.to} end={item.to === '/'} title={item.label}>
          {({ isActive }) => (
            <SidebarButton state={isActive ? 'selected' : 'default'} icon={item.icon} />
          )}
        </NavLink>
      )}
    />
  )
})

export default Sidebar
