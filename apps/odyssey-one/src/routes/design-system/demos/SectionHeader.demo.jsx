import { SectionHeader } from '@odyssey/ui'

export const meta = {
  name: 'SectionHeader',
  tier: 'molecule',
  version: '0.2.0',
  createdVersion: '0.2.0',
  figmaNode: '1696:49',
  codeConnect: 'packages/ui/src/SectionHeader.figma.tsx',
}

export const props = [
  { name: 'title', type: 'string', desc: 'Section title. Rendered as an H2 with heading-2xl-semibold typography.' },
  { name: 'supportingText', type: 'string', desc: 'Optional text aligned to the trailing edge of the title row — typically a timestamp.' },
  { name: 'className', type: 'string', desc: 'Additional class names for the <header> element.' },
  { name: 'style', type: 'CSSProperties', desc: 'Inline styles merged onto the <header> element.' },
]

export const tokens = [
  { token: '--font-size-2xl', resolves: '24px', usage: 'title font-size (via text-heading-2xl-semibold)' },
  { token: '--font-weight-semibold', resolves: '600', usage: 'title weight' },
  { token: '--line-height-2xl', resolves: '32px', usage: 'title line-height' },
  { token: '--font-size-sm', resolves: '14px', usage: 'supporting text font-size (via text-label-sm-regular)' },
  { token: '--text-tertiary', resolves: 'DSN/400', usage: 'supporting text color' },
]

export default function SectionHeaderDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Single-row section header: H2 title on the left + optional <code>supportingText</code>
        {' '}(right-aligned, typically a timestamp).
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
    </div>
  )
}
