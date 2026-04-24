import React, { useCallback } from 'react'

const shared = {
  fontSize: 14,
  fontWeight: 500,
  lineHeight: '1.1',
  fontFamily: 'var(--font-primary)',
  padding: '8px 18px',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
  cursor: 'pointer',
  border: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  whiteSpace: 'nowrap',
}

export function PrimaryButton({ children, disabled, style, className = '', ...props }) {
  const handleEnter = useCallback((e) => {
    if (disabled) return
    e.currentTarget.style.background = 'var(--btn-primary-hover)'
    e.currentTarget.style.borderColor = 'var(--btn-primary-hover)'
  }, [disabled])

  const handleLeave = useCallback((e) => {
    e.currentTarget.style.background = 'var(--btn-primary-bg)'
    e.currentTarget.style.borderColor = 'var(--btn-primary-bg)'
  }, [])

  const handleDown = useCallback((e) => {
    if (disabled) return
    e.currentTarget.style.transform = 'scale(0.98)'
    e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.1)'
  }, [disabled])

  const handleUp = useCallback((e) => {
    e.currentTarget.style.transform = 'none'
    e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
  }, [])

  return (
    <button
      className={className}
      disabled={disabled}
      {...props}
      style={{
        ...shared,
        background: 'var(--btn-primary-bg)',
        border: '1px solid var(--btn-primary-bg)',
        color: 'var(--btn-primary-text)',
        transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.1s ease',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseDown={handleDown}
      onMouseUp={handleUp}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, disabled, style, className = '', ...props }) {
  const handleEnter = useCallback((e) => {
    if (disabled) return
    e.currentTarget.style.background = 'var(--bg-secondary)'
  }, [disabled])

  const handleLeave = useCallback((e) => {
    e.currentTarget.style.background = 'var(--btn-secondary-bg)'
  }, [])

  const handleDown = useCallback((e) => {
    if (disabled) return
    e.currentTarget.style.transform = 'scale(0.98)'
    e.currentTarget.style.background = 'var(--deep-sea-neutral-200)'
    e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.1)'
  }, [disabled])

  const handleUp = useCallback((e) => {
    e.currentTarget.style.transform = 'none'
    e.currentTarget.style.background = 'var(--btn-secondary-bg)'
    e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
  }, [])

  return (
    <button
      className={className}
      disabled={disabled}
      {...props}
      style={{
        ...shared,
        background: 'var(--btn-secondary-bg)',
        border: '1px solid var(--btn-secondary-border)',
        color: 'var(--btn-secondary-text)',
        transition: 'background 0.15s ease, transform 0.1s ease',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseDown={handleDown}
      onMouseUp={handleUp}
    >
      {children}
    </button>
  )
}
