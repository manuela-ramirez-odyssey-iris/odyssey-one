import { useCallback, useEffect, useRef, useState } from 'react'
import { GlobalSearch } from '@odyssey/ui'
import OrdersFiltersView from '../orders/OrdersFiltersView'
import { activeFilterCount } from '../../search/orders/toRequest'
import { useGlobalSearch } from '../../search/useGlobalSearch'

/**
 * Clicks that are outside this wrapper in the DOM but NOT "outside the panel"
 * to a user. Everything here must be exempt from the dismissal below.
 *
 * `[data-filters-trigger]` — the table toolbar's Filters button. Without the
 *   exemption, mousedown closes the panel and the click reopens it, so the
 *   button could never close what it opened.
 *
 * `[data-placement]` / `.field-search-results` — every field popover inside the
 *   panel PORTALS to document.body (useAnchoredPortal for Dropdown + the
 *   DatePicker calendar, ComboBox's own createPortal for the typeahead list).
 *   They are visually inside the panel but DOM-outside it, so picking a
 *   Customer suggestion, an Error Count operator, or a date used to dismiss the
 *   whole panel mid-interaction.
 */
const KEEP_OPEN_SELECTOR = '[data-filters-trigger], [data-placement], .field-search-results'

/**
 * OrdersGlobalSearch — the Orders domain's navbar search slot.
 *
 * Same shape as ShipmentsGlobalSearch, and deliberately in the SAME PLACE:
 * `AppShell searchSlot` → the bar sits in the navbar, and the panel drops
 * beneath it (`.orders-results-panel`, sharing the Shipments placement rule).
 *
 * TWO triggers, ONE panel, ONE place (user ruling, 2026-08-20): the bar's own
 * FilterButton and the table toolbar's Filters button. Open state is therefore
 * CONTROLLED by OrdersRoute — the toolbar button lives in a different subtree
 * and could not otherwise drive it. Both stay in sync because neither owns the
 * state.
 *
 * FREE-TEXT SEARCH (S128, user ruling 2026-08-20) is live: typing an order
 * number and pressing Enter commits it as a query badge and filters the table.
 * Matching, multi-code union and relevance ordering are Shipments' own, shared
 * verbatim through `search/criteria-core` — see `search/orders/criteria.js`.
 *
 * Still phase 2: attribute CHIPS (Order #: … as a structured chip), the
 * suggestion dropdown and the results-preview panel. The hook is given no
 * adapter, which is exactly how it stays inert for those — `useGlobalSearch`
 * documents "pass no adapter and the bar stays inert: no suggestions, no
 * dropdown" — while still owning value/commit/clear for the text path.
 */
export default function OrdersGlobalSearch({ tab, filters, onApply, open, onOpenChange, onSearch }) {
  const wrapperRef = useRef(null)
  const setOpen = onOpenChange

  // No adapter: text-only search (see the component doc above).
  const search = useGlobalSearch(null, {
    // Removing the last committed item IS the clear gesture (S81) — the bar and
    // the table criteria must not disagree about whether a search is active.
    onLastRemoved: useCallback(() => onSearch(''), [onSearch]),
  })
  const { value, onChange, onClear, textChip, onTextCommit, onTextRemove } = search

  // Enter commits the typed text: it becomes the bar's query badge AND the
  // table's criteria in one gesture. Committing an EMPTY bar is a no-op in the
  // hook, so guard the table call the same way rather than clearing on a stray
  // Enter.
  const commit = useCallback(() => {
    const text = value.trim()
    if (!text) return
    onTextCommit()
    onSearch(text)
  }, [value, onTextCommit, onSearch])

  const clearAll = useCallback(() => {
    onClear()
    onSearch('')
  }, [onClear, onSearch])

  // Outside click / Escape close the panel — the two dismissal gestures the
  // Shipments panel supports. Applying and the header X close it too (below).
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (e.target.closest?.(KEEP_OPEN_SELECTOR)) return
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])

  // Switching tabs changes the whole field set, so a panel left open would show
  // the previous tab's fields and could Apply against the new one.
  useEffect(() => { setOpen(false) }, [tab, setOpen])

  // Enter anywhere in the bar commits, mirroring the Shipments wrapper-level
  // handler. Ignored while the FILTERS panel is open: Enter there belongs to
  // whatever field has focus, not to the search bar behind it.
  const handleKeyDown = useCallback((e) => {
    if (open) return
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
  }, [open, commit])

  return (
    <div className="orders-global-search" ref={wrapperRef} onKeyDown={handleKeyDown}>
      <GlobalSearch
        value={value}
        onChange={onChange}
        onClear={clearAll}
        placeholder="Search order number or customer"
        chips={textChip ? [textChip] : []}
        onChipRemove={() => { onTextRemove(); onSearch('') }}
        filterCount={activeFilterCount(tab, filters)}
        filterActive={open}
        onFilterClick={(next) => setOpen(next)}
      />
      {open && (
        <div className="orders-results-panel">
          {/* Keyed by tab so the panel remounts against the new field set and
              that tab's own applied values. */}
          <OrdersFiltersView
            key={tab}
            tab={tab}
            filters={filters}
            onApply={(draft) => { onApply(draft); setOpen(false) }}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
