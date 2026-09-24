import { CircleCheck } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { useToast } from '../../utils/toast'

// ToastHost — mounted once in AppShell so a toast fired from anywhere (e.g.
// Executed Shipment Details, after navigating back to the PGI/PGR list) is
// visible regardless of which route is on screen. No Figma master for this —
// tokens-only bottom-center banner, the smallest thing that reads as a toast.
export default function ToastHost() {
  const toast = useToast()
  if (!toast) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center text-label-sm-medium"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'var(--spacing-8)',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        gap: 'var(--spacing-2)',
        padding: 'var(--spacing-3) var(--spacing-5)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-inverse)',
        color: 'var(--text-inverse)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <CircleCheck {...ICON_MD} />
      {toast.message}
    </div>
  )
}
