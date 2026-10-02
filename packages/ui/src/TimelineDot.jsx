const COLORS = ['amber', 'blue', 'green', 'red', 'purple', 'gray', 'info']

/**
 * TimelineDot (atom) — the marker dot on a vertical activity rail (History
 * tab rows). Decorative: `aria-hidden`, the row's Badge/text carries meaning.
 *
 * Figma: `TimelineDot` COMPONENT_SET 6945:301 (Components-Atoms › Badges),
 * one VARIANT prop `Color`. Built from the History mock 6944:2928 (dot
 * 6942:2846). 10×10 circle (`--radius-full`), 2px INSIDE White ring
 * (border-box, so 6px of color shows), `shadow/base` → `--shadow-base`.
 *
 * Fill per color (all existing tokens):
 *   amber  --sunrise-yellow-300   blue   --ice-blue-600
 *   green  --caribbean-green-600  red    --bittersweet-600
 *   purple --purple-800           gray   --deep-sea-neutral-400
 *   info   --carolina-blue-400
 *
 * The color NAMES mirror Badge variants so a History row's dot matches its
 * Badge; the SHADES are one step brighter than `--badge-*-text` because a 6px
 * dot in the dark badge-text shade reads almost black (user, 2026-09-30).
 *
 * Code default is `gray`, NOT Figma's default `amber`, on purpose: an
 * unknown/missing color must read neutral, never alarm-yellow or crash.
 */
export default function TimelineDot({ color = 'gray', className = '', ...rest }) {
  const c = COLORS.includes(color) ? color : 'gray'
  return (
    <span
      aria-hidden="true"
      className={`odyssey-timeline-dot odyssey-timeline-dot--${c}${className ? ' ' + className : ''}`}
      {...rest}
    />
  )
}
