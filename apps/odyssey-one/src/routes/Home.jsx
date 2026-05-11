import { Plus } from 'lucide-react'
import { Button, EntityChip, PageHeader, SectionHeader } from '@odyssey/ui'
import AppShell from '../components/layout/AppShell'
import './Home.css'

export default function Home() {
  return (
    <AppShell>
      <PageHeader title="Home" className="home-page-header" />
      <SectionHeader
        title="Welcome Amy!"
        supportingText="Last update: 04/24/2026 03:51 PM"
        leadingActions={
          <Button variant="primary" size="md" icon={<Plus />}>
            Add Widgets
          </Button>
        }
        trailingActions={
          <EntityChip
            name="Customers"
            count={5}
            onAddClick={() => console.log('add customer')}
          />
        }
      />
    </AppShell>
  )
}
