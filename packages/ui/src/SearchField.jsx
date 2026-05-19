import { useState } from 'react'
import { Search, CircleX, Info } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

/**
 * SearchField — molecule. Mirrors the Shipments TableControls search recipe:
 * `--bg-primary` surface, 1px `--border-default` border (2px `--deep-sea-neutral-600`
 * on focus), `--shadow-sm`. Leading Search icon shifts text-placeholder → text-tertiary
 * on focus. Controlled via `value` + `onChange`.
 *
 * Optional label row above the input bar (toggled via `showLabel`), with an optional
 * info icon (toggled via `showInfoIcon`). Both default off so existing call sites
 * keep their flat input-only rendering.
 */
export default function SearchField({
  value = '',
  onChange,
  placeholder = 'Search',
  onClear,
  showLabel = false,
  label = 'Label',
  showInfoIcon = false,
  onInfoClick,
  results = null,
  className = '',
  ...rest
}) {
  const [focused, setFocused] = useState(false)
  const showClear = !!onClear && !!value

  const inputBar = (
    <div
      className="flex items-center"
      style={{
        height: 32,
        padding: '0 var(--spacing-3)',
        gap: 'var(--spacing-2)',
        background: 'var(--bg-primary)',
        border: focused
          ? '2px solid var(--deep-sea-neutral-600)'
          : '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'border-color var(--transition-fast)',
      }}
    >
      <Search
        {...ICON_MD}
        style={{
          color: focused ? 'var(--text-tertiary)' : 'var(--text-placeholder)',
          flexShrink: 0,
          transition: 'color var(--transition-fast)',
        }}
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className="flex-1 bg-transparent border-none min-w-0"
        style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-primary)',
          fontSize: 'var(--font-size-sm)',
          lineHeight: 'var(--line-height-sm)',
          outline: 'none',
          boxShadow: 'none',
        }}
      />
      {showClear && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClear}
          className="flex items-center justify-center border-none bg-transparent cursor-pointer p-0 shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label="Clear search"
        >
          <CircleX {...ICON_MD} />
        </button>
      )}
    </div>
  )

  if (!showLabel) {
    return (
      <div className={className} {...rest}>
        {inputBar}
        {results && <div className="search-field__results">{results}</div>}
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col ${className}`.trim()}
      style={{ gap: 'var(--spacing-2)', alignItems: 'stretch' }}
      {...rest}
    >
      <div className="flex items-center" style={{ gap: 'var(--spacing-1)' }}>
        <span
          className="text-label-sm-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
        {showInfoIcon && (
          onInfoClick ? (
            <button
              type="button"
              onClick={onInfoClick}
              className="inline-flex items-center justify-center border-none bg-transparent cursor-pointer p-0"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="More info"
            >
              <Info {...ICON_MD} />
            </button>
          ) : (
            <span
              className="inline-flex items-center justify-center"
              style={{ color: 'var(--text-tertiary)' }}
              aria-hidden="true"
            >
              <Info {...ICON_MD} />
            </span>
          )
        )}
      </div>
      {inputBar}
      {results && <div className="search-field__results">{results}</div>}
    </div>
  )
}
