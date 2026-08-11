import { describe, it, expect } from 'vitest'
import { NAMED_LISTS, buildCarrierRows, FLAG_LABELS } from './carrierList'

// Mirrors the real getLookupOptions('carrier') pool shape ({value: scac,
// label: 'SCAC - Name'}) — covers every SCAC referenced by NAMED_LISTS plus
// a few extras, so "a named list is a curated subset of the pool" is
// actually exercised (not every pool entry belongs to every list).
const carrierOptions = [
  { value: 'KNGT', label: 'KNGT - Knight-Swift Transportation' },
  { value: 'SCNN', label: 'SCNN - Schneider National' },
  { value: 'JBHT', label: 'JBHT - J.B. Hunt Transport' },
  { value: 'WERN', label: 'WERN - Werner Enterprises' },
  { value: 'CRST', label: 'CRST - CRST International' },
  { value: 'SWFT', label: 'SWFT - Swift Transportation' },
  { value: 'PRIJ', label: 'PRIJ - Prime Inc' },
  { value: 'ODFL', label: 'ODFL - Old Dominion Freight Line' },
  { value: 'SAIA', label: 'SAIA - Saia LTL Freight' },
  { value: 'ABFS', label: 'ABFS - ABF Freight System' },
  { value: 'AACT', label: 'AACT - AAA Cooper Transportation' },
  { value: 'EXLA', label: 'EXLA - Estes Express Lines' },
  { value: 'FXFE', label: 'FXFE - FedEx Freight' },
  { value: 'SEFL', label: 'SEFL - Southeastern Freight Lines' },
  { value: 'UPGF', label: 'UPGF - UPS Ground Freight' },
]

describe('NAMED_LISTS', () => {
  it('has id, name, equipment, defaultDurationMin, scacs on every entry', () => {
    expect(NAMED_LISTS.length).toBeGreaterThan(0)
    for (const l of NAMED_LISTS) {
      expect(l).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        equipment: expect.any(String),
        defaultDurationMin: expect.any(Number),
      })
      expect(Array.isArray(l.scacs)).toBe(true)
    }
  })
})

describe('buildCarrierRows', () => {
  const list = NAMED_LISTS[0]
  const rows = buildCarrierRows(list, carrierOptions)

  it('resolves to a small, curated subset (5-8 rows) — not the whole pool', () => {
    expect(rows.length).toBeGreaterThanOrEqual(5)
    expect(rows.length).toBeLessThanOrEqual(8)
    expect(rows.length).toBeLessThan(carrierOptions.length)
  })

  it('every row belongs to the list membership', () => {
    for (const r of rows) expect(list.scacs).toContain(r.scac)
  })

  it('synthesizes an ops@ email from the SCAC, with empty dates (no prefill)', () => {
    expect(rows[0]).toMatchObject({
      scac: 'KNGT',
      name: 'Knight-Swift Transportation',
      email: 'ops@kngt.example.com',
      equipment: list.equipment,
      plannedPickup: '',
      plannedDelivery: '',
    })
  })

  it('flags at least one row Routed, deterministically (no randomness)', () => {
    const flagged = rows.filter((r) => r.flags.includes('Routed'))
    expect(flagged.length).toBeGreaterThanOrEqual(1)
    expect(list.scacs).toContain(flagged[0].scac)

    const again = buildCarrierRows(list, carrierOptions)
    expect(again).toEqual(rows)
  })

  // REVERSAL (2026-08-11, Kathleen 2026-08-07 [27:52]). This previously
  // asserted the opposite — "no row is pre-selected, regardless of flags".
  // The ruling is that the table arrives preselected and the ROUTE-GUIDE
  // carriers are the exception, which is also what the legacy overflow screen
  // shows (Routed ✓ → Status=Excluded, Include? unchecked).
  it('rows are PRESELECTED, except carriers already in the route guide', () => {
    expect(rows.length).toBeGreaterThan(0)
    const routed = rows.filter((r) => r.flags.includes('Routed'))
    const rest = rows.filter((r) => !r.flags.includes('Routed'))

    expect(routed.length).toBeGreaterThanOrEqual(1) // the rule needs something to exclude
    for (const r of routed) expect(r.incl).toBe(false)

    expect(rest.length).toBeGreaterThan(0)
    for (const r of rest) expect(r.incl).toBe(true)
  })

  it('a Waffled row still displays its flag — display text changed, flag identity did not', () => {
    const waffled = rows.filter((r) => r.flags.includes('Waffled'))
    expect(waffled.length).toBeGreaterThanOrEqual(1)
    for (const r of waffled) {
      // Waffled is NOT an exclusion — only Routed is. A carrier who gave a
      // load back is still invited unless the planner says otherwise.
      expect(r.incl).toBe(true)
      expect(list.scacs).toContain(r.scac)
    }
    // The identity string driving that check is still the bare 'Waffled' —
    // display text ('Waffled / Gave back') lives in FLAG_LABELS, separate.
    expect(FLAG_LABELS.Waffled).toBe('Waffled / Gave back')
  })

  it('skips membership SCACs the resolved pool does not (yet) have', () => {
    const thin = buildCarrierRows(list, carrierOptions.slice(0, 1))
    expect(thin.every((r) => r.scac === 'KNGT')).toBe(true)
  })
})
