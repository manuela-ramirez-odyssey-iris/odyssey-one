import Navbar from './Navbar'
import Sidebar from './Sidebar'
import CustomersModal from '../CustomersModal'
import { useEditMode } from '../../contexts/EditModeContext.jsx'
import { useCustomers } from '../../contexts/CustomersContext.jsx'
import { useSidebar } from '../../contexts/SidebarContext.jsx'

export default function AppShell({ children, filterPanel, onMainClick, transparentMain = false, searchSlot, titleMode }) {
  const { isEditMode } = useEditMode()
  const { modalOpen } = useCustomers()
  // Lives in a provider above the router: every route renders its own AppShell,
  // so state held here would reset the rail on each navigation.
  //
  // The rail is a real flex child, so widening it pushes <main> rather than
  // covering it. Nothing expands it automatically — a collapsed rail reaches
  // every route through its floating card chain, and re-expanding underneath a
  // click would fight the thing being clicked.
  const { expanded: sidebarExpanded, toggle: toggleSidebar } = useSidebar()

  return (
    <div className="flex flex-col h-screen">
      <Navbar
        searchSlot={searchSlot}
        titleMode={titleMode}
        onMenuClick={toggleSidebar}
        menuActive={sidebarExpanded}
      />
      {/* overflow-clip (not hidden): hidden boxes are still scroll containers, so a
          scrollIntoView/focus on wide content (e.g. a shipment-table row) could
          horizontally scroll this wrapper and push the Sidebar off-screen with no
          scrollbar to recover. clip renders identically but is unscrollable. */}
      <div className="flex flex-1 min-h-0 overflow-clip">
        {!isEditMode && <Sidebar expanded={sidebarExpanded} />}
        <main
          className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto flex flex-col"
          style={{
            padding: isEditMode
              ? 'var(--main-padding-top-edit) var(--spacing-8) 0 calc(var(--edit-panel-width) + var(--spacing-8))'
              : 'var(--spacing-8) var(--spacing-8) 0 var(--spacing-8)',
            background: transparentMain ? 'transparent' : 'var(--bg-secondary)',
            transition: 'padding-left var(--transition-panel), padding-top var(--transition-panel)',
          }}
          onClick={onMainClick}
        >
          {children}
        </main>
        {filterPanel}
      </div>
      {modalOpen && <CustomersModal />}
    </div>
  )
}
