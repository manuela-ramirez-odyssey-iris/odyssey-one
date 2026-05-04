import React, { useState, useRef, useEffect } from 'react'
import { GlobalSearch, LeadNav, TrailNav } from '@odyssey/ui'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../data/sso-mock'

const CATEGORIES = [
  { value: 'Global', label: 'Global', group: null },
  { value: 'Shipment Exceptions', label: 'Shipment Exceptions', group: 'Shipments' },
  { value: 'Monitoring', label: 'Monitoring', group: 'Shipments' },
  { value: 'PGI/PGR', label: 'PGI/PGR', group: 'Shipments' },
]

const Navbar = React.memo(function Navbar() {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('Shipment Exceptions')
  const [searchValue, setSearchValue] = useState('')
  const categoryDropdownRef = useRef(null)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef(null)
  const navigate = useNavigate()
  const currentUser = useCurrentUser()

  useEffect(() => {
    function handleClickOutside(e) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setCategoryDropdownOpen(false)
      }
    }
    if (categoryDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [categoryDropdownOpen])

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false)
      }
    }
    if (profileDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileDropdownOpen])

  return (
    <header className="flex items-center shrink-0 relative z-50"
      style={{ background: 'var(--navbar-bg)', padding: '14px 24px 14px 16px', gap: 'var(--spacing-6)' }}>

      {/* Left: Hamburger + Logo */}
      <LeadNav />


      {/* Center: GlobalSearch (history nav + scope dropdown + input + clear) */}
      <div className="relative flex-1 flex items-stretch" ref={categoryDropdownRef}>
        <GlobalSearch
          scope={selectedCategory}
          onScopeClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
          dropdownOpen={categoryDropdownOpen}
          value={searchValue}
          onChange={setSearchValue}
          onClear={() => setSearchValue('')}
        />

        {/* Category dropdown — TODO: extract once the menu component is designed */}
        {categoryDropdownOpen && (
          <div
            className="absolute flex flex-col"
            style={{
              top: '100%',
              left: 64,
              marginTop: 4,
              width: 220,
              background: 'var(--dropdown-bg)',
              border: '1px solid var(--dropdown-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
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
                    setCategoryDropdownOpen(false)
                  }}
                >
                  {cat.label}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: TrailNav (bell + notification + divider + avatar/name/role + chevron) */}
      <div className="relative ml-auto shrink-0" ref={profileDropdownRef}>
        <TrailNav
          name={currentUser.name}
          role={currentUser.role}
          avatar={
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          }
          notificationCount={6}
          dropdownOpen={profileDropdownOpen}
          onProfileClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
        />

        {/* Profile dropdown — TODO: extract once the menu component is designed (SHP-66 covers GlobalSearch's; this one's still inline) */}
        {profileDropdownOpen && (
            <div
              className="absolute flex flex-col"
              style={{
                top: '100%',
                right: 0,
                marginTop: 4,
                width: 200,
                background: 'var(--dropdown-bg)',
                border: '1px solid var(--dropdown-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 9999,
                padding: '4px 0',
                overflow: 'hidden',
              }}
            >
              <button
                className="flex items-center w-full text-left text-sm border-none cursor-pointer"
                style={{
                  padding: '8px 12px',
                  minHeight: 36,
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-primary)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dropdown-hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                disabled
              >
                Account
              </button>
              <button
                className="flex items-center w-full text-left text-sm border-none cursor-pointer"
                style={{
                  padding: '8px 12px',
                  minHeight: 36,
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-primary)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dropdown-hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => {
                  setProfileDropdownOpen(false)
                  navigate('/users')
                }}
              >
                Manage Users
              </button>
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
              <button
                className="flex items-center w-full text-left text-sm border-none cursor-pointer"
                style={{
                  padding: '8px 12px',
                  minHeight: 36,
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-primary)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dropdown-hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                disabled
              >
                Sign out
              </button>
            </div>
          )}
      </div>
    </header>
  )
})
export default Navbar
