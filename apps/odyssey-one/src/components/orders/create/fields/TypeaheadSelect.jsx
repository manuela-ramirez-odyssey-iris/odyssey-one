import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button, FormField } from '@odyssey/ui'
import { useLookup } from '../../../../api/queries/useLookup'
import { useDebouncedValue } from './useDebouncedValue.js'

/**
 * TypeaheadSelect — generic async lookup field (spec §8). FormField skin +
 * a co-dropdown of useLookup results. Contract: 2-char min (service-gated),
 * case-insensitive, frequency-sorted, ~250ms debounce. `allowFreeText`
 * commits the raw text on blur (Customer Required Carrier). Lookup failures
 * render an inline "couldn't load" row with retry — never crash the form
 * (spec §6). Required-ness is conveyed by the caller's label ("… *").
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
  const wrapRef = useRef(null)
  const debounced = useDebouncedValue(inputText, 250)
  const lookup = useLookup(lookupType, debounced, { orgId, enabled: open && !disabled })
  const options = lookup.data ?? []
  const minCharsPending = debounced.replace(/\s/g, '').length < 2

  // External changes (draft hydration, org-change clearing) refresh the text
  useEffect(() => {
    setInputText(selected?.label ?? '')
  }, [selected?.value, selected?.label])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

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
  }

  return (
    <div className="co-typeahead" ref={wrapRef}>
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
        onChange={(e) => {
          setInputText(e.target.value)
          setOpen(true)
          if (selected && e.target.value !== selected.label) onSelect(null) // typing invalidates the pick
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => commitFreeText()}
      />
      {open && !disabled && (
        <div className="co-dropdown" onMouseDown={(e) => e.preventDefault()}>
          {lookup.isError ? (
            <div className="co-dropdown__status text-label-sm-regular">
              Couldn't load options.
              <Button variant="link" onClick={() => lookup.refetch()}>Retry</Button>
            </div>
          ) : options.length > 0 ? (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="co-dropdown__item"
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
      )}
    </div>
  )
}
