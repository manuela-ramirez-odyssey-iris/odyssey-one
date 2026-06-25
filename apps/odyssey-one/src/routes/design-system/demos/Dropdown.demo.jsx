import { useState } from 'react'
import { Dropdown } from '@odyssey/ui'

export const meta = {
  name: 'Dropdown',
  tier: 'molecule',
  version: '0.3.0',
  figmaNode: '3644:549',
  codeConnect: 'packages/ui/src/Dropdown.figma.tsx',
}

export const props = [
  { name: 'value', type: 'string', desc: 'The currently selected option value (controlled).' },
  { name: 'options', type: '{ value, label }[]', desc: 'The selectable options, rendered as MenuRow rows.' },
  { name: 'onChange', type: '(value) => void', desc: 'Fired with the chosen value when an option is picked (also closes the menu).' },
  { name: 'disabled', type: 'boolean', desc: 'Disables the trigger. Default false.' },
  { name: 'emptyMessage', type: 'string', desc: 'Shown when options is empty. Default "No items".' },
  { name: 'className', type: 'string', desc: 'Additional class names on the wrapper.' },
]

export const tokens = [
  { token: '(composed)', resolves: 'DropdownButton + DropdownMenu + MenuRow', usage: 'all visual tokens come from the composed pieces' },
]

const ROWS_PER_PAGE = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
]

export default function DropdownDemo() {
  const [rows, setRows] = useState('50')

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Value-selecting dropdown — a <code>DropdownButton</code> trigger that opens a{' '}
        <code>DropdownMenu</code> of <code>MenuRow</code> options anchored below it. Picking an
        option fires <code>onChange</code> + closes; it also closes on outside-click, scroll, or
        resize. First consumer: the Paginator rows-per-page selector. The menu is{' '}
        <strong>boundary-aware</strong> — when there's no room below the trigger (near the viewport
        bottom) it flips and opens <strong>upward</strong> instead of clipping.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Rows per page (interactive)</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Rows per page</span>
          <Dropdown value={rows} options={ROWS_PER_PAGE} onChange={setRows} />
        </div>
        <div style={{ marginTop: 'var(--spacing-3)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
          Selected: <strong style={{ color: 'var(--text-secondary)' }}>{rows}</strong> — click the trigger, pick a value, click outside to dismiss.
          Scroll this dropdown near the bottom of the window and open it to see the upward flip.
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Disabled + empty</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
          <Dropdown value="50" options={ROWS_PER_PAGE} disabled />
          <Dropdown value="" options={[]} emptyMessage="No options" />
        </div>
      </div>
    </div>
  )
}
