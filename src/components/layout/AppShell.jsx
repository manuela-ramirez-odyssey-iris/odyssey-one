import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function AppShell({ children, filterPanel, onMainClick }) {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto flex flex-col"
          style={{ padding: 'var(--spacing-6) var(--spacing-6) 0 var(--spacing-6)', background: 'var(--bg-secondary)' }}
          onClick={onMainClick}>
          {children}
        </main>
        {filterPanel}
      </div>
    </div>
  )
}
