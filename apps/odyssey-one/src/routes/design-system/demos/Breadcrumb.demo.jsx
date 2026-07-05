import { useState } from 'react'
import { Breadcrumb } from '@odyssey/ui'

export const meta = {
  name: 'Breadcrumb',
  tier: 'atom',
  version: '0.4.0',
  createdVersion: '0.4.0',
  figmaNode: '3141:732',
  codeConnect: 'packages/ui/src/Breadcrumb.figma.tsx',
}

export const props = [
  { name: 'label', type: 'string', desc: 'Segment text.' },
  { name: 'current', type: 'boolean', desc: 'true = the last/innermost segment (current page): dark label (DSN/700), not interactive, aria-current="page". Default false (link segment, DSN/400).' },
  { name: 'onClick', type: '() => void', desc: 'When passed on a non-current segment, renders the label as an interactive button (hover darkens to DSN/700).' },
  { name: 'className', type: 'string', desc: 'Additional CSS classes for the root element.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-400', resolves: 'DSN/400', usage: 'link-segment label + chevron (always)' },
  { token: '--deep-sea-neutral-700', resolves: 'DSN/700', usage: 'current-segment label + link hover' },
  { token: '--font-size-sm / --line-height-sm', resolves: '14 / 20', usage: 'label type (.text-label-sm-medium)' },
  { token: '--font-weight-medium', resolves: '500', usage: 'label weight' },
  { token: '--icon-size-lg', resolves: '20px', usage: 'chevron-right size' },
  { token: '--spacing-1', resolves: '4px', usage: 'label↔chevron gap' },
]

export default function BreadcrumbDemo() {
  const [clicked, setClicked] = useState(null)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        One trail segment — label + trailing chevron-right. Compose multiple in a
        flex row to form a trail. The chevron is <strong>always DSN/400</strong>;
        only the label color changes between <code>current</code> (DSN/700) and
        link (DSN/400) segments.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Variant axis — Current</h4>
        <div className="ds-demo-col" style={{ gap: 'var(--spacing-2)', alignItems: 'flex-start' }}>
          <Breadcrumb label="Create new order" current={false} />
          <Breadcrumb label="Create new order" current={true} />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Composed trail (hover the links)</h4>
        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
          <Breadcrumb label="Orders" onClick={() => setClicked('Orders')} />
          <Breadcrumb label="Drafts" onClick={() => setClicked('Drafts')} />
          <Breadcrumb label="Create new order" current />
        </div>
        {clicked && (
          <p style={{ marginTop: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Navigated to: <strong>{clicked}</strong>
          </p>
        )}
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive link — hover / focus</h4>
        <div style={{ width: 240 }}>
          <Breadcrumb label="Clickable segment" onClick={() => setClicked('Clickable segment')} />
        </div>
      </div>
    </div>
  )
}
