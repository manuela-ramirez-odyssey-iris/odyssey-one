import { useMemo } from 'react'
import { SEARCH_ATTRIBUTES } from '../../data'

export default function SearchChipPanel({ query, activeChipKey, onChipSelect }) {
  const chips = useMemo(() => {
    if (!query || !query.trim()) return []
    return getChipsForQuery(query.trim())
  }, [query])

  if (chips.length === 0) return null

  return (
    <div
      className="absolute left-0 right-0 z-30"
      style={{
        top: '100%',
        marginTop: 4,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        padding: '8px 12px',
      }}
    >
      <div className="flex flex-wrap gap-1.5">
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
              className="text-xs font-medium border-none cursor-pointer whitespace-nowrap"
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                background: isActive ? 'var(--bg-inverse)' : 'var(--bg-tertiary)',
                color: isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              {attr.label}
            </button>
          )
        })}
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
