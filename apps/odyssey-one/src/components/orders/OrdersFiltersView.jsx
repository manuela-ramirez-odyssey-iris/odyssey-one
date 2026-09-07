import { useMemo, useState } from 'react'
import { Badge, ComboBox, DatePicker, Dropdown, FormField, GlobalSearchPanel, PillTab } from '@odyssey/ui'
import {
  ERROR_COUNT_OPERATORS,
  attrsForTab,
  getOrdersAttributeValues,
  locationLabel,
} from '../../search/orders/registry'
import { emptyState, parseErrorCount } from '../../search/orders/toRequest'

/**
 * OrdersFiltersView — the Orders table filter panel.
 *
 * Rendered by OrdersGlobalSearch in the GlobalSearch panel place (beneath the
 * navbar bar), opened by the bar's FilterButton. Fields come from
 * `attrsForTab`, which now returns the SAME field set on every tab (user
 * ruling, 2026-09-04, Ramesh meeting: "merge all filters into one so results
 * are then applied to tabs") — this overrides LINX-10285's note that each of
 * the three tabs specified its own set.
 *
 * Scope is LEAN by decision: fields + Show all results / Clear all.
 * No Saved tab, no shared filters, no edit-profile mode — none of the three
 * stories ask for them, and generalizing Shipments' savedFilters layer per
 * domain is its own piece of work.
 *
 * The panel edits a DRAFT copy and only lifts it on Apply (LINX-10285: "After
 * selecting one or more basic filters ... clicking on 'Apply Filters' will show
 * the filtered table"). Typing into a field must not refetch the grid.
 *
 * Controls are normalized @odyssey/ui components, picked by `attr.control`:
 *   text → plain FormField. Order Number is typed or pasted, not picked
 *     (user ruling, 2026-08-20: "an input field like we have in shipments,
 *     which can be entered from the searchbar or not"). Commas separate
 *     several values, the same IN-list rule Shipments' Order # chip uses.
 *   combobox / location → ComboBox (typeahead, options LAZY-LOADED in pages),
 *     ONE value per field — the pick shows in the field, exactly as in
 *     Shipments (S130 alignment ruling). See `ValueField` for what this
 *     replaced and what it costs.
 *   enum → toggle chips. The AC says "dropdown", but for a fixed 3-7 value set
 *     that's intent, not a widget ruling (and it's the shipped Shipments
 *     pattern for the same shape).
 *   date-range → ONE DatePicker in range mode. The AC describes two calendars
 *     "From" and "To" separated by a hyphen; the normalized range DatePicker
 *     IS that control — a From–To pair in one field.
 *   comparator → operator Dropdown (local fixed list) + integer FormField.
 */

// Enum chips use the DSM's documented Badge toggle (Badge.demo "Toggle (used
// as a selectable filter chip)") — see ShipmentsFiltersView's EnumChips, which
// this mirrors exactly.
function FieldLabel({ label, htmlFor }) {
  return (
    <label className="orders-filters__label text-label-xs-medium" htmlFor={htmlFor}>
      {label}
    </label>
  )
}

// Toggle chips for a short fixed value set (enum controls).
function EnumChips({ attr, value, onChange }) {
  const selected = new Set(value)
  return (
    <div className="orders-filters__chips">
      {attr.values.map((v) => (
        <button
          key={v}
          type="button"
          className="badge-interactive"
          aria-pressed={selected.has(v)}
          onClick={() =>
            onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v])
          }
        >
          <Badge variant="gray">{v}</Badge>
        </button>
      ))}
    </div>
  )
}

/**
 * Lazy typeahead over one value — the same control, and the same one-value-per-
 * field rule, as Shipments' filter panel (S130, user ruling: "make sure orders
 * global search is aligned with the one in shipments"). The pick shows IN the
 * field; picking again replaces it.
 *
 * SUPERSEDES the multi-select this was: LINX-10285 asks for a "multi-select
 * dropdown", and since `@odyssey/ui` has no multi-select ComboBox the multi-ness
 * used to live here as committed chips UNDER the field. That is the thing the
 * ruling removes — the chips read as stray content below the input, and nothing
 * in Shipments looks like it. Filtering on two customers at once is the cost;
 * bringing it back means a real multi-select ComboBox variant (Figma-first
 * /normalize cycle), not chips bolted under this one.
 *
 * The stored value stays an ARRAY that simply never exceeds one entry, so
 * emptyState/toRequestFilters and the request wire format are untouched.
 *
 * NOT `@odyssey/ui`'s MultiSelect, deliberately: it takes a STATIC `options`
 * array with no async loading and renders a two-column selected-items table
 * with headers — right for the bounded Special Services picker it was built
 * for, wrong for lists that must page in. Per the data-source rule
 * (fetch/lazyload → ComboBox, local list → Dropdown/MultiSelect), these are
 * lazyload fields.
 *
 * Options are LAZY: `loadOptions(query, skip)` returns `{ options, total }`, so
 * ComboBox fetches one page on focus/typing and more as the list is scrolled.
 * These lists (customers, locations, users) can run long and are never fully
 * materialised (user ruling, 2026-08-20).
 *
 * ponytail: no free-text commit here — ComboBox forwards neither onBlur nor
 * onKeyDown once typeahead is active (ComboBox.jsx:490,619), so there is no
 * prop to hang it on. These are pick-from-a-list fields, which is why that is
 * acceptable; Order Number, the one people paste, is a plain text field
 * precisely so it never depends on a suggestion round-trip. Consequence of the
 * same gap: text typed and then abandoned (no pick) stays visible until the
 * committed value next changes — upgrade path is a blur resync in ComboBox.
 */
function ValueField({ attr, value, onChange }) {
  // DERIVED, never local state: "Clear all" resets the draft, and a
  // field holding its own copy of the text would keep showing the cleared value
  // (the exact defect Shipments' own Clear all had — S130).
  const committed = value[0] ?? ''
  return (
    <ComboBox
      variant="select"
      placeholder={`Select ${attr.label}`}
      value={attr.control === 'location' ? locationLabel(committed) : committed}
      onSelect={(v) => onChange(v ? [v] : [])}
      // ComboBox only RENDERS the clear-X when `onClear` is passed, but in
      // typeahead mode it routes the click through `onSelect(null)` instead —
      // same unset either way, so this is correct whichever path fires.
      onClear={() => onChange([])}
      loadOptions={(q, skip) => getOrdersAttributeValues(attr, q, skip)}
      emptyMessage="No matching values"
    />
  )
}

// ISO yyyy-mm-dd ⇄ Date, at local midnight. The wire/filter format is ISO; the
// DatePicker speaks Date and displays MM/DD/YYYY (its US default, which is the
// format LINX-10285 and LINX-11663 both specify).
const isoToDate = (iso) => {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return Number.isFinite(y) ? new Date(y, m - 1, d) : null
}
const dateToIso = (d) =>
  d instanceof Date && !Number.isNaN(d.getTime())
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : ''

function DateRangeField({ attr, value, onChange }) {
  return (
    <DatePicker
      mode="range"
      value={{ start: isoToDate(value.from), end: isoToDate(value.to) }}
      onChange={(r) => onChange({ from: dateToIso(r?.start), to: dateToIso(r?.end) })}
    />
  )
}

/**
 * Operator + whole-number value (LINX-11659). The number is validated inline —
 * "whole number only, >=1 & no decimals allowed" — and toRequestFilters drops
 * the pair unless BOTH halves are valid, so a half-filled comparator never
 * silently narrows the table.
 */
function ComparatorField({ attr, value, onChange }) {
  const typed = String(value.value ?? '').trim()
  const invalid = typed !== '' && parseErrorCount(typed) == null
  return (
    <div className="orders-filters__comparator">
      {/* Dropdown has no placeholder prop — it falls back to rendering `value`
          when no option matches, so an unset operator shows "Select" instead of
          a bare chevron. Selection still round-trips real option values. */}
      <Dropdown
        value={value.op || 'Select'}
        options={ERROR_COUNT_OPERATORS}
        onChange={(op) => onChange({ ...value, op })}
      />
      <FormField
        showLabel={false}
        format="integer"
        placeholder={`Enter ${attr.label}`}
        value={value.value}
        error={invalid ? 'Whole number, 1 or greater' : undefined}
        onChange={(e) => onChange({ ...value, value: e.target.value })}
      />
    </div>
  )
}

// Order Number (LINX-10285/11663/11659) — typed or pasted, never picked.
function TextField({ attr, value, onChange }) {
  return (
    <FormField
      showLabel={false}
      placeholder={`Enter ${attr.label}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function renderControl(attr, value, onChange) {
  if (attr.control === 'text') return <TextField attr={attr} value={value} onChange={onChange} />
  if (attr.control === 'enum') return <EnumChips attr={attr} value={value} onChange={onChange} />
  if (attr.control === 'date-range') return <DateRangeField attr={attr} value={value} onChange={onChange} />
  if (attr.control === 'comparator') return <ComparatorField attr={attr} value={value} onChange={onChange} />
  return <ValueField attr={attr} value={value} onChange={onChange} />
}

// Controls that pair into a two-column row when two of them sit next to each
// other: date ranges (a DatePicker caps itself at 284px, so full-width leaves a
// gap — see `.orders-filters__grid-2`), the Origin/Destination locations
// (user ruling, 2026-08-20 — they read as a pair, so they should sit as one),
// and comboboxes, which puts Created By beside Last Edited By in Audit Trail
// (user, 2026-09-07). Customer is the only other combobox and has no combobox
// neighbour, so it stays full-width.
const PAIRABLE = new Set(['date-range', 'location', 'combobox'])

/**
 * Group the field list so a RUN of two consecutive pairable fields of the SAME
 * control renders as one two-column row. Every such run is already adjacent in
 * the AC's own field order, so this never reorders anything.
 */
function groupFields(attrs) {
  const rows = []
  for (const attr of attrs) {
    const prev = rows[rows.length - 1]
    const pairs =
      PAIRABLE.has(attr.control) && prev?.length === 1 && prev[0].control === attr.control &&
      // Never pair ACROSS a section boundary — a two-column row straddling
      // two headings would sit under the wrong one.
      prev[0].group === attr.group
    if (pairs) prev.push(attr)
    else rows.push([attr])
  }
  return rows
}

/**
 * Rows → `[{ group, rows }]`, sections in the order the registry lists them
 * (user, 2026-09-07 — "group order filters like we group in shipments"). The
 * registry owns the names; this only splits on a change of `group`, so adding
 * an attribute there is the whole edit.
 */
function sectionsOf(rows) {
  const sections = []
  for (const row of rows) {
    const group = row[0].group ?? ''
    const last = sections[sections.length - 1]
    if (last?.group === group) last.rows.push(row)
    else sections.push({ group, rows: [row] })
  }
  return sections
}

/** A draft field counts as set when a leaf actually carries something. */
function hasValue(v) {
  if (Array.isArray(v)) return v.length > 0
  if (v && typeof v === 'object') return Object.values(v).some(Boolean)
  return !!v
}

function SectionHeader({ children }) {
  return <div className="orders-filters__section-title text-label-sm-semibold">{children}</div>
}

export default function OrdersFiltersView({ tab, filters, onApply, onClose }) {
  // Draft copy — see the "edits a DRAFT copy" note above. Re-seeded whenever the
  // panel remounts (the host mounts it only while open), so reopening always
  // shows what's currently applied.
  const [draft, setDraft] = useState(() => ({ ...emptyState(tab), ...filters }))
  // All / Saved, the same two pills the Shipments panel carries (user,
  // 2026-09-07). Saved is a PLACEHOLDER here: Orders has no saved-filter
  // store yet (Shipments' lives in savedFilters.js + a user preference), so
  // the tab exists, counts zero, and says so rather than pretending.
  const [activeTab, setActiveTab] = useState('all')
  const sections = useMemo(() => sectionsOf(groupFields(attrsForTab(tab))), [tab])
  const setField = (key, v) => setDraft((d) => ({ ...d, [key]: v }))
  // Counts the fields carrying a value, over the DRAFT so the pill tracks
  // what is being edited. Shipments' one-liner (`filter(Boolean)`) does not
  // port: `emptyState` seeds date-range as `{from:'',to:''}` and comparator as
  // `{op:'',value:''}`, and an empty OBJECT is truthy — every panel would
  // open reading 7. Look at the leaves instead.
  const activeCount = Object.values(draft).filter(hasValue).length
  const tabs = [
    { key: 'all', label: 'All', count: activeCount },
    { key: 'saved', label: 'Saved', count: 0 },
  ]

  const field = (attr) => (
    <div key={attr.key} className="orders-filters__field">
      <FieldLabel label={attr.label} />
      {renderControl(attr, draft[attr.key], (v) => setField(attr.key, v))}
    </div>
  )

  return (
    <GlobalSearchPanel
      className="global-search-panel--filters orders-filters"
      showHeader
      title="Filters"
      onClose={onClose}
      // S130 alignment — same wording as the Shipments panel. "Show all
      // results" carries NO count on purpose: the panel holds an unapplied
      // draft, so any number here would describe the criteria currently on the
      // table, not the ones the button is about to apply (user ruling: "we are
      // not validating how many results for a filter there is").
      secondaryLabel="Clear all"
      onClear={() => setDraft(emptyState(tab))}
      primaryLabel="Show all results"
      onShowResults={() => onApply(draft)}
    >
      <div className="orders-filters__tabs">
        {tabs.map((t) => (
          <PillTab
            key={t.key}
            label={t.label}
            count={t.count}
            selected={activeTab === t.key}
            onClick={() => setActiveTab(t.key)}
          />
        ))}
      </div>

      <div className="orders-filters__body">
        {activeTab === 'saved' ? (
          <p className="orders-filters__empty text-label-sm-regular">Coming soon</p>
        ) : sections.map((section) => (
          <div key={section.group} className="orders-filters__section">
            {section.group && <SectionHeader>{section.group}</SectionHeader>}
            {section.rows.map((row) =>
              row.length === 1 ? field(row[0]) : (
                <div key={row[0].key} className="orders-filters__grid-2">{row.map(field)}</div>
              ),
            )}
          </div>
        ))}
      </div>
    </GlobalSearchPanel>
  )
}
