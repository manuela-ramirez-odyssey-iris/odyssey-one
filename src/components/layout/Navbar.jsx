import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Menu, Bell, ChevronDown } from 'lucide-react'

const CATEGORIES = [
  { value: 'Global', label: 'Global', group: null },
  { value: 'Shipment Exceptions', label: 'Shipment Exceptions', group: 'Shipments' },
  { value: 'Monitoring', label: 'Monitoring', group: 'Shipments' },
  { value: 'PGI/PGR', label: 'PGI/PGR', group: 'Shipments' },
]

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('Shipment Exceptions')
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  return (
    <header className="flex items-center justify-between shrink-0 relative z-50"
      style={{ background: 'var(--navbar-bg)', padding: '14px 24px 14px 16px' }}>

      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-4 pr-14">
        <button className="flex items-center justify-center p-2" style={{ color: 'var(--navbar-text-muted)' }}>
          <Menu size={20} />
        </button>
        <div className="font-semibold text-lg" style={{ color: 'var(--navbar-text)' }}>
          Odyssey ONE
        </div>
      </div>

      {/* Center: Nav arrows + Search */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 h-8">
          <button className="flex items-center justify-center p-1.5" style={{ color: 'var(--navbar-text-muted)' }}>
            <ChevronLeft size={20} />
          </button>
          <button className="flex items-center justify-center p-1.5" style={{ color: 'var(--navbar-text-muted)' }}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Navbar search bar */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-3 overflow-hidden"
            style={{
              width: 632, background: 'var(--navbar-search-bg)',
              border: '1px solid var(--navbar-search-focus)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)', paddingRight: 12,
            }}>
            <button
              className="flex items-center gap-3 shrink-0 whitespace-nowrap"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                padding: '6px 8px 6px 12px',
                background: 'var(--navbar-search-dropdown)',
                border: 'none', borderRight: '1px solid var(--navbar-divider)',
                cursor: 'pointer',
              }}>
              <span className="text-sm" style={{ color: 'var(--navbar-text-muted)' }}>
                {selectedCategory}
              </span>
              <ChevronDown size={16} style={{ color: 'var(--navbar-text-muted)' }} />
            </button>
            <input
              type="text"
              placeholder="Search"
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium min-w-0"
              style={{ color: 'var(--text-inverse)' }}
            />
          </div>

          {/* Category dropdown */}
          {dropdownOpen && (
            <div
              className="absolute flex flex-col"
              style={{
                top: '100%',
                left: 0,
                marginTop: 4,
                width: 220,
                background: 'var(--dropdown-bg)',
                border: '1px solid var(--dropdown-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 9999,
                padding: '4px 0',
                overflow: 'hidden',
              }}
            >
              {CATEGORIES.map((cat, i) => (
                <div key={cat.value}>
                  {i === 1 && (
                    <>
                      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                      <span className="text-xs font-semibold px-3 py-1 block" style={{ color: 'var(--text-placeholder)' }}>
                        Shipments
                      </span>
                    </>
                  )}
                  <button
                    className="flex items-center w-full text-left text-sm border-none cursor-pointer"
                    style={{
                      padding: '8px 12px',
                      minHeight: 36,
                      background: selectedCategory === cat.value ? 'var(--bg-tertiary)' : 'transparent',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-primary)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dropdown-hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = selectedCategory === cat.value ? 'var(--bg-tertiary)' : 'transparent'}
                    onClick={() => {
                      setSelectedCategory(cat.value)
                      setDropdownOpen(false)
                    }}
                  >
                    {cat.label}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Bell + Profile */}
      <div className="flex items-center gap-6 justify-end pl-9" style={{ width: 272 }}>
        <button className="relative p-1.5" style={{ color: 'var(--navbar-text-muted)' }}>
          <Bell size={20} />
          <span className="absolute flex items-center justify-center text-xs font-medium"
            style={{
              top: -6, left: 16, width: 20, height: 20, padding: 4,
              background: 'var(--navbar-notification)', borderRadius: 'var(--radius-full)',
              color: 'var(--text-inverse)',
            }}>
            6
          </span>
        </button>

        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--navbar-search-dropdown)' }} />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-semibold"
            style={{ background: 'var(--deep-sea-neutral-600)', color: 'var(--text-inverse)' }}>
            AC
          </div>
          <div className="flex flex-col whitespace-nowrap">
            <span className="text-sm font-medium" style={{ color: 'var(--navbar-user-name)' }}>Amy Cook</span>
            <span className="text-xs" style={{ color: 'var(--navbar-text-muted)', lineHeight: '12px' }}>Admin</span>
          </div>
          <ChevronDown size={16} style={{ color: 'var(--navbar-text-muted)' }} />
        </div>
      </div>
    </header>
  )
}
