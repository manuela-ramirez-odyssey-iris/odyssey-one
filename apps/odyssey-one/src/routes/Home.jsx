import { Download, Plus, Route, TriangleAlert, UserCog } from 'lucide-react'
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

// 3xChart widget — multi-data, all 4 segments visible.
const chartSegments = [
  { value: 42, color: 'var(--chart-1)' },
  { value: 28, color: 'var(--chart-2)' },
  { value: 18, color: 'var(--chart-3)' },
  { value: 12, color: 'var(--chart-4)' },
]

// 2x widget — single-data view (one metric = one filled segment in chart-1).
// Matches WidgetPieChart md Figma variant which has exactly one Chart/1 segment + Chart/rest ring.
const singleChartSegment = [{ value: 42, color: 'var(--chart-1)' }]

// 3xCta widget — call-to-action quick links. Action-oriented labels to ease
// onboarding for users coming from the old system. No data attached.
const ctaRows = [
  { icon: <Plus size={20} />, label: 'Create a New Order', onClick: handleRow('create-order') },
  { icon: <Route size={20} />, label: 'Track a Shipment', onClick: handleRow('track-shipment') },
  { icon: <UserCog size={20} />, label: 'Manage Users', onClick: handleRow('manage-users') },
  { icon: <Download size={20} />, label: 'Invoices', onClick: handleRow('invoices') },
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
          title="Open Exceptions"
          value="83"
          label="Across all customers"
          onGoToClick={() => console.log('go to exceptions')}
        />
        <Widget
          variant="2x"
          title="Critical Exceptions"
          domainIcon={domainIcon}
          value="12"
          label="Need action today"
          percentage="42%"
          chartSegments={singleChartSegment}
          chartTotal={100}
          goToLabel="Go to Exceptions"
          onGoToClick={() => console.log('go to exceptions')}
        />
        <Widget
          variant="3x"
          title="Exceptions by Type"
          domainIcon={domainIcon}
          rows={exceptionRows}
          goToLabel="Go to Exceptions"
          onGoToClick={() => console.log('go to exceptions')}
        />
        <Widget
          variant="3xChart"
          title="Exception Causes (7d)"
          domainIcon={domainIcon}
          value="156"
          label="Total this week"
          chartSegments={chartSegments}
          rows={chartRows}
          goToLabel="Go to Exceptions"
          onGoToClick={() => console.log('go to exceptions')}
        />
        <Widget
          variant="3xCta"
          title="What would you like to do?"
          ctaRows={ctaRows}
        />
      </div>
    </AppShell>
  )
}
