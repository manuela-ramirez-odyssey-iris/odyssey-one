import Navbar from './Navbar'
import Sidebar from './Sidebar'
import CustomersModal from '../CustomersModal'
import ToastHost from './ToastHost'
import { useEditMode } from '../../contexts/EditModeContext.jsx'
import { useCustomers } from '../../contexts/CustomersContext.jsx'
import { useSidebar } from '../../contexts/SidebarContext.jsx'

export default function AppShell({ children, filterPanel, onMainClick, transparentMain = false, searchSlot, titleMode, sidebarHidden = false }) {
  const { isEditMode } = useEditMode()
  const { modalOpen } = useCustomers()
  // Lives in a provider above the router: every route renders its own AppShell,
  // so state held here would reset the rail on each navigation.
  //
  // The rail is a real flex child, so widening it pushes <main> rather than
  // covering it. `expanded` is pinned (hamburger click) OR peeking (hover/
  // focus over the collapsed rail) — hover reuses the exact same expand
  // machinery the hamburger drives, never a second one. `menuActive` reflects
  // `pinned` only, so the hamburger doesn't light up just because the pointer
  // happens to be over the rail.
  const { expanded: sidebarExpanded, pinned: sidebarPinned, setPeeking: setSidebarPeeking, toggle: toggleSidebar } = useSidebar()

  return (
    <div
      className="flex flex-col h-screen"
      // The rail is a flex child, so its width is the left edge of <main> —
      // but `position: fixed` surfaces (the docked ShipmentsBar, the bottom
      // bar, the bar scrim) are out of flow and used to hardcode
      // `left: var(--sidebar-width)`, so they slid under the rail the moment
      // it expanded. Publishing the rail's CURRENT width here is the single
      // source they all read (S155): one var, set where the rail's state
      // actually lives, instead of a class on every fixed surface.
      // isEditMode doesn't render the rail at all — same as hidden, 0.
      style={{
        '--sidebar-current': (sidebarHidden || isEditMode)
          ? '0px'
          : sidebarExpanded ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width)',
      }}
    >
      <Navbar
        searchSlot={searchSlot}
        titleMode={titleMode}
        onMenuClick={toggleSidebar}
        menuActive={sidebarPinned}
      />
      {/* overflow-clip (not hidden): hidden boxes are still scroll containers, so a
          scrollIntoView/focus on wide content (e.g. a shipment-table row) could
          horizontally scroll this wrapper and push the Sidebar off-screen with no
          scrollbar to recover. clip renders identically but is unscrollable. */}
      <div className="flex flex-1 min-h-0 overflow-clip">
        {!isEditMode && (
          <Sidebar expanded={sidebarExpanded} onHoverChange={setSidebarPeeking} hidden={sidebarHidden} />
        )}
        <main
          className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto flex flex-col"
          style={{
            padding: isEditMode
              ? 'var(--main-padding-top-edit) var(--spacing-8) 0 calc(var(--edit-panel-width) + var(--spacing-8))'
              : 'var(--spacing-8) var(--spacing-8) 0 var(--spacing-8)',
            background: transparentMain ? 'transparent' : 'var(--bg-secondary)',
            transition: 'padding-left var(--transition-sidebar), padding-top var(--transition-panel)',
          }}
          onClick={onMainClick}
        >
          {children}
        </main>
        {filterPanel}
      </div>
      {modalOpen && <CustomersModal />}
      <ToastHost />
    </div>
  )
}
