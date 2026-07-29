import {
  OWNING_ORGS,
  EXTRA_ORGS,
  EQUIPMENT_CODES,
  EQUIPMENT_LABELS,
  EQUIPMENT_SCOPE,
  FREIGHT_TERMS,
  SHIP_DIRECTIONS,
  SHIP_CLASSES,
  SPECIAL_SERVICES,
  CARRIERS,
  TIMEZONES,
  TIMEZONE_LABELS,
  LOCATION_ADDRESSES,
  CHEMICAL_PRODUCTS,
} from '../../data/master-data'

// Typeahead lookups behind the mock/live seam (spec §2.3). live → the
// order-service lookup catalog; mock → master-data pools with the LINX-7553
// contract: 2-char minimum (excluding spaces) on typeahead types,
// case-insensitive matching, frequency-sorted. Debounce (~250ms) lives in
// the UI hook (useDebouncedValue) — the service is synchronous-shaped.

export type LookupType =
  | 'owning-org'
  | 'equipment'
  | 'freight-term'
  | 'ship-direction'
  | 'org-address'
  | 'product'
  | 'ship-class'
  | 'special-service'
  | 'timezone'
  | 'carrier'

export interface LookupOption {
  value: string
  label: string
  description?: string
  frequency: number
  meta?: Record<string, unknown> // org-address: address fields for hydration
}

export const TYPEAHEAD_MIN_CHARS = 2

/**
 * Canonical query normalizer for lookup gating and matching.
 * Trims surrounding whitespace, collapses internal runs to one space, lowercases.
 * The gate length is computed on the collapsed form EXCLUDING spaces (LINX-7553).
 */
export function normalizeLookupQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase()
}

// Plain selects return their full list; only true typeaheads gate on length
// (plan decision 14). Equipment gates on org instead (decision 15).
const TYPEAHEAD_TYPES = new Set<LookupType>([
  'owning-org', 'org-address', 'product', 'special-service', 'carrier',
])

export interface LookupParams {
  orgId?: string
}

function poolFor(type: LookupType, params: LookupParams): LookupOption[] {
  switch (type) {
    case 'owning-org':
      // Shared-pool customers first (frequency-ranked), then the create-order-only
      // QA-style extras alphabetically (frequency 0 → label tiebreak)
      return [...OWNING_ORGS, ...EXTRA_ORGS.map((o) => ({ ...o, frequency: 0 }))]
    case 'equipment': {
      if (!params.orgId) return [] // scoped by Owning Organization — none picked, no catalog
      const codes: string[] = EQUIPMENT_SCOPE[params.orgId as keyof typeof EQUIPMENT_SCOPE] ?? EQUIPMENT_CODES
      return codes.map((code: string, i: number) => ({
        value: code,
        label: `${code} — ${EQUIPMENT_LABELS[code as keyof typeof EQUIPMENT_LABELS] ?? code}`,
        frequency: codes.length - i,
      }))
    }
    case 'freight-term':
      return FREIGHT_TERMS.map((t: { value: string; label: string }, i: number) => ({
        ...t, frequency: FREIGHT_TERMS.length - i,
      }))
    case 'ship-direction':
      return SHIP_DIRECTIONS.map((d: { value: string; label: string }, i: number) => ({
        ...d, frequency: SHIP_DIRECTIONS.length - i,
      }))
    case 'ship-class':
      return SHIP_CLASSES.map((c: { value: string; label: string }, i: number) => ({
        ...c, frequency: SHIP_CLASSES.length - i,
      }))
    case 'org-address':
      return LOCATION_ADDRESSES.map((a: Record<string, string | number>) => ({
        value: String(a.locationId),
        label: `${a.locationId}: ${a.longName}`,
        description: `${a.city}, ${a.state} ${a.postal}`,
        frequency: Number(a.frequency),
        meta: {
          longName: a.longName, address1: a.address1, city: a.city,
          state: a.state, postal: a.postal, country: a.country,
        },
      }))
    case 'product':
      // Product ID = 13-digit external id (18-digit legacy minus 5 leading
      // zeros — DB ledger row 5). Single-sourced: data-pools stamps the same
      // id on the pool lines, so create-flow picks match seeded lines.
      return CHEMICAL_PRODUCTS.map((p: { item: string; desc: string; hazmat: boolean }, i: number) => ({
        value: p.item,
        label: p.item,
        description: p.desc,
        frequency: CHEMICAL_PRODUCTS.length - i,
        meta: { hazmat: p.hazmat },
      }))
    case 'special-service':
      return SPECIAL_SERVICES.map((s: { code: string; description: string; frequency: number }) => ({
        value: s.code, label: s.code, description: s.description, frequency: s.frequency,
      }))
    case 'timezone':
      return TIMEZONES.map((tz: string, i: number) => ({
        value: tz,
        label: TIMEZONE_LABELS[tz as keyof typeof TIMEZONE_LABELS] ?? tz,
        frequency: TIMEZONES.length - i,
      }))
    case 'carrier':
      // LINX-8126: "<SCAC> - <Carrier Name>", ALPHABETICAL by name (frequency
      // sort was struck for carriers) — descending frequency encodes name order
      // so the global frequency sort preserves it
      return [...CARRIERS]
        .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
        .map((c: { scac: string; name: string }, i: number, arr: unknown[]) => ({
          value: c.scac, label: `${c.scac} - ${c.name}`, frequency: arr.length - i,
        }))
  }
}

export async function getLookupOptions(
  type: LookupType,
  query: string,
  params: LookupParams = {},
): Promise<LookupOption[]> {
  // Live mode INTENTIONALLY falls through to the mock pools: our Neon API has
  // no lookup endpoints yet (DB slice 5) — the old live branch POSTed to
  // /order-service/v1/<type>/lookup, got nothing, and left dropdowns empty
  // (S95 customer-search bug). Restore a live branch when slice 5 ships;
  // request shape per LLD: POST { lookup, pageNumber, pageSize }.

  const q = normalizeLookupQuery(query)
  const gateLength = q.replace(/ /g, '').length // spaces excluded (LINX-7553)
  // Empty query = BROWSE mode (chevron click lists the catalog, paged by the
  // caller); the 2-char gate only applies once the user starts typing
  if (TYPEAHEAD_TYPES.has(type) && gateLength > 0 && gateLength < TYPEAHEAD_MIN_CHARS) return []

  return poolFor(type, params)
    .filter(o =>
      q === '' ||
      o.value.toLowerCase().includes(q) ||
      o.label.toLowerCase().includes(q) ||
      (o.description ?? '').toLowerCase().includes(q))
    .sort((a, b) => b.frequency - a.frequency || a.label.localeCompare(b.label))
}
