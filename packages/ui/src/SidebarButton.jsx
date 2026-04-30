import React from 'react'

export default function SidebarButton({ icon, state = 'default' }) {
  const isSelected = state === 'selected'
  const isHover = state === 'hover'

  return (
    <div
      className={`flex items-center justify-center w-10 h-10 transition-colors duration-150 ${
        isSelected || isHover
          ? 'text-[var(--text-primary)]'
          : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
      }`}
      style={{
        borderRadius: 'var(--radius-lg)',
        background: isSelected ? 'var(--deep-sea-neutral-300)' : 'transparent',
      }}
    >
      {icon}
    </div>
  )
}
