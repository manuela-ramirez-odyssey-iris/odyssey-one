import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Badge, Button, ComboBox } from '@odyssey/ui'
import { useLookup } from '../../../api/queries/useLookup'
import { useDebouncedValue } from './fields/useDebouncedValue.js'
import { useAnchoredPortal } from '@odyssey/ui'

/**
 * SpecialServicesPicker (spec §3.4, screens 5): search typeahead whose
 * dropdown is a TABLE (Service Category code + Description, frequency-
 * sorted, searchable by either). Keyboard-navigable (ArrowDown/Up wrap,
 * Enter adds, Escape closes); selected rows render the code as a gray
 * Badge + auto description + trash. Entirely optional.
 * `value`/`onChange` come from the parent Controller.
 *
 * ARIA: role=combobox on input, role=listbox on dropdown table, role=option
 * + stable ids on each row, aria-activedescendant tracks active row.
 * Mirrors TypeaheadSelect (S52) adapted for tabular shape.
 */
export default function SpecialServicesPicker({ value, onChange, id }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef(null)
  const { triggerRef: portalTriggerRef, dropdownRef, AnchoredPortal } = useAnchoredPortal({
    open,
    onClose: () => { setOpen(false); setActiveIdx(-1) },
  })
  const setWrapRef = (el) => {
    wrapRef.current = el
    portalTriggerRef.current = el
  }
  const debounced = useDebouncedValue(query, 250)
  const lookup = useLookup('special-service', debounced, { enabled: open })
  const minCharsPending = debounced.replace(/\s/g, '').length < 2
  const options = (lookup.data ?? []).filter((o) => !value.some((s) => s.code === o.value))

  // Stable ids for ARIA wiring
  const inputId = id ?? 'special-services-input'
  const listId = `${inputId}-listbox`
  const getRowId = (idx) => `${inputId}-option-${idx}`

  // Reset active index whenever options change
  useEffect(() => { setActiveIdx(-1) }, [options])

  const add = (opt) => {
    onChange([...value, { code: opt.value, description: opt.description ?? '' }])
    setQuery('')
    setActiveIdx(-1)
    // Keep dropdown open so user can add more services
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setActiveIdx(-1)
      return
    }
    if (!open || options.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % options.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i <= 0 ? options.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && activeIdx < options.length) {
        e.preventDefault()
        add(options[activeIdx])
      }
    }
  }

  return (
    <div className="co-services">
      <div className="co-typeahead" ref={setWrapRef}>
        <ComboBox
          id={inputId}
          showLabel
          label="Special Services"
          showInfoIcon
          placeholder="Search a special services"
          value={query}
          onChange={(v) => { setQuery(v); setOpen(true) }}
          onClear={() => setQuery('')}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={activeIdx >= 0 ? getRowId(activeIdx) : undefined}
          aria-autocomplete="list"
          aria-haspopup="listbox"
        />
        {open && (
          <AnchoredPortal>
            <div
              ref={dropdownRef}
              className="co-dropdown co-dropdown--table"
              onMouseDown={(e) => e.preventDefault()}
            >
              {lookup.isError ? (
                <div className="co-dropdown__status text-label-sm-regular">
                  Couldn't load services.
                  <Button variant="link" onClick={() => lookup.refetch()}>Retry</Button>
                </div>
              ) : minCharsPending ? (
                <div className="co-dropdown__status text-label-sm-regular">Type at least 2 characters</div>
              ) : options.length === 0 ? (
                <div className="co-dropdown__status text-label-sm-regular">
                  {lookup.isFetching ? 'Searching…' : 'No matches'}
                </div>
              ) : (
                <table
                  id={listId}
                  role="listbox"
                  aria-label="Special services options"
                  className="co-services-table"
                >
                  <thead>
                    <tr>
                      <th className="text-label-sm-medium">Service Category</th>
                      <th className="text-label-sm-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {options.map((opt, idx) => (
                      <tr
                        key={opt.value}
                        id={getRowId(idx)}
                        role="option"
                        aria-selected={false}
                        className={activeIdx === idx ? 'co-services-row--active' : undefined}
                        onClick={() => add(opt)}
                      >
                        <td className="text-label-sm-regular">{opt.value}</td>
                        <td className="text-label-sm-regular">{opt.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </AnchoredPortal>
        )}
      </div>

      <table className="co-services-table co-services-table--selected">
        <thead>
          <tr>
            <th className="text-label-sm-medium">Service Category</th>
            <th className="text-label-sm-medium">Description</th>
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {value.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-label-sm-regular co-cell--empty">
                No special services added
              </td>
            </tr>
          ) : (
            value.map((s) => (
              <tr key={s.code}>
                <td><Badge variant="gray">{s.code}</Badge></td>
                <td className="text-label-sm-regular">{s.description}</td>
                <td>
                  <Button
                    variant="icon"
                    size="sm"
                    icon={<Trash2 size={16} />}
                    aria-label={`Remove ${s.code}`}
                    onClick={() => onChange(value.filter((v) => v.code !== s.code))}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
