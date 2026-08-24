import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GlobalSearch, GlobalSearchPanel, GlobalSearchResults } from '@odyssey/ui'
import OrdersFiltersView from '../orders/OrdersFiltersView'
import { activeFilterCount, emptyState, filterChips } from '../../search/orders/toRequest'
import { ordersSearchAdapter } from '../../search/orders/adapter'
import { useGlobalSearch } from '../../search/useGlobalSearch'
import { FIELD_POPOVER_SELECTOR } from './fieldPopovers'

/**
 * Clicks that are outside this wrapper in the DOM but NOT "outside the panel"
 * to a user. Everything here must be exempt from the dismissal below.
 *
 * `[data-filters-trigger]` — the table toolbar's Filters button. Without the
 *   exemption, mousedown closes the panel and the click reopens it, so the
 *   button could never close what it opened.
 *
 * The field popovers are the shared half — see fieldPopovers.js. Shipments hit
 * the identical bug (S130) with the same two components, which is why that
 * selector now lives in one place instead of being copied per host.
 */
const KEEP_OPEN_SELECTOR = `[data-filters-trigger], ${FIELD_POPOVER_SELECTOR}`

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
 * FILTER CRITERIA RIDE IN THE BAR (S130, user ruling): applying the panel
 * populates the bar with one chip per filled field, and removing a chip clears
 * that field — the same two-way relationship Shipments has between its bar and
 * its Filters panel. The chips are DERIVED from the applied filters
 * (`filterChips`), not held here, so there is no second copy to drift.
 *
 * SUGGESTIONS + RESULTS PREVIEW (S130) are live: the bar is given the Orders
 * adapter, so typing offers "What is it?" attribute chips, a committed chip
 * drills forward through the progression, and the preview panel shows the top
 * matches with "Show all results".
 *
 * EVERY progression attribute commits (S130). Committed chips travel as
 * `filters.searchChips` — a flat criteria path, separate from the tab-scoped
 * panel filters — and both the mock matcher and the SQL honour all 20. An
 * earlier cut offered only the subset that had a panel filter param behind it;
 * the rest could be previewed but not applied, which is the "looks wired, does
 * nothing" failure api/_lib/orders.mjs warns about.
 */
export default function OrdersGlobalSearch({ tab, filters, onApply, open, onOpenChange, onSearch, onCommitCriteria }) {
  const wrapperRef = useRef(null)
  const setOpen = onOpenChange

  // The Orders adapter (S130) — suggestions, drill-forward and the results
  // preview all come from it. Passing `null` here is what used to keep the bar
  // text-only: no dropdown, no preview, however good the adapter was.
  const search = useGlobalSearch(ordersSearchAdapter, {
    // Removing the last committed item IS the clear gesture (S81) — the bar and
    // the table criteria must not disagree about whether a search is active.
    onLastRemoved: useCallback(() => onSearch(''), [onSearch]),
  })
  const {
    value, onChange, onClear, onFocus, onBlur, textChip, onTextCommit, onTextRemove,
    chips: draftChips, onChipCommit, onChipRemove: onDraftChipRemove, applyChips,
    suggestionSections, suggestionsOpen, results, resultTotal, searching,
  } = search

  // The preview panel — separate from `open`, which OrdersRoute owns for the
  // FILTERS panel (two triggers, one panel place). Only one of the two ever
  // renders: filters wins, mirroring how Shipments' single panel switches view.
  const [previewOpen, setPreviewOpen] = useState(false)

  // The APPLIED filters, shown in the bar as chips (S130 — "the searchbar is
  // wired to the filters panel too like in shipments"). Derived from the same
  // state the grid is filtered by, never a second copy, so the bar cannot claim
  // a criterion the table isn't honouring.
  const criteriaChips = useMemo(() => filterChips(tab, filters), [tab, filters])
  // Panel-applied criteria first, then the bar's own chips, then the text badge.
  // The two chip groups are genuinely different criteria paths (tab-scoped panel
  // filters vs the flat `searchChips`) that AND together on the request, so both
  // belong on the bar.
  const barChips = [
    ...criteriaChips,
    ...draftChips,
    ...(textChip ? [textChip] : []),
  ]

  // Removing a criterion chip clears THAT field and re-applies — the same
  // "modify the current criteria from the bar" gesture Shipments has. The text
  // badge keeps its own removal path (it isn't part of the filter state).
  const removeChip = useCallback((key) => {
    if (textChip && key === textChip.key) {
      onTextRemove()
      onSearch('')
      return
    }
    // A BAR chip: drop it from the hook and re-commit what is left, so the grid
    // never disagrees with what the bar is showing. (Shipments deliberately does
    // NOT re-commit on removal; here the bar and the table were already kept in
    // lockstep for the panel-derived chips, and two different removal
    // behaviours on one bar would be the surprising thing.)
    if (draftChips.some((c) => c.key === key)) {
      onDraftChipRemove(key)
      const remaining = draftChips.filter((c) => c.key !== key)
      onCommitCriteria(remaining, textChip?.value ?? '')
      return
    }
    const blank = emptyState(tab)
    onApply({ ...blank, ...filters, [key]: blank[key] })
  }, [textChip, onTextRemove, onSearch, onApply, tab, filters, draftChips, onDraftChipRemove, onCommitCriteria])

  // The bar's X clears EVERYTHING it displays — now that the criteria chips
  // live there too, wiping only the text would leave the bar looking active.
  const clearAll = useCallback(() => {
    onClear()
    onCommitCriteria([], '')
    onApply(emptyState(tab))
    setPreviewOpen(false)
  }, [onClear, onCommitCriteria, onApply, tab])

  // "Show all results" — the committed chips become PANEL FILTER STATE and the
  // typed text becomes the grid's search term, so one gesture lands both halves
  // on the table. The draft chips are then cleared: the same criteria come back
  // as `criteriaChips`, derived from what is now applied, so the bar shows one
  // chip per criterion instead of two.
  const commitCriteria = useCallback(() => {
    const text = value.trim() || textChip?.value || ''
    if (value.trim()) onTextCommit()
    // Chips and text commit TOGETHER — one request, so the grid is never
    // briefly narrowed by one half without the other. The chips STAY in the
    // hook (they are the bar's own criteria, exactly as in Shipments); the
    // route just mirrors them onto the request.
    onCommitCriteria(draftChips, text)
    setPreviewOpen(false)
  }, [value, textChip, draftChips, onTextCommit, onCommitCriteria])

  // The preview closes on the same gestures the filters panel does.
  useEffect(() => {
    if (!previewOpen) return undefined
    const onDown = (e) => {
      if (e.target.closest?.(KEEP_OPEN_SELECTOR)) return
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setPreviewOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setPreviewOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [previewOpen])

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
      commitCriteria()
    }
  }, [open, commitCriteria])

  return (
    <div className="orders-global-search" ref={wrapperRef} onKeyDown={handleKeyDown}>
      <GlobalSearch
        value={value}
        onChange={onChange}
        onClear={clearAll}
        placeholder="Search order number or customer"
        onFocus={onFocus}
        onBlur={onBlur}
        chips={barChips}
        onChipRemove={removeChip}
        onChipClick={() => setPreviewOpen(true)}
        resultsOpen={previewOpen}
        filterCount={activeFilterCount(tab, filters)}
        filterActive={open}
        onFilterClick={(next) => { setOpen(next); if (next) setPreviewOpen(false) }}
        suggestionSections={suggestionSections}
        suggestionsOpen={suggestionsOpen && !open}
        onSuggestionSelect={(item) => { onChipCommit(item); setPreviewOpen(true) }}
      />

      {/* One panel place, two views: the FILTERS panel wins whenever it is open
          (it is the deliberate gesture), otherwise the preview shows for as long
          as there is something to preview. */}
      {!open && previewOpen && (draftChips.length > 0 || value.trim() || textChip) && (
        <div className="orders-results-panel">
          <GlobalSearchPanel
            count={resultTotal}
            loading={searching}
            onClear={clearAll}
            onShowResults={commitCriteria}
          >
            <GlobalSearchResults
              matches={results}
              maxRows={12}
              onFiltersClick={() => { setPreviewOpen(false); setOpen(true) }}
            />
          </GlobalSearchPanel>
        </div>
      )}

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
