const variants = {
  amber: { bg: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' },
  blue: { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  green: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  red: { bg: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' },
  purple: { bg: 'var(--badge-purple-bg)', color: 'var(--badge-purple-text)' },
}

export default function Badge({ children, variant = 'blue' }) {
  const style = variants[variant] || variants.blue
  return (
    <span
      className="inline-block text-xs font-medium mr-1"
      style={{
        borderRadius: 'var(--radius-sm)',
        padding: '2px 8px',
        background: style.bg,
        color: style.color,
      }}
    >
      {children}
    </span>
  )
}
