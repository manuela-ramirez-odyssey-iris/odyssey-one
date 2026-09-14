import type { AuditChangeCategory, AuditChangeType, AuditTrailRow } from '../types/auditTrail'

/**
 * Live wire row → AuditTrailRow. The /v3/audit-report field table is an IMAGE
 * in LINX-8457 that the Jira export did not carry (Q-AT-2), so this shape is
 * ASSUMED from LINX-9730's diff output + the AC's column list, and every field
 * is read tolerantly. Adjust the two code maps when Venkata's shape lands —
 * nothing else should need to move.
 */
export interface AuditReportWireRow {
  auditId: number | string
  changeTimestamp: string
  timeZoneCode?: string
  changeMadeBy: string            // 'USER' | 'SYSTEM' (or already 'User' / 'System')
  userEmail?: string
  userName?: string
  source?: string                 // system name when SYSTEM
  changeType: string              // 'ORDER_ACTION' | 'ORDER_EVENT' | label
  changeCategory: string          // code | label
  lineItemId?: number | string | null
  changes?: Array<{ fieldName?: string; field?: string; oldValue?: unknown; newValue?: unknown }>
}

const TYPE: Record<string, AuditChangeType> = {
  ORDER_ACTION: 'Order Action', ORDER_EVENT: 'Order Event',
  'Order Action': 'Order Action', 'Order Event': 'Order Event',
}
const CATEGORY: Record<string, AuditChangeCategory> = {
  ORDER_CREATION: 'Order Creation',
  ORDER_HEADER_EDITING: 'Order Header Editing',
  ORDER_LINE_ITEM_EDITING: 'Order Line Item Editing',
  STATUS_CHANGE: 'Order Lifecycle Status Change',
  HOLD_APPLIED: 'Order Applied on Hold',
  HOLD_RELEASED_HEADER: 'Order Released from Hold (Header Level Editing)',
  HOLD_RELEASED_LINE: 'Order Released from Hold (Line Item Editing)',
  ORDER_CANCELLATION_PARTIAL: 'Order Partial Cancellation',
  ORDER_CANCELLATION_FULL: 'Order Full Cancellation',
}
const str = (v: unknown) => (v == null ? '' : String(v))

export function mapAuditReportRow(w: AuditReportWireRow): AuditTrailRow {
  const isUser = String(w.changeMadeBy).toUpperCase() === 'USER'
  const source = isUser
    ? [w.userEmail, w.userName].filter(Boolean).join(' · ')
    : (w.source ?? '')
  return {
    id: String(w.auditId),
    timestamp: w.changeTimestamp,
    timeZoneCode: w.timeZoneCode ?? '',
    changedBy: isUser ? 'User' : 'System',
    source,
    changeType: TYPE[w.changeType] ?? (w.changeType as AuditChangeType),
    changeCategory: CATEGORY[w.changeCategory] ?? (w.changeCategory as AuditChangeCategory),
    lineItemId: w.lineItemId == null || w.lineItemId === '' ? null : String(w.lineItemId),
    changes: (w.changes ?? []).map((c) => ({ field: str(c.fieldName ?? c.field), oldValue: str(c.oldValue), newValue: str(c.newValue) })),
  }
}
