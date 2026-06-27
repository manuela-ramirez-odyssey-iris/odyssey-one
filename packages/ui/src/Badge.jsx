import { Star, Clock, Info } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

const variants = {
  amber: { bg: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' },
  blue: { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  green: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  red: { bg: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' },
  purple: { bg: 'var(--badge-purple-bg)', color: 'var(--badge-purple-text)' },
  gray: { bg: 'var(--badge-gray-bg)', color: 'var(--badge-gray-text)', iconColor: 'var(--text-tertiary)' },
  notification: { bg: 'var(--bittersweet-600)', color: 'var(--text-inverse)', isDot: true },
  count: { bg: 'var(--carolina-blue-400)', color: 'var(--text-inverse)', isCount: true },
  metric: { bg: 'var(--badge-gray-bg)', color: 'var(--text-primary)', isMetric: true },
  favorite: { bg: 'var(--caribbean-green-600)', color: 'var(--white)', isFavorite: true },
  // Icon-only (Shape=Icon) semantic badges — square soft-tint tile, fixed icon by meaning.
  time: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  info: { bg: 'var(--badge-info-bg)', color: 'var(--badge-info-text)' },
}

// Baked default icon per icon-only variant (the icon IS the variant's identity).
// Consumers may still override via `leftIcon`.
const ICON_BADGE_DEFAULTS = {
  time: <Clock {...ICON_MD} />,
  info: <Info {...ICON_MD} />,
}

function getPadding(leftIcon, rightIcon, isDot, isMetric, isCount) {
  if (isDot) return '4px'
  if (isCount) return '0 4px'
  if (isMetric) return '1px var(--spacing-2)'
  const left = leftIcon ? 8 : 10
  const right = rightIcon ? 8 : 10
  return `2px ${right}px 2px ${left}px`
}

export default function Badge({ children, variant = 'blue', leftIcon, rightIcon, statusDot, iconOnly = false }) {
  const v = variants[variant] || variants.blue
  const isDot = !!v.isDot
  const isCount = !!v.isCount
  const isMetric = !!v.isMetric
  const isFavorite = !!v.isFavorite

  if (iconOnly) {
    // Shape=Icon — square soft-tint tile, icon-only (no text). Icon defaults to
    // the variant's baked glyph (time→Clock, info→Info); `leftIcon` overrides.
    const icon = leftIcon || ICON_BADGE_DEFAULTS[variant]
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
          borderRadius: 'var(--radius-sm)',
          background: v.bg,
          color: v.iconColor || v.color,
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
        aria-hidden="true"
      >
        {icon}
      </span>
    )
  }

  if (isFavorite) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 12,
          height: 12,
          borderRadius: 'var(--radius-full)',
          background: v.bg,
          color: v.color,
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
        aria-hidden="true"
      >
        <Star size={8} fill="currentColor" stroke="currentColor" strokeWidth={2} />
      </span>
    )
  }

  const hasLeft = !!leftIcon && !isMetric
  const hasRight = !!rightIcon && !isMetric
  const hasDot = !!statusDot && !isMetric
  const iconColor = v.iconColor || 'currentColor'
  const radius = isDot || isCount
    ? 'var(--radius-full)'
    : isMetric
      ? 'var(--radius-lg)'
      : 'var(--radius-sm)'

  return (
    <span
      className={
        isMetric
          ? 'badge-metric text-label-xs-semibold'
          : 'text-badge'
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: isDot || isCount ? 'center' : undefined,
        gap: 4,
        borderRadius: radius,
        padding: getPadding(hasLeft, hasRight, isDot, isMetric, isCount),
        width: isDot ? 20 : undefined,
        minWidth: isCount ? 20 : undefined,
        height: isDot || isCount ? 20 : undefined,
        boxSizing: 'border-box',
        background: isMetric ? undefined : v.bg,
        color: v.color,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        fontVariantNumeric: isMetric || isCount ? 'tabular-nums' : undefined,
      }}
    >
      {hasDot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'currentColor',
            flexShrink: 0,
            marginRight: 2,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}
      {hasLeft && (
        <span
          style={{
            display: 'inline-flex',
            flexShrink: 0,
            color: iconColor,
          }}
        >
          {leftIcon}
        </span>
      )}
      {children}
      {hasRight && (
        <span
          style={{
            display: 'inline-flex',
            flexShrink: 0,
            color: iconColor,
          }}
        >
          {rightIcon}
        </span>
      )}
    </span>
  )
}
