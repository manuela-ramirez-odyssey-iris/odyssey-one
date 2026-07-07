// Shared money parse/format helpers — extracted from the identical logic that
// lived in CostAllocationTab and RoutingGuideTab (S80 QA de-dupe).

// "$1,234.56 USD" | "--" | null → 1234.56 | null
export function parseDollar(val) {
  if (val == null || val === '' || val === '--') return null
  const n = parseFloat(String(val).replace(/[^0-9.\-]/g, ''))
  return Number.isNaN(n) ? null : n
}

// 1234.5 → "$1,234.50"; -12 → "-$12.00"; null → "--"
export function fmtDollar(n) {
  if (n == null) return '--'
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `-$${formatted}` : `$${formatted}`
}
