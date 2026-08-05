import { useState, useMemo } from 'react'
import { RightPanel, MenuRowCheckbox } from '@odyssey/ui'
import { GroupLabel } from '../common/presetChrome.jsx'
import { TABS } from './BottomBar'

const arraysEqual = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])

// The Orders tab is the shipment's anchor pane (selection always lands on it) —
// pinned to the first strip position: always visible, not removable, not reorderable.
const PINNED_KEY = 'order'

/**
 * TabArrangementPanel — ShipmentsBar tab arrange feature. Mirrors the ColumnPanel
 * arrangement view (RightPanel shell, Selected/Available groups, drag-reorder,
 * Cancel/Save draft semantics) for the detail-bar tabs instead of table columns.
 * No presets — tabs are a single small ordered set.
 *
 * `tabOrder` = the committed ordered array of visible tab keys (Orders first).
 * Edits stage into a DRAFT; any pending change raises the RightPanel footer with
 * Cancel / Save. Reopening the panel discards an unsaved draft.
 */
export default function TabArrangementPanel({ isOpen, onClose, tabOrder, onTabOrderChange }) {
  // Reorderable part of the committed order — everything after the pinned Orders tab.
  const committedRest = useMemo(() => tabOrder.filter(k => k !== PINNED_KEY), [tabOrder])

  const [draft, setDraft] = useState(committedRest)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  // Opening the panel starts a fresh draft from the committed order (render-time
  // "adjust state on change" — also discards a draft abandoned via the X close).
  const [prevOpen, setPrevOpen] = useState(isOpen)
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen)
    if (isOpen) setDraft(committedRest)
  }

  const dirty = !arraysEqual(draft, committedRest)

  const selectedTabs = useMemo(
    () => draft.map(key => TABS.find(t => t.key === key)).filter(Boolean),
    [draft],
  )
  const availableTabs = useMemo(() => {
    const draftSet = new Set(draft)
    return TABS.filter(t => t.key !== PINNED_KEY && !draftSet.has(t.key))
  }, [draft])
  const pinnedTab = TABS.find(t => t.key === PINNED_KEY)

  const handleToggleTab = (key, checked) => {
    setDraft(checked ? [...draft, key] : draft.filter(k => k !== key))
  }

  const handleDrop = (e, toIndex) => {
    e.preventDefault()
    setDragOverIndex(null)
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (isNaN(fromIndex) || fromIndex === toIndex) return
    const next = [...draft]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setDraft(next)
  }

  const handleSave = () => {
    if (dirty) onTabOrderChange([PINNED_KEY, ...draft])
  }

  const handleCancel = () => {
    setDraft(committedRest)
  }

  return (
    <RightPanel
      open={isOpen}
      title="Shipment tabs"
      subtitle="Tab Arrangement"
      onClose={onClose}
      footer={dirty}
      onCancel={handleCancel}
      onSave={handleSave}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', padding: 'var(--spacing-4) var(--spacing-6)' }}>
        {/* Selected tabs — Orders pinned first; drag to reorder, uncheck to remove */}
        <div>
          <GroupLabel>Selected tabs ({selectedTabs.length + 1})</GroupLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
            <MenuRowCheckbox
              label={pinnedTab.label}
              checked
              disabled
              draggable={false}
              value={pinnedTab.key}
            />
            {selectedTabs.map((tab, index) => (
              <div
                key={tab.key}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', String(index))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDragOverIndex(index)
                }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={(e) => handleDrop(e, index)}
                style={{
                  borderTop: dragOverIndex === index ? '2px solid var(--border-focus)' : '2px solid transparent',
                  transition: 'border-top-color var(--transition-fast)',
                }}
              >
                <MenuRowCheckbox
                  label={tab.label}
                  checked
                  draggable
                  value={tab.key}
                  onToggle={() => handleToggleTab(tab.key, false)}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border-subtle)' }} />

        {/* Available tabs — check to add (small fixed set, no search needed) */}
        <div>
          <GroupLabel>Available tabs</GroupLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
            {availableTabs.map(tab => (
              <MenuRowCheckbox
                key={tab.key}
                label={tab.label}
                checked={false}
                draggable={false}
                value={tab.key}
                onToggle={() => handleToggleTab(tab.key, true)}
              />
            ))}
          </div>
          {availableTabs.length === 0 && (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-placeholder)', padding: 'var(--spacing-2) var(--spacing-3)' }}>
              All tabs are shown
            </div>
          )}
        </div>
      </div>
    </RightPanel>
  )
}
