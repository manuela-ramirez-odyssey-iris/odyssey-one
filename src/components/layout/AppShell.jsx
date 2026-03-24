import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function AppShell({ children }) {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto flex flex-col"
          style={{ padding: '24px 24px 0 64px', background: 'var(--bg-secondary)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
