import { useState } from 'react'
import { WidgetsLeftMenu } from '@odyssey/ui'

export const meta = {
  name: 'WidgetsLeftMenu',
  tier: 'organism',
  version: '0.2.0',
  figmaNode: '1961:393',
  codeConnect: 'packages/ui/src/WidgetsLeftMenu.figma.tsx',
}

export const props = [
  { name: 'title', type: 'string', desc: "Panel heading. Default 'Metrics library'." },
  { name: 'groups', type: 'Array<{ id, title, items: Array<{ id, label }> }>', desc: 'Item groups. Each group renders as a collapsible MenuDropdown containing MenuRow items.' },
  { name: 'searchValue', type: 'string', desc: 'Controlled search input value. Filters items client-side (case-insensitive label match). Default empty.' },
  { name: 'onSearchChange', type: '(value: string) => void', desc: 'Called on every search keystroke.' },
  { name: 'collapsedGroupIds', type: 'Set<string> | string[]', desc: 'IDs of collapsed groups. Converts to a Set internally.' },
  { name: 'onToggleGroup', type: '(groupId: string) => void', desc: 'Called when a group header is clicked.' },
  { name: 'onItemClick', type: '(itemId: string, groupId: string) => void', desc: 'Called when a MenuRow item is clicked (when renderItem is not provided).' },
  { name: 'renderItem', type: '(item, group, defaultNode, { disabled }) => ReactNode', desc: 'Optional render-prop so consumers can wrap each item with a DnD adapter (e.g. dnd-kit useSortable) without this package depending on it.' },
  { name: 'isItemDisabled', type: '(item, group) => boolean', desc: 'Return true to disable a specific item.' },
]

export const tokens = [
  { token: '--white', resolves: 'white', usage: 'panel background' },
  { token: '--shadow-panel', resolves: 'shadow/panel', usage: 'panel left-edge shadow' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'header bottom divider' },
  { token: '--text-primary', resolves: 'Text/primary', usage: 'panel title + item labels' },
  { token: '--spacing-4', resolves: '16px', usage: 'header + search horizontal padding' },
  { token: '--spacing-3', resolves: '12px', usage: 'search vertical padding' },
]

const GROUPS = [
  {
    id: 'shipments',
    title: 'Shipments',
    items: [
      { id: 'active', label: 'Active Shipments' },
      { id: 'on-time', label: 'On-Time Delivery' },
      { id: 'at-risk', label: 'At Risk' },
      { id: 'exceptions', label: 'Exceptions' },
    ],
  },
  {
    id: 'carriers',
    title: 'Carriers',
    items: [
      { id: 'carrier-mix', label: 'Carrier Mix' },
      { id: 'carrier-perf', label: 'Carrier Performance' },
      { id: 'tender-accept', label: 'Tender Acceptance' },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    items: [
      { id: 'cost-per-mile', label: 'Cost Per Mile' },
      { id: 'dwell-time', label: 'Dwell Time' },
      { id: 'pickup-compliance', label: 'Pickup Compliance' },
    ],
  },
]

export default function WidgetsLeftMenuDemo() {
  const [searchValue, setSearchValue] = useState('')
  const [collapsedIds, setCollapsedIds] = useState(new Set())
  const [lastClicked, setLastClicked] = useState(null)

  const handleToggleGroup = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Edit-mode left panel for the Home dashboard widget library. Renders a fixed
        240px card with a search field and collapsible groups of draggable metric
        items. The <code>renderItem</code> render-prop keeps this component DnD-agnostic;
        the demo passes <code>undefined</code> so each item renders as a plain{' '}
        <code>MenuRow</code> via the default node.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive — search + collapse/expand groups</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ height: 480, display: 'flex' }}>
            <WidgetsLeftMenu
              title="Metrics library"
              groups={GROUPS}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              collapsedGroupIds={collapsedIds}
              onToggleGroup={handleToggleGroup}
              onItemClick={(itemId, groupId) => setLastClicked(`${groupId} › ${itemId}`)}
            />
          </div>
          {lastClicked && (
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', margin: 0 }}>
              Last clicked: <strong>{lastClicked}</strong>
            </p>
          )}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">With renderItem — default node pass-through (DnD placeholder)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ height: 320, display: 'flex' }}>
            <WidgetsLeftMenu
              title="Metrics library"
              groups={GROUPS.slice(0, 2)}
              searchValue=""
              onSearchChange={() => {}}
              collapsedGroupIds={new Set()}
              onToggleGroup={() => {}}
              renderItem={(_item, _group, defaultNode) => defaultNode}
            />
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">With isItemDisabled — disabled items grayed out</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ height: 260, display: 'flex' }}>
            <WidgetsLeftMenu
              title="Metrics library"
              groups={GROUPS.slice(0, 1)}
              searchValue=""
              onSearchChange={() => {}}
              collapsedGroupIds={new Set()}
              onToggleGroup={() => {}}
              isItemDisabled={(item) => item.id === 'at-risk' || item.id === 'exceptions'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
