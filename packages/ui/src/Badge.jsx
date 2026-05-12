const variants = {
  amber: { bg: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' },
  blue: { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  green: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  red: { bg: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' },
  purple: { bg: 'var(--badge-purple-bg)', color: 'var(--badge-purple-text)' },
  gray: { bg: 'var(--badge-gray-bg)', color: 'var(--badge-gray-text)', iconColor: 'var(--text-tertiary)' },
  notification: { bg: 'var(--bittersweet-600)', color: 'var(--text-inverse)', isDot: true },
  metric: { bg: 'var(--badge-gray-bg)', color: 'var(--text-primary)', isMetric: true },
}

function getPadding(leftIcon, rightIcon, isDot, isMetric) {
  if (isDot) return '4px'
  if (isMetric) return '1px var(--spacing-2)'
  const left = leftIcon ? 8 : 10
  const right = rightIcon ? 8 : 10
  return `2px ${right}px 2px ${left}px`
}

export default function Badge({ children, variant = 'blue', leftIcon, rightIcon, statusDot }) {
  const v = variants[variant] || variants.blue
  const isDot = !!v.isDot
  const isMetric = !!v.isMetric
  const hasLeft = !!leftIcon && !isMetric
  const hasRight = !!rightIcon && !isMetric
  const hasDot = !!statusDot && !isMetric
  const iconColor = v.iconColor || 'currentColor'
  const radius = isDot
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
        justifyContent: isDot ? 'center' : undefined,
        gap: 4,
        borderRadius: radius,
        padding: getPadding(hasLeft, hasRight, isDot, isMetric),
        width: isDot ? 20 : undefined,
        height: isDot ? 20 : undefined,
        boxSizing: 'border-box',
        background: isMetric ? undefined : v.bg,
        color: v.color,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        fontVariantNumeric: isMetric ? 'tabular-nums' : undefined,
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
