import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { GlobalSearch, GlobalSearchPanel, GlobalSearchResults } from '@odyssey/ui'
import { useGlobalSearch } from '../../search/useGlobalSearch'
import { shipmentsSearchAdapter, panelForResults } from '../../search/shipments'
import { DATE_LIKE } from '../../search/shipments/adapter'
import { parseSearchDate } from '../../search/shipments/criteria'
import { useCustomers } from '../../contexts/CustomersContext.jsx'
import ShipmentsFiltersView, { mergeFiltersIntoChips } from './ShipmentsFiltersView'
import { tabForDataKey } from '../shipments/cellTabMap'

/**
 * ShipmentsGlobalSearch — Shipments-domain wiring of the GlobalSearch bar.
 * Owns the search state (via hook + adapter), renders chips in the bar, and
 * positions the GlobalSearchPanel below the bar. Entry points: a non-empty
 * (debounced) query or a committed chip opens the Results glimpse (top-12
 * matches), and the FilterButton opens the Filters view (its active state is
 * bound to the Filters view being open, however it was reached).
 * The panel closes on click-outside and on Escape.
 *
 * TYPING NEVER FILTERS THE TABLE (decision 5, S79b). The table pipeline is fed
 * only by explicit commits:
 * - `onCommitQuery({ chips, text })` — "Show all N results" click or Enter in
 *   the input (S79c decision 7: chips + text commit as ONE criteria set; a
 *   chips-only commit works, and committing with empty text no longer clears
 *   the criteria — only Clear all does, via `onCommitQuery(null)`). The host
 *   route feeds it into listParams.searchCriteria.
 * - `onSelectShipment(sellShipmentId, tab?, expandGeneral?)` — a match-row
 *   click. The host route selects that shipment (opens the docked ShipmentsBar
 *   with its details); `tab` (from the leading chip via the shared
 *   CELL_TAB_MAP) lands it on the mapped pane, mirroring table cell clicks.
 */
export default function ShipmentsGlobalSearch({ onCommitQuery, onSelectShipment }) {
  // Customer scoping (S79c decision 10): the glimpse must respect the selected
  // customer list, so the domain adapter is wrapped with the selection's dataIds
  // baked into searchShipments. The hook stays domain-agnostic — a selection
  // change produces a new adapter identity, which re-runs the results search.
  const { selectedDataIds } = useCustomers()
  const scopedAdapter = useMemo(() => ({
    ...shipmentsSearchAdapter,
    searchShipments: (chips, query) =>
      shipmentsSearchAdapter.searchShipments(chips, query, selectedDataIds),
  }), [selectedDataIds])

  // Removing the LAST remaining committed item (final attribute chip or the
  // free-text query badge) is the explicit full clear — same as the bar's X:
  // the hook wipes its own state and this callback clears the committed table
  // criteria so the table restores. Removing a chip while others remain keeps
  // the deliberate no-recommit behavior (the hook only fires this on empty).
  const handleLastRemoved = useCallback(() => onCommitQuery?.(null), [onCommitQuery])

  const {
    value, query, onChange, onClear, onFocus, onBlur,
    chips, onChipCommit, onChipRemove,
    textChip, onTextCommit, onTextRemove, onSetCommit, onDateCommit, onDateToggle, applyChips,
    suggestionSections, suggestionsOpen,
    results, resultTotal, searching, pendingDateChip,
  } = useGlobalSearch(scopedAdapter, { onLastRemoved: handleLastRemoved })

  const wrapperRef = useRef(null)
  const panelRef = useRef(null)
  const [resultsOpen, setResultsOpen] = useState(false)
  // Which view the overlay shows: the results list or the filters panel.
  const [panelView, setPanelView] = useState('results')

  // Mirror panelView into a ref so the open/close effect below can read it
  // WITHOUT re-running when only the view changes — otherwise closing the panel
  // (which flips panelView back to 'results') would immediately re-open it while
  // chips exist.
  const panelViewRef = useRef('results')
  useEffect(() => { panelViewRef.current = panelView }, [panelView])

  // A non-empty debounced query or a NEWLY committed chip → open the Results
  // glimpse. Emptying everything closes it — but only while the Results view is
  // showing; the Filters view stays open (you can build filters with no chips
  // committed yet, e.g. opened via the FilterButton). Keyed to the query STRING
  // (not a boolean) so continued typing re-opens the glimpse after an explicit
  // close. Compared against the PREVIOUS chips/query (S80): a commit now clears
  // the input (the text becomes a query badge), and without the delta check
  // that query change would re-open the panel right after commitQuery closed it.
  const hasQuery = query.trim().length > 0
  const prevOpenKeyRef = useRef({ chipCount: 0, query: '', pendingDateChip: false })
  // Fix B (user, 2026-08-03): selecting a shipment (match row) or clicking the
  // docked ShipmentsBar is a pure UI dismissal — set right before forcing an
  // open date chip closed / the panel closed, so THIS effect's next pass (the
  // one reacting to that chip closing) skips its normal "chip closed → open
  // results" heuristics instead of undoing the dismissal.
  const dismissRef = useRef(false)
  useEffect(() => {
    const prev = prevOpenKeyRef.current
    prevOpenKeyRef.current = { chipCount: chips.length, query, pendingDateChip }
    if (dismissRef.current) { dismissRef.current = false; return }
    const q = query.trim()
    // Case 12 / GS-22 refinement: an open date chip suppresses the panel only
    // while it has no date yet; a reopened chip with a date leaves the panel
    // as-is (user, 2026-08-03). A fresh chip (no `from`) still owns the space
    // below the bar — quick results appear only once a date is picked. A
    // committed chip reopened for editing (`from` already set) must NOT force
    // the results panel closed behind it.
    const openDateChipNoDate = chips.some((c) => c.kind === 'date-range' && c.open && !c.from)
    const openDateChipWithDate = chips.some((c) => c.kind === 'date-range' && c.open && c.from)
    if (openDateChipWithDate) {
      return
    }
    if (openDateChipNoDate) {
      setResultsOpen(false)
      return
    }
    // Case 12: a PARTIAL date ("12/", "12/3") is suggestion territory — the
    // date chips show, the panel doesn't. It opens once the date is VALID
    // (fully typed) or picked in the calendar.
    const partialDate = DATE_LIKE.test(q) && !parseSearchDate(q)
    if (partialDate) {
      if (panelViewRef.current === 'results') setResultsOpen(false)
      return
    }
    const dateCompleted = prev.pendingDateChip && !pendingDateChip && chips.length > 0
    if ((q && query !== prev.query) || chips.length > prev.chipCount || dateCompleted) {
      setResultsOpen(true)
    } else if (!q && chips.length === 0 && !textChip && panelViewRef.current === 'results') {
      setResultsOpen(false)
    }
  }, [chips, query, textChip, pendingDateChip])

  const openFilters = () => { setPanelView('filters'); setResultsOpen(true) }
  const closePanel = useCallback(() => { setResultsOpen(false); setPanelView('results') }, [])

  // Fix B (user, 2026-08-03): a pure UI dismissal — the user's focus moved to
  // a shipment (match-row click, or the docked ShipmentsBar). Closes the
  // panel AND any open date chip's calendar, but is NOT a commit and must not
  // trigger a search or the "chip closed → open results" heuristic above
  // (guarded via dismissRef, since that closing chip re-fires this effect).
  const dismissSearchUI = useCallback(() => {
    // Only arm the guard when there's actually an open chip to close — that's
    // the only case that re-fires the effect above; arming it unconditionally
    // would wrongly swallow the NEXT unrelated chips/query change (the effect
    // only reruns when one of its deps actually changes, so a stale armed
    // flag would sit there until some future, unrelated change consumed it).
    const openDate = chips.find((c) => c.kind === 'date-range' && c.open)
    if (openDate) {
      dismissRef.current = true
      onDateToggle(openDate.key, false)
    }
    closePanel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chips, onDateToggle, closePanel])

  // Commit the current criteria set — committed chips + free text — to the
  // host's table-search pipeline and close the glimpse. Chips-only commits work
  // (Enter with chips and an empty input commits the chips). S80 req 2 ("every
  // entered search is a query"): typed text turns into a query BADGE in the bar
  // on commit (onTextCommit) instead of lingering as raw input text; with an
  // empty input, the existing badge's term recommits. The `{ chips, text }`
  // contract is unchanged — the badge is presentation, `text` stays a string.
  const commitQuery = useCallback(() => {
    const text = value.trim() || textChip?.value || ''
    // The landing tab comes from the PREVIEW the user is looking at (GS-18) —
    // the panel of the leading result group, not the fullest panel overall.
    onCommitQuery?.({ chips, text }, { landOnPanel: panelForResults(results) })
    if (value.trim()) onTextCommit()
    closePanel()
  }, [chips, value, textChip, results, onCommitQuery, onTextCommit, closePanel])

  // Explicit Clear all — wipes the bar (chips + text, via the hook's onClear)
  // AND the committed table criteria. This is the only gesture that clears the
  // committed criteria (decision 7); an empty commit does not.
  const handleClearAll = useCallback(() => {
    onClear()
    onCommitQuery?.(null)
  }, [onClear, onCommitQuery])

  // Filters outbound wiring: edited filter values become chips. "Show N
  // results" MERGES into the current chips and commits to the table (chips are
  // the criteria); a Saved profile REPLACES the chips (a profile is a whole
  // search) and shows the glimpse without committing.
  const handleApplyFilters = useCallback((filters, { commit = false, replace = false } = {}) => {
    const nextChips = mergeFiltersIntoChips(replace ? [] : chips, filters)
    applyChips(nextChips)
    if (commit) {
      onCommitQuery?.({ chips: nextChips, text: textChip?.value || '' })
      closePanel()
    } else {
      setPanelView('results')
    }
  }, [chips, textChip, applyChips, onCommitQuery, closePanel])

  // Match-row click → select that shipment (docked bar opens with its details,
  // whether or not the row is on the current table page) and dismiss the
  // glimpse. Mirrors the table's cell→tab wiring: the LEADING chip (the one
  // that scoped the search, same rule as the adapter's result entity) picks
  // the bar tab via the shared CELL_TAB_MAP — searching by Order Count lands
  // on Orders, by SCAC on Tender, etc. No chips (free-text glimpse) → default
  // tab. Fix B (user, 2026-08-03): dismissSearchUI, not closePanel — this is
  // the user's focus moving to the shipment, not a commit.
  const handleMatchClick = useCallback((match) => {
    const key = match?.['data-shipment-key']
    if (key) {
      const mapping = chips.length ? tabForDataKey(chips[0].dataKey) : null
      onSelectShipment?.(key, mapping?.tab, mapping?.expandGeneral)
    }
    dismissSearchUI()
  }, [onSelectShipment, dismissSearchUI, chips])

  // Keyboard: Enter in the input commits the query (same as "Show all N
  // results"); Escape closes the panel. Listens on the wrapper so we don't
  // reach into the GlobalSearch internals; chip Enter presses are scoped out
  // by the INPUT check, and GlobalSearch stops propagation when Enter selects a
  // highlighted suggestion (S80 req 5), so that case never reaches here.
  // S80 req 4: Enter also commits while the RESULTS PANEL has focus (the user
  // clicked into it, de-focusing the input — still "in search context"). The
  // panel is focusable (tabIndex -1) so clicks land focus inside the wrapper;
  // interactive descendants (rows, links, buttons) keep their own Enter.
  const canCommit = !!(value.trim() || chips.length > 0 || textChip)
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { closePanel(); return }
    if (e.key !== 'Enter' || !canCommit) return
    // Case 12: while a date chip's calendar is open, Enter CLOSES the chip
    // (which is what triggers the quick results) instead of committing the
    // whole query to the table.
    // (Enter on a calendar day button stays a pick — only Enter OUTSIDE the
    // calendar closes the chip.)
    const openDate = chips.find((c) => c.kind === 'date-range' && c.open)
    if (openDate && !e.target.closest('.search-chip__calendar')) {
      onDateToggle(openDate.key, false)
      return
    }
    const inInput = e.target.tagName === 'INPUT'
    const inPanel = panelRef.current?.contains(e.target) &&
      !e.target.closest('button, a, input, textarea, select, [role="button"], [role="option"]')
    if (inInput || inPanel) commitQuery()
  }, [closePanel, commitQuery, canCommit, chips, onDateToggle])

  // S80 req 3: clicking back into the bar while there's in-progress text (or
  // committed chips / a query badge) re-opens the panel with the current
  // glimpse — closing via click-outside doesn't discard the composition.
  const handleFocus = useCallback(() => {
    onFocus()
    if (canCommit) setResultsOpen(true)
  }, [onFocus, canCommit])

  // Close on click outside the entire wrapper (bar + panel). Fix B (user,
  // 2026-08-03): a click landing on the docked ShipmentsBar (`.shipments-bar`)
  // is the same "focus moved to a shipment" dismissal as a match-row click —
  // dismissSearchUI, not a plain close, so an open date chip doesn't race
  // back open behind it. Any OTHER outside click is unaffected — it's a
  // legitimate outside-click commit (S106) and may still open results.
  useEffect(() => {
    if (!resultsOpen) return
    const handleMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        if (e.target.closest?.('.shipments-bar')) {
          dismissSearchUI()
          return
        }
        setResultsOpen(false)
        setPanelView('results')
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [resultsOpen, dismissSearchUI])

  // Bar chips = committed attribute chips + (when present) the free-text query
  // badge (S80 req 2) — same visual treatment, quoted label to read as a query
  // term. Removal routes by key: the text badge clears via onTextRemove.
  // GS-21: a multi-code commit upgrades the badge to kind 'set' — it renders
  // as the expandable SearchChip; its label here only feeds the overflow
  // measurer, so mirror SearchChip's summary string.
  const barChips = useMemo(() => {
    if (!textChip) return chips
    const label = textChip.kind === 'set'
      ? `${textChip.typeLabel || 'Multiple'} Set • ${textChip.codes.filter((c) => c.valid !== false).length} IDs`
      : `"${textChip.label}"`
    return [...chips, { ...textChip, label }]
  }, [chips, textChip])
  const handleChipRemove = useCallback((key) => {
    if (textChip && key === textChip.key) onTextRemove()
    else onChipRemove(key)
  }, [textChip, onTextRemove, onChipRemove])

  return (
    <div className="shipments-global-search" ref={wrapperRef} onKeyDown={handleKeyDown}>
      <GlobalSearch
        value={value}
        onChange={onChange}
        // The bar's X wipes chips + text — an explicit clear-all gesture, so it
        // clears the committed table criteria too.
        onClear={handleClearAll}
        onFocus={handleFocus}
        onBlur={onBlur}
        chips={barChips}
        onChipRemove={handleChipRemove}
        onChipClick={() => setResultsOpen(true)}
        onSetCommit={onSetCommit}
        onDateCommit={onDateCommit}
        onDateToggle={onDateToggle}
        resultsOpen={resultsOpen}
        filterCount={barChips.length}
        // FilterButton opens the Filters view; its active state is bound to the
        // Filters view being open — whether reached via the button or the
        // GlobalSearchResults "All Filters" link.
        filterActive={resultsOpen && panelView === 'filters'}
        onFilterClick={(next) => { if (next) openFilters(); else closePanel() }}
        suggestionSections={suggestionSections}
        suggestionsOpen={suggestionsOpen}
        onSuggestionSelect={onChipCommit}
      />

      {/* Results needs a query (typed or committed as the text badge) or
          committed chips; Filters can show on its own (opened via the
          FilterButton even before any chip is committed). tabIndex -1 makes the
          panel focusable so a click inside it keeps Enter working (req 4). */}
      {resultsOpen && (panelView === 'filters' || chips.length > 0 || hasQuery || textChip) && (
        <div className="shipments-results-panel" ref={panelRef} tabIndex={-1}>
          {panelView === 'results' ? (
            <GlobalSearchPanel
              count={resultTotal}
              loading={searching}
              // "Clear all" wipes chips AND the typed query (the hook's onClear
              // does both) AND the committed table criteria — with query-driven
              // results, clearing only chips would leave the glimpse open on
              // the residual query.
              onClear={handleClearAll}
              onShowResults={commitQuery}
            >
              <GlobalSearchResults
                matches={results}
                maxRows={12}
                onMatchClick={handleMatchClick}
                onFiltersClick={() => setPanelView('filters')}
              />
            </GlobalSearchPanel>
          ) : (
            <ShipmentsFiltersView
              chips={chips}
              resultTotal={resultTotal}
              onBack={() => { if (chips.length > 0 || hasQuery) setPanelView('results'); else closePanel() }}
              onClose={closePanel}
              onClearAll={() => chips.forEach((c) => onChipRemove(c.key))}
              onApplyFilters={handleApplyFilters}
            />
          )}
        </div>
      )}
    </div>
  )
}
