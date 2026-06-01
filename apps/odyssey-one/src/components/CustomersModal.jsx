import { useEffect, useMemo, useRef, useState } from 'react'
import { Handshake } from 'lucide-react'
import { SearchField, CustomerRow, EmptyState, Button } from '@odyssey/ui'
import { useCustomers } from '../contexts/CustomersContext.jsx'

// Global customers picker. Rendered as a popover anchored below the navbar
// (right-aligned, 14px from the window edge) — NOT a centered overlay modal.
// Dismisses on Escape or click-outside; clicks on the navbar handshake trigger
// (aria-label "Customers") are ignored so the trigger can toggle it.
export default function CustomersModal() {
  const { customers, selectedIds, closeModal, toggleSelect, toggleFavorite, deleteCustomer } = useCustomers()
  const [filter, setFilter] = useState('')
  const [resultsOpen, setResultsOpen] = useState(false)
  const popoverRef = useRef(null)
  const searchRef = useRef(null)

  // Close the popover on Escape / outside click.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') closeModal()
    }
    function onMouseDown(e) {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return
      // ignore the navbar handshake trigger so it can toggle the popover itself
      if (e.target.closest && e.target.closest('[aria-label="Customers"]')) return
      closeModal()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [closeModal])

  // Close the search-results dropdown when clicking inside the popover but
  // outside the search field.
  useEffect(() => {
    if (!resultsOpen) return
    function onMouseDown(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setResultsOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [resultsOpen])

  const selectedCustomers = useMemo(
    () => customers.filter((c) => selectedIds.has(c.id)),
    [customers, selectedIds],
  )
  const searchMatches = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const available = customers.filter((c) => !selectedIds.has(c.id))
    if (!q) return available
    return available.filter((c) => c.label.toLowerCase().includes(q))
  }, [customers, filter, selectedIds])

  return (
    <div
      className="customers-popover"
      ref={popoverRef}
      role="dialog"
      aria-label="Add Customers"
    >
      <header className="customers-popover__header">
        <span className="text-heading-lg-semibold">Add Customers</span>
      </header>

      <div className="customers-popover__content">
        <div ref={searchRef} onFocus={() => setResultsOpen(true)}>
          <SearchField
            value={filter}
            onChange={(v) => { setFilter(v); setResultsOpen(true) }}
            onClear={() => { setFilter(''); setResultsOpen(false) }}
            placeholder="Search Customers"
            showLabel
            showInfoIcon
            label="Set your Customers"
            results={
              resultsOpen ? (
                <>
                  <div className="search-field__results-header text-label-sm-medium">
                    All Customers
                  </div>
                  {searchMatches.length === 0 ? (
                    <div className="search-field__results-empty text-label-sm-regular">
                      No matches
                    </div>
                  ) : (
                    searchMatches.map((c) => (
                      <CustomerRow
                        key={c.id}
                        mode="result"
                        label={c.label}
                        favorite={c.favorite}
                        onClick={() => toggleSelect(c.id)}
                        onFavoriteToggle={() => toggleFavorite(c.id)}
                      />
                    ))
                  )}
                </>
              ) : null
            }
          />
        </div>

        <div className="customers-modal-list">
          {selectedCustomers.length === 0 ? (
            <EmptyState
              className="customers-modal-empty"
              icon={<Handshake size={32} />}
              message="No customer has been selected yet."
            />
          ) : (
            selectedCustomers.map((c) => (
              <CustomerRow
                key={c.id}
                mode="list"
                label={c.label}
                favorite={c.favorite}
                onDelete={() => deleteCustomer(c.id)}
              />
            ))
          )}
        </div>
      </div>

      <footer className="customers-popover__footer">
        <Button variant="secondary" size="md" onClick={closeModal}>
          Cancel
        </Button>
        <Button variant="primary" size="md" onClick={closeModal}>
          Save
        </Button>
      </footer>
    </div>
  )
}
