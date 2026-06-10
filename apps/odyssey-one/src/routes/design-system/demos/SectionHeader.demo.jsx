import { Button } from '@odyssey/ui'
import { SectionHeader } from '@odyssey/ui'
import { Filter, Download } from 'lucide-react'

export const meta = {
  name: 'SectionHeader',
  tier: 'molecule',
  figmaNode: '1696:49',
  codeConnect: 'packages/ui/src/SectionHeader.figma.tsx',
}

export const props = [
  { name: 'title', type: 'string', desc: 'Section title. Rendered as an H2 with heading-2xl-semibold typography.' },
  { name: 'supportingText', type: 'string', desc: 'Optional text aligned to the trailing edge of the title row — typically a timestamp.' },
  { name: 'leadingActions', type: 'ReactNode', desc: 'Optional left slot in the actions row. Only the actions row renders when at least one action slot is non-null.' },
  { name: 'trailingActions', type: 'ReactNode', desc: 'Optional right slot in the actions row.' },
  { name: 'className', type: 'string', desc: 'Additional class names for the <header> element.' },
  { name: 'style', type: 'CSSProperties', desc: 'Inline styles merged onto the <header> element.' },
]

export const tokens = [
  { token: '--font-size-2xl', resolves: '24px', usage: 'title font-size (via text-heading-2xl-semibold)' },
  { token: '--font-weight-semibold', resolves: '600', usage: 'title weight' },
  { token: '--line-height-2xl', resolves: '32px', usage: 'title line-height' },
  { token: '--font-size-sm', resolves: '14px', usage: 'supporting text font-size (via text-label-sm-regular)' },
  { token: '--text-tertiary', resolves: 'DSN/400', usage: 'supporting text color' },
  { token: '--spacing-8', resolves: '32px', usage: 'gap between title row and actions row' },
]

export default function SectionHeaderDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Two-row section header. Row 1: H2 title + optional <code>supportingText</code> (right-aligned).
        Row 2: <code>leadingActions</code> / <code>trailingActions</code> slots — the row is
        not rendered at all when both are omitted.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Title only</h4>
        <div className="ds-demo-cell" style={{ justifyContent: 'flex-start' }}>
          <SectionHeader title="Active shipments" style={{ width: '100%' }} />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Title + supporting text</h4>
        <div className="ds-demo-cell" style={{ justifyContent: 'flex-start' }}>
          <SectionHeader
            title="Active shipments"
            supportingText="Last updated 2 min ago"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Title + supporting text + leading and trailing actions</h4>
        <div className="ds-demo-cell" style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
          <SectionHeader
            title="Active shipments"
            supportingText="Last updated 2 min ago"
            leadingActions={
              <Button variant="secondary" size="sm" icon={<Filter size={14} />}>
                Filter
              </Button>
            }
            trailingActions={
              <Button variant="secondary" size="sm" icon={<Download size={14} />}>
                Export
              </Button>
            }
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Trailing actions only (leading omitted)</h4>
        <div className="ds-demo-cell" style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
          <SectionHeader
            title="Exceptions"
            trailingActions={
              <Button variant="secondary" size="sm" icon={<Download size={14} />}>
                Export CSV
              </Button>
            }
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  )
}
