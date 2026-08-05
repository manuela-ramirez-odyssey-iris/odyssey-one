import { describe, it, expect } from 'vitest'
import { NAMED_LISTS, buildCarrierRows } from './carrierList'

const carrierOptions = [
  { value: 'ODFL', label: 'ODFL - Old Dominion Freight Line' },
  { value: 'FXFE', label: 'FXFE - FedEx Freight' },
  { value: 'SAIA', label: 'SAIA - Saia Inc' },
  { value: 'UPGF', label: 'UPGF - UPS Freight' },
]

describe('NAMED_LISTS', () => {
  it('has id, name, equipment, defaultDurationMin on every entry', () => {
    expect(NAMED_LISTS.length).toBeGreaterThan(0)
    for (const l of NAMED_LISTS) {
      expect(l).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        equipment: expect.any(String),
        defaultDurationMin: expect.any(Number),
      })
    }
  })
})

describe('buildCarrierRows', () => {
  const list = NAMED_LISTS[0]
  const rows = buildCarrierRows(list, carrierOptions)

  it('synthesizes an ops@ email from the SCAC', () => {
    expect(rows[0]).toMatchObject({
      scac: 'ODFL',
      name: 'Old Dominion Freight Line',
      email: 'ops@odfl.example.com',
      equipment: list.equipment,
      plannedPickup: '',
      plannedDelivery: '',
    })
  })

  it('flags at least one row Routed with incl:false, deterministically (no randomness)', () => {
    const flagged = rows.filter((r) => r.flags.includes('Routed'))
    expect(flagged.length).toBeGreaterThanOrEqual(1)
    expect(flagged[0].incl).toBe(false)

    const again = buildCarrierRows(list, carrierOptions)
    expect(again).toEqual(rows)
  })

  it('defaults incl:true for unflagged rows', () => {
    const unflagged = rows.filter((r) => r.flags.length === 0)
    expect(unflagged.length).toBeGreaterThan(0)
    for (const r of unflagged) expect(r.incl).toBe(true)
  })

  it('is pure sync over an already-resolved options array', () => {
    expect(rows).toHaveLength(carrierOptions.length)
  })
})
