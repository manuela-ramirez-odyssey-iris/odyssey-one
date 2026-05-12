import { Plus, TriangleAlert } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import { Button, EntityChip, PageHeader, SectionHeader, Widget } from '@odyssey/ui'
import AppShell from '../components/layout/AppShell'
import './Home.css'

const domainIcon = <TriangleAlert {...ICON_LG} />

const handleRow = (label) => () => console.log('drill into', label)

const exceptionRows = [
  { label: 'Date issues', value: '23', onClick: handleRow('date-issues') },
  { label: 'Missing documents', value: '17', onClick: handleRow('missing-docs') },
  { label: 'Stops at risk', value: '12', onClick: handleRow('stops-at-risk') },
  { label: 'Tender rejections', value: '8', onClick: handleRow('tender-rej') },
]

const chartRows = [
  { label: 'Carrier delay', value: '42%', indicatorColor: 'var(--chart-1)', onClick: handleRow('carrier-delay') },
  { label: 'Customer hold', value: '28%', indicatorColor: 'var(--chart-2)', onClick: handleRow('customer-hold') },
  { label: 'Document missing', value: '18%', indicatorColor: 'var(--chart-3)', onClick: handleRow('doc-missing') },
  { label: 'Other', value: '12%', indicatorColor: 'var(--chart-4)', onClick: handleRow('other') },
]

const chartSegments = [
  { value: 42, color: 'var(--chart-1)' },
  { value: 28, color: 'var(--chart-2)' },
  { value: 18, color: 'var(--chart-3)' },
  { value: 12, color: 'var(--chart-4)' },
]

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
      <div className="home-widget-grid">
        <Widget
          variant="1x"
          title="Open exceptions"
          value="83"
          label="Across all customers"
          onGoToClick={() => console.log('go to exceptions')}
        />
        <Widget
          variant="2x"
          title="Critical exceptions"
          domainIcon={domainIcon}
          value="12"
          label="Need action today"
          percentage="42%"
          chartSegments={chartSegments}
          goToLabel="Go to exceptions"
          onGoToClick={() => console.log('go to exceptions')}
        />
        <Widget
          variant="3x"
          title="Exceptions by type"
          domainIcon={domainIcon}
          rows={exceptionRows}
          goToLabel="Go to exceptions"
          onGoToClick={() => console.log('go to exceptions')}
        />
        <Widget
          variant="3xChart"
          title="Exception causes (7d)"
          domainIcon={domainIcon}
          value="156"
          label="Total this week"
          chartSegments={chartSegments}
          rows={chartRows}
          goToLabel="Go to exceptions"
          onGoToClick={() => console.log('go to exceptions')}
        />
      </div>
    </AppShell>
  )
}
