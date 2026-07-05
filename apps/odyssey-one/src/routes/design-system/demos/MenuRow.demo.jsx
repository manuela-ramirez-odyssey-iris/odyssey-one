import { useState } from 'react'
import { MenuRow } from '@odyssey/ui'
import { ICON_LG } from '@odyssey/tokens'
import { Truck } from 'lucide-react'

export const meta = {
  name: 'MenuRow',
  tier: 'atom',
  version: '0.4.0',
  createdVersion: '0.2.0',
  figmaNode: '1973:87',
  codeConnect: 'packages/ui/src/MenuRow.figma.tsx',
}

export const props = [
  { name: 'label', type: 'string', desc: 'Row label text (truncates with ellipsis).' },
  { name: 'selected', type: 'boolean', desc: 'Marks the chosen row — DSN/100 background. Default false.' },
  { name: 'draggable', type: 'boolean', desc: 'Adds a trailing grip + grab cursor for reorderable single-select rows (e.g. the WidgetsLeftMenu catalog). Composes with selected/disabled. Default false.' },
  { name: 'leadingIcon', type: 'ReactNode', desc: 'Optional leading icon (20px slot). Pass a sized lucide icon, e.g. <Truck {...ICON_LG} />.' },
  { name: 'onClick', type: '() => void', desc: 'Click handler. Suppressed when disabled.' },
  { name: 'disabled', type: 'boolean', desc: 'Mutes the label + icon + grip (DSN/400) and suppresses the click. Default false.' },
]

export const tokens = [
  { token: '--text-secondary', resolves: 'Text/secondary (DSN/700)', usage: 'label + leading icon color' },
  { token: '--text-tertiary', resolves: 'Text/tertiary (DSN/500)', usage: 'trailing grip (draggable) color' },
  { token: '--text-placeholder', resolves: 'Text/placeholder (DSN/400)', usage: 'disabled label + icon + grip color' },
  { token: '--deep-sea-neutral-100', resolves: 'DSN/100', usage: 'hover bg + selected bg' },
  { token: '--deep-sea-neutral-200', resolves: 'DSN/200', usage: 'active / dragging bg' },
  { token: '--spacing-2 / --spacing-3', resolves: '8px / 12px', usage: 'vertical / horizontal padding + gaps' },
  { token: '--radius-md', resolves: '6px', usage: 'row corner radius' },
]

const Frame = ({ children, w = 240 }) => (
  <div style={{ width: w, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-2)', background: 'var(--surface-base, #fff)' }}>
    {children}
  </div>
)

export default function MenuRowDemo() {
  const [selected, setSelected] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [draggable, setDraggable] = useState(false)
  const [withIcon, setWithIcon] = useState(false)
  const [lastClicked, setLastClicked] = useState(null)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        A single-select row inside menus, dropdowns, and panels. Selection intent picks the
        component: single → MenuRow, single + drill-in → <strong>MenuRowRadio</strong>,
        multi-select + reorder → <strong>MenuRowCheckbox</strong>. <code>draggable</code> is an
        orthogonal capability (trailing grip + grab cursor) for reorderable single-select rows.
        Hover, pressed, and selected are CSS-driven — hover the rows below.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">States</h4>
        <Frame>
          <MenuRow label="Default" />
          <MenuRow label="Selected (DSN/100 bg)" selected />
          <MenuRow label="Disabled (muted label)" disabled />
        </Frame>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Draggable (trailing grip + grab cursor)</h4>
        <Frame>
          <MenuRow label="Draggable row" draggable />
          <MenuRow label="Draggable + selected" draggable selected />
          <MenuRow label="Draggable + disabled" draggable disabled />
        </Frame>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Leading icon (20px slot)</h4>
        <Frame>
          <MenuRow label="With leading icon" leadingIcon={<Truck {...ICON_LG} />} />
          <MenuRow label="Selected + icon" leadingIcon={<Truck {...ICON_LG} />} selected />
          <MenuRow label="Disabled + icon" leadingIcon={<Truck {...ICON_LG} />} disabled />
        </Frame>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive playground</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={selected} onChange={(e) => setSelected(e.target.checked)} /> selected
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} /> disabled
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={draggable} onChange={(e) => setDraggable(e.target.checked)} /> draggable
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={withIcon} onChange={(e) => setWithIcon(e.target.checked)} /> leadingIcon
          </label>
        </div>
        <Frame>
          <MenuRow
            label="Playground row"
            selected={selected}
            disabled={disabled}
            draggable={draggable}
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
