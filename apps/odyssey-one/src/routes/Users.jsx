import { PageHeader } from '@odyssey/ui'
import { useLocation } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import './route-stub.css'

// User Management is the first domain with a real submenu, so its sections are
// real routes rather than one stub — the sidebar's second and third levels have
// to land somewhere for the disclosure to mean anything. One component covers
// all five: the pages are stubs, and five identical files would be five files
// to change when they stop being stubs.
const SECTIONS = {
  '/users/accounts': 'Users Accounts',
  '/users/access/domains': 'Domains',
  '/users/access/resources': 'Resources',
  '/users/access/user-sets': 'User Sets',
  '/users/access/roles': 'Roles',
}

export default function Users() {
  const { pathname } = useLocation()
  const title = SECTIONS[pathname] ?? 'User Management'

  return (
    <AppShell>
      <div className="route-stub">
        <PageHeader title={title} />
        <p>Coming soon.</p>
      </div>
    </AppShell>
  )
}
