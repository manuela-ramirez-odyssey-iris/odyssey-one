import { House, ClipboardList, Container, Route, Truck, UserCog, Handshake } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import React from 'react'
import { NavLink } from 'react-router-dom'
import { SidebarButton } from '@odyssey/ui'

const topItems = [
  { icon: House,         label: 'Home',      to: '/' },
  { icon: ClipboardList, label: 'Orders',    to: '/orders' },
  { icon: Container,     label: 'Shipments', to: '/shipments' },
  { icon: Route,         label: 'Tracking',  to: '/tracking' },
]

const bottomItems = [
  { icon: Truck,     label: 'Carriers',        to: '/carriers' },
  { icon: UserCog,   label: 'User Management', to: '/users' },
  { icon: Handshake, label: 'Partners',        to: null },
]

const Sidebar = React.memo(function Sidebar() {
  return (
    <aside
      className="shrink-0 flex flex-col sticky top-0"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--deep-sea-neutral-200)',
        padding: 'var(--spacing-3)',
        height: 'calc(100vh - var(--navbar-height))',
      }}
    >
      <nav className="flex flex-col items-center flex-1" style={{ width: 40 }}>
        <div
          className="flex flex-col items-center"
          style={{
            width: 40,
            gap: 'var(--spacing-2)',
            paddingBottom: 'var(--spacing-6)',
          }}
        >
          {topItems.map(({ icon: Icon, label, to }) => (
            <NavLink key={to} to={to} end={to === '/'} title={label}>
              {({ isActive }) => (
                <SidebarButton
                  state={isActive ? 'selected' : 'default'}
                  icon={<Icon {...ICON_LG} />}
                />
              )}
            </NavLink>
          ))}
        </div>

        <div
          className="flex flex-col items-center"
          style={{
            width: 40,
            gap: 'var(--spacing-2)',
            paddingTop: 'var(--spacing-6)',
            borderTop: '1px solid var(--deep-sea-neutral-300)',
          }}
        >
          {bottomItems.map(({ icon: Icon, label, to }) =>
            to ? (
              <NavLink key={label} to={to} title={label}>
                {({ isActive }) => (
                  <SidebarButton
                    state={isActive ? 'selected' : 'default'}
                    icon={<Icon {...ICON_LG} />}
                  />
                )}
              </NavLink>
            ) : (
              <button
                key={label}
                title={label}
                className="border-none bg-transparent p-0 cursor-pointer"
              >
                <SidebarButton icon={<Icon {...ICON_LG} />} />
              </button>
            )
          )}
        </div>
      </nav>
    </aside>
  )
})

export default Sidebar
