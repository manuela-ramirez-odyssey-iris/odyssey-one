import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useEditMode } from '../../contexts/EditModeContext.jsx'

export default function AppShell({ children, filterPanel, onMainClick }) {
  const { isEditMode } = useEditMode()
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        {!isEditMode && <Sidebar />}
        <main
          className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto flex flex-col"
          style={{
            padding: isEditMode
              ? 'var(--spacing-8) var(--spacing-6) 0 calc(var(--edit-panel-width) + var(--spacing-6))'
              : 'var(--spacing-8) var(--spacing-6) 0 var(--spacing-6)',
            background: 'var(--bg-secondary)',
          }}
          onClick={onMainClick}
        >
          {children}
        </main>
        {filterPanel}
      </div>
    </div>
  )
}
