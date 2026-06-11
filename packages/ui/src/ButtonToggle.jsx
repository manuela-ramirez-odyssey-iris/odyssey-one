import { useLayoutEffect, useRef, useState } from 'react'

/**
 * ButtonToggle — molecule. Two-option toggle (Apple-style segmented control):
 * a white raised "thumb" slides under the selected segment.
 *
 * Two content modes, never mixed (Figma `Content` axis): icons OR text labels.
 * Passing `firstLabel`/`secondLabel` switches the whole component to text mode
 * and `firstIcon`/`secondIcon` are ignored.
 *
 * Composition contract: in the Figma master the selected segment IS a nested
 * Button instance (Content=Icon → Variant=Icon/sm, Content=Text →
 * Variant=Secondary/sm) — its states (idle/hover/pressed) are the source of
 * truth. In code the sliding thumb mirrors that variant's full state ladder
 * (.btn--icon / .btn--secondary share one ladder) instead of rendering
 * <Button>, because the chrome must slide independently of the content.
 *
 * Geometry: the selected segment widens in sync with the thumb travel
 * (icon mode h-padding 6→8, fixed 36px thumb; text mode h-padding 12→14,
 * thumb computed from the measured label width — computed, not measured
 * live, so the thumb target stays stable mid-transition).
 *
 * Controlled component: `selected` ('first' | 'second') + `onChange(next)`.
 * Icons are consumer-passed Lucide nodes at 20px (placeholder-20 INSTANCE_SWAP
 * slots in Figma); labels are strings (`First label`/`Second label` TEXT props
 * in Figma, reaching the unselected segment — the selected one goes through
 * the exposed Button picker). Both modes render content in DSN/500.
 *
 * Figma master: `ButtonToggle` set 2978:330 on Components-Molecules
 * (`Content=Icon|Text` × `Selected=First|Second`).
 */

// Mirrors the CSS: text segments pad 12→14 (selected), track gap 4.
const TEXT_SEL_PAD = 14
const TEXT_UNSEL_PAD = 12
const TRACK_GAP = 4

export default function ButtonToggle({
  firstIcon,
  secondIcon,
  firstLabel,
  secondLabel,
  selected = 'first',
  onChange,
  firstAriaLabel,
  secondAriaLabel,
  className = '',
  ...props
}) {
  const isSecond = selected === 'second'
  const isText = firstLabel != null || secondLabel != null

  const firstContentRef = useRef(null)
  const secondContentRef = useRef(null)
  const [contentW, setContentW] = useState(null)

  useLayoutEffect(() => {
    if (!isText) return
    const first = firstContentRef.current
    const second = secondContentRef.current
    if (first && second) {
      setContentW({
        first: first.getBoundingClientRect().width,
        second: second.getBoundingClientRect().width,
      })
    }
  }, [isText, firstLabel, secondLabel])

  // Icon mode keeps the fixed CSS geometry (36px thumb, 36px travel); text
  // mode positions the thumb inline from the measured label widths.
  let thumbStyle
  if (isText && contentW) {
    const width = (isSecond ? contentW.second : contentW.first) + TEXT_SEL_PAD * 2
    const x = isSecond ? contentW.first + TEXT_UNSEL_PAD * 2 + TRACK_GAP : 0
    thumbStyle = { width: `${width}px`, transform: `translateX(${x}px)` }
  }

  const segmentClass = (segSelected) =>
    [
      'button-toggle__segment',
      isText && 'button-toggle__segment--text',
      isText && 'text-label-sm-medium',
      segSelected && 'button-toggle__segment--selected',
    ].filter(Boolean).join(' ')

  return (
    <div className={`button-toggle ${className}`.trim()} role="group" {...props}>
      <span
        className={`button-toggle__thumb${!isText && isSecond ? ' button-toggle__thumb--second' : ''}`}
        style={thumbStyle}
        aria-hidden="true"
      />
      <button
        type="button"
        className={segmentClass(!isSecond)}
        aria-pressed={!isSecond}
        aria-label={firstAriaLabel}
        onClick={() => { if (isSecond) onChange?.('first') }}
      >
        {isText
          ? <span ref={firstContentRef} className="button-toggle__label">{firstLabel}</span>
          : firstIcon}
      </button>
      <button
        type="button"
        className={segmentClass(isSecond)}
        aria-pressed={isSecond}
        aria-label={secondAriaLabel}
        onClick={() => { if (!isSecond) onChange?.('second') }}
      >
        {isText
          ? <span ref={secondContentRef} className="button-toggle__label">{secondLabel}</span>
          : secondIcon}
      </button>
    </div>
  )
}
