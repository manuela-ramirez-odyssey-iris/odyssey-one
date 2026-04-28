import { Home, ShoppingCart, Truck, ClipboardList, MapPin, Settings, Handshake } from 'lucide-react'
import React from 'react'
import { NavLink } from 'react-router-dom'

const topItems = [
  { icon: Home, label: 'Home', to: '/' },
  { icon: ShoppingCart, label: 'Orders', to: '/orders' },
  { icon: Truck, label: 'Carriers', to: '/carriers' },
  { icon: ClipboardList, label: 'Shipments', to: '/shipments' },
  { icon: MapPin, label: 'Tracking', to: '/tracking' },
]

const bottomItems = [
  { icon: Settings, label: 'User Settings', to: null },
  { icon: Handshake, label: 'Partners', to: null },
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
        <div className="flex flex-col gap-2 pb-6">
          {topItems.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={label}
              className="flex items-center justify-center w-10 h-10 cursor-pointer transition-colors duration-150"
              style={({ isActive }) => ({
                borderRadius: 'var(--radius-lg)',
                background: isActive ? 'var(--deep-sea-neutral-300)' : 'transparent',
              })}
            >
              <Icon size={20} style={{ color: 'var(--text-tertiary)' }} />
            </NavLink>
          ))}
        </div>

        <div
          className="flex flex-col gap-2 pt-6 w-10"
          style={{ borderTop: '1px solid var(--deep-sea-neutral-300)' }}
        >
          {bottomItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              title={label}
              className="flex items-center justify-center w-10 h-10 border-none cursor-pointer transition-colors duration-150"
              style={{
                borderRadius: 'var(--radius-lg)',
                background: 'transparent',
              }}
            >
              <Icon size={20} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          ))}
        </div>
      </nav>
    </aside>
  )
})

export default Sidebar
