import { useEffect, useState } from 'react'

/**
 * WidgetPieChart — molecule. SVG donut chart used inside Widget 2x and 3xChart.
 * - Segments grow in on mount (stroke-dasharray transitions from 0 to final length).
 * - The whole chart scales on hover via CSS (`.widget__pie:hover`).
 * - Sizes match the Figma `Size` variant: md = 72, lg = 96 (stroke ≈ 18% of size).
 *
 * Props:
 *   segments       — array of { value, color }. `color` is a Chart/* token (e.g. 'var(--chart-1)').
 *   centerText     — optional text rendered in the donut center (Widget 2x percentage).
 *   size           — 'md' | 'lg' | number. md=72, lg=96. Number passes through for ad-hoc sizes.
 *   total          — optional denominator. When the sum of segment values does NOT cover the
 *                    whole circle (e.g. 2x single-data: one 42-value segment of an implied 100),
 *                    pass `total={100}` so the segment renders as 42% of the ring and the rest
 *                    shows as `--chart-rest`. Defaults to the sum of segment values.
 *
 * Figma master: `WidgetPieChart` component set (1881:77) with `Size=md|lg`,
 * `Show center text` BOOLEAN, `Center text` TEXT.
 */
export default function WidgetPieChart({ segments = [], centerText, size = 'md', total, delayMs = 0, play = true }) {
  const px = size === 'md' ? 72 : size === 'lg' ? 96 : size
  const segmentSum = segments.reduce((sum, s) => sum + (s.value || 0), 0)
  const denominator = total ?? segmentSum ?? 1
  const radius = px / 2
  const strokeWidth = px * 0.18
  const innerRadius = radius - strokeWidth / 2
  const circumference = 2 * Math.PI * innerRadius
  // Grow-in on mount: segments transition from "0 circumference" to their final
  // length once `animatedIn` flips on the next frame. To replay the grow-in when
  // the data changes asynchronously, the consumer remounts this component via a
  // data-derived `key` (see Widget) — a fresh mount paints at 0 first, then animates.
  // `play` gates the grow-in (set by the consumer once the widget scrolls into
  // view — lazy-load behavior). Until play is true the segments stay at 0.
  const [animatedIn, setAnimatedIn] = useState(false)
  useEffect(() => {
    if (!play) return
    if (delayMs > 0) {
      const t = setTimeout(() => setAnimatedIn(true), delayMs)
      return () => clearTimeout(t)
    }
    const id = requestAnimationFrame(() => setAnimatedIn(true))
    return () => cancelAnimationFrame(id)
  }, [play])
  let offset = 0
  return (
    <span className="widget__pie" style={{ width: px, height: px }}>
      <svg viewBox={`0 0 ${px} ${px}`} width={px} height={px}>
        <circle
          cx={radius}
          cy={radius}
          r={innerRadius}
          fill="none"
          stroke="var(--chart-rest)"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg, i) => {
          const length = (seg.value / denominator) * circumference
          const dasharray = animatedIn
            ? `${length} ${circumference - length}`
            : `0 ${circumference}`
          const segOffset = (offset / denominator) * circumference
          offset += seg.value
          return (
            <circle
              key={i}
              className="widget__pie-segment"
              cx={radius}
              cy={radius}
              r={innerRadius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dasharray}
              strokeDashoffset={-segOffset}
              transform={`rotate(-90 ${radius} ${radius})`}
            />
          )
        })}
      </svg>
      {centerText && (
        <span className="widget__pie-center text-label-sm-medium">{centerText}</span>
      )}
    </span>
  )
}
