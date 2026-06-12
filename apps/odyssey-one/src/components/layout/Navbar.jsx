import React, { useState, useRef, useEffect } from 'react'
import { GlobalSearch, LeadNav, TrailNav, Navbar as NavbarShell } from '@odyssey/ui'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../data/sso-mock'
import { useEditMode } from '../../contexts/EditModeContext.jsx'
import { useCreateOrderMode } from '../../contexts/CreateOrderModeContext.jsx'
import { useCustomers } from '../../contexts/CustomersContext.jsx'

const Navbar = React.memo(function Navbar({ searchSlot } = {}) {
  const [searchValue, setSearchValue] = useState('')
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef(null)
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const { isEditMode, save, cancel } = useEditMode()
  const { isCreateOrderMode, saveForLater, close } = useCreateOrderMode()
  const { toggleModal, modalOpen } = useCustomers()

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false)
      }
    }
    if (profileDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileDropdownOpen])

  if (isEditMode) {
    return (
      <NavbarShell
        compact
        lead={<LeadNav />}
        search={<GlobalSearch mode="title" title="Edit Dashboard" />}
        trail={
          <TrailNav
            mode="editor"
            showRightIcon={false}
            primaryButtonLabel="Cancel"
            onPrimaryButtonClick={cancel}
            secondaryButtonLabel="Save"
            onSecondaryButtonClick={save}
            onHelpClick={() => console.log('help')}
          />
        }
      />
    )
  }

  if (isCreateOrderMode) {
    return (
      <NavbarShell
        compact
        lead={<LeadNav />}
        search={<GlobalSearch mode="title" title="Create New Order" />}
        trail={
          <TrailNav
            mode="editor"
            showPrimaryButton={false}
            secondaryButtonLabel="Save for Later"
            onSecondaryButtonClick={saveForLater}
            onHelpClick={() => {}} // inert this build (spec §2.1)
            onRightIconClick={close}
          />
        }
      />
    )
  }

  return (
    <NavbarShell
      lead={<LeadNav />}
      search={
        searchSlot ?? (
          <GlobalSearch
            value={searchValue}
            onChange={setSearchValue}
            onClear={() => setSearchValue('')}
          />
        )
      }
      trailRef={profileDropdownRef}
      trail={
        <>
          <TrailNav
            name={currentUser.name}
            role={currentUser.role}
            onCustomersClick={toggleModal}
            customersActive={modalOpen}
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
        </>
      }
    />
  )
})
export default Navbar
