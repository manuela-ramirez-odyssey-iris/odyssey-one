import { Widget } from '@odyssey/ui'
import { Package, Ship, Truck, Users, BarChart3, AlertCircle } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'

export const meta = {
  name: 'Widget',
  tier: 'organism',
  figmaNode: '1825:7',
  codeConnect: 'packages/ui/src/Widget.figma.tsx',
}

export const props = [
  { name: 'variant', type: "'1x'|'2x'|'3x'|'3xChart'|'3xCta'", desc: 'Widget size/layout variant. Drives the content shape and width class.' },
  { name: 'title', type: 'string', desc: 'Widget header title.' },
  { name: 'domainIcon', type: 'ReactNode', desc: 'Domain icon in the header (inline for 1x/2x; in a container for 3x/3xChart).' },
  { name: 'showGrip', type: 'boolean', desc: 'Show the GripVertical drag handle (edit-mode affordance). Default false.' },
  { name: 'onClose', type: '() => void', desc: 'Shows an X close button in the header when provided.' },
  { name: 'onGoToClick', type: '() => void', desc: 'Navigates to the source domain. In 1x this is the whole content area; in 2x/3x/3xChart it adds a footer "Go to" link.' },
  { name: 'goToLabel', type: 'string', desc: 'Label for the footer link button (non-1x variants).' },
  { name: 'value', type: 'string|number', desc: 'Primary metric value (1x, 2x, 3xChart). Animates count-up on mount.' },
  { name: 'label', type: 'string', desc: 'Metric label below the value (1x, 2x, 3xChart).' },
  { name: 'percentage', type: 'string|number', desc: '2x only — center text rendered inside the donut chart.' },
  { name: 'rows', type: 'Array<{ label, value, indicatorColor?, onClick? }>', desc: 'Stat rows for 3x and 3xChart variants.' },
  { name: 'chartSegments', type: 'Array<{ value, color }>', desc: 'Donut chart segments (2x, 3xChart). color = a Chart/* token.' },
  { name: 'chartTotal', type: 'number', desc: '2x only — implied total for a single-segment percentage chart.' },
  { name: 'showChart', type: 'boolean', desc: '2x only — hide the donut for stat-only widgets. Default true.' },
  { name: 'chartDelayMs', type: 'number', desc: 'Delay in ms before the donut grow-in animation starts. Default 0.' },
  { name: 'ctaRows', type: 'Array<{ icon, label, onClick }>', desc: '3xCta only — call-to-action link rows (up to 4).' },
  { name: 'editMode', type: 'boolean', desc: 'Forces grip on, dims CTAs, overlays a close button wired to onRemove. Default false.' },
  { name: 'onRemove', type: '() => void', desc: 'Called when the edit-mode close button is clicked.' },
]

export const tokens = [
  { token: '--widget-bg', resolves: 'white', usage: 'widget card background' },
  { token: '--widget-border', resolves: 'Border/subtle', usage: 'card border' },
  { token: '--widget-radius', resolves: 'radius/lg', usage: 'card corner radius' },
  { token: '--chart-1', resolves: 'Carolina Blue variant', usage: 'primary chart segment color' },
  { token: '--chart-2', resolves: 'Teal variant', usage: 'secondary chart segment color' },
  { token: '--chart-3', resolves: 'Sage variant', usage: 'third chart segment color' },
  { token: '--chart-rest', resolves: 'DSN/100', usage: 'unfilled remainder of donut arc' },
  { token: '--shadow-panel', resolves: 'shadow/panel', usage: 'card elevation' },
]

export default function WidgetDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Home dashboard widget with 5 layout variants. All variants share a common
        header (title, domain icon, optional grip + close) and differ in their
        content shape: scalar metric, metric + donut, multi-row stats, stat-donut
        legend, or call-to-action links. Count-up and donut grow-in animations fire
        once the widget scrolls into view.
      </p>

      {/* 1x */}
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">1x — scalar metric (content area is a navigation button)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <Widget
            variant="1x"
            title="Shipments"
            domainIcon={<Truck {...ICON_LG} />}
            value="1,284"
            label="Active shipments"
            onGoToClick={() => {}}
          />
          <Widget
            variant="1x"
            title="Carriers"
            domainIcon={<Ship {...ICON_LG} />}
            value="42"
            label="Active carriers"
            onGoToClick={() => {}}
          />
        </div>
      </div>

      {/* 2x */}
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">2x — metric + donut chart</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <Widget
            variant="2x"
            title="On-Time Delivery"
            domainIcon={<Package {...ICON_LG} />}
            value="847"
            label="Shipments on time"
            percentage="73%"
            chartSegments={[
              { value: 73, color: 'var(--chart-1)' },
              { value: 27, color: 'var(--chart-rest)' },
            ]}
            chartTotal={100}
            onGoToClick={() => {}}
            goToLabel="Go to Shipments"
          />
          <Widget
            variant="2x"
            title="Users Enrolled"
            domainIcon={<Users {...ICON_LG} />}
            value="142"
            label="Active users"
            showChart={false}
            onGoToClick={() => {}}
            goToLabel="Go to Users"
          />
        </div>
      </div>

      {/* 3x */}
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">3x — multi-row stat list</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <Widget
            variant="3x"
            title="Shipments"
            domainIcon={<Truck {...ICON_LG} />}
            rows={[
              { label: 'In Transit', value: '518' },
              { label: 'At Risk', value: '34' },
              { label: 'Delayed', value: '12' },
              { label: 'Delivered', value: '720' },
            ]}
            onGoToClick={() => {}}
            goToLabel="Go to Shipments"
          />
        </div>
      </div>

      {/* 3xChart */}
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">3xChart — large donut + legend rows</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <Widget
            variant="3xChart"
            title="Carrier Mix"
            domainIcon={<BarChart3 {...ICON_LG} />}
            value="1,284"
            label="Total shipments"
            chartSegments={[
              { value: 540, color: 'var(--chart-1)' },
              { value: 360, color: 'var(--chart-2)' },
              { value: 240, color: 'var(--chart-3)' },
              { value: 144, color: 'var(--chart-4)' },
            ]}
            rows={[
              { label: 'XPO Logistics', value: '540', indicatorColor: 'var(--chart-1)' },
              { label: 'Werner', value: '360', indicatorColor: 'var(--chart-2)' },
              { label: 'J.B. Hunt', value: '240', indicatorColor: 'var(--chart-3)' },
              { label: 'Other', value: '144', indicatorColor: 'var(--chart-4)' },
            ]}
            onGoToClick={() => {}}
            goToLabel="Go to Carriers"
          />
        </div>
      </div>

      {/* 3xCta */}
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">3xCta — call-to-action link rows (no chart, no data)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <Widget
            variant="3xCta"
            title="Quick Actions"
            ctaRows={[
              { icon: <Truck {...ICON_LG} />, label: 'View active shipments', onClick: () => {} },
              { icon: <AlertCircle {...ICON_LG} />, label: 'Review exceptions', onClick: () => {} },
              { icon: <Ship {...ICON_LG} />, label: 'Manage carriers', onClick: () => {} },
              { icon: <Users {...ICON_LG} />, label: 'User management', onClick: () => {} },
            ]}
          />
        </div>
      </div>

      {/* Edit mode */}
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Edit mode — grip handle + remove button active</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <Widget
            variant="1x"
            title="Shipments"
            domainIcon={<Truck {...ICON_LG} />}
            value="1,284"
            label="Active shipments"
            editMode
            onRemove={() => {}}
          />
          <Widget
            variant="2x"
            title="On-Time Delivery"
            domainIcon={<Package {...ICON_LG} />}
            value="847"
            label="Shipments on time"
            percentage="73%"
            chartSegments={[
              { value: 73, color: 'var(--chart-1)' },
              { value: 27, color: 'var(--chart-rest)' },
            ]}
            chartTotal={100}
            editMode
            onRemove={() => {}}
          />
        </div>
      </div>
    </div>
  )
}
