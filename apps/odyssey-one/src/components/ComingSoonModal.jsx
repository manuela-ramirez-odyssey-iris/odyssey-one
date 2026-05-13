import { useEffect } from 'react'
import { X } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import { Button } from '@odyssey/ui'

export default function ComingSoonModal({ widgetLabel, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!widgetLabel) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.4)', zIndex: 200 }}
      onClick={onClose}
    >
      <div
        className="flex flex-col"
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-panel)',
          padding: 'var(--spacing-6)',
          gap: 'var(--spacing-4)',
          minWidth: 400,
          maxWidth: 500,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between" style={{ gap: 'var(--spacing-3)' }}>
          <h2
            style={{
              fontFamily: 'var(--font-primary)',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              lineHeight: 'var(--line-height-lg)',
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {widgetLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center border-none bg-transparent cursor-pointer"
            style={{
              width: 28,
              height: 28,
              color: 'var(--text-secondary)',
            }}
            aria-label="Close"
          >
            <X {...ICON_LG} />
          </button>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 'var(--line-height-sm)',
            color: 'var(--text-secondary)',
            margin: 0,
          }}
        >
          The widget configurator is coming soon. Selecting a size and adding this widget to your dashboard will be available in a future update.
        </p>
        <div className="flex justify-end">
          <Button variant="primary" size="md" onClick={onClose}>OK</Button>
        </div>
      </div>
    </div>
  )
}
