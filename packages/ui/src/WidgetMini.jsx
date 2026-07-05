import { useEffect, useRef, useState } from 'react'
import WidgetPieChart from './WidgetPieChart.jsx'
import { CountUp } from './Widget.jsx'

/**
 * WidgetMini — molecule. A compact clickable metric card: big count + label on the
 * left, a slim 64px donut showing the metric's share on the right. Used on the
 * Shipments page as the "Widget mode" rendering of the category filter row
 * (replacing the retired MonitorPanels). Deliberately NOT a `Widget` variant —
 * Widget is a passive dashboard summary with header chrome (grip/title/close/go-to);
 * WidgetMini is a filter toggle with a `selected` state and no header. They share
 * the WidgetPieChart primitive, per the share-the-primitive rule. Not offered in
 * the Home widget picker.
 *
 * Hover/pressed are CSS-only; `selected` is the only stateful appearance prop
 * (border swaps to DSN/900 + shadow/sm), mirroring the Figma `State` axis.
 *
 * Figma master: `WidgetMini` set 4103:5027 (Components-Molecules),
 * `State=Default|Selected` + `Value`/`Label`/`Percentage` TEXT props.
 *
 * Props:
 *   value      — the metric count (string | number). Counts up on load (Widget's
 *                CountUp sweep) and recounts with the donut on activation.
 *   label      — the metric name under the count.
 *   percentage — 0–100; drives the donut sweep and the "N%" center text.
 *   selected   — active-filter state (aria-pressed). Becoming selected replays
 *                the donut grow-in (chart remounts on the false→true transition).
 *   onClick    — click handler; the card renders as a <button>.
 *   showChart  — escape hatch for metrics without a share (default true).
 *   chartColor — donut arc color token (default 'var(--ice-blue-600)', the Figma binding).
 */
export default function WidgetMini({
  value,
  label,
  percentage,
  selected = false,
  onClick,
  showChart = true,
  chartColor = 'var(--ice-blue-600)',
  className = '',
  ...rest
}) {
  const classes = [
    'widget-mini',
    selected && 'widget-mini--selected',
    className,
  ].filter(Boolean).join(' ')
  const pct = Math.max(0, Math.min(100, Math.round(percentage ?? 0)))

  // Replay the entry animation (donut grow-in + value/percentage count-up)
  // whenever the card becomes selected: bump a key on the false→true transition
  // only (WidgetPieChart's documented remount-to-replay contract; CountUp rides
  // the same remount) — deselecting or first mount doesn't double-paint.
  const prevSelected = useRef(selected)
  const [paintKey, setPaintKey] = useState(0)
  useEffect(() => {
    if (selected && !prevSelected.current) setPaintKey(k => k + 1)
    prevSelected.current = selected
  }, [selected])
  return (
    <button type="button" className={classes} aria-pressed={selected} onClick={onClick} {...rest}>
      <span className="widget-mini__metric">
        <span className="widget-mini__value"><CountUp key={paintKey} value={value} /></span>
        <span className="widget-mini__label text-label-xs-medium">{label}</span>
      </span>
      {showChart && percentage != null && (
        <WidgetPieChart
          key={paintKey}
          size={64}
          strokeWidth={9}
          segments={[{ value: pct, color: chartColor }]}
          total={100}
          centerText={<CountUp value={`${pct}%`} />}
        />
      )}
    </button>
  )
}
