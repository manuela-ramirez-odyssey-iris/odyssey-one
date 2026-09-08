import { useState } from 'react'
import { SidebarButton } from '@odyssey/ui'
import { ICON_LG } from '@odyssey/tokens'
import { House, Container, Truck, UserCog } from 'lucide-react'

export const meta = {
  name: 'SidebarButton',
  tier: 'atom',
  version: '0.3.0',
  createdVersion: '0.2.0',
  figmaNode: '514:2479',
  codeConnect: 'packages/ui/src/SidebarButton.figma.tsx',
  normalizing: true,
  approved: true,
}

export const props = [
  { name: 'type', type: 'collapsed|domain|submenu', desc: 'Row geometry. collapsed = 40×40 icon only (the 64px rail); domain = 40h labelled row; submenu = 36h indented row, regular weight, no icon. Default collapsed. (Figma: Type)' },
  { name: 'icon', type: 'ReactNode', desc: 'Leading glyph, a Lucide icon at 20px (ICON_LG). Ignored when type is submenu. (Figma: Icon)' },
  { name: 'label', type: 'string', desc: 'Row caption. Truncates with an ellipsis. Ignored when type is collapsed. (Figma: Label)' },
  { name: 'count', type: 'number|string', desc: 'Optional count badge on the trailing edge. domain only — omit to hide it. (Figma: Show count + Count)' },
  { name: 'chevron', type: 'up|down|right|null', desc: 'Trailing chevron: up/down for a submenu disclosure, right for a row that opens a floating flyout. Default null. (Figma: Show chevron + Chevron)' },
  { name: 'state', type: 'default|hover|selected', desc: 'Appearance state. selected fills the row DSN/300 at every type. hover is a real CSS :hover — this prop exists for the state grid below, code never passes it. (Figma: State)' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the row element.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300', usage: 'selected row fill + rest count-badge fill' },
  { token: '--deep-sea-neutral-200', resolves: 'DSN/200', usage: 'count-badge fill on a SELECTED row' },
  { token: '--text-secondary', resolves: 'DSN/700', usage: 'label color' },
  { token: '--text-tertiary', resolves: 'Text/tertiary', usage: 'icon + chevron color at rest' },
  { token: '--text-primary', resolves: 'Text/primary', usage: 'icon color on hover/selected, count text' },
  { token: '--radius-lg', resolves: '8px', usage: 'collapsed + domain corner rounding' },
  { token: '--radius-md', resolves: '6px', usage: 'submenu corner rounding' },
]

const TYPES = ['collapsed', 'domain', 'submenu']
const STATES = ['default', 'hover', 'selected']

export default function SidebarButtonDemo() {
  const [type, setType] = useState('domain')
  const [state, setState] = useState('selected')
  const [count, setCount] = useState(true)
  const [chevron, setChevron] = useState('down')

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        The row for every level of the left rail. <code>type</code> carries the geometry —
        height, radius and padding — because those are the parts Figma cannot bind to a
        boolean. A selected row fills DSN/300 at every type, and a selected{' '}
        <code>domain</code> row flips its count badge to DSN/200 so the number stays readable
        against the fill.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — type × state</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start', gap: 32 }}>
          {TYPES.map((t) => (
            <div className="ds-demo-col" key={t} style={{ gap: 8, minWidth: 220 }}>
              <span className="ds-demo-label">{t}</span>
              <div style={{ background: 'var(--deep-sea-neutral-200)', padding: 12, borderRadius: 8 }}>
                {STATES.map((s) => (
                  <SidebarButton
                    key={s}
                    type={t}
                    state={s}
                    icon={<Container {...ICON_LG} />}
                    label="Shipments"
                    count={t === 'domain' ? 3 : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start', gap: 24 }}>
          <div style={{ background: 'var(--deep-sea-neutral-200)', padding: 12, borderRadius: 8, width: 240 }}>
            <SidebarButton
              type={type}
              state={state}
              icon={<UserCog {...ICON_LG} />}
              label="User Management"
              count={count ? 3 : undefined}
              chevron={chevron || null}
            />
          </div>
          <div className="ds-demo-col" style={{ gap: 8 }}>
            <label className="ds-demo-label">
              type{' '}
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="ds-demo-label">
              state{' '}
              <select value={state} onChange={(e) => setState(e.target.value)}>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="ds-demo-label">
              chevron{' '}
              <select value={chevron} onChange={(e) => setChevron(e.target.value)}>
                <option value="">none</option>
                <option value="up">up</option>
                <option value="down">down</option>
                <option value="right">right</option>
              </select>
            </label>
            <label className="ds-demo-label">
              <input type="checkbox" checked={count} onChange={(e) => setCount(e.target.checked)} />{' '}
              count badge (domain only)
            </label>
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Collapsed rail, in context</h4>
        <div style={{ background: 'var(--deep-sea-neutral-200)', padding: 12, borderRadius: 8, width: 64 }}>
          <SidebarButton icon={<House {...ICON_LG} />} />
          <SidebarButton icon={<Container {...ICON_LG} />} state="selected" />
          <SidebarButton icon={<Truck {...ICON_LG} />} />
        </div>
      </div>
    </div>
  )
}
