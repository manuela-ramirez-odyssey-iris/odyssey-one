import { useState } from 'react'
import { ModalFooter } from '@odyssey/ui'

export const meta = {
  name: 'ModalFooter',
  tier: 'molecule',
  normalizing: false,
  version: '0.5.0',
  figmaNode: '3170:3649',
  codeConnect: 'packages/ui/src/ModalFooter.figma.tsx',
}

export const props = [
  { name: 'type', type: "'confirm' | 'filters' | 'link'", desc: 'Which footer layout. (Figma: Type variant ModalFooter1 / 2 / 3.)' },
  { name: 'cancelLabel / saveLabel', type: 'string', desc: 'confirm labels (default Cancel / Save).' },
  { name: 'tertiaryLabel', type: 'string', desc: "confirm only: pass it to show a 'Clear all' secondary button beside Save (omit → hidden). No boolean." },
  { name: 'onCancel / onSave / onTertiary', type: '() => void', desc: 'confirm handlers.' },
  { name: 'saveFiltersLabel / clearLabel / resultsLabel', type: 'string', desc: 'filters labels (default Save Filters / Clear all / Show results).' },
  { name: 'onSaveFilters / onClear / onResults', type: '() => void', desc: 'filters handlers.' },
  { name: 'text / linkLabel', type: 'string', desc: 'link helper text + action label (default "Don’t see your address?" / Add manually).' },
  { name: 'onLink', type: '() => void', desc: 'link action handler.' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the footer element.' },
]

export const tokens = [
  { token: '--spacing-6', resolves: '24px', usage: 'horizontal padding' },
  { token: '--spacing-3', resolves: '12px', usage: 'vertical padding + button-cluster gap' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'top divider' },
  { token: '--text-link', resolves: 'Text/link', usage: 'ButtonLink text (filters / link)' },
  { token: '--text-secondary', resolves: 'Text/secondary', usage: 'helper text (link type)' },
]

function Frame({ children }) {
  return (
    <div style={{ width: 560, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {children}
    </div>
  )
}

const TYPES = ['confirm', 'filters', 'link']

export default function ModalFooterDemo() {
  const [type, setType] = useState('confirm')
  const [clearAll, setClearAll] = useState(false)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        The footer bar for modal / panel shells — three <code>type</code>s (Figma <code>Type</code> variant),
        each composed from the <strong>Button</strong> atom. Every label + handler is a prop. RightPanel
        composes <code>type="confirm"</code>.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — pick a type</h4>
        <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap' }}>
          {TYPES.map((t) => (
            <label key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
              <input type="radio" name="mf-type" checked={type === t} onChange={() => setType(t)} /> {t}
            </label>
          ))}
          {type === 'confirm' && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
              <input type="checkbox" checked={clearAll} onChange={(e) => setClearAll(e.target.checked)} /> Clear all (tertiary)
            </label>
          )}
        </div>
        <Frame>
          <ModalFooter
            type={type}
            tertiaryLabel={type === 'confirm' && clearAll ? 'Clear all' : undefined}
            resultsLabel="Show 2 results"
            onCancel={() => {}}
            onSave={() => {}}
            onTertiary={() => {}}
            onSaveFilters={() => {}}
            onClear={() => {}}
            onResults={() => {}}
            onLink={() => {}}
          />
        </Frame>
      </div>
    </div>
  )
}
