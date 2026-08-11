// Named carrier-list presets for a SpotBoard quote. Static demo data — no
// backend concept of a "list" exists yet.
//
// ponytail: `scacs` is a hand-picked membership standing in for a real OCM
// carrier-list profile (which would define membership server-side). Real
// SCACs pulled from src/data/master-data.js CARRIERS so the rows resolve
// against the actual carrier pool; upgrade to a fetched list when OCM exists.
export const NAMED_LISTS = [
  {
    id: 'tl-se',
    name: 'TL Southeast Overflow',
    equipment: 'Van',
    defaultDurationMin: 120,
    scacs: ['KNGT', 'SCNN', 'JBHT', 'WERN', 'CRST', 'SWFT', 'PRIJ'],
  },
  {
    id: 'ltl-comp',
    name: 'LTL Comparable Set',
    equipment: 'LTL',
    defaultDurationMin: 240,
    scacs: ['ODFL', 'SAIA', 'ABFS', 'AACT', 'EXLA', 'FXFE', 'SEFL'],
  },
]

// ponytail: deterministic demo seeding by index within the (small) list
// membership (row 1 = Routed, row 3 = Waffled) instead of randomness, so
// tests and demos stay stable.
const FLAG_BY_INDEX = { 1: 'Routed', 3: 'Waffled' }

// Flag IDENTITY strings ('Routed' / 'Waffled') drive logic (incl default,
// filtering) and must never change. Display text is separate — Kathleen's
// wireframe wants the fuller label without touching what the logic checks.
export const FLAG_LABELS = { Waffled: 'Waffled / Gave back' }

// carrierOptions come from the resolved async carrier pool
// (getLookupOptions('carrier', q)) — { value: scac, label: 'SCAC - Name' }.
// This function stays pure/sync; the caller awaits the fetch.
//
// A named list is a curated SUBSET of the pool (list.scacs), not the whole
// pool — resolve each membership SCAC against carrierOptions to pick up the
// pool's name/label, and skip any SCAC the pool doesn't (yet) have.
//
// Rows start with EMPTY dates — selection is manual (SPB design revision:
// prefill undercut the "filling dates auto-checks the row" rule since rows
// already had dates). The planner now sets pickup/delivery per carrier.
export function buildCarrierRows(list, carrierOptions) {
  const byScac = new Map(carrierOptions.map((opt) => [opt.value, opt]))
  return (list.scacs ?? [])
    .map((scac) => byScac.get(scac))
    .filter(Boolean)
    .map((opt, i) => {
      const scac = opt.value
      const sep = opt.label.indexOf(' - ')
      const name = sep === -1 ? opt.label : opt.label.slice(sep + 3)
      const flag = FLAG_BY_INDEX[i]
      const flags = flag ? [flag] : []
      // PRESELECTED BY DEFAULT, except carriers already in the route guide.
      // Kathleen, 2026-08-07 SpotBoard UX call [27:52]: "by default, you don't
      // send them the routed carriers that were from the route guide, but you
      // can include them for a spot bid if you want to." The legacy screen
      // (Maintain Carrier Overflow) shows exactly this — routed carriers sit at
      // Status=Excluded with Include? unchecked, every other carrier checked.
      //
      // So 'Routed' is not merely a display flag: it is the one thing that
      // opts a carrier OUT of the default. 'Waffled' does not — a carrier who
      // gave a load back is still invited unless the planner says otherwise.
      return {
        scac,
        name,
        email: `ops@${scac.toLowerCase()}.example.com`,
        equipment: list.equipment,
        incl: !flags.includes('Routed'),
        plannedPickup: '',
        plannedDelivery: '',
        flags,
      }
    })
}
