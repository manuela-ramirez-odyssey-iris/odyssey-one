import { useState } from 'react'
import { FilterSuggestions } from '@odyssey/ui'

export const meta = {
  name: 'FilterSuggestions',
  tier: 'molecule',
  version: '0.2.0',
  createdVersion: '0.2.0',
  figmaNode: '2400:2',
  codeConnect: 'packages/ui/src/FilterSuggestions.figma.tsx',
}

export const props = [
  { name: 'title', type: 'string', desc: "Section heading shown above the chip list. Default 'Suggested Filters'." },
  { name: 'items', type: 'string[] | {label: string, value: any}[]', desc: 'Chip content. Strings are used as-is; objects expose a separate value passed to onSelect.' },
  { name: 'onSelect', type: '(item) => void', desc: 'Called when a chip is clicked. When omitted, chips render decoratively (no pointer / hover affordance).' },
  { name: 'className', type: 'string', desc: 'Extra class names forwarded to the root element.' },
  { name: 'style', type: 'CSSProperties', desc: 'Inline styles merged onto the root element.' },
]

export const tokens = [
  { token: '--bg-primary', resolves: 'white', usage: 'panel background' },
  { token: '--radius-lg', resolves: 'radius/lg', usage: 'panel corner radius' },
  { token: '--shadow-2xl', resolves: 'shadow/2xl', usage: 'panel elevation (floating dropdown)' },
  { token: '--spacing-4', resolves: '16px', usage: 'panel padding + gap between chips' },
  { token: '--text-tertiary', resolves: 'Text/tertiary', usage: 'section title color' },
]

const ITEMS_A = [
  'Status: In Transit',
  'Status: Delivered',
  'Status: At Risk',
  'Carrier: XPO',
  'Client: Delaware Inc.',
]

const ITEMS_B = [
  { label: 'Mode: TL', value: 'tl' },
  { label: 'Mode: LTL', value: 'ltl' },
  { label: 'Origin: Chicago, IL', value: 'chi' },
  { label: 'Dest: Atlanta, GA', value: 'atl' },
  { label: 'Week: Jun 9–13', value: 'w23' },
]

export default function FilterSuggestionsDemo() {
  const [lastSelected, setLastSelected] = useState(null)

  const handleSelect = (item) => {
    const label = typeof item === 'string' ? item : item.label
    setLastSelected(label)
  }

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Floating suggestion panel that surfaces selectable{' '}
        <code>Badge variant="gray"</code> chips. Used below the GlobalSearch bar
        as the user types; rendered here inline so it is visible in normal flow.
        The list scrolls at 9+ items; the title stays pinned.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">String items — click a chip to select</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <FilterSuggestions
            title="Suggested Filters"
            items={ITEMS_A}
            onSelect={handleSelect}
          />
          {lastSelected && (
            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', alignSelf: 'center' }}>
              Selected: <strong style={{ color: 'var(--text-primary)' }}>{lastSelected}</strong>
            </p>
          )}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Object items — {`{ label, value }`} shape</h4>
        <FilterSuggestions
          title="Refine by"
          items={ITEMS_B}
          onSelect={handleSelect}
        />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Decorative — no onSelect (no hover affordance)</h4>
        <FilterSuggestions
          title="Applied Filters"
          items={['Status: Delivered', 'Carrier: Werner', 'Mode: TL']}
        />
      </div>
    </div>
  )
}
