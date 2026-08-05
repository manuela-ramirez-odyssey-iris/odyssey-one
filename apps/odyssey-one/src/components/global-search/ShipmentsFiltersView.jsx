import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Info, Copy } from 'lucide-react'
import {
  GlobalSearchPanel, PillTab, ComboBox, FormField, DatePicker,
  MenuRowRadio, MenuRowCheckbox, ModalMedium, Button, IconButtonGhost,
} from '@odyssey/ui'
import { ICON_MD } from '@odyssey/tokens'
import { GroupLabel, PresetActionsMenu } from '../common/presetChrome.jsx'
import { SHIPMENTS_PROGRESSION } from '../../search/shipments/progression'
import { shipmentsSearchAdapter } from '../../search/shipments'
import { formatDateMDY } from '../../lib/dates'
import { splitFreeText, ODYSSEY_DEFAULT_FILTERS, stripChip, formatChipsForCopy } from './savedFilters'
import { currentUser } from '../../data/sso-mock'

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
 * ISO "from|to"). "Save Filters" opens the real Save Filter modal (S108 1b,
 * `onOpenSaveModal` — hosted in ShipmentsGlobalSearch, not here). The Saved
 * tab (S108 1d) renders the real persisted Custom-group list from the
 * `savedFilters` prop, plus (S108 Phase 2) the shipped ODYSSEY_DEFAULT_FILTERS
 * code constants (savedFilters.js) as a second group, and (S108 Phase 3d) the
 * SHARED filters (`sharedFilters` prop, hosted in ShipmentsGlobalSearch same
 * as everything else) sharing that same Odyssey group.
 *
 * S110 rev2 (docs/superpowers/specs/2026-08-05-filters-two-modes.md) —
 * SUPERSEDES rev1 (2026-08-05-filters-profile-flow.md) on every point below.
 * The All-filters panel now has TWO MODES:
 *   free mode (default)  — the fields ARE the live bar's own criteria,
 *     two-way with the bar (unchanged from pre-rev1 behaviour: opening the
 *     panel seeds `filters` from the committed chips; "Show N results"
 *     commits an edit back to the bar/table).
 *   edit-filter mode      — the fields are a SAVED PROFILE's criteria,
 *     fully DECOUPLED from the bar. Entered only via ⋮ → "Edit Filters" on a
 *     SELECTED Saved-tab row (rev1's row-body-navigates gesture is GONE —
 *     spec item 2, "the row body no longer navigates"; both click zones of
 *     MenuRowRadio now just SELECT, mirroring the column-preset radio rows).
 *     Nothing the user changes in this mode reaches the bar/table until
 *     "Update Filter" is pressed (spec decision 1: that click both PERSISTS
 *     and APPLIES, then returns to the Saved tab with the row still
 *     selected — the one moment the decoupling deliberately ends). Leaving
 *     with unsaved changes (tab switch, panel close, back) warns first via a
 *     ModalMedium confirm (spec decision 4).
 * The All tab is ALWAYS "All" (never renamed to a profile — reverses rev1);
 * its header TITLE becomes "Edit <profile>" instead. Tab order is back to
 * All · Saved (reverses rev1's Saved · All). The Saved tab's own
 * select→count→apply flow (spec 2026-08-04 "Behaviour" 7/8) is UNCHANGED —
 * only how you get to the EDITOR changed.
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

// S108 Phase 3d — the badge slot (MenuRowRadio's `badge` prop) carries
// `by: <username>` on every SHARED row. Custom rows and shipped defaults get
// NO badge — only a shared row has an author to show.
function authorBadge(filter) {
  return `by: ${filter.ownerUsername}`
}

// Drag payload shared by every draggable row in the Saved tab (Custom
// reorder AND the two cross-group share/un-share gestures). `from` tells a
// drop target which store the row came from; `index` is only meaningful for
// a Custom-origin drag (Custom reorder needs a position, Odyssey has none —
// "fixed order").
function readDragPayload(e) {
  try {
    return JSON.parse(e.dataTransfer.getData('text/plain'))
  } catch {
    return null
  }
}

// The inline rename `<input>` — same field, same styling, needed by BOTH the
// Custom group (any row) and the Odyssey group (an OWNED shared row only —
// S110 rev2 decision 2, "the author edits") — factored out once rather than
// duplicated per group.
function RenameInput({ inputRef, value, onChange, onKeyDown, onBlur, ariaLabel }) {
  return (
    <input
      ref={inputRef}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      aria-label={ariaLabel}
      style={{
        background: 'transparent', border: 'none', outline: 'none',
        padding: 0, margin: 0, width: '100%', minWidth: 0,
        color: 'var(--text-secondary)', fontFamily: 'var(--font-primary)',
        fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-sm)',
        fontWeight: 'var(--font-weight-regular)',
      }}
    />
  )
}

// S110 rev2 "Per-row copy icon" (spec item 7, GS-28 — reverses GS-26's "copy
// is a bar-only affordance"). Copies that ROW's OWN chips, never the bar's —
// so applying first is no longer a prerequisite for copying someone else's
// (or your own) saved search. Uses the SAME `formatChipsForCopy` the bar's
// own copy button calls (savedFilters.js) — one formatter, both call sites,
// so the two strings can never drift (spec decision 3).
function RowCopyButton({ filter }) {
  return (
    <IconButtonGhost
      icon={<Copy {...ICON_MD} aria-hidden="true" />}
      ariaLabel={`Copy ${filter.name} filters`}
      onClick={() => navigator.clipboard?.writeText(formatChipsForCopy(filter.chips))}
    />
  )
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
  // the edited filters (FREE MODE ONLY — see S110 rev2 "two modes" doc comment
  // above; edit-filter mode never calls this).
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
  // S108 Phase 3d — the SHARED half of the Odyssey group (hosted in
  // ShipmentsGlobalSearch, same `useQuery`/`setQueryData` pairing as
  // `savedFilters` above; see that file's "Shared filters" block). Each
  // entry carries `ownerId`/`ownerUsername` from the `users` join
  // (sharedFilters.mjs) — ownership gates rename/delete/drag-out below.
  // Default `[]` for the same bare-render reason as `savedFilters` above.
  sharedFilters = [],
  // Custom → Odyssey drag (spec "Behaviour" 4): shares the dragged Custom
  // filter and moves it out of Custom, called with the FULL filter object
  // (id/name/chips) so the host doesn't have to re-look-up what was dragged.
  onShareFilter,
  // Odyssey → Custom drag (spec "Behaviour" 4): un-shares + restores to
  // Custom. Author-only — the view's own drag-doesn't-start guard (below)
  // keeps a non-author's row from ever producing this call in the first
  // place; the host's author check (sharedFilterService) is the backstop.
  onUnshareFilter,
  // ⋮ → Edit Name acting on a selection that's an OWNED shared filter rather
  // than a Custom one (S110 rev2 decision 2: "the author edits" now covers
  // Custom + your own shared rows, not just Custom) — same menu, different
  // persistence call underneath.
  onRenameSharedFilter,
  // ⋮ → Delete Filters batch, for the ids among the selection that are OWNED
  // shared rows (spec "Behaviour" 4's "checkboxes appear only on your own
  // shared rows"). A genuine delete, not an un-share+restore — that's what
  // the drag gesture is for; see `handleConfirmDelete` below.
  onDeleteSharedFilters,
  // S110 rev2 "Edit-filter mode" (decision 1) — Update Filter PERSISTS the
  // editor's merged values onto the OPEN profile. Panel-only by
  // construction: this is the sole call site, and it never fires for a
  // free-mode edit — that's the HARD RULE carried over from rev1, "a profile
  // can be updated only from the panel, never from the bar."
  onUpdateFilter,
  // S110 rev2 decision 1's SECOND half — Update Filter also APPLIES the
  // merged chips to the bar/table (the one moment edit-mode's decoupling
  // ends), but WITHOUT closing the whole search panel — the spec is explicit
  // the user "returns to the Saved tab with the row still selected," not out
  // of the panel entirely. This is why it's a distinct prop from
  // `onApplySaved` below: that one is wired to the host's `handleApplySaved`,
  // which closes the panel (S108 1e, "Show N results" on Saved IS the exit
  // gesture) — reusing it here would close the panel out from under a click
  // that the spec says should land back on Saved, not outside the panel.
  onApplyUpdatedFilter,
  // S108 1e (spec "Behaviour" 8): "Show N results" on the Saved tab applies
  // the SELECTED filter's stored chips wholesale — see this prop's consumer,
  // ShipmentsGlobalSearch's `handleApplySaved`, for why it must be a
  // dedicated callback and not `onApplyFilters`. UNCHANGED by S110 rev2 —
  // only how you reach the EDITOR changed, not how the Saved tab applies.
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
  // S110 rev2 decision 4 — a ref the host reads on every panel-dismissal
  // path IT owns directly (outside-click, Escape — neither routes through
  // this component's own onClose/onBack props). This view assigns its
  // `attemptLeaveEditMode` guard to it on every render, so the host can run
  // `(editGuardRef.current ?? ((fn) => fn()))(actualCloseAction)` instead of
  // closing unconditionally — the ONE bridge needed to cover "any exit"
  // (spec decision 4) rather than only the in-panel Back/Close/tab buttons.
  editGuardRef,
  // The host's `wrapperRef` (spec "Hosting" defect 1) — the delete-confirm
  // and discard-confirm ModalMediums portal INTO it rather than rendering as
  // a normal descendant. This component always renders inside
  // `.shipments-results-panel`, which has `transform: translateX(-50%)`
  // (components.css) and becomes the containing block for any
  // `position: fixed` descendant, sizing the modal's overlay to the 720px
  // panel instead of the viewport — the exact defect the spec documents for
  // the Save modal. Portaling straight to `document.body` would dodge THAT
  // trap but land in a second one: the host's outside-click listener tests
  // `wrapperRef.current.contains(e.target)` on raw DOM position, and a
  // `document.body` portal sits outside that subtree, so a click on
  // Cancel/Delete/Discard would read as an outside click and close the whole
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
  // Tab count is MODE-DEPENDENT (S110 rev2 spec item 1: "free mode counts the
  // live filter fields in use; edit-filter mode counts the fields belonging
  // to the profile being edited"). Both modes render through the SAME
  // `filters` state — free mode seeds it from the bar's chips, edit mode
  // seeds it from the profile's (see `handleEditFilters` below) — so one
  // count expression naturally serves both without a mode branch.
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
  // Single select, ACROSS both zones of a row (S110 rev2 spec item 2: "both
  // the radio AND the row body now select the row" — the row body no longer
  // navigates anywhere; MenuRowRadio's `onSelect`/`onNavigate` are wired to
  // the SAME handler below). Selecting does NOT apply — it COUNTS (spec
  // "Behaviour" 7, the effect right below).
  const [selectedFilterId, setSelectedFilterId] = useState(null)
  const selectFilter = (id) => setSelectedFilterId(id)

  // `editingFilterId` — which profile (if any) is open in EDIT-FILTER MODE
  // (S110 rev2 "The model" + item 4). Set only by ⋮ → "Edit Filters" acting
  // on the current SELECTION (`handleEditFilters` below); replaces rev1's
  // `openProfileId`, which the (now-deleted) row-body-navigate gesture used
  // to set directly. `editingFilter` is derived, not stored, so it always
  // reflects the LATEST chips for that id (e.g. right after Update Filter
  // persists and the host round-trips fresh props).
  const [editingFilterId, setEditingFilterId] = useState(null)

  // Selection → count (spec "Behaviour" 7). Debounced + cancelled on rapid
  // re-selection: a NEW `selectedFilterId` tears down the previous effect
  // run FIRST (React's cleanup-before-next-effect ordering), which either
  // clears a still-pending debounce timer or — if the request already went
  // out — flips `cancelled` so its `.then` becomes a no-op; the in-flight
  // response can't land after a newer selection's count already did.
  // S108 Phase 2/3d: selection is single-select ACROSS all three sources
  // (Custom, Odyssey defaults, shared) — one `selectedFilterId`/count/apply
  // machinery for the whole Saved tab.
  const allSavedFilters = [...savedFilters, ...ODYSSEY_DEFAULT_FILTERS, ...sharedFilters]
  const editingFilter = allSavedFilters.find((f) => f.id === editingFilterId) || null
  // Shared filters this session's user authored (spec "Behaviour" 5: "the
  // author edits, everyone applies") — same spoofable-until-SSO identity
  // check as the API/service layer (sharedFilters.mjs header), just on the
  // client for gating which affordances even render.
  const ownedSharedFilters = sharedFilters.filter((f) => f.ownerId === currentUser.id)
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

  // Inline rename (⋮ → Edit Name, S110 rev2 decision 2). Only one row renames
  // at a time; `renameInputRef` focuses + selects it once, on ENTRY only
  // (effect keyed to `renamingId`, not `renameValue` — keying on the value
  // too would re-select the whole field after every keystroke and fight typing).
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  // Which STORE the renaming row lives in — decides whether `commitRename`
  // calls `onRenameFilter` (Custom) or `onRenameSharedFilter` (owned shared).
  // Set once, at entry (`handleEditName`), same lifecycle as `renamingId`.
  const [renamingIsShared, setRenamingIsShared] = useState(false)
  const renameInputRef = useRef(null)
  useEffect(() => {
    if (renamingId) { renameInputRef.current?.focus(); renameInputRef.current?.select() }
  }, [renamingId])

  // The row Edit Name acts on: the SELECTED row, if (and only if) it's one
  // the current user can actually rename — a Custom filter (all of them, no
  // author concept) OR an OWNED shared filter (S110 rev2 decision 2: "Edit
  // Name covers Custom rows AND the author's own shared rows" — this REVISES
  // the earlier same-day "Custom-only" ruling the rev1 spec had recorded;
  // decision 2 is explicit that ruling was aimed at the row-body-navigate
  // fallback that no longer exists, not at shared ownership). An Odyssey
  // default or someone else's shared row is never a target.
  //
  // Deliberately NOT falling back to the profile open in the editor tab —
  // opening a profile (⋮ → Edit Filters) is a read/edit-its-VALUES gesture;
  // selecting it is the act that names a RENAME target. The two are kept
  // separate on purpose (same reasoning rev1 recorded for its own version of
  // this guard).
  const renameTargetId = (
    savedFilters.some((f) => f.id === selectedFilterId) ||
    ownedSharedFilters.some((f) => f.id === selectedFilterId)
  ) ? selectedFilterId : null

  const handleEditName = () => {
    const customTarget = savedFilters.find((f) => f.id === renameTargetId)
    const sharedTarget = customTarget ? null : ownedSharedFilters.find((f) => f.id === renameTargetId)
    const target = customTarget || sharedTarget
    if (!target) return // menu option is disabled in this case; belt + suspenders
    setRenameValue(target.name)
    setRenamingId(target.id)
    setRenamingIsShared(!!sharedTarget)
    onRenameActiveChange?.(true)
  }
  // Idempotent (checked against `renamingId`, not a separate "did we already
  // act" flag) — Escape can fire its own cancel and then a blur commit can
  // still land on the same input as it unmounts; the second call is a no-op.
  const commitRename = () => {
    if (!renamingId) return
    const name = renameValue.trim()
    if (name) {
      if (renamingIsShared) onRenameSharedFilter?.(renamingId, name)
      else onRenameFilter?.(renamingId, name)
    }
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
    // S108 Phase 3d — the batch may mix Custom ids and OWNED-shared ids (the
    // Odyssey group's checkboxes only ever render for those, see the render
    // block below), so split and route to the two stores' own delete calls.
    // This is a genuine delete for a shared row, not un-share+restore — that
    // pairing is the drag gesture's job (`onUnshareFilter`), a deliberately
    // different, less-final action.
    const ids = [...deleteSelection]
    const customIds = ids.filter((id) => savedFilters.some((f) => f.id === id))
    const sharedIds = ids.filter((id) => ownedSharedFilters.some((f) => f.id === id))
    if (customIds.length) onDeleteFilters?.(customIds)
    if (sharedIds.length) onDeleteSharedFilters?.(sharedIds)
    if (selectedFilterId && deleteSelection.has(selectedFilterId)) setSelectedFilterId(null)
    // The deleted profile can't stay "open" in the editor.
    if (editingFilterId && deleteSelection.has(editingFilterId)) setEditingFilterId(null)
    setShowDeleteConfirm(false)
    handleExitDeleteMode()
  }

  // ── S110 rev2 drag rebuild ────────────────────────────────────────────────
  // Task instruction: "REBUILD the cross-group drag from scratch" — the old
  // row/list-mixed wiring survived two code-reading passes and never worked
  // in a real browser, so this is a rewrite, not a patch. Two things a
  // working native HTML5 drag needs that are easy to under-wire:
  //   1. `dragenter` needs its OWN `preventDefault`, not just `dragover` —
  //      some browsers decide whether an element is a valid drop target off
  //      `dragenter` first; a dragover-only guard can leave it refused
  //      before dragover ever gets a say.
  //   2. EVERY element the pointer can be over mid-drag — the list container
  //      AND every row inside it — gets its OWN dragenter/dragover pair
  //      (`acceptDrag` below), not just the container. A single list-level
  //      listener is relying on the browser to keep bubbling the event
  //      through untouched; putting the pair on every row removes that
  //      dependency entirely instead of trusting it.
  // Drop targets are GROUPS, not rows (spec item 8) — `dragOverGroup` is the
  // ONE visible affordance (a dashed outline on the whole target list), so
  // the user always sees which CONTAINER a drop lands in, never a row-sized
  // target that misleadingly reads as "this specific row." Reorder-by-drag
  // (Custom-only) is the one exception with a row-level drop target, because
  // a reorder genuinely needs a row-sized "insert before here" position.
  const [dragOverGroup, setDragOverGroup] = useState(null) // 'custom' | 'odyssey' | null
  const [dragOverIndex, setDragOverIndex] = useState(null) // Custom-only reorder marker

  function startDrag(e, payload) {
    e.dataTransfer.setData('text/plain', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'move'
  }

  // Spread onto every element a drag can cross (group containers AND every
  // row) — see point 1/2 above. Never sets any state; the group-level
  // affordance below layers ADDITIONAL handling of the same events on top of
  // this, it doesn't replace it.
  const acceptDrag = {
    onDragEnter: (e) => e.preventDefault(),
    onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' },
  }

  // A group's list-container props: `acceptDrag`'s pair (so the container
  // itself is always a valid target even with no rows under the pointer —
  // e.g. an empty Custom list), the visible-affordance toggle, and the real
  // onDrop logic. `onDragLeave` only clears the affordance once the pointer
  // has genuinely left the container — `relatedTarget` is the element the
  // pointer is entering; if the container still contains it, this was a hop
  // between two of its own children, not an exit (the classic DnD
  // dragleave-flicker fix).
  function groupDropProps(groupKey, onDropPayload) {
    return {
      onDragEnter: (e) => { e.preventDefault(); setDragOverGroup(groupKey) },
      onDragOver: acceptDrag.onDragOver,
      onDragLeave: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setDragOverGroup((g) => (g === groupKey ? null : g))
        }
      },
      onDrop: (e) => {
        e.preventDefault()
        setDragOverGroup(null)
        setDragOverIndex(null)
        const payload = readDragPayload(e)
        if (payload) onDropPayload(payload)
      },
    }
  }
  // A Custom row's own drop target — reorder (Custom-origin) or un-share
  // (shared-origin dropped directly on a row instead of empty list space).
  // `stopPropagation` claims the drop so the Custom LIST's own onDrop (below)
  // doesn't also fire for the same native event.
  function customRowDropProps(toIndex) {
    return {
      onDragEnter: (e) => { e.preventDefault(); setDragOverGroup('custom'); setDragOverIndex(toIndex) },
      onDragOver: acceptDrag.onDragOver,
      onDrop: (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOverGroup(null)
        setDragOverIndex(null)
        const payload = readDragPayload(e)
        if (!payload) return
        if (payload.from === 'custom') {
          if (payload.index !== toIndex) onReorderFilters?.(payload.index, toIndex)
        } else if (payload.from === 'shared') {
          const filter = ownedSharedFilters.find((f) => f.id === payload.id)
          if (filter) onUnshareFilter?.(filter)
        }
      },
    }
  }
  // Odyssey → Custom (un-share): dropped ANYWHERE in the Custom list/rows —
  // position is meaningless here. Author-only in practice: a non-author's
  // row never starts this drag (its `draggable` is never set — see the
  // Odyssey row render below), so this payload can only ever name an OWNED
  // shared filter; `ownedSharedFilters.find` is belt + suspenders.
  const handleCustomDrop = (payload) => {
    if (payload.from !== 'shared') return
    const filter = ownedSharedFilters.find((f) => f.id === payload.id)
    if (filter) onUnshareFilter?.(filter)
  }
  // Custom → Odyssey (share): dropped ANYWHERE in the Odyssey list/rows — no
  // per-row target at all (fixed order, "nobody drags inside it"), so a
  // reorder attempt WITHIN Odyssey (shared-origin payload landing here) is a
  // no-op by construction, not a separate check.
  const handleOdysseyDrop = (payload) => {
    if (payload.from !== 'custom') return
    const filter = savedFilters.find((f) => f.id === payload.id)
    if (filter) onShareFilter?.(filter)
  }

  const savedMenuOptions = [
    // S110 rev2 item 3 — new: enters edit-filter mode on the SELECTED row.
    // Enabled for ANY selection (Custom, default, or shared) — "you can look
    // at it, and use it as a starting point," same allowance rev1 granted
    // for opening a profile; only `Update Filter` itself is barred for a
    // default/shared profile (see `isOdysseyDefaultOpen`/`isSharedOpen` and
    // `editorDirty` below).
    { label: 'Edit Filters', onSelect: () => handleEditFilters(), disabled: !selectedFilterId },
    // Enabled for a selection the current user OWNS — a Custom filter (all
    // of them, no author concept) or an OWNED shared filter (S110 rev2
    // decision 2). An Odyssey default or someone else's shared row is never
    // editable — `handleEditName`'s own guard already no-ops for either,
    // this is belt + suspenders that also keeps the ⋮ item's disabled state honest.
    { label: 'Edit Name', onSelect: handleEditName, disabled: !renameTargetId },
    { label: 'Delete Filters', onSelect: handleEnterDeleteMode },
  ]

  const inSavedDeleteMode = activeTab === 'saved' && deleteMode
  const savedTabActive = activeTab === 'saved' && !inSavedDeleteMode
  const savedFilterSelected = allSavedFilters.find((f) => f.id === selectedFilterId) || null
  // S110 rev2 "The model" — the two ALL-tab sub-modes. `editModeActive` is
  // the decoupled one (spec item 4); `freeModeActive` is "what exists
  // today" (spec item 5), two-way with the bar.
  const editModeActive = activeTab === 'all' && !!editingFilter && !inSavedDeleteMode
  const freeModeActive = activeTab === 'all' && !editingFilter && !inSavedDeleteMode

  // S110 rev2 "Odyssey defaults stay uneditable" (carried over from rev1,
  // same rule as no ⋮/no grip/not deletable) — Update Filter must NEVER
  // appear for one, even though opening it in the editor is allowed.
  const isOdysseyDefaultOpen = !!editingFilter && ODYSSEY_DEFAULT_FILTERS.some((f) => f.id === editingFilter.id)
  // S108 Phase 3d — Update Filter is suppressed for EVERY shared row, owned
  // or not: `shared_filters` only exposes rename (PATCH name) and delete
  // (DELETE), never "update chips" — see savedFilters.js's Data model. To
  // change what a shared filter searches for: un-share it (drag Odyssey →
  // Custom), edit it as a Custom profile (Update Filter works there), then
  // re-share.
  const isSharedOpen = !!editingFilter && sharedFilters.some((f) => f.id === editingFilter.id)
  // Dirty = the editor's current values, merged back onto the OPEN PROFILE's
  // own stored chips (not the bar's — that's the point of the decoupling),
  // differ from the profile as stored. Reuses the exact field list
  // `chipsSearchKey` (useGlobalSearch.js) strips before comparing —
  // `stripChip`, exported by savedFilters.js — instead of a new deep-equal.
  const editorDirty = !!editingFilter && !isOdysseyDefaultOpen && !isSharedOpen &&
    JSON.stringify(mergeFiltersIntoChips(editingFilter.chips, filters).map(stripChip)) !==
      JSON.stringify(editingFilter.chips.map(stripChip))
  // Whether the open profile is one Update Filter can ever act on at all.
  // Gates the PRIMARY button's label, not just its disabled state — an
  // uneditable profile must never show "Update Filter" (disabled OR not),
  // same precedent as no ⋮/no grip/not deletable elsewhere for these rows;
  // `editorDirty` above already structurally can't be true for either case,
  // this just keeps the BUTTON TEXT honest about it too.
  const showUpdatePrimary = editModeActive && !isOdysseyDefaultOpen && !isSharedOpen

  // S110 rev2 decision 1 — Update Filter PERSISTS the merged chips AND
  // APPLIES them to the bar/table (via the dedicated `onApplyUpdatedFilter`,
  // NOT `onApplySaved` — see that prop's own comment for why), then returns
  // to the Saved tab with the SAME row still selected (`selectedFilterId` is
  // untouched — it was already this profile's id, since Edit Filters only
  // ever acts on the current selection).
  const handleUpdateFilter = () => {
    if (!editingFilter || isOdysseyDefaultOpen || isSharedOpen) return // belt + suspenders — the button is hidden for all three already
    const merged = mergeFiltersIntoChips(editingFilter.chips, filters)
    onUpdateFilter?.(editingFilter.id, merged)
    onApplyUpdatedFilter?.(merged)
    setEditingFilterId(null)
    setActiveTab('saved')
  }

  // ⋮ → Edit Filters (S110 rev2 item 3/4): loads the SELECTED row's stored
  // chips into the editor and switches to the (always-"All") tab. Whatever
  // free-mode criteria were in `filters` before are overwritten — that's
  // fine, they're recoverable (`exitEditMode` below rebuilds them fresh from
  // the live `chips` prop on the way back out, since free mode always
  // mirrors the bar rather than remembering its own history).
  const handleEditFilters = () => {
    const target = allSavedFilters.find((f) => f.id === selectedFilterId)
    if (!target) return // menu option is disabled without a selection; belt + suspenders
    setFilters(chipsToFilters(target.chips))
    setEditingFilterId(target.id)
    setActiveTab('all')
  }

  // Returns to free mode: clears the open profile and rebuilds `filters`
  // from the CURRENT bar chips (not whatever was cached before Edit Filters
  // ran) — free mode always mirrors the live bar, never a stale snapshot.
  const exitEditMode = () => {
    setEditingFilterId(null)
    setFilters(chipsToFilters(chips))
  }

  // S110 rev2 decision 4 — "leaving edit-filter mode with unsaved changes
  // WARNS first... on any exit that would lose them (tab switch, panel
  // close, selecting another profile)." Every exit path below funnels
  // through this one gate: if not editing (or editing but clean), the exit
  // just happens; if editing AND dirty, `after` is deferred behind a
  // ModalMedium confirm (`discardPending`) instead of running immediately.
  const [discardPending, setDiscardPending] = useState(null) // { after: () => void } | null
  const attemptLeaveEditMode = (after) => {
    if (!editingFilter) { after(); return }
    if (editorDirty) { setDiscardPending({ after }); return }
    exitEditMode()
    after()
  }
  const handleConfirmDiscard = () => {
    const pending = discardPending
    exitEditMode()
    setDiscardPending(null)
    pending?.after()
  }
  const handleCancelDiscard = () => setDiscardPending(null)

  // Bridges the guard out to the host (see `editGuardRef`'s own doc comment
  // above) for the two dismissal paths the host owns directly and never
  // routes through `onBack`/`onClose` below: outside-click and Escape.
  // Reassigned every render (cheap — a ref write) so it always closes over
  // the LATEST `editingFilter`/`editorDirty`, not a stale render's.
  useEffect(() => {
    if (!editGuardRef) return
    editGuardRef.current = attemptLeaveEditMode
    return () => { editGuardRef.current = null }
  })

  const handleTabClick = (key) => {
    if (key === activeTab) return
    attemptLeaveEditMode(() => setActiveTab(key))
  }
  const handleBack = () => attemptLeaveEditMode(() => onBack?.())
  const handleClose = () => attemptLeaveEditMode(() => onClose?.())

  // S110 rev2 item 1 — the All tab is ALWAYS "All" (never renamed to a
  // profile, reversing rev1); tab order is back to All · Saved (reversing
  // rev1's Saved · All). Count semantics: see `activeCount`'s own comment
  // above (free vs. edit-filter mode) and `allSavedFilters.length` for the
  // Saved tab's count (every row the Saved tab actually renders, both groups).
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

  // S110 rev2 decision 4's confirm — "Discard changes to <profile>?" ·
  // Cancel / Discard.
  const discardConfirmModal = discardPending ? (
    <ModalMedium
      title={`Discard changes to ${editingFilter?.name ?? 'this filter'}?`}
      onClose={handleCancelDiscard}
      ariaLabel="Discard changes"
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={handleCancelDiscard}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" onClick={handleConfirmDiscard}>
            Discard
          </Button>
        </>
      }
    >
      <p className="text-label-sm-regular" style={{ margin: 0 }}>
        Your edits haven't been saved — leaving now will lose them.
      </p>
    </ModalMedium>
  ) : null

  // Custom row body — shared by the map below and nothing else, kept local
  // (not hoisted) since it closes over almost every piece of state above.
  const renderCustomRow = (filter, index) => {
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
      <div key={filter.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
        {/* Wrapper carries the real HTML5 DnD attributes — MenuRowRadio
            destructures `draggable` for its own grip icon and never forwards
            it to the DOM (ColumnPanel.jsx selected-columns pattern). Not
            draggable mid-rename: a click-drag to select text inside the
            input would otherwise start a row drag. */}
        <div
          draggable={!isRenaming}
          onDragStart={(e) => startDrag(e, { id: filter.id, index, from: 'custom' })}
          {...customRowDropProps(index)}
          style={{
            flex: 1,
            minWidth: 0,
            borderTop: dragOverIndex === index ? '2px solid var(--border-focus)' : '2px solid transparent',
            transition: 'border-top-color var(--transition-fast)',
          }}
        >
          <MenuRowRadio
            // S110 rev2 item 2 — both click zones select (mirrors the
            // column-preset radio rows); the row body no longer navigates
            // anywhere. `label` takes the inline rename <input> as a
            // ReactNode while renaming this row (`.menu-row__label` is a
            // plain span, happy with either); `onNavigate` is dropped mid-
            // rename so the nav zone's click no-ops instead of stealing
            // focus from the input.
            label={isRenaming ? (
              <RenameInput
                inputRef={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={commitRename}
                ariaLabel={`Rename ${filter.name}`}
              />
            ) : filter.name}
            selected={selectedFilterId === filter.id}
            draggable
            onSelect={() => selectFilter(filter.id)}
            onNavigate={isRenaming ? undefined : () => selectFilter(filter.id)}
          />
        </div>
        {!isRenaming && <RowCopyButton filter={filter} />}
      </div>
    )
  }

  // Odyssey row body — one function for BOTH sub-sets (shared + defaults,
  // S110 rev2 item 6) since the two only differ in `isDefault`-derived bits
  // (badge, draggability, disabled-in-delete-mode).
  const renderOdysseyRow = (filter, isDefault) => {
    const badge = isDefault ? undefined : authorBadge(filter)
    const isOwnedShared = !isDefault && filter.ownerId === currentUser.id
    if (deleteMode) {
      // Only an OWNED shared row swaps to a checkbox (spec "Behaviour" 4:
      // "checkboxes appear only on your own shared rows"); a default or
      // someone else's shared row renders disabled, mirroring ColumnPanel's
      // "Odyssey group renders disabled" (4301:19405).
      if (isOwnedShared) {
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
      return (
        <MenuRowRadio
          key={filter.id}
          label={filter.name}
          badge={badge}
          selected={selectedFilterId === filter.id}
          disabled
          onSelect={() => selectFilter(filter.id)}
        />
      )
    }
    const isRenaming = renamingId === filter.id
    return (
      <div key={filter.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
        {/* Only an OWNED shared row is draggable at all: `draggable` is only
            SET (and only `onDragStart` attached) when `isOwnedShared`, so a
            default or someone else's row has no HTML5 drag affordance to
            trigger in the first place — "the drag must not start" is true by
            omission, not a runtime guard inside a handler. Every row (owned
            or not) still gets `acceptDrag` — see the drag-rebuild comment
            above for why every crossable element needs its own pair. */}
        <div
          draggable={isOwnedShared}
          {...(isOwnedShared && { onDragStart: (e) => startDrag(e, { id: filter.id, from: 'shared' }) })}
          {...acceptDrag}
          style={{ flex: 1, minWidth: 0 }}
        >
          <MenuRowRadio
            label={isRenaming ? (
              <RenameInput
                inputRef={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={commitRename}
                ariaLabel={`Rename ${filter.name}`}
              />
            ) : filter.name}
            badge={isRenaming ? undefined : badge}
            selected={selectedFilterId === filter.id}
            onSelect={() => selectFilter(filter.id)}
            onNavigate={isRenaming ? undefined : () => selectFilter(filter.id)}
          />
        </div>
        {!isRenaming && <RowCopyButton filter={filter} />}
      </div>
    )
  }

  return (
    <>
    <GlobalSearchPanel
      className="global-search-panel--filters"
      showHeader
      showBack
      // S110 rev2 item 4 — the HEADER (not the tab, which stays "All") reads
      // "Edit <profile name>" while in edit-filter mode.
      title={editingFilter ? `Edit ${editingFilter.name}` : 'Filters'}
      onBack={handleBack}
      onClose={handleClose}
      // Delete mode (Saved tab only) borrows the SAME baked footer slots
      // GlobalSearchPanel already exposes — Cancel in the lead-secondary slot,
      // "Delete (n)" in the primary slot — rather than adding a bespoke footer
      // (mirrors how ColumnPanel's delete mode reuses RightPanel's existing
      // footer/saveLabel props instead of a second footer implementation).
      //
      // S110 rev2 items 4/5 — free mode: the link is `Save Filters +`
      // (GlobalSearchPanel's own default label + CirclePlus icon, unchanged),
      // shown and — see `onLink` below — disabled when nothing is filled.
      // Edit-filter mode: the link is HIDDEN entirely (you're editing an
      // existing profile, not creating one); the PRIMARY button becomes
      // `Update Filter` instead (no more lead-secondary-slot workaround —
      // rev1 needed one because Update Filter was a secondary link
      // co-existing with the "Show N" primary; rev2 makes it the primary
      // outright, freeing the trail-secondary slot back to its normal
      // "Clear all" job whenever it's shown at all).
      showLink={freeModeActive}
      // Spec 5 — nothing filled means nothing to save, so the link is genuinely
      // DISABLED rather than a live-looking no-op (user ruling 2026-08-05 on the
      // primary button: use the Button's own disabled state, which the design
      // system already defines; `linkDisabled` is the same pass-through).
      linkDisabled={activeCount === 0}
      onLink={onOpenSaveModal}
      showSecondary={inSavedDeleteMode || savedTabActive}
      showTrailSecondary={freeModeActive}
      secondaryLabel={inSavedDeleteMode ? 'Cancel' : 'Clear all'}
      onClear={inSavedDeleteMode ? handleExitDeleteMode : onClearAll}
      count={savedTabActive ? savedFilterCount : resultTotal}
      // `showUpdatePrimary` (not the broader `editModeActive`) gates the
      // TEXT — an uneditable open profile (default/shared, `editModeActive`
      // true but `showUpdatePrimary` false) falls through to the undefined/
      // default label rather than ever reading "Update Filter": see that
      // flag's own comment above for why this must be a label change, not
      // just a disabled state.
      primaryLabel={
        inSavedDeleteMode ? `Delete (${deleteSelection.size})` : showUpdatePrimary ? 'Update Filter' : undefined
      }
      // S110 rev2 decision 1 — inactive until at least one field changes.
      // An uneditable open profile (editModeActive && !showUpdatePrimary)
      // is force-disabled — `editorDirty` is already structurally false for
      // it, this is belt + suspenders now that the label falls through too.
      primaryDisabled={
        inSavedDeleteMode
          ? false
          : editModeActive
            ? !editorDirty
            : savedTabActive && !savedFilterSelected
      }
      // S108 1e (spec "Behaviour" 8): Saved applies the SELECTED filter's
      // stored chips WHOLESALE via the dedicated `onApplySaved` — never
      // `onApplyFilters` (see ShipmentsGlobalSearch's `handleApplySaved` for
      // the chipsToFilters/mergeFiltersIntoChips flattening it dodges).
      // Nothing selected on the Saved tab → the primary is genuinely
      // DISABLED. An uneditable open profile gets NO handler at all — never
      // `onApplyFilters` (that's free mode's job, and calling it here would
      // break the "no bar coupling at all while in this mode" rule).
      onShowResults={
        inSavedDeleteMode
          ? handleDeleteSave
          : showUpdatePrimary
            ? handleUpdateFilter
            : editModeActive
              ? undefined
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
            onClick={() => handleTabClick(tab.key)}
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
              className={
                'shipments-filters__saved-list shipments-filters__saved-list--custom' +
                (dragOverGroup === 'custom' ? ' shipments-filters__saved-list--drag-over' : '')
              }
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}
              {...groupDropProps('custom', handleCustomDrop)}
            >
              {savedFilters.map((filter, index) => renderCustomRow(filter, index))}
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

            {/* ODYSSEY FILTERS: S110 rev2 item 6 — shared user profiles ABOVE a
                visible line separator, shipped defaults (ODYSSEY_DEFAULT_FILTERS,
                code constants, S108 Phase 2) BELOW it — "shared by people" reads
                above "shipped by Odyssey" (reverses the S108 render order, which
                had defaults first). No ⋮ of its own — the Custom group's ⋮ still
                owns Edit Filters/Edit Name/Delete Filters; those actions route by
                ownership (`handleEditFilters`/`handleEditName`/`handleConfirmDelete`
                above), which is why a selected OWNED shared row can still be
                edited/renamed/deleted from that single menu. */}
            <div style={{ marginTop: 'var(--spacing-5)' }}>
              <GroupLabel>Odyssey Filters</GroupLabel>
              <div
                className={
                  'shipments-filters__saved-list shipments-filters__saved-list--odyssey' +
                  (dragOverGroup === 'odyssey' ? ' shipments-filters__saved-list--drag-over' : '')
                }
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}
                {...groupDropProps('odyssey', handleOdysseyDrop)}
              >
                {sharedFilters.map((filter) => renderOdysseyRow(filter, false))}
                {sharedFilters.length > 0 && (
                  <div className="shipments-filters__saved-divider" aria-hidden="true" />
                )}
                {ODYSSEY_DEFAULT_FILTERS.map((filter) => renderOdysseyRow(filter, true))}
              </div>
            </div>
          </div>
        )}
      </div>
    </GlobalSearchPanel>
    {deleteConfirmModal && (modalContainerRef?.current
      ? createPortal(deleteConfirmModal, modalContainerRef.current)
      : deleteConfirmModal)}
    {discardConfirmModal && (modalContainerRef?.current
      ? createPortal(discardConfirmModal, modalContainerRef.current)
      : discardConfirmModal)}
    </>
  )
}
