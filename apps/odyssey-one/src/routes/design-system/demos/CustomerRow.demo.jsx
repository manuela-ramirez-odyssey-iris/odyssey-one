import { useState } from 'react'
import { CustomerRow } from '@odyssey/ui'

export const meta = {
  name: 'CustomerRow',
  tier: 'molecule',
  version: '0.2.0',
  createdVersion: '0.2.0',
  figmaNode: '2029:461',
  codeConnect: 'packages/ui/src/CustomerRow.figma.tsx',
}

export const props = [
  { name: 'label', type: 'string', desc: 'Customer name displayed in the row.' },
  { name: 'icon', type: 'ReactNode', desc: 'Override the default Handshake icon with a custom node.' },
  { name: 'mode', type: "'list'|'result'", desc: "Row context. 'list' = 48h selected-list row with Trash action + favorite badge; 'result' = 40h dropdown row with Star toggle. Default 'list'." },
  { name: 'favorite', type: 'boolean', desc: "In 'list' mode: shows a green Badge overlay. In 'result' mode: fills the Star icon. Default false." },
  { name: 'onFavoriteToggle', type: '() => void', desc: "Callback for the Star toggle button (result mode only)." },
  { name: 'onDelete', type: '() => void', desc: "Callback for the Trash button (list mode only)." },
  { name: 'onClick', type: '() => void', desc: 'Makes the entire row a button (adds hover affordance).' },
]

export const tokens = [
  { token: '--customer-row-border', resolves: '--border-subtle', usage: 'bottom divider between rows (list mode)' },
  { token: '--customer-row-icon-size', resolves: '32px (list) / 24px (result)', usage: 'logo container size' },
  { token: '--bg-secondary', resolves: 'Bg/secondary', usage: 'icon container fill' },
  { token: '--text-primary', resolves: 'Text/primary', usage: 'label text color' },
  { token: '--text-tertiary', resolves: 'Text/tertiary', usage: 'Trash / Star icon color' },
  { token: '--bg-primary', resolves: 'white', usage: 'row background' },
]

const CUSTOMERS = [
  { id: 'a', label: 'Delaware Inc.' },
  { id: 'b', label: 'Midwest Freight Co.' },
  { id: 'c', label: 'Pacific Cargo Group' },
]

export default function CustomerRowDemo() {
  // List mode — track favorites + deletions
  const [favorites, setFavorites] = useState(new Set(['b']))
  const [deleted, setDeleted] = useState(new Set())

  // Result mode — track star toggles
  const [resultFavs, setResultFavs] = useState(new Set(['a']))

  const toggleFav = (id) =>
    setFavorites((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleResultFav = (id) =>
    setResultFavs((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleDelete = (id) =>
    setDeleted((prev) => new Set([...prev, id]))

  const visibleList = CUSTOMERS.filter((c) => !deleted.has(c.id))

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Two-mode customer row used inside the customer-picker flow.{' '}
        <code>mode="list"</code> is the selected-list row (48 h, Trash action, favorite badge);{' '}
        <code>mode="result"</code> is the dropdown search-result row (40 h, Star toggle, no badge).
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">mode="list" — trash to remove, star badge on favorited row</h4>
        <div style={{ width: 492, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {visibleList.length === 0 && (
            <p style={{ padding: 'var(--spacing-4)', margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
              All rows removed.
            </p>
          )}
          {visibleList.map((c) => (
            <CustomerRow
              key={c.id}
              mode="list"
              label={c.label}
              favorite={favorites.has(c.id)}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">mode="result" — star toggle (no badge overlay)</h4>
        <div style={{ width: 492, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {CUSTOMERS.map((c) => (
            <CustomerRow
              key={c.id}
              mode="result"
              label={c.label}
              favorite={resultFavs.has(c.id)}
              onFavoriteToggle={() => toggleResultFav(c.id)}
              onClick={() => {}}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
