import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { GlobalSearch, GlobalSearchPanel, GlobalSearchResults } from '@odyssey/ui'
import { useGlobalSearch } from '../../search/useGlobalSearch'
import { shipmentsSearchAdapter, panelForResults } from '../../search/shipments'
import { DATE_LIKE } from '../../search/shipments/adapter'
import { parseSearchDate } from '../../search/shipments/criteria'
import { useCustomers } from '../../contexts/CustomersContext.jsx'
import { useUserPreference } from '../../api/queries/useUserPreference'
import {
  listSharedFilters,
  shareFilter as shareFilterApi,
  renameSharedFilter as renameSharedFilterApi,
  deleteSharedFilter as deleteSharedFilterApi,
} from '../../api/services/sharedFilterService'
import ShipmentsFiltersView, { mergeFiltersIntoChips } from './ShipmentsFiltersView'
import SaveFilterModal from './SaveFilterModal'
import { hydrate, newFilter, splitFreeText, toStored, formatChipsForCopy } from './savedFilters'
import { tabForDataKey } from '../shipments/cellTabMap'
import { inFieldPopover } from './fieldPopovers'

// react-query key for the Odyssey group's shared half (S108 Phase 3d) —
// separate from SAVED_FILTERS_KEY above: that one is a user_preferences ROW
// (personal, one per user); this one is the shared_filters TABLE (everyone's
// rows, one list for the whole app). Kept as its own query rather than
// folded into the preference fetch because they're genuinely different
// resources with different write paths (PATCH/DELETE by id vs. whole-row PUT).
const SHARED_FILTERS_QUERY_KEY = ['shared-filters']

// user_preferences key for personal Saved Filters (S108 spec, "Data model").
const SAVED_FILTERS_KEY = 'shipments.savedFilters'

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

  // Saved filters (S108 Phase 1a/1c — hosting move + persistence shape). Lives
  // HERE, not in ShipmentsFiltersView, which unmounts on every panel close
  // (spec "Hosting" defect 3): `useUserPreference` is `staleTime: Infinity`
  // with a fire-and-forget `save()` that never seeds the query cache, so a
  // filter saved while the view was mounted would vanish the moment it
  // remounts on reopen. Every mutation below pairs `save()` with
  // `setQueryData` on the SAME queryKey the hook builds (`['user-preference',
  // key]`) so the cache carries the write immediately, independent of any
  // refetch. The list + callbacks pass down to `ShipmentsFiltersView`, whose
  // Saved tab renders them directly.
  const queryClient = useQueryClient()
  const { data: savedFiltersPref, save: saveSavedFiltersPref } = useUserPreference(SAVED_FILTERS_KEY)
  const savedFilters = useMemo(() => hydrate(savedFiltersPref), [savedFiltersPref])

  const persistSavedFilters = useCallback((next) => {
    saveSavedFiltersPref(next)
    queryClient.setQueryData(['user-preference', SAVED_FILTERS_KEY], next)
  }, [saveSavedFiltersPref, queryClient])

  const saveFilter = useCallback((name, filterChips) => {
    persistSavedFilters({ v: 1, custom: [...savedFilters.custom, newFilter(name, filterChips)] })
  }, [savedFilters, persistSavedFilters])

  const renameFilter = useCallback((id, name) => {
    persistSavedFilters({
      v: 1,
      custom: savedFilters.custom.map((f) => (f.id === id ? { ...f, name } : f)),
    })
  }, [savedFilters, persistSavedFilters])

  const deleteFilters = useCallback((ids) => {
    const idSet = new Set(ids)
    persistSavedFilters({ v: 1, custom: savedFilters.custom.filter((f) => !idSet.has(f.id)) })
  }, [savedFilters, persistSavedFilters])

  const reorderFilters = useCallback((fromIndex, toIndex) => {
    const next = [...savedFilters.custom]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    persistSavedFilters({ v: 1, custom: next })
  }, [savedFilters, persistSavedFilters])

  // S110 rev2 (docs/superpowers/specs/2026-08-05-filters-two-modes.md,
  // decision 1) — Update Filter writes the editor's current chips back onto
  // the OPEN profile, replacing its stored chip list wholesale (same
  // `toStored` strip `saveFilter`/`newFilter` already apply: transient UI
  // state out, invalid chips dropped). This is the ONLY write path that
  // mutates an existing profile's `chips` — nothing on the bar's own edit
  // path (handleApplyFilters/handleApplySaved) calls it, which is what makes
  // "a profile can be updated only from the panel, never from the bar"
  // (spec HARD RULE, carried over from rev1) true by construction.
  const updateFilter = useCallback((id, filterChips) => {
    persistSavedFilters({
      v: 1,
      custom: savedFilters.custom.map((f) => (f.id === id ? { ...f, chips: toStored(filterChips) } : f)),
    })
  }, [savedFilters, persistSavedFilters])

  // S110 rev2 decision 1's SECOND half — Update Filter also APPLIES the
  // merged chips to the bar/table (the one moment edit-filter mode's
  // decoupling deliberately ends), but must NOT close the whole search
  // panel: the spec is explicit the user "returns to the Saved tab with the
  // row still selected," not out of the panel. Deliberately NOT
  // `handleApplySaved` (below) — that one closes the panel (S108 1e, "Show N
  // results" on Saved IS the exit gesture); reusing it here would close the
  // panel out from under a click the spec says should land back on Saved.
  // Same `dismissRef`/`splitFreeText` machinery as `handleApplySaved`, same
  // reasoning (see that callback's own comment).
  const applyUpdatedFilterToBar = useCallback((filterChips) => {
    const { chips: realChips, freeText } = splitFreeText(filterChips)
    dismissRef.current = true
    applyChips(realChips, freeText)
    onCommitQuery?.({ chips: realChips, text: freeText?.value || '' })
  }, [applyChips, onCommitQuery])

  // Shared filters (S108 Phase 3d — the Odyssey group's shared half; the
  // migration + API + service landed in earlier phases, this wires the UI).
  // Hosted HERE for the identical reason as the Custom list above: the Saved
  // tab (ShipmentsFiltersView) unmounts on every panel close, and a plain
  // `useQuery` with `staleTime: Infinity` only fetches once per HOST mount.
  // Every mutation below pairs its API/mock call with `setQueryData` on this
  // SAME key so a just-shared/-renamed/-deleted row is in the cache the
  // instant the mutation resolves — the exact "doesn't vanish on reopen"
  // requirement `persistSavedFilters` above satisfies for Custom filters.
  const { data: sharedFiltersData } = useQuery({
    queryKey: SHARED_FILTERS_QUERY_KEY,
    queryFn: listSharedFilters,
    staleTime: Infinity,
  })
  const sharedFilters = sharedFiltersData ?? []

  // Custom → Odyssey drag (spec "Behaviour" 4): share, then remove from
  // Custom — a MOVE, not a copy (same `id` throughout; sharedFilters.mjs's
  // own comment: "sharing moves it, not copies it"). Order matters: the
  // Custom-side removal only happens AFTER the share (and its cache update)
  // succeed, so the row never has a tick where it's in neither list — worst
  // case on failure, it just stays in Custom instead of vanishing.
  // Refetches the FULL list after sharing rather than appending the POST's
  // own response: the live route's INSERT...RETURNING (sharedFilters.mjs)
  // doesn't include `ownerUsername` (no `users` join on that statement, only
  // on GET) — appending it directly would badge the just-shared row
  // `by: undefined` until some unrelated refetch happened to fix it. This
  // sidesteps that gap without touching the API file.
  const shareFilter = useCallback(async (filter) => {
    try {
      await shareFilterApi(filter.id, filter.name, filter.chips)
      const all = await listSharedFilters()
      queryClient.setQueryData(SHARED_FILTERS_QUERY_KEY, all)
      persistSavedFilters({ v: 1, custom: savedFilters.custom.filter((f) => f.id !== filter.id) })
    } catch (e) {
      console.error(`shareFilter(${filter.id})`, e)
    }
  }, [savedFilters, persistSavedFilters, queryClient])

  // Odyssey → Custom drag (spec "Behaviour" 4): un-share + restore to
  // Custom. Author-only in practice — the view's drag-doesn't-start guard
  // (ShipmentsFiltersView) keeps a non-author's row from ever reaching this
  // call, and sharedFilterService's own author check is the backstop if it
  // somehow did (see that file's spoofable-userId ceiling comment).
  const unshareFilter = useCallback(async (filter) => {
    try {
      await deleteSharedFilterApi(filter.id)
      queryClient.setQueryData(SHARED_FILTERS_QUERY_KEY, (prev) => (prev ?? []).filter((f) => f.id !== filter.id))
      persistSavedFilters({ v: 1, custom: [...savedFilters.custom, { id: filter.id, name: filter.name, chips: filter.chips }] })
    } catch (e) {
      console.error(`unshareFilter(${filter.id})`, e)
    }
  }, [savedFilters, persistSavedFilters, queryClient])

  // ⋮ → Edit Name acting on an OWNED shared row (spec "Behaviour" 5). PATCH
  // returns only `{ id, name }` (sharedFilters.mjs's RETURNING clause) — the
  // merge below only overwrites `name`, so `ownerUsername`/`chips`/
  // `createdAt` already in the cache survive untouched (no refetch needed,
  // unlike `shareFilter` above: rename doesn't touch anything a `users` join
  // would supply).
  const renameSharedFilterEntry = useCallback(async (id, name) => {
    try {
      const renamed = await renameSharedFilterApi(id, name)
      queryClient.setQueryData(SHARED_FILTERS_QUERY_KEY, (prev) =>
        (prev ?? []).map((f) => (f.id === id ? { ...f, ...renamed } : f)))
    } catch (e) {
      console.error(`renameSharedFilter(${id})`, e)
    }
  }, [queryClient])

  // ⋮ → Delete Filters batch, for whichever ids in the selection are OWNED
  // shared rows (ShipmentsFiltersView splits the batch by store before
  // calling this — see its handleConfirmDelete). A genuine delete, not
  // un-share+restore; that pairing is the drag gesture's job above.
  const deleteSharedFiltersEntries = useCallback(async (ids) => {
    try {
      await Promise.all(ids.map((id) => deleteSharedFilterApi(id)))
      const idSet = new Set(ids)
      queryClient.setQueryData(SHARED_FILTERS_QUERY_KEY, (prev) => (prev ?? []).filter((f) => !idSet.has(f.id)))
    } catch (e) {
      console.error('deleteSharedFilters', e)
    }
  }, [queryClient])

  // Save Filter modal (S108 1b). Rendered as a SIBLING of
  // `.shipments-results-panel` below, inside this wrapper — NOT nested inside
  // the panel, which has `transform: translateX(-50%)` (components.css) and
  // would become the containing block for ModalMedium's `position: fixed`
  // overlay, sizing it to the panel instead of the viewport and trapping it
  // under the panel's `z-index: 49` (spec "Hosting"). Staying inside the
  // wrapper still keeps it inside `wrapperRef`, so the outside-click handler
  // below never treats a modal click as an outside click.
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const openSaveModal = useCallback(() => setSaveModalOpen(true), [])
  // Bumped on every successful save so the (still-mounted) ShipmentsFiltersView
  // can flip its OWN `activeTab` to 'saved' (spec "Behaviour" 1) without lifting
  // that tab state up here — see the matching effect in ShipmentsFiltersView.
  const [savedTabSignal, setSavedTabSignal] = useState(0)
  const handleSaveFilter = useCallback((name, filterChips) => {
    saveFilter(name, filterChips)
    setSavedTabSignal((n) => n + 1)
    setSaveModalOpen(false)
  }, [saveFilter])

  // S108 1d keyboard trap: an active inline rename (⋮ → Edit Name on the
  // Saved tab) is an INPUT inside this wrapper too, same trap class as the
  // save-modal title field above — `handleKeyDown` below extends its early
  // return to cover it (see that callback + `ShipmentsFiltersView`'s own
  // `onRenameActiveChange` comment for the full mechanics).
  const [renameActive, setRenameActive] = useState(false)

  // S110 rev2 decision 4 — the bridge for the two panel-dismissal paths this
  // component owns DIRECTLY and never routes through ShipmentsFiltersView's
  // own `onBack`/`onClose` props: outside-click and Escape (both below).
  // ShipmentsFiltersView assigns its `attemptLeaveEditMode` guard to this
  // ref on every render while it's mounted (see that component's own
  // `editGuardRef` comment) — `null` whenever it isn't (e.g. the Results
  // view is showing, or ShipmentsFiltersView is stubbed out in a test), in
  // which case the two call sites below just close immediately.
  const editGuardRef = useRef(null)

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
    // S108 1e bonus fix (spec "Behaviour" 9): committing here is ALSO the
    // pre-existing All-tab bug — applyChips changes `chips` (often GROWING it
    // by the chip just edited), which re-fires the open/close effect below;
    // its `chips.length > prev.chipCount` branch reopens the results glimpse
    // in the very next render, right behind the closePanel() a few lines down.
    // Same dismissRef guard as `handleApplySaved`, same reasoning: consumed
    // unconditionally at that effect's top, and applyChips always sets a
    // fresh array, so the flag always gets consumed by the run this commit
    // causes — it can't strand and suppress some unrelated later reopen.
    if (commit) dismissRef.current = true
    applyChips(nextChips)
    if (commit) {
      onCommitQuery?.({ chips: nextChips, text: textChip?.value || '' })
      closePanel()
    } else {
      setPanelView('results')
    }
  }, [chips, textChip, applyChips, onCommitQuery, closePanel])

  // S108 1e (spec "Behaviour" 8) — the Saved tab's "Show N results": apply the
  // SELECTED filter's stored chips WHOLESALE via the hook's `applyChips`, NOT
  // `handleApplyFilters`'s `{ commit, replace }` path above. That path runs
  // `chipsToFilters` (chip → flat filter value) then `mergeFiltersIntoChips`
  // (flat value → chip) to merge an edit back in — and `mergeFiltersIntoChips`
  // only ever builds `kind: 'attribute'` / `kind: 'date-range'` chips (see
  // ShipmentsFiltersView.jsx). A GS-21 `kind: 'set'` chip's `codes`/
  // `typeLabel` has nowhere to go in that round-trip and would silently
  // flatten to a plain queryValue string — exactly the loss the chip-object
  // storage format (GS-24, supersedes GS-10) exists to prevent. Confirmed by
  // reading both functions before writing this: `chipsToFilters` only reads
  // `c.queryValue` for a non-date chip (a set chip has one — its joined code
  // list), and `mergeFiltersIntoChips`'s non-date branch always builds
  // `{ kind: 'attribute', queryValue: v }` from scratch, never copying
  // `codes`/`typeLabel` through. So this bypasses that pair entirely.
  //
  // `filterChips` may carry a `__free-text__` entry (the query badge folded
  // in by `barChips` at save time) — split via `splitFreeText` and restore it
  // as the hook's separate `textChip` state (its `applyChips` 2nd arg), not
  // as a member of `chips` (a chip with no `dataKey` fails every
  // `matchesChip` check and zeroes the count — see `savedFilters.js`).
  // `null` when the saved filter carried no free text WIPES any stray text
  // left in the bar, matching "wholesale replace."
  const handleApplySaved = useCallback((filterChips) => {
    const { chips: realChips, freeText } = splitFreeText(filterChips)
    // Same reopen-suppression as the All-tab commit above (spec "Behaviour" 9,
    // this task's primary case — the All-tab fix piggybacks on this one).
    dismissRef.current = true
    applyChips(realChips, freeText)
    onCommitQuery?.({ chips: realChips, text: freeText?.value || '' })
    closePanel()
  }, [applyChips, onCommitQuery, closePanel])

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
    // S108 1b (the keyboard trap): while the Save Filter modal is open, Enter
    // in its title field must NOT commit the search and Escape must close the
    // MODAL only, not this whole panel. Doing nothing here for every key lets
    // the event keep bubbling to ModalMedium's own window `keydown` listener
    // (ModalMedium.jsx), which closes just the modal on Escape — no extra
    // Escape handling needed on this side.
    // S108 1d: the same trap applies to an active inline rename on the Saved
    // tab — its own onKeyDown (ShipmentsFiltersView) handles Enter (commit)
    // and Escape (cancel) itself before this bubble; the early return here
    // just stops THIS handler from also treating them as commit/close.
    if (saveModalOpen || renameActive) return
    // S110 rev2 decision 4 — Escape is one of the two dismissal paths this
    // component owns directly (never routes through ShipmentsFiltersView's
    // own onClose), so it's bridged through `editGuardRef` — see that ref's
    // doc comment above. `null` (Results view showing, or no unsaved
    // edit-filter-mode changes) closes immediately, same as before.
    if (e.key === 'Escape') {
      if (editGuardRef.current) editGuardRef.current(closePanel)
      else closePanel()
      return
    }
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
  }, [closePanel, commitQuery, canCommit, chips, onDateToggle, saveModalOpen, renameActive])

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
      // A pick inside a body-portalled field popover (ComboBox typeahead list,
      // DatePicker calendar) is DOM-outside this wrapper but is not an outside
      // click — without this the panel closed on mousedown and unmounted the
      // popover before the option's own click ran, so selecting a value or a
      // date did nothing at all (S130). Same class as GS-24's ⋮ menu; the
      // Orders host has carried this exemption since S128.
      if (inFieldPopover(e.target)) return
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        // S110 rev2 decision 4 — the other dismissal path this component
        // owns directly; same `editGuardRef` bridge as Escape above.
        const doClose = () => {
          if (e.target.closest?.('.shipments-bar')) {
            dismissSearchUI()
            return
          }
          setResultsOpen(false)
          setPanelView('results')
        }
        if (editGuardRef.current) editGuardRef.current(doClose)
        else doClose()
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

  // S108 1f (spec "Behaviour" 10): a human-readable rendering of the CURRENT
  // bar — `barChips`' own `label`s ("Attr: value", already computed for the
  // bar itself, including the free-text/set badge folded in above). S110
  // rev2 (GS-28, decision 3) extracted the join into `formatChipsForCopy`
  // (savedFilters.js) so the Saved tab's per-row copy icon
  // (ShipmentsFiltersView's RowCopyButton) produces the IDENTICAL string
  // shape for its own chips — one formatter, two call sites, no drift.
  // Guard `navigator.clipboard?.` — absent in non-secure contexts (plain
  // HTTP) and in jsdom; must not throw there (spec, "Copy-to-clipboard icon").
  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(formatChipsForCopy(barChips))
  }, [barChips])

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
        onCopy={handleCopy}
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
              // S108 1e: dedicated Saved-tab apply (see `handleApplySaved`
              // above for why this is NOT `handleApplyFilters`) + the
              // CUSTOMER-SCOPED adapter (this component's own `scopedAdapter`,
              // built above with `selectedDataIds` baked in) for counting a
              // selected filter — the unscoped module import the view falls
              // back to on its own would disagree with the table.
              onApplySaved={handleApplySaved}
              scopedAdapter={scopedAdapter}
              // S108 1a/1c/1d: hydrated Custom-group list + persistence
              // callbacks, hosted here (see the block above) and rendered by
              // the view's real Saved tab.
              savedFilters={savedFilters.custom}
              onSaveFilter={saveFilter}
              onRenameFilter={renameFilter}
              onDeleteFilters={deleteFilters}
              onReorderFilters={reorderFilters}
              // S110 rev2 — panel-only profile update: persist (`updateFilter`
              // above) AND apply to the bar/table without closing the panel
              // (`applyUpdatedFilterToBar` above) — see decision 1.
              onUpdateFilter={updateFilter}
              onApplyUpdatedFilter={applyUpdatedFilterToBar}
              // S110 rev2 decision 4 — the escape hatch for the two
              // dismissal paths this component owns directly (see the ref's
              // own doc comment above).
              editGuardRef={editGuardRef}
              // S108 Phase 3d — the Odyssey group's shared half + the four
              // cross-store mutations (see the "Shared filters" block above
              // for why each is its own callback/query pairing). S110 rev2
              // decision 2 also routes ⋮ → Edit Name through
              // `onRenameSharedFilter` for the current user's OWNED shared
              // rows, not just Custom — same callback, wired unchanged.
              sharedFilters={sharedFilters}
              onShareFilter={shareFilter}
              onUnshareFilter={unshareFilter}
              onRenameSharedFilter={renameSharedFilterEntry}
              onDeleteSharedFilters={deleteSharedFiltersEntries}
              // S108 1b: "Save Filters" link opens the modal (below).
              // savedTabSignal
              // is a change-only counter the view watches to flip its OWN
              // `activeTab` to 'saved' once the modal actually saves.
              onOpenSaveModal={openSaveModal}
              savedTabSignal={savedTabSignal}
              // S108 1d: the rename keyboard-trap flag (see `renameActive`
              // above) + this wrapper's own ref, so the view's delete-confirm
              // modal can portal INTO it instead of rendering as a normal
              // descendant (see ShipmentsFiltersView's `modalContainerRef`
              // comment for why — same transform trap as the Save modal).
              onRenameActiveChange={setRenameActive}
              modalContainerRef={wrapperRef}
            />
          )}
        </div>
      )}

      {/* S108 1b: sibling of .shipments-results-panel above, not nested in it
          — see the `saveModalOpen` block near the top of this component for
          why. `barChips` (not the bare `chips`) so the free-text/set query
          badge is included in what gets saved (spec "Behaviour" 1). */}
      {saveModalOpen && (
        <SaveFilterModal
          chips={barChips}
          onSave={handleSaveFilter}
          onClose={() => setSaveModalOpen(false)}
        />
      )}
    </div>
  )
}
