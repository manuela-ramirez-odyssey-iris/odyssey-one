import { useState } from 'react'
import { SearchField } from '@odyssey/ui'

export const meta = {
  name: 'SearchField',
  tier: 'molecule',
  version: '0.2.0',
  figmaNode: '1959:76',
  codeConnect: 'packages/ui/src/SearchField.figma.tsx',
}

export const props = [
  { name: 'value', type: 'string', desc: 'Controlled input value.' },
  { name: 'onChange', type: '(value: string) => void', desc: 'Called on every keystroke.' },
  { name: 'placeholder', type: 'string', desc: "Input placeholder text. Default 'Search'." },
  { name: 'onClear', type: '() => void', desc: 'When provided + value is non-empty, shows a CircleX clear button that calls this on click.' },
  { name: 'showLabel', type: 'boolean', desc: 'Render a label row above the input bar. Default false.' },
  { name: 'label', type: 'string', desc: "Label text (only shown when showLabel=true). Default 'Label'." },
  { name: 'showInfoIcon', type: 'boolean', desc: 'Append an Info icon to the label row. Default false.' },
  { name: 'onInfoClick', type: '() => void', desc: 'When provided the Info icon becomes a clickable button; otherwise it is decorative.' },
  { name: 'results', type: 'ReactNode', desc: 'Optional slot rendered below the input bar (e.g. a results list).' },
  { name: 'className', type: 'string', desc: 'Extra class names forwarded to the root element.' },
]

export const tokens = [
  { token: '--bg-primary', resolves: 'white', usage: 'input bar background' },
  { token: '--border-default', resolves: 'Border/default', usage: 'idle 1px border' },
  { token: '--deep-sea-neutral-600', resolves: 'DSN/600', usage: 'focused 2px border' },
  { token: '--shadow-sm', resolves: 'shadow/sm', usage: 'input bar elevation' },
  { token: '--text-placeholder', resolves: 'Text/placeholder', usage: 'Search icon color at rest' },
  { token: '--text-tertiary', resolves: 'Text/tertiary', usage: 'Search icon color when focused; Info icon; clear icon' },
  { token: '--text-secondary', resolves: 'Text/secondary', usage: 'label text color' },
  { token: '--transition-fast', resolves: 'transition/fast', usage: 'border-color + icon-color transition' },
]

export default function SearchFieldDemo() {
  const [plainValue, setPlainValue] = useState('')
  const [labeledValue, setLabeledValue] = useState('')
  const [infoClicked, setInfoClicked] = useState(false)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Light-surface search input. The border steps from 1px <code>--border-default</code> to
        2px <code>--deep-sea-neutral-600</code> on focus. An optional label row with info icon
        sits above the bar; a clear button appears when <code>onClear</code> is set and the
        field has a value.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Plain — no label (default)</h4>
        <div style={{ maxWidth: 360 }}>
          <SearchField
            value={plainValue}
            onChange={setPlainValue}
            onClear={() => setPlainValue('')}
            placeholder="Search shipments…"
          />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Labeled — showLabel + showInfoIcon</h4>
        <div style={{ maxWidth: 360 }}>
          <SearchField
            value={labeledValue}
            onChange={setLabeledValue}
            onClear={() => setLabeledValue('')}
            placeholder="Search by customer…"
            showLabel
            label="Customer"
            showInfoIcon
            onInfoClick={() => setInfoClicked(true)}
          />
        </div>
        {infoClicked && (
          <p style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
            Info icon clicked.
          </p>
        )}
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Labeled — showLabel, no info icon</h4>
        <div style={{ maxWidth: 360 }}>
          <SearchField
            value=""
            onChange={() => {}}
            placeholder="Search by carrier…"
            showLabel
            label="Carrier"
          />
        </div>
      </div>
    </div>
  )
}
