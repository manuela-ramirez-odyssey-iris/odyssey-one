import { Fragment } from 'react'
import SearchField from './SearchField.jsx'
import MenuRow from './MenuRow.jsx'
import MenuDropdown from './MenuDropdown.jsx'

/**
 * WidgetsLeftMenu — organism. Catalog panel: title + search + collapsible groups of items.
 * Library-pure: accepts an optional `renderItem` render-prop so consumers can wrap each
 * item with their DnD adapter (e.g. dnd-kit's useSortable) without this package depending on it.
 */
export default function WidgetsLeftMenu({
  title = 'Metrics library',
  groups = [],
  searchValue = '',
  onSearchChange,
  collapsedGroupIds,
  onToggleGroup,
  onItemClick,
  renderItem,
  isItemDisabled,
  className = '',
  ...rest
}) {
  const collapsedSet =
    collapsedGroupIds instanceof Set
      ? collapsedGroupIds
      : new Set(collapsedGroupIds || [])

  const query = (searchValue || '').toLowerCase().trim()
  const filteredGroups = groups
    .map((g) => {
      const items = query
        ? (g.items || []).filter((it) => it.label.toLowerCase().includes(query))
        : (g.items || [])
      return { ...g, items }
    })
    .filter((g) => g.items.length > 0)

  return (
    <div
      className={`widgets-left-menu flex flex-col ${className}`.trim()}
      style={{
        width: 240,
        height: '100%',
        background: 'var(--white)',
        boxShadow: 'var(--shadow-panel)',
      }}
      {...rest}
    >
      <div
        className="flex items-center"
        style={{
          height: 48,
          padding: 'var(--spacing-4)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span
          className="text-label-xs-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </span>
      </div>

      <div
        style={{
          padding: 'var(--spacing-3) var(--spacing-4)',
        }}
      >
        <SearchField
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search"
        />
      </div>

      <div className="flex flex-col" style={{ overflowY: 'auto' }}>
        {filteredGroups.map((group) => {
          const collapsed = collapsedSet.has(group.id)
          return (
            <MenuDropdown
              key={group.id}
              title={group.title}
              expanded={!collapsed}
              onToggle={() => onToggleGroup?.(group.id)}
            >
              {group.items.map((item) => {
                const disabled = isItemDisabled ? Boolean(isItemDisabled(item, group)) : false
                const defaultNode = (
                  <MenuRow
                    key={item.id}
                    label={item.label}
                    onClick={() => onItemClick?.(item.id, group.id)}
                    disabled={disabled}
                  />
                )
                if (renderItem) {
                  return (
                    <Fragment key={item.id}>
                      {renderItem(item, group, defaultNode, { disabled })}
                    </Fragment>
                  )
                }
                return defaultNode
              })}
            </MenuDropdown>
          )
        })}
      </div>
    </div>
  )
}
