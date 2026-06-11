/**
 * ButtonToggle — molecule. Two-option icon toggle (Apple-style segmented control):
 * a white raised "thumb" slides under the selected segment.
 *
 * Composition contract: in the Figma master the selected segment IS a nested
 * Button (Variant=Icon, Size=sm) instance — its states (idle/hover/pressed) are
 * the source of truth. In code the sliding thumb mirrors that variant's full
 * state ladder (.btn--icon) instead of rendering <Button>, because the chrome
 * must slide independently of the icons. The selected segment widens 32→36px
 * (h-padding 6→8) in sync with the thumb travel, matching the Figma masters.
 *
 * Controlled component: `selected` ('first' | 'second') + `onChange(next)`.
 * Icons are consumer-passed Lucide nodes at 20px (placeholder-20 INSTANCE_SWAP
 * slots in Figma); they adopt DSN/500 via currentColor in both states.
 *
 * Figma master: `ButtonToggle` set 2978:330 on Components-Molecules.
 */
export default function ButtonToggle({
  firstIcon,
  secondIcon,
  selected = 'first',
  onChange,
  firstAriaLabel,
  secondAriaLabel,
  className = '',
  ...props
}) {
  const isSecond = selected === 'second'

  return (
    <div className={`button-toggle ${className}`.trim()} role="group" {...props}>
      <span
        className={`button-toggle__thumb${isSecond ? ' button-toggle__thumb--second' : ''}`}
        aria-hidden="true"
      />
      <button
        type="button"
        className={`button-toggle__segment${!isSecond ? ' button-toggle__segment--selected' : ''}`}
        aria-pressed={!isSecond}
        aria-label={firstAriaLabel}
        onClick={() => { if (isSecond) onChange?.('first') }}
      >
        {firstIcon}
      </button>
      <button
        type="button"
        className={`button-toggle__segment${isSecond ? ' button-toggle__segment--selected' : ''}`}
        aria-pressed={isSecond}
        aria-label={secondAriaLabel}
        onClick={() => { if (!isSecond) onChange?.('second') }}
      >
        {secondIcon}
      </button>
    </div>
  )
}
