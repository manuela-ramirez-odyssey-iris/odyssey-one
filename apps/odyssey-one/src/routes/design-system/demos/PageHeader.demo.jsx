import { useState } from 'react'
import { Button, ButtonToggle, PageHeader } from '@odyssey/ui'
import { Plus, Download, ArrowRight, SlidersHorizontal, Route } from 'lucide-react'

export const meta = {
  name: 'PageHeader',
  tier: 'molecule',
  figmaNode: '1693:49',
  codeConnect: 'packages/ui/src/PageHeader.figma.tsx',
}

export const props = [
  { name: 'title', type: 'string', desc: 'Route/page title. Rendered as an H1 with display-3xl-semibold typography.' },
  { name: 'children', type: 'ReactNode', desc: 'Actions for the trailing cluster (flex, 16px gap). Presence/absence of each child maps to the Figma Show toggle / Show link / Show button BOOLEANs.' },
  { name: 'className', type: 'string', desc: 'Additional class names for the <header> element.' },
  { name: 'style', type: 'CSSProperties', desc: 'Inline styles merged onto the <header> element.' },
]

export const tokens = [
  { token: '--font-size-3xl', resolves: '30px', usage: 'title font-size (via text-display-3xl-semibold utility)' },
  { token: '--font-weight-semibold', resolves: '600', usage: 'title weight' },
  { token: '--line-height-3xl', resolves: '38px', usage: 'title line-height' },
  { token: '--text-primary', resolves: 'DSN/900', usage: 'title text color (inherited from page)' },
  { token: '--spacing-4', resolves: '16px', usage: 'actions cluster gap (page-header__actions)' },
]

export default function PageHeaderDemo() {
  const [view, setView] = useState('first')

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Top-of-route H1 in a full-width flex shell. The right side is an actions
        cluster (16px gap) fed by <code>children</code>; when empty the title takes
        the full width. Passing or omitting each action mirrors the Figma
        Show toggle / Show link / Show button BOOLEANs.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Full actions cluster (Figma master)</h4>
        <div className="ds-demo-cell" style={{ justifyContent: 'flex-start' }}>
          <PageHeader title="Home" style={{ width: '100%' }}>
            <ButtonToggle
              firstIcon={<SlidersHorizontal size={20} />}
              secondIcon={<Route size={20} />}
              selected={view}
              onChange={setView}
              firstAriaLabel="Filters view"
              secondAriaLabel="Route view"
            />
            <Button variant="link" iconRight={<ArrowRight size={16} />}>Go to Tracking</Button>
            <Button icon={<Plus size={20} />}>Button</Button>
          </PageHeader>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Title only</h4>
        <div className="ds-demo-cell" style={{ justifyContent: 'flex-start' }}>
          <PageHeader title="Shipments" style={{ width: '100%' }} />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Title + single action</h4>
        <div className="ds-demo-cell" style={{ justifyContent: 'flex-start' }}>
          <PageHeader title="Orders" style={{ width: '100%' }}>
            <Button icon={<Plus size={20} />}>New order</Button>
          </PageHeader>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Title + multiple actions</h4>
        <div className="ds-demo-cell" style={{ justifyContent: 'flex-start' }}>
          <PageHeader title="Carriers" style={{ width: '100%' }}>
            <Button variant="secondary" icon={<Download size={20} />}>Export</Button>
            <Button icon={<Plus size={20} />}>Add carrier</Button>
          </PageHeader>
        </div>
      </div>
    </div>
  )
}
