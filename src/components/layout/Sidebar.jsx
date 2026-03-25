import { Home, ClipboardList, Package, Truck, Route, Settings, Handshake } from 'lucide-react'
import { useState } from 'react'

const topItems = [
  { icon: Home, label: 'Home', key: 'home' },
  { icon: ClipboardList, label: 'Shipments', key: 'shipments' },
  { icon: Package, label: 'Packages', key: 'packages' },
  { icon: Truck, label: 'Trucks', key: 'trucks' },
  { icon: Route, label: 'Routes', key: 'routes' },
]

const bottomItems = [
  { icon: Settings, label: 'User Settings', key: 'settings' },
  { icon: Handshake, label: 'Partners', key: 'partners' },
]

export default function Sidebar() {
  const [active, setActive] = useState('shipments')

  return (
    <aside className="shrink-0 flex flex-col sticky top-16"
      style={{
        width: 'var(--sidebar-width)', background: 'var(--deep-sea-neutral-200)',
        padding: 'var(--spacing-3)', height: 'calc(100vh - var(--navbar-height))',
      }}>
      <nav className="flex flex-col items-center flex-1" style={{ width: 40 }}>
        <div className="flex flex-col gap-2">
          {topItems.map(({ icon: Icon, label, key }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              title={label}
              className="flex items-center justify-center w-10 h-10 border-none cursor-pointer transition-colors duration-150"
              style={{
                borderRadius: 'var(--radius-lg)',
                background: active === key ? 'var(--deep-sea-neutral-300)' : 'transparent',
              }}
            >
              <Icon size={20} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          ))}
        </div>

        <div className="my-6" style={{ width: 40, height: 1, background: 'var(--deep-sea-neutral-300)' }} />

        <div className="flex flex-col gap-2">
          {bottomItems.map(({ icon: Icon, label, key }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              title={label}
              className="flex items-center justify-center w-10 h-10 border-none cursor-pointer transition-colors duration-150"
              style={{
                borderRadius: 'var(--radius-lg)',
                background: active === key ? 'var(--deep-sea-neutral-300)' : 'transparent',
              }}
            >
              <Icon size={20} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          ))}
        </div>
      </nav>

      <div className="flex items-center justify-center p-1 shrink-0 text-xs font-bold"
        style={{ color: 'var(--text-placeholder)' }}>
        O
      </div>
    </aside>
  )
}
