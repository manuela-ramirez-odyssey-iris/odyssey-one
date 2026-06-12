import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button, FormField } from '@odyssey/ui'
import { useLookup } from '../../../../api/queries/useLookup'
import { useDebouncedValue } from './useDebouncedValue.js'
import { useAnchoredPortal } from './useAnchoredPortal.jsx'

/**
 * TypeaheadSelect — generic async lookup field (spec §8). FormField skin +
 * a co-dropdown of useLookup results. Contract: 2-char min (service-gated),
 * case-insensitive, frequency-sorted, ~250ms debounce. `allowFreeText`
 * commits the raw text on blur (Customer Required Carrier). Lookup failures
 * render an inline "couldn't load" row with retry — never crash the form
 * (spec §6). Required-ness is conveyed by the caller's label ("… *").
 *
 * Keyboard: ArrowDown/Up move active-option index (wrapping); Enter selects
 * active option or falls back to free-text commit; Escape closes + keeps focus.
 * ARIA: role=combobox on input, role=listbox on dropdown, role=option + ids on
 * items, aria-activedescendant tracks active item (mirrors OrderRowActionMenu
 * aria discipline, S52).
 */
export default function TypeaheadSelect({
  label,
  showLabel = true,
  placeholder,
  lookupType,
  orgId,
  selected,        // { value, label } | null — the committed pick
  onSelect,        // (option | null) => void
  allowFreeText = false,
  error,
  disabled = false,
  id,
}) {
  const [inputText, setInputText] = useState(selected?.label ?? '')
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
  const debounced = useDebouncedValue(inputText, 250)
  const lookup = useLookup(lookupType, debounced, { orgId, enabled: open && !disabled })
  const options = lookup.data ?? []
  const minCharsPending = debounced.replace(/\s/g, '').length < 2

  // Stable ids for ARIA wiring
  const listId = id ? `${id}-listbox` : undefined
  const getOptionId = (idx) => (id ? `${id}-option-${idx}` : undefined)

  // Reset active index whenever options change
  useEffect(() => { setActiveIdx(-1) }, [options])

  // External changes (draft hydration, org-change clearing) refresh the text
  useEffect(() => {
    setInputText(selected?.label ?? '')
  }, [selected?.value, selected?.label])

  const commitFreeText = () => {
    if (!allowFreeText) return
    const text = inputText.trim()
    if (text !== '' && text !== (selected?.label ?? '')) {
      onSelect({ value: text, label: text, freeText: true })
    }
  }

  const pick = (opt) => {
    onSelect(opt)
    setInputText(opt.label)
    setOpen(false)
    setActiveIdx(-1)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      // Close and keep focus in the input (no blur)
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
        pick(options[activeIdx])
      }
      // else: no active option — fall through to free-text commit on blur
    }
  }

  return (
    <div className="co-typeahead" ref={setWrapRef}>
      <FormField
        id={id}
        label={label}
        showLabel={showLabel}
        placeholder={placeholder}
        value={inputText}
        error={error}
        disabled={disabled}
        trailingIcon={<ChevronDown size={16} />}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeIdx >= 0 ? getOptionId(activeIdx) : undefined}
        onChange={(e) => {
          setInputText(e.target.value)
          setOpen(true)
          if (selected && e.target.value !== selected.label) onSelect(null) // typing invalidates the pick
        }}
        onFocus={() => setOpen(true)}
        // NOTE: dropdown onMouseDown calls e.preventDefault() — this prevents the
        // input from losing focus on item click, which allows the blur handler to
        // run *after* the click handler has committed the pick (free-text path too).
        onBlur={() => {
          setOpen(false)
          setActiveIdx(-1)
          commitFreeText()
        }}
        onKeyDown={handleKeyDown}
      />
      {open && !disabled && (
        <AnchoredPortal>
          <div
            ref={dropdownRef}
            id={listId}
            role="listbox"
            className="co-dropdown"
            // Prevent mousedown from stealing focus away from the input — this is
            // what keeps the blur handler from firing before pick() on item click.
            onMouseDown={(e) => e.preventDefault()}
          >
            {lookup.isError ? (
              <div className="co-dropdown__status text-label-sm-regular">
                Couldn't load options.
                <Button variant="link" onClick={() => lookup.refetch()}>Retry</Button>
              </div>
            ) : options.length > 0 ? (
              options.map((opt, idx) => (
                <button
                  key={opt.value}
                  id={getOptionId(idx)}
                  type="button"
                  role="option"
                  aria-selected={selected?.value === opt.value}
                  className={`co-dropdown__item${activeIdx === idx ? ' co-dropdown__item--active' : ''}`}
                  onClick={() => pick(opt)}
                >
                  <span className="text-label-sm-regular">{opt.label}</span>
                  {opt.description && (
                    <span className="co-dropdown__item-desc text-label-xs-regular">{opt.description}</span>
                  )}
                </button>
              ))
            ) : (
              <div className="co-dropdown__status text-label-sm-regular">
                {lookup.isFetching
                  ? 'Searching…'
                  : minCharsPending && lookupType !== 'equipment'
                    ? 'Type at least 2 characters'
                    : 'No matches'}
              </div>
            )}
          </div>
        </AnchoredPortal>
      )}
    </div>
  )
}
