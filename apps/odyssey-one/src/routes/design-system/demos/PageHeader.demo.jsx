import { Button } from '@odyssey/ui'
import { PageHeader } from '@odyssey/ui'
import { Plus, Download } from 'lucide-react'

export const meta = {
  name: 'PageHeader',
  tier: 'molecule',
  figmaNode: '1693:49',
  codeConnect: 'packages/ui/src/PageHeader.figma.tsx',
}

export const props = [
  { name: 'title', type: 'string', desc: 'Route/page title. Rendered as an H1 with display-3xl-semibold typography.' },
  { name: 'children', type: 'ReactNode', desc: 'Optional right-side content (e.g. action buttons). Pushed to the trailing edge via justify-content: space-between.' },
  { name: 'className', type: 'string', desc: 'Additional class names for the <header> element.' },
  { name: 'style', type: 'CSSProperties', desc: 'Inline styles merged onto the <header> element.' },
]

export const tokens = [
  { token: '--font-size-3xl', resolves: '30px', usage: 'title font-size (via text-display-3xl-semibold utility)' },
  { token: '--font-weight-semibold', resolves: '600', usage: 'title weight' },
  { token: '--line-height-3xl', resolves: '38px', usage: 'title line-height' },
  { token: '--text-primary', resolves: 'DSN/900', usage: 'title text color (inherited from page)' },
]

export default function PageHeaderDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Top-of-route H1 in a full-width flex shell. The right side is open for
        actions passed as <code>children</code>; when empty the title takes the full
        width.
      </p>

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
            <Button icon={<Plus size={16} />}>New order</Button>
          </PageHeader>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Title + multiple actions</h4>
        <div className="ds-demo-cell" style={{ justifyContent: 'flex-start' }}>
          <PageHeader title="Carriers" style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
              <Button variant="secondary" icon={<Download size={16} />}>Export</Button>
              <Button icon={<Plus size={16} />}>Add carrier</Button>
            </div>
          </PageHeader>
        </div>
      </div>
    </div>
  )
}
