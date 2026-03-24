import { Clock } from 'lucide-react'

export default function HistoryTab() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3"
      style={{ padding: '48px 0', color: 'var(--text-placeholder)' }}
    >
      <Clock size={32} />
      <div className="text-sm font-medium">History coming soon</div>
      <div className="text-xs">Shipment history and audit trail will be available in a future release.</div>
    </div>
  )
}
