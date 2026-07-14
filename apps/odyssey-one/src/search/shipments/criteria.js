/**
 * Shared search-criteria matcher — the ONE implementation of chip+text matching
 * used by BOTH the GlobalSearch glimpse (adapter.searchShipments) and the table
 * pipeline (gridService list + category counts). S79c decision 7: extracting it
 * here is what guarantees the glimpse total always equals the sum of the
 * criteria-filtered panel totals.
 *
 * Semantics (unchanged from the adapter's reference implementation):
 * - Chips are ANDed; each chip is a case-insensitive SUBSTRING match against its
 *   `dataKey` field (arrays joined with spaces; a null field never matches, even
 *   for an empty queryValue).
 * - Free text is ANDed with the chips and ORed across FREE_TEXT_KEYS.
 */

// Fields the free-text query matches against (OR semantics). Single source of
// truth — the adapter and the grid service both import this list.
export const FREE_TEXT_KEYS = [
  'buyShipment', 'sellShipment', 'customerId', 'customerName', 'origin', 'destination', 'scac', 'orders',
]

// Case-insensitive substring test against one field (arrays joined with spaces).
function fieldIncludes(field, needle) {
  if (field == null) return false
  const str = (Array.isArray(field) ? field.join(' ') : String(field)).toLowerCase()
  return str.includes(needle)
}

// AND predicate for a single chip against a row (substring on chip.dataKey).
// Chips flagged `exact` (count-like fields) require full equality — "2" must
// not match a count of 12.
export function matchesChip(row, chip) {
  const needle = (chip.queryValue || '').toLowerCase()
  if (chip.exact) {
    const field = row[chip.dataKey]
    return field != null && String(field).toLowerCase() === needle
  }
  return fieldIncludes(row[chip.dataKey], needle)
}

// Free-text predicate: empty text matches everything; otherwise OR across
// FREE_TEXT_KEYS.
export function matchesFreeText(row, text) {
  const q = (text || '').trim().toLowerCase()
  if (!q) return true
  return FREE_TEXT_KEYS.some((key) => fieldIncludes(row[key], q))
}

// True when a committed criteria object carries anything to match on.
export function hasCriteria(criteria) {
  if (!criteria) return false
  return (criteria.chips?.length ?? 0) > 0 || !!(criteria.text || '').trim()
}

// Full criteria predicate: every chip matches AND the free text matches.
// Empty criteria match everything (callers gate with hasCriteria for clarity).
export function matchesCriteria(row, criteria) {
  if (!hasCriteria(criteria)) return true
  const chips = criteria.chips || []
  return matchesFreeText(row, criteria.text) && chips.every((chip) => matchesChip(row, chip))
}
