import { ArrowRight, GripVertical, X } from 'lucide-react'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'
import Button from './Button.jsx'
import WidgetMetricRow from './WidgetMetricRow.jsx'
import WidgetPieChart from './WidgetPieChart.jsx'

/**
 * Widget — molecule. Unified Home dashboard widget with 4 variants (1x / 2x / 3x / 3xChart).
 *
 * The shell (header + footer) and content are intentionally bundled into one component:
 * resizing in the UI is a `variant` prop change, not a component swap. Figma mirrors this
 * as a single component set with `Variant=1x|2x|3x|3xChart`.
 *
 * Common props:  variant, title, domainIcon, showGrip, onClose, onGoToClick, goToLabel
 * 1x:            value, label                                          (Header arrow takes you to source)
 * 2x:            value, label, percentage, chartSegments               (small donut beside metric)
 * 3x:            rows (array of { label, value, indicatorColor? })     (4-6 rows of stats)
 * 3xChart:       value, label, rows, chartSegments                     (donut + multi-row legend)
 *
 * `rows` items: { label, value, indicatorColor?, onClick? }
 * `chartSegments` items: { value, color } — color is a Chart/* token (e.g. 'var(--chart-1)')
 */
export default function Widget({
  variant = '1x',
  title = '',
  domainIcon,
  // Grip + close button are edit-mode-only affordances. Default off; consumers
  // in an "edit a view profile" mode pass showGrip={true} + onClose={fn} to enable.
  showGrip = false,
  onClose,
  onGoToClick,
  goToLabel,
  // Content props (used per variant)
  value,
  label,
  percentage,
  rows = [],
  chartSegments = [],
  className = '',
  ...rest
}) {
  const cls = `widget widget--${variant} ${className}`.trim()
  return (
    <div className={cls} {...rest}>
      <Header
        variant={variant}
        title={title}
        domainIcon={domainIcon}
        showGrip={showGrip}
        onClose={onClose}
      />
      <Content
        variant={variant}
        value={value}
        label={label}
        percentage={percentage}
        rows={rows}
        chartSegments={chartSegments}
        onGoToClick={onGoToClick}
      />
      {variant !== '1x' && onGoToClick && goToLabel && (
        <Button
          variant="link"
          size="sm"
          iconRight={<ArrowRight {...ICON_MD} />}
          onClick={onGoToClick}
        >
          {goToLabel}
        </Button>
      )}
    </div>
  )
}

function Header({ variant, title, domainIcon, showGrip, onClose }) {
  const titleClass =
    variant === '1x' ? 'text-label-xs-medium'
    : variant === '2x' ? 'text-label-sm-medium'
    : 'text-heading-lg-medium' // 3x / 3xChart
  const showDomainIconContainer = variant === '3x' || variant === '3xChart'

  return (
    <header className="widget__header">
      <div className="widget__header-title">
        {showGrip && <GripVertical {...ICON_LG} className="widget__grip" aria-hidden="true" />}
        {showDomainIconContainer ? (
          <span className="widget__domain-icon-container">
            {domainIcon}
          </span>
        ) : (
          variant === '2x' && domainIcon && <span className="widget__domain-icon">{domainIcon}</span>
        )}
        <span className={`widget__title ${titleClass}`}>{title}</span>
      </div>
      {onClose && (
        <button
          type="button"
          className="widget__close"
          onClick={onClose}
          aria-label="Remove widget"
        >
          <X {...ICON_LG} aria-hidden="true" />
        </button>
      )}
    </header>
  )
}

function Content({ variant, value, label, percentage, rows, chartSegments, onGoToClick }) {
  if (variant === '1x') {
    return (
      <button
        type="button"
        className="widget__content widget__content--1x"
        onClick={onGoToClick}
        disabled={!onGoToClick}
      >
        <span className="widget__value-row">
          <span className="text-display-3xl-semibold widget__value">{value}</span>
          <ArrowRight {...ICON_MD} className="widget__inline-arrow" aria-hidden="true" />
        </span>
        <span className="text-label-sm-regular widget__label">{label}</span>
      </button>
    )
  }
  if (variant === '2x') {
    return (
      <div className="widget__content widget__content--2x">
        <div className="widget__data-container">
          <span className="text-display-3xl-semibold widget__value">{value}</span>
          <span className="text-label-sm-medium widget__label">{label}</span>
        </div>
        <WidgetPieChart segments={chartSegments} centerText={percentage} size="md" />
      </div>
    )
  }
  if (variant === '3x') {
    return (
      <div className="widget__content widget__content--3x">
        {rows.map((row, i) => (
          <WidgetMetricRow
            key={i}
            label={row.label}
            value={row.value}
            showIndicator={false}
            onClick={row.onClick}
          />
        ))}
      </div>
    )
  }
  if (variant === '3xChart') {
    return (
      <div className="widget__content widget__content--3xChart">
        <div className="widget__chart-section">
          <div className="widget__info-container">
            <span className="text-display-4xl-semibold widget__value">{value}</span>
            <span className="text-label-sm-medium widget__label">{label}</span>
          </div>
          <WidgetPieChart segments={chartSegments} size="lg" />
        </div>
        <div className="widget__data-section">
          {rows.map((row, i) => (
            <WidgetMetricRow
              key={i}
              label={row.label}
              value={row.value}
              showIndicator={true}
              indicatorColor={row.indicatorColor}
              onClick={row.onClick}
            />
          ))}
        </div>
      </div>
    )
  }
  return null
}

