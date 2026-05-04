const variants = {
  amber: { bg: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' },
  blue: { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  green: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  red: { bg: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' },
  purple: { bg: 'var(--badge-purple-bg)', color: 'var(--badge-purple-text)' },
  gray: { bg: 'var(--badge-gray-bg)', color: 'var(--badge-gray-text)', iconColor: 'var(--text-tertiary)' },
  notification: { bg: 'var(--bittersweet-600)', color: 'var(--text-inverse)', isDot: true },
}

function getPadding(leftIcon, rightIcon, isDot) {
  if (isDot) return '4px'
  const left = leftIcon ? 8 : 10
  const right = rightIcon ? 8 : 10
  return `2px ${right}px 2px ${left}px`
}

export default function Badge({ children, variant = 'blue', leftIcon, rightIcon, statusDot }) {
  const v = variants[variant] || variants.blue
  const hasLeft = !!leftIcon
  const hasRight = !!rightIcon
  const hasDot = !!statusDot
  const iconColor = v.iconColor || 'currentColor'
  const isDot = !!v.isDot

  return (
    <span
      className="text-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: isDot ? 'center' : undefined,
        gap: 4,
        borderRadius: isDot ? 'var(--radius-full)' : 'var(--radius-sm)',
        padding: getPadding(hasLeft, hasRight, isDot),
        width: isDot ? 20 : undefined,
        height: isDot ? 20 : undefined,
        boxSizing: 'border-box',
        background: v.bg,
        color: v.color,
        whiteSpace: 'nowrap',
        flexShrink: 0,
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
