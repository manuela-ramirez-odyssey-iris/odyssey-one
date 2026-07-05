import { EmptyState } from '@odyssey/ui'
import { PackageSearch, SearchX, Inbox } from 'lucide-react'

export const meta = {
  name: 'EmptyState',
  tier: 'atom',
  version: '0.2.0',
  createdVersion: '0.2.0',
  figmaNode: '2159:295',
  codeConnect: 'packages/ui/src/EmptyState.figma.tsx',
}

export const props = [
  { name: 'icon', type: 'ReactNode', desc: 'Optional lucide icon rendered above the message. Consumer-sized (24px recommended).' },
  { name: 'message', type: 'string', desc: 'Help text shown below the icon. Keep to one short sentence.' },
  { name: 'className', type: 'string', desc: 'Additional CSS classes for the root element.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-100', resolves: 'DSN/100', usage: 'surface background' },
  { token: '--text-placeholder', resolves: 'Text/placeholder', usage: 'icon and message color' },
  { token: '--radius-lg', resolves: 'Radius/lg', usage: 'container corner rounding' },
  { token: '--spacing-6', resolves: '24px', usage: 'container padding' },
  { token: '--spacing-2', resolves: '8px', usage: 'gap between icon and message' },
]

export default function EmptyStateDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Centered placeholder shown when a list or data view has no content.
        Pass any Lucide icon — the component renders it inside a DSN/100 rounded container
        with a muted message below.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Realistic examples</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <EmptyState
            icon={<PackageSearch size={24} />}
            message="No shipments match your filters."
          />
          <EmptyState
            icon={<SearchX size={24} />}
            message="No results found. Try a different search."
          />
          <EmptyState
            icon={<Inbox size={24} />}
            message="Your inbox is empty."
          />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Icon-only vs message-only</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <EmptyState icon={<PackageSearch size={24} />} />
          <EmptyState message="No data available." />
        </div>
      </div>
    </div>
  )
}
