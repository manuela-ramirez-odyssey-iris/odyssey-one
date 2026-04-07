import { useMemo } from 'react'
import { Filter } from 'lucide-react'
import { SEARCH_ATTRIBUTES } from '../../data'

export default function SearchChipPanel({ query, activeChipKey, onChipSelect, onToggleFilters, filtersOpen }) {
  const chips = useMemo(() => {
    if (!query || !query.trim()) return []
    return getChipsForQuery(query.trim())
  }, [query])

  if (chips.length === 0) return null

  const filterEnabled = activeChipKey !== null

  return (
    <div className="flex flex-wrap items-center gap-2" style={{ padding: 'var(--spacing-2) 0', marginBottom: 'var(--spacing-2)' }}>
      {/* Chips */}
      {chips.map((attr) => {
        const isActive = activeChipKey === attr.key
        return (
          <button
            key={attr.key}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onChipSelect(isActive ? null : attr.key)
            }}
            className="cursor-pointer whitespace-nowrap"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              border: `1px solid ${isActive ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
              background: isActive ? 'var(--badge-blue-bg)' : 'var(--bg-tertiary)',
              color: isActive ? 'var(--badge-blue-text)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-primary)',
              fontSize: 13,
              fontWeight: 500,
              lineHeight: '18px',
              transition: 'background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)',
            }}
          >
            {attr.label}
          </button>
        )
      })}

      {/* Filter icon — inline after last chip with divider */}
      <div
        className="flex items-center shrink-0"
        style={{ paddingLeft: 'var(--spacing-2)', borderLeft: '1px solid var(--border-subtle)' }}
      >
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (filterEnabled && onToggleFilters) onToggleFilters()
          }}
          className="flex items-center justify-center bg-transparent border-none"
          style={{
            cursor: filterEnabled ? 'pointer' : 'not-allowed',
            opacity: filterEnabled ? 1 : 0.35,
            color: filtersOpen ? 'var(--text-primary)' : 'var(--text-tertiary)',
            transition: 'opacity var(--transition-fast), color var(--transition-fast)',
            padding: 4,
            borderRadius: 'var(--radius-sm)',
          }}
          onMouseEnter={(e) => { if (filterEnabled && !filtersOpen) e.currentTarget.style.color = 'var(--text-secondary)' }}
          onMouseLeave={(e) => { if (!filtersOpen) e.currentTarget.style.color = 'var(--text-tertiary)' }}
          title={filterEnabled ? 'Open filters' : 'Select a chip to enable filters'}
        >
          <Filter size={18} fill={filtersOpen ? 'var(--text-primary)' : 'none'} />
        </button>
      </div>
    </div>
  )
}

function getChipsForQuery(query) {
  const hasDigits = /\d/.test(query)
  const hasLetters = /[a-zA-Z]/.test(query)
  const queryLower = query.toLowerCase()
  const chips = []

  SEARCH_ATTRIBUTES.forEach((attr) => {
    if (attr.type === 'dropdown') {
      if (attr.values && attr.values.some((v) => v.toLowerCase().includes(queryLower))) {
        chips.push(attr)
      }
    } else if (attr.type === 'number-text') {
      if (hasDigits) chips.push(attr)
    } else if (attr.type === 'text') {
      if (hasLetters) chips.push(attr)
    }
  })

  return chips
}
