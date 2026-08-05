import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import {
  GlobalSearchPanel, PillTab, ComboBox, FormField, DatePicker,
  MenuRowRadio, MenuRowCheckbox, ModalMedium, Button,
} from '@odyssey/ui'
import { GroupLabel, PresetActionsMenu } from '../common/presetChrome.jsx'
import { SHIPMENTS_PROGRESSION } from '../../search/shipments/progression'
import { shipmentsSearchAdapter } from '../../search/shipments'
import { formatDateMDY } from '../../lib/dates'
import { splitFreeText, ODYSSEY_DEFAULT_FILTERS, stripChip } from './savedFilters'
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
 * ISO "from|to"). The committed searchbar chips pre-fill the matching
 * controls; "Save Filters" opens the real Save Filter modal (S108 1b,
 * `onOpenSaveModal` — hosted in ShipmentsGlobalSearch, not here). The Saved
 * tab (S108 1d) renders the real persisted Custom-group list from the
 * `savedFilters` prop, plus (S108 Phase 2) the shipped ODYSSEY_DEFAULT_FILTERS
 * code constants (savedFilters.js) as a second, fixed-order, undeletable
 * group. S108 Phase 3d adds the SHARED filters (`sharedFilters` prop, hosted
 * in ShipmentsGlobalSearch same as everything else) into that same Odyssey
 * group, each carrying a `by: <username>` badge — see the "Odyssey Filters"
 * render block below for the ownership rules (spec "Behaviour" 4/5).
 *
 * S110 rev1 (docs/superpowers/specs/2026-08-05-filters-profile-flow.md) —
 * "a saved filter is not a thing you select and apply, it is a search
 * profile you edit." A row's TWO click zones (MenuRowRadio, same split
 * ColumnPanel already uses) now diverge in purpose: the radio only selects
 * (Saved tab's own select→count→apply flow below, unchanged); the row BODY
 * (label/chevron, `onNavigate`) opens the RIGHT tab loaded with that
 * profile's values (`openProfileInEditor`) and renames it to the profile —
 * the tab becomes that profile's editor. The Phase 1 chevron-expand (an
 * inline read-only SearchChip list) is DELETED outright, not migrated: once
 * the right tab holds the same values open and EDITABLE, an inline preview
 * would just show them again in a worse (static, unremovable) form.
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

// S108 Phase 3d — the badge slot (MenuRowRadio's `badge` prop, gate 2 of the
// spec, already shipped) now carries `by: <username>` on every SHARED row
// (spec "Behaviour" 2, task instruction: "replace, don't stack" — the Phase 1
// filter-count placeholder badge that used to live here is gone outright, not
// kept alongside this one). Custom rows and shipped defaults get NO badge —
// only a shared row has an author to show.
function authorBadge(filter) {
  return `by: ${filter.ownerUsername}`
}

// Drag payload shared by every draggable row in the Saved tab (Custom
// reorder AND the two cross-group share/un-share gestures, spec "Behaviour"
// 4). `from` tells a drop target which store the row came from; `index` is
// only meaningful for a Custom-origin drag (Custom reorder needs a position,
// Odyssey has none — "fixed order", spec "Behaviour" 2). JSON over the bare
// index `ColumnPanel.jsx` uses because a single wire format now has to carry
// two different drag intents (reposition vs. move-between-groups).
function readDragPayload(e) {
  try {
    return JSON.parse(e.dataTransfer.getData('text/plain'))
  } catch {
    return null
  }
}

// The inline rename `<input>` — same field, same styling, needed by BOTH the
// Custom group (any row) and the Odyssey group (an OWNED shared row only,
// spec "Behaviour" 5 "the author edits") — factored out once rather than
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
  // than a Custom one (spec "Behaviour" 5: "the author edits" isn't scoped to
  // Custom) — same menu, different persistence call underneath.
  onRenameSharedFilter,
  // ⋮ → Delete Filters batch, for the ids among the selection that are OWNED
  // shared rows (spec "Behaviour" 4's "checkboxes appear only on your own
  // shared rows"). A genuine delete, not an un-share+restore — that's what
  // the drag gesture is for; see `handleConfirmDelete` below.
  onDeleteSharedFilters,
  // S110 rev1 "Footer links" — Update Filter persists the editor's current
  // values onto the OPEN profile (id, chips). Panel-only by construction:
  // this is the sole call site, and it never touches onApplyFilters/
  // onApplySaved — that's the HARD RULE, "a profile can be updated only
  // from the panel, never from the bar," and decision 1, "Update Filter
  // persists only — it does NOT re-apply to the bar/table."
  onUpdateFilter,
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
  // the effect right below) and does NOT navigate (S110 rev1 decision 2: "a
  // different profile open leaves the editor where it is" — selecting and
  // opening-for-edit are deliberately distinct gestures, kept as two
  // separate pieces of state so one can't yank the other).
  const [selectedFilterId, setSelectedFilterId] = useState(null)
  // `openProfileId` — which profile (if any) is loaded into the RIGHT tab's
  // editor (S110 rev1 "Behaviour" 2). Set only by a row-BODY click
  // (`openProfileInEditor`, below); the radio never touches it. Replaces
  // Phase 1's `expandedIds` Set — the chevron-expand is DELETED, not
  // migrated (spec: "we don't need to expand below the row anything since
  // now we have it expanded and editable in the other tab").
  const [openProfileId, setOpenProfileId] = useState(null)
  // S110 rev1 "Behaviour" 2/decision 3 — row-body click loads that profile's
  // stored chips into the editor fields, renames the right tab to it, and
  // lands on it. Whatever was in the editor before is silently discarded
  // (decision 3: "unsaved edits are discarded silently on navigate-away",
  // same as the All tab today) — no confirm dialog.
  const openProfileInEditor = (filter) => {
    setFilters(chipsToFilters(filter.chips))
    setOpenProfileId(filter.id)
    setActiveTab('all')
  }

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
  // lookups search the combined list rather than `savedFilters` alone. Phase
  // 3d adds `sharedFilters` to the same combined list — "anyone can select
  // and apply any shared filter" (spec "Behaviour" 5) needs no extra
  // machinery beyond being IN this list; ownership only gates the
  // rename/delete/drag-out paths below, never selection/apply.
  const allSavedFilters = [...savedFilters, ...ODYSSEY_DEFAULT_FILTERS, ...sharedFilters]
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
    // S108 Phase 3d: "the author edits" (spec "Behaviour" 5) isn't scoped to
    // Custom — the selection may be an OWNED shared row instead. Custom
    // checked first (the common case); `ownedSharedFilters` (not the raw
    // `sharedFilters`) is the guard that keeps this disabled for someone
    // else's shared row, same as `savedMenuOptions`'s disabled check below.
    const target = savedFilters.find((f) => f.id === selectedFilterId) ||
      ownedSharedFilters.find((f) => f.id === selectedFilterId)
    if (!target) return // menu option is disabled with nothing selected/owned; belt + suspenders
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
    // Route by which store the id lives in — `handleEditName` above only
    // ever arms `renamingId` for a Custom filter or an OWNED shared one, so
    // this dispatch is safe without re-checking ownership here. Blank name:
    // treat as cancel, don't persist either way.
    if (name) {
      if (savedFilters.some((f) => f.id === renamingId)) onRenameFilter?.(renamingId, name)
      else onRenameSharedFilter?.(renamingId, name)
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
    // The deleted profile can't stay "open" in the editor — its own tab
    // label (its name) would dangle. Reverts the right tab back to "All".
    if (openProfileId && deleteSelection.has(openProfileId)) setOpenProfileId(null)
    setShowDeleteConfirm(false)
    handleExitDeleteMode()
  }

  // Drag reorder (spec "Behaviour" 2, wrapper-div pattern per ColumnPanel.jsx's
  // selected-columns list — MenuRowRadio destructures `draggable` for its own
  // grip icon and does NOT forward it to the DOM, so the wrapper carries the
  // real HTML5 DnD attributes). S108 Phase 3d reuses the SAME wiring for the
  // two cross-group gestures (spec "Behaviour" 4) rather than adding a
  // library — `readDragPayload` (above) tags every drag with its origin
  // store so a drop target can tell "reposition within Custom" apart from
  // "moved from the other group."
  const [savedDragOverIndex, setSavedDragOverIndex] = useState(null)
  const handleSavedDrop = (e, toIndex) => {
    e.preventDefault()
    setSavedDragOverIndex(null)
    const payload = readDragPayload(e)
    // A Custom-origin drag landing on a Custom row: reorder (unchanged
    // behaviour/wire shape aside from the JSON envelope). A shared-origin
    // drag reaching here is handled by the LIST container's own onDrop
    // below (un-share) — ignore it so the two don't double-fire (this
    // handler doesn't stopPropagation, so the container still sees it).
    if (!payload || payload.from !== 'custom' || payload.index === toIndex) return
    onReorderFilters?.(payload.index, toIndex)
  }
  // Odyssey → Custom (spec "Behaviour" 4, un-share): dropped ANYWHERE in the
  // Custom list — position is meaningless here, there's no "index" to land
  // on, just "is now in Custom." Sits on the LIST container (not each row)
  // so it still works when Custom is empty (no rows to drop onto).
  const handleCustomListDrop = (e) => {
    e.preventDefault()
    const payload = readDragPayload(e)
    if (!payload || payload.from !== 'shared') return
    const filter = ownedSharedFilters.find((f) => f.id === payload.id)
    if (filter) onUnshareFilter?.(filter)
  }
  // Custom → Odyssey (spec "Behaviour" 4, share): same reasoning — the
  // Odyssey group has no per-row drop target at all (fixed order, "nobody
  // drags inside it"), so this lives on the group's list container only.
  const handleOdysseyListDrop = (e) => {
    e.preventDefault()
    const payload = readDragPayload(e)
    if (!payload || payload.from !== 'custom') return
    const filter = savedFilters.find((f) => f.id === payload.id)
    if (filter) onShareFilter?.(filter)
  }

  const savedMenuOptions = [
    // Enabled for a selection the current user OWNS — a Custom filter (all
    // of them, no author concept) or an OWNED shared filter (S108 Phase 3d,
    // spec "Behaviour" 5: "the author edits" isn't scoped to Custom). An
    // Odyssey default or someone else's shared row is never editable —
    // `handleEditName`'s own guard already no-ops for either, this is belt +
    // suspenders that also keeps the ⋮ item's disabled state honest.
    {
      label: 'Edit Name',
      onSelect: handleEditName,
      disabled: !savedFilters.some((f) => f.id === selectedFilterId) &&
        !ownedSharedFilters.some((f) => f.id === selectedFilterId),
    },
    { label: 'Delete Filters', onSelect: handleEnterDeleteMode },
  ]

  const inSavedDeleteMode = activeTab === 'saved' && deleteMode
  // S108 1e — the footer's count/primary action is tab-scoped: All shows the
  // live bar's resultTotal (unchanged); Saved shows the SELECTED filter's own
  // count (the effect above), never resultTotal — mixing the two would show a
  // number that belongs to a different search than the one about to apply.
  const savedTabActive = activeTab === 'saved' && !inSavedDeleteMode
  const savedFilterSelected = allSavedFilters.find((f) => f.id === selectedFilterId) || null
  const editorTabActive = activeTab === 'all' && !inSavedDeleteMode

  // S110 rev1 "Footer links"/"Dirty tracking" — the right tab's OPEN profile
  // (null when it's just the generic All tab) + whether it's an uneditable
  // Odyssey default (spec "Odyssey defaults stay uneditable": Update Filter
  // must never appear for one, same rule as no ⋮/no grip/not deletable).
  const openProfile = allSavedFilters.find((f) => f.id === openProfileId) || null
  const isOdysseyDefaultOpen = !!openProfile && ODYSSEY_DEFAULT_FILTERS.some((f) => f.id === openProfile.id)
  // S108 Phase 3d — Update Filter is suppressed for EVERY shared row, owned
  // or not, not just someone else's. Reason: `shared_filters` only exposes
  // rename (PATCH name) and delete (DELETE) — sharedFilters.mjs has no
  // "update chips" route, by design (the migration/API for this feature is
  // already live and out of scope to extend here). A delete+re-share could
  // fake it, but that's two non-atomic network calls behind one button —
  // if the POST failed after the DELETE succeeded, the row would just be
  // gone. The honest, safe answer: to change what a shared filter searches
  // for, un-share it (drag Odyssey → Custom), edit it as a Custom profile
  // (Update Filter works there), then re-share. This trivially also
  // satisfies "must not let you overwrite someone else's" — it never
  // overwrites anyone's, including your own, from this button.
  const isSharedOpen = !!openProfile && sharedFilters.some((f) => f.id === openProfile.id)
  // Dirty = the editor's current values, merged back onto the OPEN PROFILE's
  // own stored chips (not the bar's — that's the point), differ from the
  // profile as stored. Reuses the exact field list `chipsSearchKey`
  // (useGlobalSearch.js) strips before comparing — `stripChip`, exported by
  // savedFilters.js — instead of a new deep-equal. `mergeFiltersIntoChips` is
  // a no-op for any key whose value hasn't changed (see that function above),
  // so an untouched profile round-trips byte-identical and reads as clean;
  // this is also why it disappears again right after a successful update —
  // `openProfile.chips` becomes what was just persisted, so the next merge
  // is a no-op against itself.
  const editorDirty = !!openProfile && !isOdysseyDefaultOpen && !isSharedOpen &&
    JSON.stringify(mergeFiltersIntoChips(openProfile.chips, filters).map(stripChip)) !==
      JSON.stringify(openProfile.chips.map(stripChip))

  // S110 rev1 "Footer links" — Update Filter PERSISTS ONLY (decision 1: it
  // does NOT re-apply to the bar/table — "Show N results" keeps that job)
  // and is the only call site for `onUpdateFilter`, making the panel the
  // only place a profile can be updated from (the HARD RULE).
  const handleUpdateFilter = () => {
    if (!openProfile || isOdysseyDefaultOpen || isSharedOpen) return // belt + suspenders — the button is hidden for all three already
    onUpdateFilter?.(openProfile.id, mergeFiltersIntoChips(openProfile.chips, filters))
  }

  // Tab count = every ROW the Saved tab actually renders — both groups
  // (S108 Phase 2: adding the Odyssey group without updating this would
  // undercount, the exact "truthful number" the task calls out). Order +
  // naming per S110 rev1 "Tab order and naming": Saved now leads; the right
  // tab reads "All" with no profile open, else the open profile's own name.
  const tabs = [
    { key: 'saved', label: 'Saved', count: allSavedFilters.length },
    { key: 'all', label: openProfile ? openProfile.name : 'All', count: activeCount },
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
      //
      // S110 rev1 "Footer links" — the link renames Save Filters +→ Create
      // New Filter once a profile is open (SAME action, `onOpenSaveModal`;
      // spec is explicit this still saves what's in the BAR, just relabelled
      // so it can't read as "save over the open profile"). GlobalSearchPanel
      // exposes exactly ONE lead-secondary/trail-secondary label+handler pair
      // (packages/ui, not modified here — see task notes), reused at either
      // position; the two are mutually exclusive per tab today (Saved: lead
      // "Clear all", All: trail "Clear all"). Update Filter needs a SECOND,
      // independently-labelled button beside the link — the only slot that
      // can host it without a library change is the lead-secondary one, so
      // while the editor is dirty it takes over that slot as "Update Filter"
      // and the trail "Clear all" is suppressed for as long as that lasts
      // (there's no second secondary slot to keep both). Flagged in the task
      // report, not a silent compromise.
      showLink={editorTabActive}
      linkLabel={openProfile ? 'Create New Filter' : 'Save Filters'}
      onLink={onOpenSaveModal}
      showSecondary={inSavedDeleteMode || savedTabActive || (editorTabActive && editorDirty)}
      showTrailSecondary={editorTabActive && !editorDirty}
      secondaryLabel={inSavedDeleteMode ? 'Cancel' : (editorTabActive && editorDirty ? 'Update Filter' : 'Clear all')}
      onClear={inSavedDeleteMode ? handleExitDeleteMode : (editorTabActive && editorDirty ? handleUpdateFilter : onClearAll)}
      count={savedTabActive ? savedFilterCount : resultTotal}
      primaryLabel={inSavedDeleteMode ? `Delete (${deleteSelection.size})` : undefined}
      // S108 1e (spec "Behaviour" 8): Saved applies the SELECTED filter's
      // stored chips WHOLESALE via the dedicated `onApplySaved` — never
      // `onApplyFilters` (see ShipmentsGlobalSearch's `handleApplySaved` for
      // the chipsToFilters/mergeFiltersIntoChips flattening it dodges).
      // Nothing selected on the Saved tab → the primary is genuinely DISABLED
      // (user ruling 2026-08-05: use the Button's own disabled state, which the
      // design system already defines, rather than leaving a live-looking
      // button that no-ops).
      primaryDisabled={savedTabActive && !inSavedDeleteMode && !savedFilterSelected}
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
              // S108 Phase 3d (spec "Behaviour" 4, un-share) — dropping an
              // OWNED shared row anywhere in this list restores it to
              // Custom. Lives on the LIST, not a row, so it still works when
              // Custom is empty (`handleCustomListDrop` above). A Custom-
              // origin drag bubbling up here from a row's own `onDrop`
              // (reorder, below) is a no-op — that handler only reacts to
              // `from === 'shared'`.
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCustomListDrop}
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
                        text inside the input would otherwise start a row drag.
                        Payload tags this drag `from: 'custom'` + its own `index`
                        (S108 Phase 3d, `readDragPayload`) so a drop target can
                        tell "reposition" (Custom→Custom) apart from "move
                        groups" (Custom→Odyssey, `handleOdysseyListDrop`). */}
                    <div
                      draggable={!isRenaming}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify({ id: filter.id, index, from: 'custom' }))
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
                        // S110 rev1 "Behaviour" 2 — MenuRowRadio's two click
                        // zones now diverge: the radio SELECTS only (stays on
                        // Saved, no navigation); the row body (label/chevron,
                        // `onNavigate`) OPENS this profile in the right tab's
                        // editor. `label` takes the inline rename <input> as a
                        // ReactNode while renaming this row (`.menu-row__label`
                        // is a plain span, happy with either); `onNavigate` is
                        // dropped so the nav zone's click no-ops instead of
                        // swapping the tab out from under the input mid-edit.
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
                        // S108 Phase 3d "replace, don't stack" — Custom rows
                        // never carry a badge (no filter-count placeholder
                        // anymore, no author either — they're not shared).
                        selected={selectedFilterId === filter.id}
                        draggable
                        onSelect={() => setSelectedFilterId(filter.id)}
                        onNavigate={isRenaming ? undefined : () => openProfileInEditor(filter)}
                      />
                    </div>
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

            {/* ODYSSEY FILTERS: the shipped defaults (ODYSSEY_DEFAULT_FILTERS,
                code constants, S108 Phase 2) AND everyone's shared filters
                (S108 Phase 3d, `sharedFilters` prop) — spec "Behaviour" 2's
                "fixed order: defaults first, then shared by created_at."
                Concatenating the two arrays in that order IS the ordering —
                `sharedFilters` already arrives newest-first (the service's
                own `ORDER BY created_at DESC`, mirrored by the mock's
                `.reverse()`), and no drag reorders inside this group, so
                nothing here ever needs to re-sort it.
                No ⋮ of its own — the Custom group's ⋮ still owns Edit
                Name/Delete Filters; its actions route by ownership
                (`handleEditName`/`handleConfirmDelete` above), which is why
                a selected OWNED shared row can still be renamed/deleted from
                that single menu. Select/open-in-editor reuse the SAME state
                as Custom (`selectedFilterId`/`openProfileId`) — one
                selection across every group, applying goes through the
                identical onApplySaved(chips) path (`allSavedFilters` above),
                because spec "Behaviour" 5 is "anyone can select/apply any
                shared filter" — ownership never gates that half. */}
            <div style={{ marginTop: 'var(--spacing-5)' }}>
              <GroupLabel>Odyssey Filters</GroupLabel>
              <div
                className="shipments-filters__saved-list shipments-filters__saved-list--odyssey"
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}
                // S108 Phase 3d (spec "Behaviour" 4, share) — dropping a
                // Custom-origin row anywhere in this list shares it. Lives on
                // the LIST, not a row: the group has no per-row drop target
                // at all (fixed order, "nobody drags inside it" — an
                // Odyssey→Odyssey drag has nowhere to land, satisfying
                // "reorder-drag inside it does nothing" by construction,
                // not by a separate check).
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleOdysseyListDrop}
              >
                {[...ODYSSEY_DEFAULT_FILTERS, ...sharedFilters].map((filter) => {
                  const isDefault = ODYSSEY_DEFAULT_FILTERS.some((d) => d.id === filter.id)
                  // Every SHARED row (owned or not) carries its author badge
                  // (spec "Behaviour" 2) — a shipped default has no author,
                  // so it gets none, same as a Custom row.
                  const badge = isDefault ? undefined : authorBadge(filter)
                  const isOwnedShared = !isDefault && filter.ownerId === currentUser.id
                  // Delete mode: only an OWNED shared row swaps to a
                  // checkbox (spec "Behaviour" 4: "checkboxes appear only on
                  // your own shared rows"); a default or someone else's
                  // shared row renders disabled, mirroring ColumnPanel's
                  // "Odyssey group renders disabled" (4301:19405) — neither
                  // was ever part of the deletable batch.
                  if (deleteMode) {
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
                        onSelect={() => setSelectedFilterId(filter.id)}
                      />
                    )
                  }
                  const isRenaming = renamingId === filter.id
                  return (
                    <div key={filter.id}>
                      {/* S110 rev1 "Behaviour" 2 — opening a default OR any
                          shared filter in the editor IS allowed (you can
                          look at it, use it as a Create New Filter starting
                          point); only Update Filter is barred (above, via
                          `isOdysseyDefaultOpen`/`isSharedOpen`).
                          S108 Phase 3d — only an OWNED shared row is
                          draggable at all: `draggable` is only SET (and only
                          `onDragStart` attached) when `isOwnedShared`, so a
                          default or someone else's row has no HTML5 drag
                          affordance to trigger in the first place — "the
                          drag must not start" is true by omission, not a
                          runtime guard inside a handler. */}
                      <div
                        draggable={isOwnedShared}
                        {...(isOwnedShared && {
                          onDragStart: (e) => {
                            e.dataTransfer.setData('text/plain', JSON.stringify({ id: filter.id, from: 'shared' }))
                            e.dataTransfer.effectAllowed = 'move'
                          },
                        })}
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
                          onSelect={() => setSelectedFilterId(filter.id)}
                          onNavigate={isRenaming ? undefined : () => openProfileInEditor(filter)}
                        />
                      </div>
                    </div>
                  )
                })}
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
