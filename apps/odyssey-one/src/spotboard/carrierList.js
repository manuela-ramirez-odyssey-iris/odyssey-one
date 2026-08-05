// Named carrier-list presets for a SpotBoard quote. Static demo data — no
// backend concept of a "list" exists yet.
export const NAMED_LISTS = [
  { id: 'tl-se', name: 'TL Southeast Overflow', equipment: 'Van', defaultDurationMin: 120 },
  { id: 'ltl-comp', name: 'LTL Comparable Set', equipment: 'LTL', defaultDurationMin: 240 },
]

// ponytail: deterministic demo seeding by index (row 1 = Routed, row 3 =
// Waffled) instead of randomness, so tests and demos stay stable.
const FLAG_BY_INDEX = { 1: 'Routed', 3: 'Waffled' }

// carrierOptions come from the resolved async carrier pool
// (getLookupOptions('carrier', q)) — { value: scac, label: 'SCAC - Name' }.
// This function stays pure/sync; the caller awaits the fetch.
export function buildCarrierRows(list, carrierOptions) {
  return carrierOptions.map((opt, i) => {
    const scac = opt.value
    const sep = opt.label.indexOf(' - ')
    const name = sep === -1 ? opt.label : opt.label.slice(sep + 3)
    const flag = FLAG_BY_INDEX[i]
    const flags = flag ? [flag] : []
    return {
      scac,
      name,
      email: `ops@${scac.toLowerCase()}.example.com`,
      equipment: list.equipment,
      incl: !flags.includes('Routed') && !flags.includes('Waffled'),
      plannedPickup: '',
      plannedDelivery: '',
      flags,
    }
  })
}
