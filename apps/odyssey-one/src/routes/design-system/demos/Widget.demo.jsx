import { Widget } from '@odyssey/ui'
import { Package, Ship, Truck, Users, BarChart3, AlertCircle } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'

export const meta = {
  name: 'Widget',
  tier: 'organism',
  version: '0.2.0',
  createdVersion: '0.2.0',
  figmaNode: '1825:7',
  codeConnect: 'packages/ui/src/Widget.figma.tsx',
  normalizing: true,
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
  { name: 'chartDelayMs', type: 'number', desc: 'Delay in ms before the entry animations (count-up + donut grow-in) start, so both begin together. Default 0.' },
  { name: 'ctaRows', type: 'Array<{ icon, label, onClick }>', desc: '3xCta only — call-to-action link rows (up to 4).' },
  { name: 'selected', type: 'boolean', default: 'false', desc: "Active-filter state, mirroring WidgetMini's `selected` axis — for consumers that use a ROW of widgets as the filter control (the Shipments PGI/PGR category row). Appearance only: border COLOUR + shadow, never the border width, so selecting a card cannot resize it or reflow the row. Code-only extension — the Figma master has no selected axis yet (Pending Figma Sync)." },
  { name: 'editMode', type: 'boolean', desc: 'Forces grip on, dims CTAs, overlays a close button wired to onRemove. Default false.' },
  { name: 'onRemove', type: '() => void', desc: 'Called when the edit-mode close button is clicked.' },
]

export const tokens = [
  { token: '--widget-bg', resolves: 'white', usage: 'widget card background' },
  { token: '--widget-border', resolves: 'Border/subtle', usage: 'card border' },
  { token: '--widget-radius', resolves: 'radius/lg', usage: 'card corner radius' },
  { token: '--chart-1', resolves: 'Ice Blue 600', usage: 'chart segment + matching indicator dot' },
  { token: '--chart-2', resolves: 'Ice Blue 200', usage: 'chart segment + matching indicator dot' },
  { token: '--chart-3', resolves: 'Tan Hide 600', usage: 'chart segment + matching indicator dot' },
  { token: '--chart-4', resolves: 'Tan Hide 300', usage: 'chart segment + matching indicator dot' },
  { token: '--chart-5', resolves: 'Caribbean Green 600', usage: 'chart segment + matching indicator dot' },
  { token: '--chart-6', resolves: 'Caribbean Green 200', usage: 'chart segment + matching indicator dot' },
  { token: '--chart-7', resolves: 'Sunrise Yellow 600', usage: 'chart segment + matching indicator dot' },
  { token: '--chart-8', resolves: 'Sunrise Yellow 300', usage: 'chart segment + matching indicator dot' },
  { token: '--chart-9', resolves: 'Purple 800', usage: 'chart segment + matching indicator dot' },
  { token: '--chart-10', resolves: 'Bittersweet 600', usage: 'chart segment + matching indicator dot' },
  { token: '--chart-11', resolves: 'Bittersweet 300', usage: 'chart segment + matching indicator dot' },
  { token: '--chart-rest', resolves: 'DSN/200', usage: 'unfilled remainder of donut arc — never a legend color' },
  { token: '--widget-height-max', resolves: '420px', usage: 'height ceiling for 3x / 3xChart / 3xCta' },
  { token: '--shadow-panel', resolves: 'shadow/panel', usage: 'card elevation' },
]

// One metric per chart color. Eleven rows in a shell that fits four is the point:
// the legend scrolls rather than the widget growing.
const METRICS = [
  { label: 'Date Issues', value: 312, indicatorColor: 'var(--chart-1)' },
  { label: 'Routing Review', value: 244, indicatorColor: 'var(--chart-2)' },
  { label: 'Tender Issues', value: 198, indicatorColor: 'var(--chart-3)' },
  { label: 'Tender Review', value: 160, indicatorColor: 'var(--chart-4)' },
  { label: 'Bid Review', value: 124, indicatorColor: 'var(--chart-5)' },
  { label: 'Rating Failure', value: 98, indicatorColor: 'var(--chart-6)' },
  { label: 'PGI/PGR Errors', value: 82, indicatorColor: 'var(--chart-7)' },
  { label: 'Manual PGI/PGR', value: 66, indicatorColor: 'var(--chart-8)' },
  { label: 'Carrier Rejected', value: 54, indicatorColor: 'var(--chart-9)' },
  { label: 'Missing Documents', value: 40, indicatorColor: 'var(--chart-10)' },
  { label: 'Rate Expired', value: 28, indicatorColor: 'var(--chart-11)' },
]

// 3x has no donut, so its rows carry no indicator — the point here is purely that
// the shell stops at the ceiling and the list scrolls under a pinned header/link.
const MANY_ROWS = Array.from({ length: 14 }, (_, i) => ({
  label: ['In Transit', 'At Risk', 'Delayed', 'Delivered', 'Booked', 'Tendered', 'Picked Up', 'At Consignee',
    'Awaiting POD', 'Short Shipped', 'Damaged', 'Refused', 'Reconsigned', 'Closed'][i],
  value: String(720 - i * 47),
}))

const MANY_CTAS = (icons) => [
  'View active shipments', 'Review exceptions', 'Manage carriers', 'User management',
  'Create an order', 'Track a shipment', 'Run a report', 'Open the spot board', 'Bulk tender',
].map((label, i) => ({ icon: icons[i % icons.length], label, onClick: () => {} }))

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

      {/* Height ceiling + full palette */}
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Height ceiling — the ceiling across all three variants</h4>
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          No widget grows past <code>--widget-height-max</code> (420px). Past that the content
          scrolls inside its own region while the header — and the Go-to link, where the
          variant has one — stay pinned. All three 2×2-span variants are shown here
          overflowing, since the rule is a height ceiling and not a row count.
        </p>
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          <strong>3xChart</strong> scrolls its legend <em>only</em> — the chart section is
          pinned, because scrolling the donut away would strand the rows that explain it.
          <strong> 3x</strong> and <strong>3xCta</strong> have no donut, so the whole content
          scrolls. The 3xChart below also carries the full eleven-colour palette: one metric
          per colour, never repeated, since the colour is what separates them.
          <code>--chart-rest</code> is the donut&rsquo;s unfilled remainder and is never a
          legend colour.
        </p>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <Widget
            variant="3xChart"
            title="Shipment Exceptions"
            domainIcon={<AlertCircle {...ICON_LG} />}
            value="1,284"
            label="Total exceptions"
            chartSegments={METRICS.map((r) => ({ value: r.value, color: r.indicatorColor }))}
            rows={METRICS.map((r) => ({ ...r, value: String(r.value) }))}
            onGoToClick={() => {}}
            goToLabel="Go to Shipments"
          />
          <Widget
            variant="3x"
            title="Shipments"
            domainIcon={<Truck {...ICON_LG} />}
            rows={MANY_ROWS}
            onGoToClick={() => {}}
            goToLabel="Go to Shipments"
          />
          <Widget
            variant="3xCta"
            title="Quick Actions"
            ctaRows={MANY_CTAS([
              <Truck {...ICON_LG} />, <AlertCircle {...ICON_LG} />,
              <Ship {...ICON_LG} />, <Users {...ICON_LG} />, <Package {...ICON_LG} />,
            ])}
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
