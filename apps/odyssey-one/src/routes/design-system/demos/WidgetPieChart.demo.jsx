import { WidgetPieChart } from '@odyssey/ui'

export const meta = {
  name: 'WidgetPieChart',
  tier: 'molecule',
  version: '0.2.0',
  figmaNode: '1881:77',
  codeConnect: 'packages/ui/src/WidgetPieChart.figma.tsx',
}

export const props = [
  { name: 'segments', type: 'Array<{ value: number, color: string }>', desc: 'Segment data. color should be a Chart/* token (e.g. "var(--chart-1)").' },
  { name: 'size', type: "'md' | 'lg' | number", desc: 'Donut diameter. md=72px, lg=96px. Pass a number for ad-hoc sizes. Default md.' },
  { name: 'centerText', type: 'string', desc: 'Optional text rendered in the donut center (e.g. a percentage for a single-metric widget).' },
  { name: 'total', type: 'number', desc: 'Optional denominator. When segment values do not sum to 100%, pass total so the rest renders as --chart-rest.' },
  { name: 'delayMs', type: 'number', desc: 'Delay in ms before the grow-in animation fires. Default 0.' },
  { name: 'play', type: 'boolean', desc: 'Gates the grow-in animation (for lazy-load / scroll-into-view patterns). Default true.' },
]

export const tokens = [
  { token: '--chart-1', resolves: 'Chart/1', usage: 'segment 1 color' },
  { token: '--chart-2', resolves: 'Chart/2', usage: 'segment 2 color' },
  { token: '--chart-3', resolves: 'Chart/3', usage: 'segment 3 color' },
  { token: '--chart-4', resolves: 'Chart/4', usage: 'segment 4 color' },
  { token: '--chart-rest', resolves: 'Chart/rest', usage: 'background ring + unfilled arc when total > sum' },
]

const FOUR_SEGMENTS = [
  { value: 42, color: 'var(--chart-1)' },
  { value: 28, color: 'var(--chart-2)' },
  { value: 18, color: 'var(--chart-3)' },
  { value: 12, color: 'var(--chart-4)' },
]

const SINGLE_SEGMENT = [{ value: 67, color: 'var(--chart-1)' }]

export default function WidgetPieChartDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        SVG donut chart with a grow-in animation on mount. Segments accept any{' '}
        <code>--chart-N</code> color token. When segment values do not fill the
        ring, pass <code>total</code> so the remainder renders as{' '}
        <code>--chart-rest</code>.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Sizes — md (72px) vs lg (96px)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-end' }}>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <WidgetPieChart size="md" segments={FOUR_SEGMENTS} />
            <span className="ds-demo-label">md</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <WidgetPieChart size="lg" segments={FOUR_SEGMENTS} />
            <span className="ds-demo-label">lg</span>
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Center text (single-metric, partial ring)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-end' }}>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <WidgetPieChart
              size="md"
              segments={SINGLE_SEGMENT}
              total={100}
              centerText="67%"
            />
            <span className="ds-demo-label">md + centerText</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <WidgetPieChart
              size="lg"
              segments={SINGLE_SEGMENT}
              total={100}
              centerText="67%"
            />
            <span className="ds-demo-label">lg + centerText</span>
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Multi-segment — 4 chart tokens</h4>
        <div className="ds-demo-row" style={{ alignItems: 'center' }}>
          <WidgetPieChart size="lg" segments={FOUR_SEGMENTS} />
          <div className="ds-demo-col" style={{ gap: 'var(--spacing-2)' }}>
            {FOUR_SEGMENTS.map((seg, i) => (
              <div key={i} className="ds-demo-row" style={{ gap: 'var(--spacing-2)', alignItems: 'center' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                  {['Active', 'In Transit', 'Delayed', 'Delivered'][i]} — {seg.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
