import { useState, useEffect, useRef } from 'react'
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
  // Defer the donut grow-in animation by N ms after mount. Consumers (e.g. Home's
  // mount-stagger) set this so charts start blooming only after their parent
  // widget's entry transform has settled. Default 0 = animate on next frame.
  chartDelayMs = 0,
  // Edit mode — Home dashboard "Add Widgets" flow. Forces grip on, dims CTAs to
  // non-interactive, and overlays a top-right close button wired to onRemove.
  editMode = false,
  onRemove,
  className = '',
  ...rest
}) {
  const cls = `widget widget--${variant} ${className}`.trim()
  const editAttrs = editMode ? { 'data-edit-mode': 'true' } : {}
  const [rootRef, inView] = useInView()
  return (
    <div ref={rootRef} className={cls} {...editAttrs} {...rest}>
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
        chartDelayMs={chartDelayMs}
        onGoToClick={onGoToClick}
        play={inView}
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

// Counts numbers up from zero. Animates every numeric token in the string
// (integer or decimal, comma-grouped or not) so values like "1,234" and
// "99 (26.33%)" sweep up together. Re-runs whenever `value` changes — pairs
// with the pie chart's grow-in on mount / data arrival.
const COUNT_UP_MS = 900

function formatNumbersWithProgress(value, progress) {
  return String(value).replace(/\d[\d,]*(?:\.\d+)?/g, (match) => {
    const decimals = match.includes('.') ? match.split('.')[1].length : 0
    const hadComma = match.includes(',')
    const target = parseFloat(match.replace(/,/g, ''))
    if (!Number.isFinite(target)) return match
    const current = target * progress
    if (decimals > 0) {
      const fixed = current.toFixed(decimals)
      return hadComma
        ? parseFloat(fixed).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : fixed
    }
    const rounded = Math.round(current)
    return hadComma ? rounded.toLocaleString() : String(rounded)
  })
}

function CountUp({ value, play = true }) {
  const [progress, setProgress] = useState(0)
  // `play` gates the count (set once the widget scrolls into view). Until then
  // progress stays 0 so the numbers read as 0, then tick up on appear.
  useEffect(() => {
    if (!play) return
    setProgress(0)
    let raf
    let start
    const tick = (t) => {
      if (start == null) start = t
      const p = Math.min(1, (t - start) / COUNT_UP_MS)
      setProgress(1 - Math.pow(1 - p, 3)) // ease-out-cubic
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [play, value])
  return <>{formatNumbersWithProgress(value, progress)}</>
}

// Latches true once the element scrolls into the viewport, so entry animations
// (chart grow-in + count-up) fire lazily as the user scrolls — and never while
// the widget is hidden. Falls back to true where IntersectionObserver is absent.
function useInView(threshold = 0.2) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          obs.disconnect() // latch — animate once on first appearance
        }
      },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

function Content({ variant, value, label, percentage, rows, ctaRows, chartSegments, chartTotal, showChart, chartDelayMs, onGoToClick, play = true }) {
  // Remount the pie chart whenever its data changes so the grow-in animation
  // replays (e.g. tracking-load-status going from its 0/placeholder state to
  // live fetched numbers). A fresh mount paints at 0 first, then animates.
  const pieKey = (chartSegments || []).map((s) => `${s.value}:${s.color}`).join('|') + `|${chartTotal ?? ''}`
  if (variant === '1x') {
    return (
      <button
        type="button"
        className="widget__content widget__content--1x"
        onClick={onGoToClick}
        disabled={!onGoToClick}
      >
        <span className="widget__value-row">
          <span className="text-display-3xl-semibold widget__value"><CountUp value={value} play={play} /></span>
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
          <span className="text-display-3xl-semibold widget__value"><CountUp value={value} play={play} /></span>
          <span className="text-label-sm-medium widget__label">{label}</span>
        </div>
        {showChart && (
          <WidgetPieChart key={pieKey} segments={chartSegments} total={chartTotal} centerText={percentage != null ? <CountUp value={percentage} play={play} /> : undefined} size="md" delayMs={chartDelayMs} play={play} />
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
            <span className="text-display-4xl-semibold widget__value"><CountUp value={value} play={play} /></span>
            <span className="text-label-sm-medium widget__label">{label}</span>
          </div>
          <WidgetPieChart key={pieKey} segments={chartSegments} total={chartTotal} size="lg" delayMs={chartDelayMs} play={play} />
        </div>
        <div className="widget__data-section">
          {rows.map((row, i) => (
            <WidgetMetricRow
              key={i}
              label={row.label}
              value={<CountUp value={row.value} play={play} />}
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

