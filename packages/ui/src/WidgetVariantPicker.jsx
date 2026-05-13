import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import Widget from './Widget.jsx'

const VARIANTS = ['1x', '2x', '3x', '3xChart']
const VARIANT_LABELS = {
  '1x': 'Small',
  '2x': 'Wide',
  '3x': 'Tall',
  '3xChart': 'Tall with chart',
}

/**
 * WidgetVariantPicker — molecule. Centered Widget preview at the selected
 * variant (1x / 2x / 3x / 3xChart) flanked by chevron arrows for stepping
 * through, a label below, and a dots indicator (also clickable).
 *
 * Mirrors Figma component set `WidgetVariantPicker` at 2005:554.
 *
 * Props:
 *   variant         — current variant ('1x' | '2x' | '3x' | '3xChart')
 *   onVariantChange — fn(nextVariant) — fired by arrows + dot clicks
 *   widgetProps     — forwarded to the inner <Widget /> (title, domainIcon,
 *                     value, rows, chartSegments, etc.)
 */
export default function WidgetVariantPicker({
  variant = '1x',
  onVariantChange,
  widgetProps = {},
  className = '',
}) {
  const currentIndex = VARIANTS.indexOf(variant)
  // Carousel wraps: end → start, start → end. Arrows are always active.
  const goPrev = () => {
    if (!onVariantChange) return
    const next = (currentIndex - 1 + VARIANTS.length) % VARIANTS.length
    onVariantChange(VARIANTS[next])
  }
  const goNext = () => {
    if (!onVariantChange) return
    const next = (currentIndex + 1) % VARIANTS.length
    onVariantChange(VARIANTS[next])
  }

  return (
    <div className={`widget-variant-picker ${className}`.trim()} data-variant={variant}>
      <button
        type="button"
        className="widget-variant-picker__arrow"
        onClick={goPrev}
        aria-label="Previous variant"
      >
        <ChevronLeft {...ICON_LG} aria-hidden="true" />
      </button>

      <div className="widget-variant-picker__info">
        <div className="widget-variant-picker__main">
          <Widget variant={variant} showGrip {...widgetProps} />
        </div>
        <div className="widget-variant-picker__dots-container">
          <span className="text-label-xs-regular widget-variant-picker__label">
            {VARIANT_LABELS[variant]}
          </span>
          <div
            className="widget-variant-picker__dots"
            role="tablist"
            aria-label="Widget size variants"
          >
            {VARIANTS.map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={v === variant}
                className={`widget-variant-picker__dot ${
                  v === variant ? 'widget-variant-picker__dot--active' : ''
                }`.trim()}
                onClick={() => onVariantChange && onVariantChange(v)}
                aria-label={`${VARIANT_LABELS[v]} variant`}
              />
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="widget-variant-picker__arrow"
        onClick={goNext}
        aria-label="Next variant"
      >
        <ChevronRight {...ICON_LG} aria-hidden="true" />
      </button>
    </div>
  )
}
