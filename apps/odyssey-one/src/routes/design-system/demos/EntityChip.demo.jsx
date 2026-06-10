import { useState } from 'react'
import { EntityChip } from '@odyssey/ui'
import { Truck, Package } from 'lucide-react'

export const meta = {
  name: 'EntityChip',
  tier: 'molecule',
  figmaNode: '1716:60',
  codeConnect: 'packages/ui/src/EntityChip.figma.tsx',
}

export const props = [
  { name: 'name', type: 'string', desc: "Entity scope label (e.g. 'Customers'). Default 'Customers'." },
  { name: 'count', type: 'number', desc: 'Number of selected entities. Drives the handshake icon count and overflow badge. Default 1.' },
  { name: 'entityIcon', type: 'ComponentType', desc: 'Lucide icon component used in the entity slots. Default Handshake.' },
  { name: 'showAddButton', type: 'boolean', desc: 'Show the trailing + IconButton. Default true.' },
  { name: 'onAddClick', type: '() => void', desc: 'Called when the + IconButton is clicked.' },
  { name: 'className', type: 'string', desc: 'Additional class names for the root div.' },
]

export const tokens = [
  { token: '--entity-chip-bg', resolves: 'chip background', usage: 'pill background surface' },
  { token: '--entity-chip-border', resolves: 'chip border', usage: 'pill border color' },
  { token: '--entity-chip-slot-ring', resolves: 'slot ring color', usage: 'dashed SVG ring on each icon slot' },
  { token: '--entity-chip-overflow-color', resolves: 'overflow text', usage: '"+N" label color inside the overflow slot' },
  { token: '--spacing-2', resolves: '8px', usage: 'negative offset for stacked slots' },
  { token: '--icon-md', resolves: '16px', usage: 'entity icon size (ICON_MD spread)' },
]

// Display-rule reference:
//   count 0   → no slots (chip shows name + add only)
//   count 1–3 → 1–3 handshake icons
//   count 4+  → 3 handshakes + "+N" (N = count − 3, capped at 9)

const COUNTS = [1, 3, 5, 12]

export default function EntityChipDemo() {
  const [addedCount, setAddedCount] = useState(1)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Pill that names an entity scope and visualises the current selection count via
        stacked dashed-ring icon slots. Counts 1–3 show that many icons; counts 4+ show
        3 icons and a <code>+N</code> overflow slot (capped at +9).
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Count ladder — 1 · 3 · 5 · 12</h4>
        <div className="ds-demo-row">
          {COUNTS.map((n) => (
            <div className="ds-demo-col" key={n} style={{ alignItems: 'flex-start' }}>
              <EntityChip name="Customers" count={n} onAddClick={() => {}} />
              <span className="ds-demo-label">count = {n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">count = 0 — no entity slots</h4>
        <div className="ds-demo-row">
          <EntityChip name="Customers" count={0} onAddClick={() => {}} />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive — click + to add</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-end' }}>
          <EntityChip
            name="Customers"
            count={addedCount}
            onAddClick={() => setAddedCount((n) => Math.min(n + 1, 12))}
          />
          <button
            type="button"
            onClick={() => setAddedCount(1)}
            style={{
              background: 'none',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px var(--spacing-2)',
              fontFamily: 'var(--font-primary)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            reset
          </button>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Custom entityIcon</h4>
        <div className="ds-demo-row">
          <div className="ds-demo-col" style={{ alignItems: 'flex-start' }}>
            <EntityChip name="Carriers" count={2} entityIcon={Truck} onAddClick={() => {}} />
            <span className="ds-demo-label">Truck icon</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'flex-start' }}>
            <EntityChip name="Shipments" count={5} entityIcon={Package} onAddClick={() => {}} />
            <span className="ds-demo-label">Package icon · overflow</span>
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">showAddButton = false</h4>
        <div className="ds-demo-row">
          <EntityChip name="Customers" count={3} showAddButton={false} />
        </div>
      </div>
    </div>
  )
}
