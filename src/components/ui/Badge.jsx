const variants = {
  amber: { bg: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' },
  blue: { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  green: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  red: { bg: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' },
  purple: { bg: 'var(--badge-purple-bg)', color: 'var(--badge-purple-text)' },
  gray: { bg: 'var(--badge-gray-bg)', color: 'var(--badge-gray-text)', iconColor: 'var(--text-tertiary)' },
}

function getPadding(icon, statusDot) {
  if (statusDot && icon) return '2px 8px'
  if (icon) return '2px 8px 2px 10px'
  return '2px 10px'
}

export default function Badge({ children, variant = 'blue', icon, statusDot }) {
  const v = variants[variant] || variants.blue
  const hasIcon = !!icon
  const hasDot = !!statusDot

  return (
    <span
      className="text-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        borderRadius: 'var(--radius-sm)',
        padding: getPadding(hasIcon, hasDot),
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
      {children}
      {hasIcon && (
        <span
          style={{
            display: 'inline-flex',
            flexShrink: 0,
            color: v.iconColor || 'currentColor',
          }}
        >
          {icon}
        </span>
      )}
    </span>
  )
}
