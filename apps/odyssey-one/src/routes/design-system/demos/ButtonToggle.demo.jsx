import { useState } from 'react'
import { SlidersHorizontal, Route, List, Map, LayoutGrid, Rows3 } from 'lucide-react'
import { ButtonToggle } from '@odyssey/ui'

export const meta = {
  name: 'ButtonToggle',
  tier: 'molecule',
  version: '0.2.0',
  createdVersion: '0.2.0',
  figmaNode: '2978:330',
  codeConnect: 'packages/ui/src/ButtonToggle.figma.tsx',
}

export const props = [
  { name: 'firstIcon', type: 'ReactNode', desc: 'Icon for the first segment (20px Lucide; placeholder-20 INSTANCE_SWAP slot in Figma). Ignored in text mode.' },
  { name: 'secondIcon', type: 'ReactNode', desc: 'Icon for the second segment (20px Lucide; placeholder-20 INSTANCE_SWAP slot in Figma). Ignored in text mode.' },
  { name: 'firstLabel', type: 'string', desc: 'Label for the first segment. Passing labels switches the whole toggle to text mode (Figma Content=Text) — icons OR text, never mixed.' },
  { name: 'secondLabel', type: 'string', desc: 'Label for the second segment (label/sm medium, DSN/500 both states — mirrors icon mode).' },
  { name: 'selected', type: "'first' | 'second'", desc: "Controlled selection — mirrors the Figma Selected variant axis. Defaults to 'first'." },
  { name: 'onChange', type: '(next) => void', desc: "Called with 'first' or 'second' when the unselected segment is clicked." },
  { name: 'firstAriaLabel', type: 'string', desc: 'Accessible label for the first segment button.' },
  { name: 'secondAriaLabel', type: 'string', desc: 'Accessible label for the second segment button.' },
  { name: 'className', type: 'string', desc: 'Extra class names appended to the root element.' },
]

export const tokens = [
  { token: '--bg-tertiary', resolves: 'DSN/100', usage: 'track background' },
  { token: '--bg-primary', resolves: 'White', usage: 'sliding thumb fill' },
  { token: '--border-default', resolves: 'DSN/300', usage: 'thumb border' },
  { token: '--shadow-sm', resolves: '0 1px 2px @5%', usage: 'thumb elevation' },
  { token: '--radius-lg', resolves: '8px', usage: 'track + thumb radius' },
  { token: '--radius-md', resolves: '6px', usage: 'unselected segment radius (hover target)' },
  { token: '--spacing-1', resolves: '4px', usage: 'track padding + segment gap' },
  { token: '--spacing-2', resolves: '8px', usage: 'selected segment h-padding' },
  { token: '--text-tertiary', resolves: 'DSN/500', usage: 'icon color (both states, via currentColor)' },
  { token: '--text-secondary', resolves: 'DSN/700', usage: 'unselected icon hover (code + DSM only — interaction state)' },
  { token: '--deep-sea-neutral-50', resolves: '#F7F8FA', usage: 'thumb hover bg (mirrors .btn--icon hover)' },
  { token: '--deep-sea-neutral-400', resolves: '#9DA3B0', usage: 'thumb hover/pressed border + pressed icon (mirrors .btn--icon)' },
  { token: '--deep-sea-neutral-100', resolves: '#F2F3F5', usage: 'thumb pressed bg (mirrors .btn--icon pressed)' },
  { token: '--transition-base', resolves: '200ms ease', usage: 'thumb slide + segment padding' },
]

export default function ButtonToggleDemo() {
  const [view, setView] = useState('first')
  const [layout, setLayout] = useState('second')
  const [scope, setScope] = useState('first')

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Two-option toggle (Apple-style segmented control). The white raised
        thumb slides under the selected segment; the selected segment widens
        in sync. Two content modes, never mixed (Figma Content axis): icons or
        text labels. In Figma the selected segment is a nested Button instance
        (Icon/sm or Secondary/sm) — the thumb mirrors that variant's
        hover/pressed ladder here so both stay identical. Icon mode is fixed
        geometry; text mode computes the thumb from the measured label widths.
        Built for view switches — list/map, grid/rows, mine/all.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Variants (Selected axis)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'center' }}>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <ButtonToggle
              firstIcon={<SlidersHorizontal size={20} />}
              secondIcon={<Route size={20} />}
              selected="first"
              firstAriaLabel="Filters view"
              secondAriaLabel="Route view"
            />
            <span className="ds-demo-label">Selected=First</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <ButtonToggle
              firstIcon={<SlidersHorizontal size={20} />}
              secondIcon={<Route size={20} />}
              selected="second"
              firstAriaLabel="Filters view"
              secondAriaLabel="Route view"
            />
            <span className="ds-demo-label">Selected=Second</span>
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Variants (Content=Text)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'center' }}>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <ButtonToggle firstLabel="Mine" secondLabel="All" selected="first" />
            <span className="ds-demo-label">Selected=First</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <ButtonToggle firstLabel="Mine" secondLabel="All" selected="second" />
            <span className="ds-demo-label">Selected=Second</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <ButtonToggle
              firstLabel="Open orders"
              secondLabel="All"
              selected={scope}
              onChange={setScope}
            />
            <span className="ds-demo-label">uneven labels: {scope}</span>
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground (click to slide)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'center' }}>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <ButtonToggle
              firstIcon={<List size={20} />}
              secondIcon={<Map size={20} />}
              selected={view}
              onChange={setView}
              firstAriaLabel="List view"
              secondAriaLabel="Map view"
            />
            <span className="ds-demo-label">view: {view}</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <ButtonToggle
              firstIcon={<LayoutGrid size={20} />}
              secondIcon={<Rows3 size={20} />}
              selected={layout}
              onChange={setLayout}
              firstAriaLabel="Grid layout"
              secondAriaLabel="Row layout"
            />
            <span className="ds-demo-label">layout: {layout}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
