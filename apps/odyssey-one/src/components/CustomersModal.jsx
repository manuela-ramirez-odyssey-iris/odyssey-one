import { useEffect, useMemo, useRef, useState } from 'react'
import { Handshake } from 'lucide-react'
import { SearchField, CustomerRow, EmptyState, Button, ModalMedium, ModalHeader } from '@odyssey/ui'
import { useCustomers } from '../contexts/CustomersContext.jsx'

// Set equality helper for the dirty check — Save only arms when the staged
// selection actually differs from the applied one (content, not reference).
function sameSet(a, b) {
  if (a.size !== b.size) return false
  for (const id of a) if (!b.has(id)) return false
  return true
}

// Global customers picker. Rendered as a popover anchored below the navbar
// (right-aligned, 14px from the window edge) — NOT a centered overlay modal.
// Dismisses on Escape or click-outside; clicks on the navbar handshake trigger
// (aria-label "Customers") are ignored so the trigger can toggle it.
//
// Selection edits are STAGED locally — the live CustomersContext selection
// (which scopes the Shipments/Orders tables) only changes when the user Saves
// AND confirms the change in a ModalMedium that lists the added/removed
// customers by name. Cancel / Escape / outside click discards the stage (the
// component unmounts, so the draft state evaporates).
export default function CustomersModal() {
  const { customers, selectedIds, applySelection, closeModal, toggleFavorite } = useCustomers()
  const [filter, setFilter] = useState('')
  const [resultsOpen, setResultsOpen] = useState(false)
  // Draft selection — seeded from the applied set on open, never written back
  // to the context until the confirmation is accepted.
  const [stagedIds, setStagedIds] = useState(() => new Set(selectedIds))
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Just-added row — drives the one-shot carolina-blue pulse in the staged
  // list so the addition is noticeable; cleared when the animation ends.
  const [lastAddedId, setLastAddedId] = useState(null)
  const popoverRef = useRef(null)
  const searchRef = useRef(null)

  const dirty = !sameSet(stagedIds, selectedIds)

  // Close the popover on Escape / outside click. Suspended while the save
  // confirmation is up — the ModalMedium owns Escape/overlay dismissal then,
  // and dismissing IT must return to the panel with the stage intact.
  useEffect(() => {
    function onKey(e) {
      if (confirmOpen) return
      if (e.key === 'Escape') closeModal()
    }
    function onMouseDown(e) {
      if (confirmOpen) return
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
  }, [closeModal, confirmOpen])

  // Exit search mode when clicking inside the popover but outside the search
  // field. Listens on CLICK (not mousedown): the footer swaps content with the
  // mode, so a mousedown-time swap would let the user's click land on a button
  // that wasn't there when they pressed (Back link → Cancel mis-click).
  useEffect(() => {
    if (!resultsOpen) return
    function onClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setResultsOpen(false)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [resultsOpen])

  // Leave search mode: close the results list and defocus the search bar (a
  // fresh focus/typing brings it back).
  const exitSearch = () => {
    setResultsOpen(false)
    searchRef.current?.querySelector('input')?.blur()
  }

  const stageAdd = (id) => {
    setStagedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const stageRemove = (id) => {
    setStagedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const selectedCustomers = useMemo(
    () => customers.filter((c) => stagedIds.has(c.id)),
    [customers, stagedIds],
  )
  const searchMatches = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const available = customers.filter((c) => !stagedIds.has(c.id))
    if (!q) return available
    return available.filter((c) => c.label.toLowerCase().includes(q))
  }, [customers, filter, stagedIds])

  // Diff for the confirmation copy — names being added to / removed from scope.
  const added = useMemo(
    () => customers.filter((c) => stagedIds.has(c.id) && !selectedIds.has(c.id)),
    [customers, stagedIds, selectedIds],
  )
  const removed = useMemo(
    () => customers.filter((c) => selectedIds.has(c.id) && !stagedIds.has(c.id)),
    [customers, stagedIds, selectedIds],
  )

  const handleConfirmApply = () => {
    applySelection(stagedIds)
    setConfirmOpen(false)
    closeModal()
  }

  return (
    <div
      className="customers-popover"
      ref={popoverRef}
      role="dialog"
      aria-label="Customers"
    >
      {/* Static title; the MODE (default = manage the current selection,
          search = adding customers) swaps the search-field label, gates the
          footer, and surfaces the ModalHeader back chevron as the way out of
          search mode. The header X always closes the popover. */}
      <ModalHeader
        title="Customers"
        onBack={resultsOpen ? exitSearch : undefined}
        onClose={closeModal}
      />

      <div className="customers-popover__content">
        <div ref={searchRef} onFocus={() => setResultsOpen(true)}>
          <SearchField
            value={filter}
            onChange={(v) => { setFilter(v); setResultsOpen(true) }}
            onClear={() => { setFilter(''); setResultsOpen(false) }}
            placeholder="Search Customers"
            showLabel
            showInfoIcon
            label={resultsOpen ? 'Select new customers' : 'Search more customers'}
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
                        // Selecting closes the list AND defocuses the search
                        // bar (back to default mode); refocusing or typing
                        // reopens it for the next add.
                        onClick={() => { stageAdd(c.id); setLastAddedId(c.id); exitSearch() }}
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
              // Wrapper carries the just-added pulse so CustomerRow's own
              // classes stay untouched; layout-neutral in the flex column.
              <div
                key={c.id}
                className={c.id === lastAddedId ? 'customers-row-pulse' : undefined}
                onAnimationEnd={() => setLastAddedId(null)}
              >
                <CustomerRow
                  mode="list"
                  label={c.label}
                  favorite={c.favorite}
                  onDelete={() => stageRemove(c.id)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer only in default mode — while picking (search mode) the header
          back chevron is the sole way out; no Save/Cancel mid-selection. */}
      {!resultsOpen && (
        <footer className="customers-popover__footer">
          <Button variant="secondary" size="md" onClick={closeModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!dirty}
            onClick={() => setConfirmOpen(true)}
          >
            Save
          </Button>
        </footer>
      )}

      {/* Save confirmation — lists the staged diff by name. Confirm applies the
          staged set to the context (tables reload via query identity) and closes
          both layers; Cancel / X / overlay returns to the panel, stage intact.
          Rendered INSIDE the popover so the outside-click guard treats overlay
          clicks as in-popover and the fixed overlay paints within the popover's
          stacking context (above its own z-index tier). */}
      {confirmOpen && (
        <ModalMedium
          title="Apply customer changes"
          onClose={() => setConfirmOpen(false)}
          ariaLabel="Apply customer changes"
          footer={
            <>
              <Button variant="secondary" size="lg" onClick={() => setConfirmOpen(false)}>
                Back
              </Button>
              <Button variant="primary" size="lg" onClick={handleConfirmApply}>
                Apply changes
              </Button>
            </>
          }
        >
          <p className="text-label-sm-regular customers-confirm__intro">
            This changes which customers scope the Shipments and Orders tables.
          </p>
          {added.length > 0 && (
            <div className="customers-confirm__group">
              <span className="text-label-sm-medium">Adding</span>
              <ul className="customers-confirm__names text-label-sm-regular">
                {added.map((c) => <li key={c.id}>{c.label}</li>)}
              </ul>
            </div>
          )}
          {removed.length > 0 && (
            <div className="customers-confirm__group">
              <span className="text-label-sm-medium">Removing</span>
              <ul className="customers-confirm__names text-label-sm-regular">
                {removed.map((c) => <li key={c.id}>{c.label}</li>)}
              </ul>
            </div>
          )}
        </ModalMedium>
      )}
    </div>
  )
}
