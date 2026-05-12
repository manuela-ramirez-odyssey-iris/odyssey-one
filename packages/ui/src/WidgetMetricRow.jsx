import { ChevronRight } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import Badge from './Badge.jsx'

/**
 * WidgetMetricRow — molecule. Single data row inside Widget 3x / 3xChart content:
 * optional indicator dot + label + inline value Badge (metric variant) + trailing chevron.
 *
 * Polymorphic: renders as `<button>` when `onClick` is provided, `<div>` otherwise.
 * Indicator color is consumer-driven (defaults to `--chart-1`); pass a chart token
 * (`'var(--chart-2)'` etc.) when the row is part of a multi-segment chart legend.
 */
export default function WidgetMetricRow({
  label,
  value,
  showIndicator = false,
  indicatorColor = 'var(--chart-1)',
  onClick,
  className = '',
  ...rest
}) {
  const isInteractive = typeof onClick === 'function'
  const Tag = isInteractive ? 'button' : 'div'
  const classes = [
    'widget-metric-row',
    isInteractive && 'widget-metric-row--interactive',
    className,
  ].filter(Boolean).join(' ')

  return (
    <Tag
      {...(isInteractive ? { type: 'button', onClick } : {})}
      className={classes}
      {...rest}
    >
      <span className="widget-metric-row__label-group">
        {showIndicator && (
          <span
            className="widget-metric-row__indicator"
            style={{ background: indicatorColor }}
            aria-hidden="true"
          />
        )}
        <span className="widget-metric-row__label text-label-sm-regular">{label}</span>
      </span>
      <span className="widget-metric-row__trailing">
        <Badge variant="metric">{value}</Badge>
        <ChevronRight {...ICON_MD} className="widget-metric-row__chevron" aria-hidden="true" />
      </span>
    </Tag>
  )
}
