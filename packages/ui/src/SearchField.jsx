import { useState } from 'react'
import { Search, CircleX } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

/**
 * SearchField — molecule. Mirrors the Shipments TableControls search recipe:
 * `--bg-primary` surface, 1px `--border-default` border (2px `--deep-sea-neutral-600`
 * on focus), `--shadow-sm`. Leading Search icon shifts text-placeholder → text-tertiary
 * on focus. Controlled via `value` + `onChange`.
 */
export default function SearchField({
  value = '',
  onChange,
  placeholder = 'Search',
  onClear,
  className = '',
  ...rest
}) {
  const [focused, setFocused] = useState(false)
  const showClear = !!onClear && !!value

  return (
    <div
      className={`flex items-center ${className}`.trim()}
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
      {...rest}
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
        className="flex-1 bg-transparent border-none outline-none min-w-0"
        style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-primary)',
          fontSize: 'var(--font-size-sm)',
          lineHeight: 'var(--line-height-sm)',
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
}
