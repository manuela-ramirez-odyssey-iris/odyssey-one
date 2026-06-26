import { DropdownMenu, MenuRow } from '@odyssey/ui'

export const meta = {
  name: 'DropdownMenu',
  tier: 'molecule',
  version: '0.3.0',
  figmaNode: '3600:1879',
  codeConnect: 'packages/ui/src/DropdownMenu.figma.tsx',
}

export const props = [
  { name: 'children', type: 'ReactNode', desc: 'Menu content — typically MenuRow atoms or a MenuDropdown group. When present, renders the content (State=Content).' },
  { name: 'emptyMessage', type: 'string', desc: 'Shown centered when there are no children (State=Empty). Default "No items".' },
  { name: 'className', type: 'string', desc: 'Additional class names merged onto the surface.' },
]

export const tokens = [
  { token: '--white', resolves: '#FFFFFF', usage: 'surface background' },
  { token: '--spacing-3', resolves: '12px', usage: 'surface padding' },
  { token: '--radius-lg', resolves: '8px', usage: 'surface corner radius' },
  { token: '--shadow-panel', resolves: '3-layer panel shadow', usage: 'surface elevation' },
  { token: '--text-tertiary', resolves: 'DSN/500', usage: 'empty message color' },
]

export default function DropdownMenuDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        A popover/menu surface for small dropdown lists (e.g. the Paginator rows-per-page
        dropdown). Renders its <code>children</code> (MenuRow atoms or a MenuDropdown group)
        when present, or a centered <code>emptyMessage</code> when empty. The surface hugs its
        content width.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Content — flat MenuRow list (paginator-style)</h4>
        <div style={{ width: 240 }}>
          <DropdownMenu>
            <MenuRow label="10 per page" selected />
            <MenuRow label="25 per page" />
            <MenuRow label="50 per page" />
            <MenuRow label="100 per page" />
          </DropdownMenu>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Empty (default + custom message)</h4>
        <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
          <div style={{ width: 200 }}>
            <DropdownMenu />
          </div>
          <div style={{ width: 200 }}>
            <DropdownMenu emptyMessage="No results found" />
          </div>
        </div>
      </div>
    </div>
  )
}
