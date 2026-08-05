import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import {
  GlobalSearchPanel, PillTab, ComboBox, FormField, DatePicker,
  MenuRowRadio, MenuRowCheckbox, SearchChip, ModalMedium, Button,
} from '@odyssey/ui'
import { GroupLabel, PresetActionsMenu } from '../common/presetChrome.jsx'
import { SHIPMENTS_PROGRESSION } from '../../search/shipments/progression'
import { shipmentsSearchAdapter } from '../../search/shipments'
import { formatDateMDY } from '../../lib/dates'
import { splitFreeText, ODYSSEY_DEFAULT_FILTERS } from './savedFilters'

/**
 * ShipmentsFiltersView — the Filters *content* of the GlobalSearch overlay.
 *
 * Renders inside the normalized `<GlobalSearchPanel>` shell (same component as the
 * Results state + Figma) — GlobalSearchPanel owns the card, the header (‹ back · Filters ·
 * × close) and the footer (Save Filters link / Clear all / Show N). This component
 * supplies only the content: the All/Saved tabs + the filter controls.
 *
 * Controls are normalized @odyssey/ui components (S107 spec —
 * docs/superpowers/specs/2026-08-03-filters-view-normalized-controls-design.md),
 * chosen by the attribute's `match` type:
 *   letters → ComboBox (typable select) fed by adapter.getAttributeValues
 *             (mock = distinct-value index; live = [] until the values endpoint
 *             exists — free text still commits)
 *   digits/both → FormField
 *   date    → TWO DatePickers per attribute: single ("Pickup Date") + range
 *             ("Pickup Date Range"), mirroring the search bar's plain + Range
 *             chip pairing (user ruling, 2026-08-03)
 *   enum    → multi-select tag chips; value packs as a comma list ("TL,LTL"),
 *             which the chip layer already treats as a GS-12 IN-list — the
 *             chip visual stays app-local pending Efrain's FilterChip master
 *
 * Filter-state keys: `<attr.key>` for every control EXCEPT the date range,
 * which owns `<attr.key>-range` (single date = ISO "YYYY-MM-DD", range =
 * ISO "from|to"). The committed searchbar chips pre-fill the matching
 * controls; "Save Filters" opens the real Save Filter modal (S108 1b,
 * `onOpenSaveModal` — hosted in ShipmentsGlobalSearch, not here). The Saved
 * tab (S108 1d) renders the real persisted Custom-group list from the
 * `savedFilters` prop, plus (S108 Phase 2) the shipped ODYSSEY_DEFAULT_FILTERS
 * code constants (savedFilters.js) as a second, fixed-order, undeletable
 * group; sharing/author badges are Phase 3 (blocked on the migration).
 */

// Saved-tab selection → count debounce (spec "Behaviour" 7): mirrors
// useGlobalSearch's own `debounceMs` default (120) — same rapid-input
// smoothing, just for row selection instead of typing.
const SAVED_COUNT_DEBOUNCE_MS = 150

// ── ISO ⇄ M/D/YYYY ⇄ Date conversions (filters state is ISO) ────────────────
const mdyToIso = (s) => {
  const m = String(s ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : ''
}
const isoToMdy = (s) => {
  const m = String(s ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? formatDateMDY(m[2], m[3], m[1]) : null
}
const isoToDate = (s) => {
  const m = String(s ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null
}
const dateToIso = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''

// Map committed chips → initial filter values. Date chips (Case 12) route by
// their `single` flag: a single-date chip fills `<key>` (one ISO day), a range
// chip fills `<key>-range` ("from|to"). Invalid date chips fill nothing.
export function chipsToFilters(chips) {
  const f = {}
  chips.forEach((c) => {
    if (c.kind === 'date-range') {
      if (c.invalid) return
      const attrKey = c.key.replace(/^date(-range)?-/, '')
      if (c.single) {
        const day = mdyToIso(c.from)
        if (day) f[attrKey] = day
      } else {
        const from = mdyToIso(c.from)
        const to = mdyToIso(c.to)
        if (from || to) f[`${attrKey}-range`] = `${from}|${to}`
      }
    } else if (c.queryValue) {
      f[c.key] = c.queryValue
    }
  })
  return f
}

// ── Outbound direction: filter values → committed chips ─────────────────────
const ATTR_BY_KEY = new Map(
  SHIPMENTS_PROGRESSION.flatMap((g) => g.attributes.map((a) => [a.key, { ...a, group: g.group }])),
)
// A filter key is `<attr.key>` or, for the date-range control, `<attr.key>-range`.
const baseAttrKey = (key) => (key.endsWith('-range') ? key.slice(0, -'-range'.length) : key)
// The filter key a committed chip belongs to (inverse of the above).
const chipFilterKey = (c) => {
  if (c.kind !== 'date-range') return c.key
  const attrKey = c.key.replace(/^date(-range)?-/, '')
  return c.single ? attrKey : `${attrKey}-range`
}

/**
 * Merge edited filter values back into a chip set. Keys PRESENT in `filters`
 * are authoritative for their control (empty value = remove the chip); keys
 * never touched keep their existing chips untouched — which also preserves
 * set/date chip metadata when the value didn't change. Date attributes build
 * `kind: 'date-range'` chips: `<key>` → a single-date chip, `<key>-range` → a
 * range chip (ISO → M/D/YYYY bounds).
 */
export function mergeFiltersIntoChips(chips, filters) {
  const next = [...chips]
  for (const [key, value] of Object.entries(filters)) {
    const isRange = key.endsWith('-range')
    const attr = ATTR_BY_KEY.get(baseAttrKey(key))
    if (!attr || (isRange && attr.match !== 'date')) continue
    const ix = next.findIndex((c) => chipFilterKey(c) === key)
    const existing = ix >= 0 ? next[ix] : null
    if (attr.match === 'date') {
      const base = {
        attrLabel: attr.label, dataKey: attr.dataKey, group: attr.group,
        kind: 'date-range', open: false,
      }
      let chip
      if (isRange) {
        const [fromIso = '', toIso = ''] = String(value || '').split('|')
        const from = isoToMdy(fromIso)
        const to = isoToMdy(toIso)
        if (!from && !to) { if (existing) next.splice(ix, 1); continue }
        const sameFrom = (existing?.from ?? null) === (from ?? null)
        const sameTo = (existing?.to ?? null) === (to ?? null)
        if (existing?.kind === 'date-range' && !existing.single && sameFrom && sameTo) continue
        chip = { ...base, key: `date-range-${baseAttrKey(key)}`, single: false, from, to }
        chip.label = `${attr.label} Range: ${from || ''}-${to || ''}`
      } else {
        const from = isoToMdy(value)
        if (!from) { if (existing) next.splice(ix, 1); continue }
        if (existing?.kind === 'date-range' && existing.single && existing.from === from) continue
        chip = { ...base, key: `date-${key}`, single: true, from, to: null }
        chip.label = `${attr.label}: ${from}`
      }
      if (existing) next[ix] = chip; else next.push(chip)
    } else {
      const v = String(value || '').trim()
      if (!v) { if (existing) next.splice(ix, 1); continue }
      if (existing && existing.queryValue === v) continue
      const chip = {
        key, label: `${attr.label}: ${v}`, attrLabel: attr.label, queryValue: v,
        dataKey: attr.dataKey, group: attr.group, ...(attr.exact && { exact: true }), kind: 'attribute',
      }
      if (existing) next[ix] = chip; else next.push(chip)
    }
  }
  return next
}

function SectionHeader({ children }) {
  return <div className="shipments-filters__section-title text-label-sm-semibold">{children}</div>
}

function FieldLabel({ label, info = false }) {
  return (
    <label className="shipments-filters__label text-label-xs-medium">
      {label}
      {info && <Info size={14} style={{ color: 'var(--text-placeholder)' }} />}
    </label>
  )
}

// Multi-select tag chips (enum attrs). Value packs as a comma list in catalog
// order — the chip layer reads it as a GS-12 IN-list. App-local visual pending
// Efrain's FilterChip master.
function EnumChips({ attr, value, onChange }) {
  const selected = new Set(value ? value.split(',') : [])
  const toggle = (v) => {
    if (selected.has(v)) selected.delete(v)
    else selected.add(v)
    onChange(attr.values.filter((x) => selected.has(x)).join(','))
  }
  return (
    <div className="shipments-filters__chips">
      {attr.values.map((v) => (
        <button
          key={v}
          type="button"
          className={`shipments-filters__chip text-label-xs-medium${selected.has(v) ? ' is-selected' : ''}`}
          aria-pressed={selected.has(v)}
          onClick={() => toggle(v)}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

// letters attrs — typable select; suggestions come from the adapter (mock =
// distinct-value index, live = none — S107 addendum). Free-typed text IS a
// legal filter. Live mode has NO suggestion source (`getAttributeValues` is
// `null`): omit every typeahead prop so the ComboBox falls back to a plain
// field instead of showing the "No matching values" empty panel, which reads
// as "this value doesn't exist" rather than "no suggestions available yet."
function ValueComboBox({ attr, value, onChange }) {
  const hasSuggestions = !!shipmentsSearchAdapter.getAttributeValues
  return (
    <ComboBox
      variant="select"
      placeholder={`Select ${attr.label}`}
      value={value}
      onChange={onChange}
      {...(hasSuggestions && {
        onSelect: (v) => onChange(v || ''),
        loadOptions: (q) => shipmentsSearchAdapter.getAttributeValues(attr.dataKey, q),
        emptyMessage: 'No matching values',
      })}
    />
  )
}

function renderControl(attr, value, onChange) {
  if (attr.match === 'enum') return <EnumChips attr={attr} value={value} onChange={onChange} />
  if (attr.match === 'letters') return <ValueComboBox attr={attr} value={value} onChange={onChange} />
  return (
    <FormField
      showLabel={false}
      placeholder={`Enter ${attr.label}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

// One date attribute renders TWO fields — single + range — mirroring the
// search bar's plain/Range chip pairing. Split into two builders (S107
// addendum) so Schedule & Appointments can lay them out as two PAIRED rows
// (all singles, then all ranges) instead of vertically per attribute.
function dateSingleField(attr, filters, setFilter) {
  return (
    <div key={attr.key} className="shipments-filters__field">
      <FieldLabel label={attr.label} />
      <DatePicker
        value={isoToDate(filters[attr.key])}
        onChange={(d) => setFilter(attr.key, dateToIso(d))}
      />
    </div>
  )
}
function dateRangeField(attr, filters, setFilter) {
  const rangeKey = `${attr.key}-range`
  const [fromIso = '', toIso = ''] = (filters[rangeKey] || '').split('|')
  return (
    <div key={rangeKey} className="shipments-filters__field">
      <FieldLabel label={`${attr.label} Range`} />
      <DatePicker
        mode="range"
        value={{ start: isoToDate(fromIso), end: isoToDate(toIso) }}
        onChange={(r) => {
          const from = dateToIso(r?.start)
          const to = dateToIso(r?.end)
          setFilter(rangeKey, from || to ? `${from}|${to}` : '')
        }}
      />
    </div>
  )
}

// Section-level field, unwrapped from the two-column-pairs special cases below.
function plainField(attr, filters, setFilter) {
  return (
    <div key={attr.key} className="shipments-filters__field">
      <FieldLabel label={attr.label} info={attr.match === 'letters'} />
      {renderControl(attr, filters[attr.key] || '', (v) => setFilter(attr.key, v))}
    </div>
  )
}

// Group body layout (S107 addendum, user ruling 2026-08-03):
//   Schedule & Appointments — singles row (Pickup Date + Delivery Date side
//     by side), then a ranges row (their Range twins side by side).
//   Customers & Parties     — all fields in a two-column grid.
//   everything else         — unchanged single column.
function renderGroupBody(group, filters, setFilter) {
  if (group.group === 'Schedule & Appointments') {
    return (
      <>
        <div className="shipments-filters__grid-2">
          {group.attributes.map((attr) => dateSingleField(attr, filters, setFilter))}
        </div>
        <div className="shipments-filters__grid-2">
          {group.attributes.map((attr) => dateRangeField(attr, filters, setFilter))}
        </div>
      </>
    )
  }
  if (group.group === 'Customers & Parties') {
    return (
      <div className="shipments-filters__grid-2">
        {group.attributes.map((attr) => plainField(attr, filters, setFilter))}
      </div>
    )
  }
  return group.attributes.flatMap((attr) =>
    attr.match === 'date'
      ? [dateSingleField(attr, filters, setFilter), dateRangeField(attr, filters, setFilter)]
      : [plainField(attr, filters, setFilter)],
  )
}

export default function ShipmentsFiltersView({
  chips = [],
  resultTotal = 0,
  onBack,
  onClose,
  onClearAll,
  // Outbound wiring: (filters, { commit, replace }) — "Show N results" commits
  // the edited filters; clicking a Saved profile replaces the bar with it.
  onApplyFilters,
  // S108 1b: opens the real Save Filter modal (hosted in ShipmentsGlobalSearch,
  // not here — see its "Hosting" comment for why). `savedTabSignal` is a
  // change-only counter bumped by the host on every successful save; this view
  // stays mounted while the modal is open (it lives outside the modal's own
  // subtree), so a plain boolean can't distinguish "just saved" from "already
  // open" on remount — the effect below only reacts to it CHANGING.
  onOpenSaveModal,
  savedTabSignal,
  // S108 1d — the persisted Custom-group list + its mutation callbacks
  // (hosted in ShipmentsGlobalSearch; see its "Saved filters" block). Default
  // `[]` so the bare `<ShipmentsFiltersView />` render in ValueComboBox.test.jsx
  // (no QueryClientProvider in that suite — spec "Hosting" defect 4) doesn't
  // crash on `.map`.
  savedFilters = [],
  onRenameFilter,
  onDeleteFilters,
  onReorderFilters,
  // S108 1e (spec "Behaviour" 8): "Show N results" on the Saved tab applies
  // the SELECTED filter's stored chips wholesale — see this prop's consumer,
  // ShipmentsGlobalSearch's `handleApplySaved`, for why it must be a
  // dedicated callback and not `onApplyFilters`.
  onApplySaved,
  // S108 1e (spec "Behaviour" 7): the CUSTOMER-SCOPED adapter built by the
  // host (`ShipmentsGlobalSearch`'s `scopedAdapter`, selected customers'
  // dataIds baked in) — used ONLY for counting a selected saved filter.
  // Defaults to the unscoped module import (below) so this file's own bare
  // renders (this suite, ValueComboBox.test.jsx) keep working without a host;
  // the real app ALWAYS passes the scoped one. Do not swap this default in
  // for the real prop — the unscoped adapter would show a total that
  // disagrees with the table the user lands on after Apply.
  scopedAdapter = shipmentsSearchAdapter,
  // S108 1d keyboard trap (spec "Behaviour" 6): an active inline rename is an
  // INPUT inside the host's wrapper, same trap as the save-modal title field
  // (saveModalOpen, ShipmentsGlobalSearch.jsx). Told to the host so its
  // handleKeyDown can early-return for Enter/Escape the same way.
  onRenameActiveChange,
  // The host's `wrapperRef` (spec "Hosting" defect 1) — the delete-confirm
  // ModalMedium portals INTO it rather than rendering as a normal descendant.
  // This component always renders inside `.shipments-results-panel`, which
  // has `transform: translateX(-50%)` (components.css) and becomes the
  // containing block for any `position: fixed` descendant, sizing the modal's
  // overlay to the 720px panel instead of the viewport — the exact defect the
  // spec documents for the Save modal. Portaling straight to `document.body`
  // would dodge THAT trap but land in a second one: the host's outside-click
  // listener tests `wrapperRef.current.contains(e.target)` on raw DOM
  // position, and a `document.body` portal sits outside that subtree, so a
  // click on Cancel/Delete would read as an outside click and close the whole
  // panel before the button's own onClick ever runs. Portaling into
  // `wrapperRef.current` itself escapes the transform (wrapperRef carries
  // none) while staying inside the contains() check — same node, no new prop
  // needed for the click guard. Optional: falls back to an inline (untransformed
  // for jsdom, harmless) render when no ref is supplied, e.g. this file's own
  // unit tests, which don't have a host wrapper to portal into.
  modalContainerRef,
}) {
  const [activeTab, setActiveTab] = useState('all')
  const [filters, setFilters] = useState(() => chipsToFilters(chips))

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val }))
  const activeCount = Object.values(filters).filter(Boolean).length

  // Guarded with a ref (not a plain `if (savedTabSignal)`) so a FRESH mount
  // that inherits an already-bumped signal (e.g. reopening the panel after an
  // earlier save this session) doesn't force the Saved tab open — only an
  // actual change, while this instance is alive, does.
  const prevSavedTabSignal = useRef(savedTabSignal)
  useEffect(() => {
    if (savedTabSignal !== prevSavedTabSignal.current) {
      prevSavedTabSignal.current = savedTabSignal
      setActiveTab('saved')
    }
  }, [savedTabSignal])

  // ── Saved tab — Custom group (S108 1d) ───────────────────────────────────
  // Single select. Selecting does NOT apply — it COUNTS (spec "Behaviour" 7,
  // the effect right below). Expand is a SEPARATE Set (a row can be expanded
  // without being selected — the chevron/label zone navigates, the radio
  // selects; MenuRowRadio's two-click-zone split, spec "Behaviour" 6).
  const [selectedFilterId, setSelectedFilterId] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const toggleExpand = (id) => setExpandedIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  // Selection → count (spec "Behaviour" 7). Debounced + cancelled on rapid
  // re-selection: a NEW `selectedFilterId` tears down the previous effect
  // run FIRST (React's cleanup-before-next-effect ordering), which either
  // clears a still-pending debounce timer or — if the request already went
  // out — flips `cancelled` so its `.then` becomes a no-op; the in-flight
  // response can't land after a newer selection's count already did.
  // NOTE on `loading`: GlobalSearchPanel accepts one (spec "Behaviour" 7 says
  // to feed it), but its implementation (packages/ui GlobalSearchPanel.jsx)
  // swaps its ENTIRE content slot for a bare Spinner — fine for the Results
  // glimpse (nothing else to interact with while it searches), but wiring it
  // here would hide the Saved list itself (rows, ⋮ menu, expand) for as long
  // as a count is in flight, which directly conflicts with THIS SAME
  // paragraph's "debounce/cancel on rapid selection": a rapid re-selection
  // needs the OTHER rows still clickable while the first one counts. Not
  // wired — flagged in the task report as a packages/ui gap (a component-
  // local loading affordance, not the panel-wide one) rather than shipping a
  // literal reading that breaks re-selection.
  // S108 Phase 2: selection is single-select ACROSS both groups (spec, user
  // ruling "single select" isn't scoped to Custom) — an Odyssey default and a
  // Custom filter share the same `selectedFilterId`/count/apply machinery, so
  // lookups search the combined list rather than `savedFilters` alone.
  const allSavedFilters = [...savedFilters, ...ODYSSEY_DEFAULT_FILTERS]
  const [savedFilterCount, setSavedFilterCount] = useState(0)
  useEffect(() => {
    if (!selectedFilterId) { setSavedFilterCount(0); return }
    const filter = allSavedFilters.find((f) => f.id === selectedFilterId)
    if (!filter || !scopedAdapter?.searchShipments) { setSavedFilterCount(0); return }
    let cancelled = false
    // `filter.chips` may carry a `__free-text__` badge — searchShipments
    // wants it split into its `query` arg, not AND'd in as a chip (see
    // `splitFreeText`'s header for why that would zero the count).
    const { chips: searchChips, freeText } = splitFreeText(filter.chips)
    const t = setTimeout(() => {
      scopedAdapter.searchShipments(searchChips, freeText?.value || '').then(({ total }) => {
        if (cancelled) return
        setSavedFilterCount(total)
      })
    }, SAVED_COUNT_DEBOUNCE_MS)
    return () => { cancelled = true; clearTimeout(t) }
  }, [selectedFilterId, savedFilters, scopedAdapter])

  // Inline rename (⋮ → Edit Name, spec "Behaviour" 3). Only one row renames
  // at a time; `renameInputRef` focuses + selects it once, on ENTRY only
  // (effect keyed to `renamingId`, not `renameValue` — keying on the value
  // too would re-select the whole field after every keystroke and fight typing).
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef(null)
  useEffect(() => {
    if (renamingId) { renameInputRef.current?.focus(); renameInputRef.current?.select() }
  }, [renamingId])

  const handleEditName = () => {
    const target = savedFilters.find((f) => f.id === selectedFilterId)
    if (!target) return // menu option is disabled with nothing selected; belt + suspenders
    setRenameValue(target.name)
    setRenamingId(target.id)
    onRenameActiveChange?.(true)
  }
  // Idempotent (checked against `renamingId`, not a separate "did we already
  // act" flag) — Escape can fire its own cancel and then a blur commit can
  // still land on the same input as it unmounts; the second call is a no-op.
  const commitRename = () => {
    if (!renamingId) return
    const name = renameValue.trim()
    if (name) onRenameFilter?.(renamingId, name) // blank name: treat as cancel, don't persist
    setRenamingId(null)
    onRenameActiveChange?.(false)
  }
  const cancelRename = () => {
    if (!renamingId) return
    setRenamingId(null)
    onRenameActiveChange?.(false)
  }
  const handleRenameKeyDown = (e) => {
    // No stopPropagation — same idiom as the save-modal title field: this
    // event still bubbles to the host's wrapper onKeyDown, which early-returns
    // for as long as `onRenameActiveChange` reports an active rename (the
    // state update above lands before the bubble reaches it in the same tick).
    if (e.key === 'Enter') { e.preventDefault(); commitRename() }
    else if (e.key === 'Escape') { e.preventDefault(); cancelRename() }
  }

  // Batch delete (⋮ → Delete Filters, spec "Behaviour" 3) — mirrors
  // ColumnPanel's delete mode (Figma 4301:19405): radio rows swap for bordered
  // MenuRowCheckbox, footer becomes Cancel / "Delete (n)", confirm via ModalMedium.
  const [deleteMode, setDeleteMode] = useState(false)
  const [deleteSelection, setDeleteSelection] = useState(() => new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const handleEnterDeleteMode = () => {
    cancelRename() // no orphaned rename input once rows become checkboxes
    setDeleteMode(true)
    setDeleteSelection(new Set())
  }
  const handleExitDeleteMode = () => {
    setDeleteMode(false)
    setDeleteSelection(new Set())
  }
  const toggleDeleteSelection = (id) => setDeleteSelection((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const handleDeleteSave = () => {
    if (deleteSelection.size === 0) { handleExitDeleteMode(); return } // nothing selected
    setShowDeleteConfirm(true)
  }
  const handleConfirmDelete = () => {
    onDeleteFilters?.([...deleteSelection])
    if (selectedFilterId && deleteSelection.has(selectedFilterId)) setSelectedFilterId(null)
    setShowDeleteConfirm(false)
    handleExitDeleteMode()
  }

  // Drag reorder (spec "Behaviour" 2, wrapper-div pattern per ColumnPanel.jsx's
  // selected-columns list — MenuRowRadio destructures `draggable` for its own
  // grip icon and does NOT forward it to the DOM, so the wrapper carries the
  // real HTML5 DnD attributes).
  const [savedDragOverIndex, setSavedDragOverIndex] = useState(null)
  const handleSavedDrop = (e, toIndex) => {
    e.preventDefault()
    setSavedDragOverIndex(null)
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (isNaN(fromIndex) || fromIndex === toIndex) return
    onReorderFilters?.(fromIndex, toIndex)
  }

  const savedMenuOptions = [
    // Enabled only for a selection the current user OWNS (Custom group) —
    // Edit Name acts on "the selected filter" (spec), and an Odyssey default
    // is never editable/deletable by anyone (S108 Phase 2). Without this
    // ownership check, selecting a default would show Edit Name as enabled
    // even though `handleEditName`'s own `savedFilters.find` guard already
    // no-ops for it — belt + suspenders, and keeps the ⋮ honest.
    { label: 'Edit Name', onSelect: handleEditName, disabled: !savedFilters.some((f) => f.id === selectedFilterId) },
    { label: 'Delete Filters', onSelect: handleEnterDeleteMode },
  ]

  const inSavedDeleteMode = activeTab === 'saved' && deleteMode
  // S108 1e — the footer's count/primary action is tab-scoped: All shows the
  // live bar's resultTotal (unchanged); Saved shows the SELECTED filter's own
  // count (the effect above), never resultTotal — mixing the two would show a
  // number that belongs to a different search than the one about to apply.
  const savedTabActive = activeTab === 'saved' && !inSavedDeleteMode
  const savedFilterSelected = allSavedFilters.find((f) => f.id === selectedFilterId) || null

  // Tab count = every ROW the Saved tab actually renders — both groups
  // (S108 Phase 2: adding the Odyssey group without updating this would
  // undercount, the exact "truthful number" the task calls out).
  const tabs = [
    { key: 'all', label: 'All', count: activeCount },
    { key: 'saved', label: 'Saved', count: allSavedFilters.length },
  ]

  // Built once (not inline in the JSX below) so both the portal branch and
  // the no-container fallback render the exact same element — see
  // `modalContainerRef` above for why a portal is needed at all.
  const deleteConfirmModal = showDeleteConfirm ? (
    <ModalMedium
      title="Delete filters"
      onClose={() => setShowDeleteConfirm(false)}
      ariaLabel="Delete filters"
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </>
      }
    >
      <p className="text-label-sm-regular" style={{ margin: 0 }}>
        Delete {deleteSelection.size} selected filter{deleteSelection.size === 1 ? '' : 's'}? This can't be undone.
      </p>
    </ModalMedium>
  ) : null

  return (
    <>
    <GlobalSearchPanel
      className="global-search-panel--filters"
      showHeader
      showBack
      title="Filters"
      onBack={onBack}
      onClose={onClose}
      // Delete mode (Saved tab only) borrows the SAME baked footer slots
      // GlobalSearchPanel already exposes — Cancel in the lead-secondary slot,
      // "Delete (n)" in the primary slot — rather than adding a bespoke footer
      // (mirrors how ColumnPanel's delete mode reuses RightPanel's existing
      // footer/saveLabel props instead of a second footer implementation).
      // Outside delete mode this is byte-identical to before (non-goal: leave
      // the "Show N results" footer behaviour exactly as it is, 1e wires it).
      showLink={activeTab === 'all' && !inSavedDeleteMode}
      linkLabel="Save Filters"
      onLink={onOpenSaveModal}
      showSecondary={inSavedDeleteMode ? true : activeTab !== 'all'}
      showTrailSecondary={activeTab === 'all' && !inSavedDeleteMode}
      secondaryLabel={inSavedDeleteMode ? 'Cancel' : 'Clear all'}
      onClear={inSavedDeleteMode ? handleExitDeleteMode : onClearAll}
      count={savedTabActive ? savedFilterCount : resultTotal}
      primaryLabel={inSavedDeleteMode ? `Delete (${deleteSelection.size})` : undefined}
      // S108 1e (spec "Behaviour" 8): Saved applies the SELECTED filter's
      // stored chips WHOLESALE via the dedicated `onApplySaved` — never
      // `onApplyFilters` (see ShipmentsGlobalSearch's `handleApplySaved` for
      // the chipsToFilters/mergeFiltersIntoChips flattening it dodges).
      // Nothing selected → `undefined`: GlobalSearchPanel's primary Button
      // has no `disabled` prop to bind to (packages/ui gap; not modified
      // here per this task's scope), so an unwired handler is the closest
      // functional "disabled" available — the button reads enabled but does
      // nothing on click.
      onShowResults={
        inSavedDeleteMode
          ? handleDeleteSave
          : savedTabActive
            ? (savedFilterSelected ? () => onApplySaved?.(savedFilterSelected.chips) : undefined)
            : () => onApplyFilters?.(filters, { commit: true })
      }
    >
      <div className="shipments-filters__tabs">
        {tabs.map((tab) => (
          <PillTab
            key={tab.key}
            label={tab.label}
            count={tab.count}
            selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </div>

      <div className="shipments-filters__body">
        {activeTab === 'all' ? (
          SHIPMENTS_PROGRESSION.map((group) => (
            <div key={group.group} className="shipments-filters__section">
              <SectionHeader>{group.group}</SectionHeader>
              {renderGroupBody(group, filters, setFilter)}
            </div>
          ))
        ) : (
          <div className="shipments-filters__saved">
            {/* GS-24/Bug1 fix: portal the ⋮ menu into the host's wrapperRef, not
                document.body — see PresetActionsMenu's own comment for why a
                document.body portal races the host's outside-click listener
                and kills every menu item's onClick. Same ref the delete-
                confirm ModalMedium below already portals into. */}
            <GroupLabel action={<PresetActionsMenu options={savedMenuOptions} containerRef={modalContainerRef} />}>
              Custom Filters
            </GroupLabel>
            <div
              className="shipments-filters__saved-list shipments-filters__saved-list--custom"
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}
            >
              {savedFilters.map((filter, index) => {
                // Delete mode: EVERY Custom row swaps radio → bordered
                // Checkbox (batch multi-select), same as ColumnPanel 4301:19405.
                if (deleteMode) {
                  return (
                    <MenuRowCheckbox
                      key={filter.id}
                      label={filter.name}
                      checked={deleteSelection.has(filter.id)}
                      bordered
                      draggable={false}
                      value={filter.id}
                      onToggle={() => toggleDeleteSelection(filter.id)}
                      aria-label={`Select ${filter.name} for deletion`}
                    />
                  )
                }
                const isRenaming = renamingId === filter.id
                return (
                  <div key={filter.id}>
                    {/* Wrapper carries the real HTML5 DnD attributes — MenuRowRadio
                        destructures `draggable` for its own grip icon and never
                        forwards it to the DOM (ColumnPanel.jsx selected-columns
                        pattern). Not draggable mid-rename: a click-drag to select
                        text inside the input would otherwise start a row drag. */}
                    <div
                      draggable={!isRenaming}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(index))
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        setSavedDragOverIndex(index)
                      }}
                      onDragLeave={() => setSavedDragOverIndex(null)}
                      onDrop={(e) => handleSavedDrop(e, index)}
                      style={{
                        borderTop: savedDragOverIndex === index ? '2px solid var(--border-focus)' : '2px solid transparent',
                        transition: 'border-top-color var(--transition-fast)',
                      }}
                    >
                      <MenuRowRadio
                        // Accepted delta (spec "Behaviour" 6): MenuRowRadio's nav
                        // zone is the label AND the chevron, so clicking the name
                        // expands rather than selects — only the radio selects.
                        // `label` takes the inline rename <input> as a ReactNode
                        // while renaming this row (`.menu-row__label` is a plain
                        // span, happy with either); `onNavigate` is dropped so the
                        // nav zone's click no-ops instead of collapsing the row
                        // out from under the input mid-edit.
                        label={isRenaming ? (
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={handleRenameKeyDown}
                            onBlur={commitRename}
                            aria-label={`Rename ${filter.name}`}
                            style={{
                              background: 'transparent', border: 'none', outline: 'none',
                              padding: 0, margin: 0, width: '100%', minWidth: 0,
                              color: 'var(--text-secondary)', fontFamily: 'var(--font-primary)',
                              fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-sm)',
                              fontWeight: 'var(--font-weight-regular)',
                            }}
                          />
                        ) : filter.name}
                        selected={selectedFilterId === filter.id}
                        draggable
                        onSelect={() => setSelectedFilterId(filter.id)}
                        onNavigate={isRenaming ? undefined : () => toggleExpand(filter.id)}
                      />
                    </div>
                    {/* Chevron-expanded chips (spec "Behaviour" 6): read-only
                        SearchChips — `label` as a plain STRING for every chip
                        (no `codes`/date fields, no `onRemove`) so none of them
                        render a chevron/CalendarPicker/document listener, same
                        rule SaveFilterModal follows. */}
                    {expandedIds.has(filter.id) && !isRenaming && (
                      <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-1)',
                        padding: 'var(--spacing-1) var(--spacing-3) var(--spacing-3)',
                      }}>
                        {filter.chips.map((chip) => (
                          <SearchChip key={chip.key} label={chip.label} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {savedFilters.length === 0 && (
                <div style={{
                  display: 'flex', justifyContent: 'center',
                  padding: 'var(--spacing-6) var(--spacing-4)',
                }}>
                  <span style={{
                    fontSize: 'var(--font-size-xs)', lineHeight: 'var(--line-height-xs)',
                    color: 'var(--text-tertiary)', textAlign: 'center',
                  }}>
                    No saved filters yet.
                  </span>
                </div>
              )}
            </div>

            {/* S108 Phase 2 — ODYSSEY FILTERS: shipped defaults, code
                constants (savedFilters.js's ODYSSEY_DEFAULT_FILTERS), neither
                store. No ⋮ (not editable/deletable by anyone), rows carry no
                `draggable` prop (no grip, no wrapper DnD div — fixed order,
                "nobody drags inside it"). Select/expand reuse the SAME state
                as Custom (`selectedFilterId`/`expandedIds`) — one selection
                across both groups, applying goes through the identical
                onApplySaved(chips) path (see `allSavedFilters` above). During
                a Custom delete-mode batch these rows just disable (mirrors
                ColumnPanel's "Odyssey group renders disabled", 4301:19405)
                rather than converting to checkboxes — they were never part
                of the deletable set. */}
            <div style={{ marginTop: 'var(--spacing-5)' }}>
              <GroupLabel>Odyssey Filters</GroupLabel>
              <div
                className="shipments-filters__saved-list shipments-filters__saved-list--odyssey"
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}
              >
                {ODYSSEY_DEFAULT_FILTERS.map((filter) => (
                  <div key={filter.id}>
                    <MenuRowRadio
                      label={filter.name}
                      selected={selectedFilterId === filter.id}
                      disabled={deleteMode}
                      onSelect={() => setSelectedFilterId(filter.id)}
                      onNavigate={deleteMode ? undefined : () => toggleExpand(filter.id)}
                    />
                    {expandedIds.has(filter.id) && (
                      <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-1)',
                        padding: 'var(--spacing-1) var(--spacing-3) var(--spacing-3)',
                      }}>
                        {filter.chips.map((chip) => (
                          <SearchChip key={chip.key} label={chip.label} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </GlobalSearchPanel>
    {deleteConfirmModal && (modalContainerRef?.current
      ? createPortal(deleteConfirmModal, modalContainerRef.current)
      : deleteConfirmModal)}
    </>
  )
}
