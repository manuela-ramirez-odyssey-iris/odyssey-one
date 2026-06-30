import Navbar from './Navbar'
import Sidebar from './Sidebar'
import CustomersModal from '../CustomersModal'
import { useEditMode } from '../../contexts/EditModeContext.jsx'
import { useCustomers } from '../../contexts/CustomersContext.jsx'

export default function AppShell({ children, filterPanel, onMainClick, transparentMain = false, searchSlot }) {
  const { isEditMode } = useEditMode()
  const { modalOpen } = useCustomers()
  return (
    <div className="flex flex-col h-screen">
      <Navbar searchSlot={searchSlot} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!isEditMode && <Sidebar />}
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
