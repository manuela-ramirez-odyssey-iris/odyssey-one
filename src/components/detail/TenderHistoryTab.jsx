import { FileText } from 'lucide-react'

export default function TenderHistoryTab() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3"
      style={{ padding: '48px 0', color: 'var(--text-placeholder)' }}
    >
      <FileText size={32} />
      <div className="text-sm font-medium">No tender history available</div>
      <div className="text-xs">Tender history records will appear here once tenders are processed.</div>
    </div>
  )
}
