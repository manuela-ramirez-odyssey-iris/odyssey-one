import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { ComboBox, DatePicker, Dropdown, FormField, GlobalSearchPanel } from '@odyssey/ui'
import {
  ERROR_COUNT_OPERATORS,
  attrsForTab,
  getOrdersAttributeValues,
} from '../../search/orders/registry'
import { emptyState, parseErrorCount } from '../../search/orders/toRequest'

/**
 * OrdersFiltersView — the Orders table filter panel.
 *
 * Rendered by OrdersGlobalSearch in the GlobalSearch panel place (beneath the
 * navbar bar), opened by either of two triggers — the bar's FilterButton or the
 * table toolbar's Filters button. Fields come from `attrsForTab`: each of the
 * three tabs specifies its OWN set, which LINX-10285's note settles as
 * intentional, not an oversight.
 *
 * Scope is LEAN by decision: fields + Apply All Filters / Clear All Filters.
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
 *   combobox / location → ComboBox (typeahead, options LAZY-LOADED in pages)
 *     + committed-value chips. The AC's "search bar with multi-select
 *     dropdown" — @odyssey/ui has no multi-select ComboBox variant, and adding
 *     one is a Figma-first /normalize cycle, so the multi-ness lives here as
 *     chips over the single-select ComboBox.
 *   enum → toggle chips. The AC says "dropdown", but for a fixed 3-7 value set
 *     that's intent, not a widget ruling (and it's the shipped Shipments
 *     pattern for the same shape).
 *   date-range → ONE DatePicker in range mode. The AC describes two calendars
 *     "From" and "To" separated by a hyphen; the normalized range DatePicker
 *     IS that control — a From–To pair in one field.
 *   comparator → operator Dropdown (local fixed list) + integer FormField.
 */

// App-local chip visuals, same as ShipmentsFiltersView's — pending Efrain's
// FilterChip master. Styles are shared selectors in components.css, not a copy.
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
          className={`orders-filters__chip text-label-xs-medium${selected.has(v) ? ' is-selected' : ''}`}
          aria-pressed={selected.has(v)}
          onClick={() =>
            onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v])
          }
        >
          {v}
        </button>
      ))}
    </div>
  )
}

/**
 * Typeahead + committed chips. Selecting appends and clears the input, so the
 * field is always ready for the next value; each chip removes itself.
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
 * precisely so it never depends on a suggestion round-trip.
 */
function MultiValueField({ attr, value, onChange }) {
  const [text, setText] = useState('')
  // Location options carry a display label distinct from their "City|State|Country"
  // value, so chips need the label to render — remembered as picked.
  const [labels, setLabels] = useState({})

  const add = (v, label) => {
    setText('')
    if (!v || value.includes(v)) return
    if (label && label !== v) setLabels((m) => ({ ...m, [v]: label }))
    onChange([...value, v])
  }

  return (
    <>
      <ComboBox
        variant="select"
        placeholder={`Select ${attr.label}`}
        value={text}
        onChange={setText}
        onSelect={(v, option) => add(v, option?.label)}
        loadOptions={(q, skip) => getOrdersAttributeValues(attr, q, skip)}
        emptyMessage="No matching values"
      />
      {value.length > 0 && (
        <div className="orders-filters__chips" role="list">
          {value.map((v) => (
            <span key={v} role="listitem" className="orders-filters__chip is-selected text-label-xs-medium">
              {labels[v] ?? v}
              <button
                type="button"
                className="orders-filters__chip-x"
                aria-label={`Remove ${labels[v] ?? v}`}
                onClick={() => onChange(value.filter((x) => x !== v))}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </>
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
  return <MultiValueField attr={attr} value={value} onChange={onChange} />
}

// Controls that pair into a two-column row when two of them sit next to each
// other: date ranges (a DatePicker caps itself at 284px, so full-width leaves a
// gap — see `.orders-filters__grid-2`) and the Origin/Destination locations
// (user ruling, 2026-08-20 — they read as a pair, so they should sit as one).
const PAIRABLE = new Set(['date-range', 'location'])

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
      PAIRABLE.has(attr.control) && prev?.length === 1 && prev[0].control === attr.control
    if (pairs) prev.push(attr)
    else rows.push([attr])
  }
  return rows
}

export default function OrdersFiltersView({ tab, filters, onApply, onClose }) {
  // Draft copy — see the "edits a DRAFT copy" note above. Re-seeded whenever the
  // panel remounts (the host mounts it only while open), so reopening always
  // shows what's currently applied.
  const [draft, setDraft] = useState(() => ({ ...emptyState(tab), ...filters }))
  const rows = useMemo(() => groupFields(attrsForTab(tab)), [tab])
  const setField = (key, v) => setDraft((d) => ({ ...d, [key]: v }))

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
      secondaryLabel="Clear All Filters"
      onClear={() => setDraft(emptyState(tab))}
      primaryLabel="Apply All Filters"
      onShowResults={() => onApply(draft)}
    >
      <div className="orders-filters__body">
        {rows.map((row) =>
          row.length === 1 ? field(row[0]) : (
            <div key={row[0].key} className="orders-filters__grid-2">{row.map(field)}</div>
          ),
        )}
      </div>
    </GlobalSearchPanel>
  )
}
