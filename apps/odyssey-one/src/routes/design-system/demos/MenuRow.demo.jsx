import { useState } from 'react'
import { MenuRow } from '@odyssey/ui'
import { ICON_LG } from '@odyssey/tokens'
import { Truck } from 'lucide-react'

export const meta = {
  name: 'MenuRow',
  tier: 'atom',
  version: '0.3.0',
  figmaNode: '1973:87',
  codeConnect: 'packages/ui/src/MenuRow.figma.tsx',
}

export const props = [
  { name: 'label', type: 'string', desc: 'Row label text (truncates with ellipsis).' },
  { name: 'variant', type: "'select' | 'navigate' | 'draggable'", desc: "Semantic role. select = plain selectable option (no trailing); navigate = drills into a view (chevron); draggable = reorderable (grip + grab cursor). Default 'select'." },
  { name: 'bordered', type: 'boolean', desc: 'Standalone DSN/300 outline. Intended for navigate (e.g. a panel profile). Default false.' },
  { name: 'selected', type: 'boolean', desc: 'Marks the chosen row. Look is per-variant (select = DSN/100 bg, draggable / navigate-bordered = DSN/900 ring, navigate-plain = none). Default false.' },
  { name: 'leadingIcon', type: 'ReactNode', desc: 'Optional leading icon (20px slot). Pass a sized lucide icon, e.g. <Truck {...ICON_LG} />.' },
  { name: 'onClick', type: '() => void', desc: 'Click handler. Suppressed when disabled.' },
  { name: 'disabled', type: 'boolean', desc: 'Disables the click handler + dims the row. Default false.' },
]

export const tokens = [
  { token: '--text-secondary', resolves: 'Text/secondary (DSN/700)', usage: 'label + leading icon color' },
  { token: '--text-tertiary', resolves: 'DSN/500', usage: 'trailing chevron / grip color' },
  { token: '--deep-sea-neutral-100', resolves: 'DSN/100', usage: 'hover bg + select-selected bg' },
  { token: '--deep-sea-neutral-200', resolves: 'DSN/200', usage: 'active / dragging bg' },
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300', usage: 'bordered outline' },
  { token: '--deep-sea-neutral-900', resolves: 'DSN/900', usage: 'selected ring (draggable / navigate-bordered)' },
  { token: '--spacing-2 / --spacing-3', resolves: '8px / 12px', usage: 'vertical / horizontal padding + gaps' },
  { token: '--radius-md', resolves: '6px', usage: 'row corner radius' },
]

const Frame = ({ children, w = 240 }) => (
  <div style={{ width: w, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-2)', background: 'var(--surface-base, #fff)' }}>
    {children}
  </div>
)

export default function MenuRowDemo() {
  const [variant, setVariant] = useState('select')
  const [bordered, setBordered] = useState(false)
  const [selected, setSelected] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [withIcon, setWithIcon] = useState(false)
  const [lastClicked, setLastClicked] = useState(null)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        A row inside menus, dropdowns, and panels. <code>variant</code> is a semantic role
        that drives the trailing affordance, cursor, and click intent:{' '}
        <strong>select</strong> (plain option), <strong>navigate</strong> (drills into a view,
        chevron), <strong>draggable</strong> (reorderable, grip + grab cursor). Hover, pressed,
        and selected are CSS-driven — hover the rows below.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Variants (State=Default)</h4>
        <Frame>
          <MenuRow label="Select — plain option" variant="select" />
          <MenuRow label="Navigate — drills in" variant="navigate" />
          <MenuRow label="Draggable — reorder" variant="draggable" />
        </Frame>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Selected (per-variant look)</h4>
        <Frame>
          <MenuRow label="Select — selected (DSN/100 bg)" variant="select" selected />
          <MenuRow label="Navigate — no selected state" variant="navigate" selected />
          <MenuRow label="Draggable — selected (DSN/900 ring)" variant="draggable" selected />
        </Frame>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Bordered (navigate, standalone panel)</h4>
        <Frame>
          <MenuRow label="Navigate + bordered" variant="navigate" bordered />
          <MenuRow label="Navigate + bordered + selected" variant="navigate" bordered selected />
        </Frame>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Leading icon (20px slot) + disabled</h4>
        <Frame>
          <MenuRow label="With leading icon" variant="navigate" leadingIcon={<Truck {...ICON_LG} />} />
          <MenuRow label="Disabled row" variant="select" disabled />
        </Frame>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive playground</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            variant:
            <select value={variant} onChange={(e) => setVariant(e.target.value)}>
              <option value="select">select</option>
              <option value="navigate">navigate</option>
              <option value="draggable">draggable</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={bordered} onChange={(e) => setBordered(e.target.checked)} /> bordered
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={selected} onChange={(e) => setSelected(e.target.checked)} /> selected
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} /> disabled
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={withIcon} onChange={(e) => setWithIcon(e.target.checked)} /> leadingIcon
          </label>
        </div>
        <Frame>
          <MenuRow
            label="Playground row"
            variant={variant}
            bordered={bordered}
            selected={selected}
            disabled={disabled}
            leadingIcon={withIcon ? <Truck {...ICON_LG} /> : null}
            onClick={() => setLastClicked(new Date().toLocaleTimeString())}
          />
        </Frame>
        {lastClicked && (
          <div style={{ marginTop: 'var(--spacing-3)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
            Last clicked at <strong style={{ color: 'var(--text-secondary)' }}>{lastClicked}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
