import { useState, useMemo, useId } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'
import FormField from './FormField.jsx'
import FieldSearchResults from './FieldSearchResults.jsx'
import Badge from './Badge.jsx'
import IconButtonGhost from './IconButtonGhost.jsx'
import { useFieldPopover } from './useFieldPopover.js'
import { moveHighlight } from './GlobalSearch.jsx'

/**
 * MultiSelect — molecule. A FormField-style search field that filters an option
 * list into an in-flow FieldSearchResults dropdown (pushes content down, not an
 * overlay), plus an always-visible table of the selected options with a per-row
 * trash action.
 *
 * Code-only composite over Figma masters `MultiSelect` 4536:5333 (Closed/Open).
 * Composes FormField + FieldSearchResults/MatchSimpleRow + Badge + IconButtonGhost.
 * Dropdown renders the TWO-COLUMN layout (code | description with in-panel
 * column headers — Orders mock 5427:13375, decision 2026-07-28); `columnHeaders`
 * titles both the dropdown panel and the selected-items table.
 *
 * Keyboard (mirrors ComboBox's combobox typeahead): ArrowDown/Up opens + moves
 * the active-row highlight (wraps, scrolls into view); Enter picks the active
 * option and moves it to the table, keeping the dropdown open for further picks
 * (its multi-select model — matches the mouse-click behaviour); Escape closes.
 * The trailing chevron is a real button (aria-label, flips Down↔Up with open
 * state) that toggles the dropdown and focuses the input.
 *
 * Props:
 *   options       — [{ value, label, description }] full option set.
 *   selected      — controlled array of selected `value`s.
 *   onChange      — (nextSelectedValues[]) on pick / trash.
 *   columnHeaders — [categoryHeader, descriptionHeader]; default
 *                   ['Service Category', 'Description'].
 *   label         — FormField label.
 *   placeholder   — FormField placeholder.
 *   disabled      — passed through to FormField; hides the dropdown.
 *   emptyTableMessage — when set, the selected-items table renders even with no
 *                   selections (headers + this muted placeholder row) so the
 *                   fill-me affordance is visible by default (2026-07-28).
 *   id            — passed through to FormField.
 */

// All options filtered by query (label OR description). Selected ones stay visible
// in the dropdown and get a persistent highlight (toggled on click).
// Pure + exported so the filter branch is unit-testable without the virtualized
// FieldSearchResults render (which draws 0 rows under jsdom).
export function availableOptions(options, selected, query) {
  const q = (query || '').trim().toLowerCase()
  return options.filter((o) => {
    if (!q) return true
    return (
      o.label.toLowerCase().includes(q) ||
      (o.description || '').toLowerCase().includes(q)
    )
  })
}

export default function MultiSelect({
  options = [],
  selected = [],
  onChange,
  columnHeaders = ['Service Category', 'Description'],
  label,
  placeholder = 'Search',
  disabled = false,
  emptyTableMessage,
  id,
}) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(-1)
  const listboxId = useId()
  const { open, setOpen, wrapperRef, wrapperProps, fieldProps, popoverProps } = useFieldPopover()

  const byValue = useMemo(() => {
    const map = new Map()
    for (const o of options) map.set(o.value, o)
    return map
  }, [options])

  // Dropdown shows ALL options (selected + unselected), filtered by the live query.
  const filteredOptions = useMemo(
    () => availableOptions(options, selected, query),
    [options, selected, query],
  )

  // FieldSearchResults consumes { matchId, address, id } — map option → row.
  const matches = useMemo(
    () => filteredOptions.map((o) => ({
      matchId: o.label,
      address: o.description,
      id: o.value,
      showAvatar: false,
    })),
    [filteredOptions],
  )

  const pick = (match) => {
    // Toggle: clicking a selected row deselects it; clicking unselected selects it.
    if (selected.includes(match.id)) {
      onChange?.(selected.filter((v) => v !== match.id))
    } else {
      onChange?.([...selected, match.id])
    }
    // Keep query so user can keep filtering; reset highlight since list may reorder.
    setActiveIdx(-1)
  }

  const remove = (value) => {
    onChange?.(selected.filter((v) => v !== value))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setActiveIdx((cur) => moveHighlight(matches.length, cur, e.key === 'ArrowDown' ? 1 : -1))
      return
    }
    if (e.key === 'Enter' && open && activeIdx >= 0) {
      e.preventDefault()
      pick(matches[activeIdx])
      return
    }
    // Tab / Escape → useFieldPopover's wrapper handler (closes).
    wrapperProps.onKeyDown(e)
  }

  const toggleOpen = () => {
    setOpen(!open)
    if (open) setActiveIdx(-1)
    wrapperRef.current?.querySelector('input')?.focus()
  }

  const rows = selected.map((v) => byValue.get(v)).filter(Boolean)

  return (
    <div
      ref={wrapperProps.ref}
      onBlur={wrapperProps.onBlur}
      onKeyDown={handleKeyDown}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', width: '100%' }}
    >
      <FormField
        id={id}
        label={label}
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setActiveIdx(-1); setOpen(true) }}
        trailingIcon={
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleOpen}
            disabled={disabled}
            aria-label={open ? 'Close options' : 'Open options'}
            aria-expanded={open}
            aria-controls={listboxId}
            className="flex items-center justify-center border-none bg-transparent p-0"
            style={{ color: 'inherit', cursor: disabled ? 'default' : 'pointer' }}
          >
            {open
              ? <ChevronUp {...ICON_MD} aria-hidden="true" />
              : <ChevronDown {...ICON_MD} aria-hidden="true" />}
          </button>
        }
        disabled={disabled}
        onFocus={fieldProps.onFocus}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeIdx >= 0 ? `${listboxId}-option-${activeIdx}` : undefined}
        aria-autocomplete="list"
      />

      {/* Dropdown — in-flow (pushes the table down), 4-row viewport. */}
      {open && !disabled && (
        <div {...popoverProps}>
          <FieldSearchResults
            id={listboxId}
            matches={matches}
            emptyMessage="No matching options"
            onMatchClick={pick}
            activeIndex={activeIdx}
            optionIdPrefix={listboxId}
            maxHeight={4 * 40}
            rowHeight={40}
            columnHeaders={columnHeaders}
            rowProps={{ showAvatar: false, twoColumn: true }}
            selectedIds={selected}
          />
        </div>
      )}

      {/* Selected-items table. With `emptyTableMessage` it renders even when
          empty (headers + muted placeholder row) so the fill-me affordance is
          visible by default; without it, only when there are rows. */}
      {(rows.length > 0 || emptyTableMessage) && (
        <table className="multi-select__table">
          <thead>
            <tr>
              <th className="multi-select__th text-label-sm-semibold">{columnHeaders[0]}</th>
              <th className="multi-select__th text-label-sm-semibold">{columnHeaders[1]}</th>
              <th className="multi-select__th multi-select__th--actions" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="multi-select__td multi-select__td--empty text-label-sm-regular">
                  {emptyTableMessage}
                </td>
              </tr>
            )}
            {rows.map((o) => (
              <tr key={o.value}>
                <td className="multi-select__td"><Badge variant="gray">{o.label}</Badge></td>
                <td className="multi-select__td"><Badge variant="gray">{o.description}</Badge></td>
                <td className="multi-select__td multi-select__td--actions">
                  <IconButtonGhost
                    icon={<Trash2 {...ICON_LG} aria-hidden="true" />}
                    onClick={() => remove(o.value)}
                    ariaLabel={`Remove ${o.label}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
