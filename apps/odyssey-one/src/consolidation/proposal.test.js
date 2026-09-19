import { describe, test, expect } from 'vitest'
import { buildProposal } from './proposal'
import { capacityFor, utilizationPct, DEFAULT_CAPACITY, EQUIPMENT_CAPACITY } from './equipmentCapacity'

const row = (i, over = {}) => ({
  id: `s${i}`, sellShipment: `s${i}`, buyShipment: `b${i}`, odysseyShipmentIdentifier: `O0000000${i}`,
  customerId: 'VALTRIS_01', customerName: 'Valtris Specialty Chemicals',
  origin: `Origin ${i}, TX`, destination: `Dest ${i}, NJ`,
  pickupDate: `0${i}/10/2026 08:00 CST`, deliveryDate: `0${i}/12/2026 08:00 CST`,
  grossWeight: '10000', equipmentCode: 'TL', ...over,
})
const detail = (volume, hazmat) => ({
  stopsData: { summary: { volume } },
  orderDetails: [{ hazmat }],
})

describe('equipmentCapacity', () => {
  test('known code → its row; unknown/empty → default', () => {
    expect(capacityFor('TL')).toBe(EQUIPMENT_CAPACITY.TL)
    expect(capacityFor('NOPE')).toBe(DEFAULT_CAPACITY)
    expect(capacityFor('')).toBe(DEFAULT_CAPACITY)
  })
  test('utilizationPct rounds to a whole percent and is null without a total', () => {
    expect(utilizationPct(22500, 45000)).toBe(50)
    expect(utilizationPct(1, 3)).toBe(33)
    expect(utilizationPct(null, 45000)).toBeNull()
  })
})

describe('buildProposal', () => {
  test('stops: every pickup in selection order, then every delivery', () => {
    const p = buildProposal([row(1), row(2)])
    expect(p.stops.map((s) => s.label)).toEqual(['P1', 'P2', 'D1', 'D2'])
    expect(p.stops[0]).toMatchObject({ type: 'pickup', location: 'Origin 1, TX', date: '01/10/2026 08:00 CST' })
    expect(p.stops[3]).toMatchObject({ type: 'delivery', location: 'Dest 2, NJ', date: '02/12/2026 08:00 CST' })
    expect(p.pickupCount).toBe(2)
    expect(p.deliveryCount).toBe(2)
  })
  test('customer + identifiers come from the rows (anchor = first row)', () => {
    const p = buildProposal([row(1), row(2)])
    expect(p.customerName).toBe('Valtris Specialty Chemicals')
    expect(p.identifiers).toEqual(['O00000001', 'O00000002'])
  })
  test('weight sums grossWeight; utilization uses the anchor equipment capacity', () => {
    const p = buildProposal([row(1), row(2, { grossWeight: '12,500' })])
    expect(p.weightLb).toBe(22500)
    expect(p.weightUtilization).toBe(utilizationPct(22500, capacityFor('TL').weightLb))
  })
  test('volume + hazmat need every detail; missing volume → null (renders --)', () => {
    const rows = [row(1), row(2)]
    expect(buildProposal(rows).volumeCuft).toBeNull()
    expect(buildProposal(rows).hazmat).toBeNull()
    const p = buildProposal(rows, [detail('1,000 cuft', 'No'), detail('375 cuft', 'Yes')])
    expect(p.volumeCuft).toBe(1375)
    expect(p.volumeUtilization).toBe(utilizationPct(1375, capacityFor('TL').volumeCuft))
    expect(p.hazmat).toBe(true)
    const q = buildProposal(rows, [detail('1,000 cuft', 'No'), detail('--', 'No')])
    expect(q.volumeCuft).toBeNull()
    expect(q.volumeUtilization).toBeNull()
    expect(q.hazmat).toBe(false)
  })
  test('empty rows → an empty proposal, no throw', () => {
    const p = buildProposal([])
    expect(p.stops).toEqual([])
    expect(p.weightLb).toBe(0)
    expect(p.customerName).toBe('')
  })
})
