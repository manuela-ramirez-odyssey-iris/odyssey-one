import React from 'react'
import SidebarButton from './SidebarButton.jsx'

/**
 * Sidebar — organism. Left navigation chrome used across every Odyssey One route:
 * a fixed-width rail of 40×40 icon buttons split into a top group and a bottom
 * group, divided by a hairline.
 *
 * Router-agnostic (no react-router dependency in the library). The consumer either
 * lets the component render clickable SidebarButtons (`activeId` + `onItemClick`)
 * or wraps each item via the `renderItem` render-prop — e.g. to wrap in a
 * react-router <NavLink> with its own isActive state. Mirrors WidgetsLeftMenu's
 * renderItem pattern so the package stays dependency-free.
 *
 * `topItems` / `bottomItems` items: { id, icon, label } — `icon` is a ReactNode
 * (an already-sized lucide element). `renderItem(item, defaultNode, { active })`.
 *
 * Fills its container height (the AppShell flex row owns the viewport math).
 */
export default function Sidebar({
  topItems = [],
  bottomItems = [],
  activeId,
  onItemClick,
  renderItem,
  className = '',
}) {
  const renderGroup = (items) =>
    items.map((item) => {
      const active = activeId != null && item.id === activeId
      const defaultNode = (
        <button
          type="button"
          className="sidebar__item flex items-center justify-center border-none bg-transparent p-0 cursor-pointer"
          onClick={() => onItemClick?.(item.id)}
          title={item.label}
          aria-label={item.label}
          aria-current={active ? 'page' : undefined}
        >
          <SidebarButton state={active ? 'selected' : 'default'} icon={item.icon} />
        </button>
      )
      return (
        <React.Fragment key={item.id}>
          {renderItem ? renderItem(item, defaultNode, { active }) : defaultNode}
        </React.Fragment>
      )
    })

  return (
    <aside
      className={`sidebar shrink-0 flex flex-col ${className}`.trim()}
      style={{
        width: 'var(--sidebar-width)',
        height: '100%',
        background: 'var(--deep-sea-neutral-200)',
        padding: 'var(--spacing-3)',
      }}
    >
      <nav className="flex flex-col items-center flex-1" style={{ width: 40 }}>
        <div
          className="flex flex-col items-center"
          style={{ width: 40, gap: 'var(--spacing-2)', paddingBottom: 'var(--spacing-6)' }}
        >
          {renderGroup(topItems)}
        </div>
        <div
          className="flex flex-col items-center"
          style={{
            width: 40,
            gap: 'var(--spacing-2)',
            paddingTop: 'var(--spacing-6)',
            borderTop: '1px solid var(--deep-sea-neutral-300)',
          }}
        >
          {renderGroup(bottomItems)}
        </div>
      </nav>
    </aside>
  )
}
