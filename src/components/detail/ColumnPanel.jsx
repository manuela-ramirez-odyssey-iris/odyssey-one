import { X } from 'lucide-react'

export default function ColumnPanel({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        width: 354,
        background: 'var(--bg-primary)',
        borderLeft: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Column Arrangement
        </span>
        <button
          onClick={onClose}
          className="flex items-center justify-center bg-transparent border-none cursor-pointer"
          style={{ color: 'var(--text-placeholder)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Empty body */}
      <div className="flex-1 min-h-0 flex items-center justify-center" style={{ padding: 'var(--spacing-4)' }}>
        <span className="text-sm" style={{ color: 'var(--text-placeholder)' }}>
          Column configuration coming soon.
        </span>
      </div>
    </div>
  )
}
