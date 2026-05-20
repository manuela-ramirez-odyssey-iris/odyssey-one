import { ArrowRight, GripVertical, X } from 'lucide-react'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'
import Button from './Button.jsx'
import IconButtonGhost from './IconButtonGhost.jsx'
import WidgetMetricRow from './WidgetMetricRow.jsx'
import WidgetPieChart from './WidgetPieChart.jsx'
import WidgetCtaRow from './WidgetCtaRow.jsx'

/**
 * Widget — molecule. Unified Home dashboard widget with 5 variants (1x / 2x / 3x / 3xChart / 3xCta).
 *
 * The shell (header + footer) and content are intentionally bundled into one component:
 * resizing in the UI is a `variant` prop change, not a component swap. Figma mirrors this
 * as a single component set with `Variant=1x|2x|3x|3xChart|3xCta`.
 *
 * Common props:  variant, title, domainIcon, showGrip, onClose, onGoToClick, goToLabel
 * 1x:            value, label                                          (Header arrow takes you to source)
 * 2x:            value, label, percentage, chartSegments               (small donut beside metric)
 * 3x:            rows (array of { label, value, indicatorColor? })     (4-6 rows of stats)
 * 3xChart:       value, label, rows, chartSegments                     (donut + multi-row legend)
 * 3xCta:         ctaRows (array of { icon, label, onClick })           (4 link rows, no chart, no data)
 *
 * `rows` items: { label, value, indicatorColor?, onClick? }
 * `chartSegments` items: { value, color } — color is a Chart/* token (e.g. 'var(--chart-1)')
 * `ctaRows` items: { icon (ReactNode), label (string), onClick (fn) } — call-to-action links.
 *   The 3xCta shell drops outer padding so rows can sit flush against the divider lines.
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
  ctaRows = [],
  chartSegments = [],
  // Optional denominator for the chart. Use for 2x single-data views where the
  // segment value (e.g. 42) represents a fraction of an implied whole (e.g. 100),
  // so the chart shows 42% filled + 58% chart-rest. Omit for 3xChart where the
  // segments already sum to the total.
  chartTotal,
  // 2x only — hide the donut for stat-only widgets (e.g. Users Enrolled: 142
  // with no percentage). Maps to the Figma `Show chart` BOOLEAN on WidgetContent 2x.
  showChart = true,
  // Edit mode — Home dashboard "Add Widgets" flow. Forces grip on, dims CTAs to
  // non-interactive, and overlays a top-right close button wired to onRemove.
  editMode = false,
  onRemove,
  className = '',
  ...rest
}) {
  const cls = `widget widget--${variant} ${className}`.trim()
  const editAttrs = editMode ? { 'data-edit-mode': 'true' } : {}
  return (
    <div className={cls} {...editAttrs} {...rest}>
      <Header
        variant={variant}
        title={title}
        domainIcon={domainIcon}
        showGrip={showGrip || editMode}
        onClose={editMode ? onRemove : onClose}
      />
      <Content
        variant={variant}
        value={value}
        label={label}
        percentage={percentage}
        rows={rows}
        ctaRows={ctaRows}
        chartSegments={chartSegments}
        chartTotal={chartTotal}
        showChart={showChart}
        onGoToClick={onGoToClick}
      />
      {variant !== '1x' && variant !== '3xCta' && onGoToClick && goToLabel && (
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
  const showInlineDomainIcon = (variant === '1x' || variant === '2x') && domainIcon

  return (
    <header className="widget__header">
      <div className="widget__header-title">
        {showGrip && <GripVertical {...ICON_LG} className="widget__grip" aria-hidden="true" />}
        {showDomainIconContainer ? (
          <span className="widget__domain-icon-container">
            {domainIcon}
          </span>
        ) : (
          showInlineDomainIcon && <span className="widget__domain-icon">{domainIcon}</span>
        )}
        <span className={`widget__title ${titleClass}`}>{title}</span>
      </div>
      {onClose && (
        <IconButtonGhost
          icon={<X {...ICON_LG} aria-hidden="true" />}
          onClick={onClose}
          ariaLabel="Remove widget"
          className="widget__close"
        />
      )}
    </header>
  )
}

function Content({ variant, value, label, percentage, rows, ctaRows, chartSegments, chartTotal, showChart, onGoToClick }) {
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
        {showChart && (
          <WidgetPieChart segments={chartSegments} total={chartTotal} centerText={percentage} size="md" />
        )}
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
  if (variant === '3xCta') {
    return (
      <div className="widget__content widget__content--3xCta">
        {ctaRows.map((row, i) => (
          <WidgetCtaRow
            key={i}
            icon={row.icon}
            label={row.label}
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
          <WidgetPieChart segments={chartSegments} total={chartTotal} size="lg" />
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

