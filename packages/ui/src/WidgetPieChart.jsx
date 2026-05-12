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
 *
 * Figma master: `WidgetPieChart` component set (1881:77) with `Size=md|lg`,
 * `Show center text` BOOLEAN, `Center text` TEXT.
 */
export default function WidgetPieChart({ segments = [], centerText, size = 'md' }) {
  const px = size === 'md' ? 72 : size === 'lg' ? 96 : size
  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0) || 1
  const radius = px / 2
  const strokeWidth = px * 0.18
  const innerRadius = radius - strokeWidth / 2
  const circumference = 2 * Math.PI * innerRadius
  const [animatedIn, setAnimatedIn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimatedIn(true))
    return () => cancelAnimationFrame(id)
  }, [])
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
          const length = (seg.value / total) * circumference
          const dasharray = animatedIn
            ? `${length} ${circumference - length}`
            : `0 ${circumference}`
          const segOffset = (offset / total) * circumference
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
