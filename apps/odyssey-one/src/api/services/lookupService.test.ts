import { describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))

import { getLookupOptions, TYPEAHEAD_MIN_CHARS } from './lookupService'

describe('lookupService.getLookupOptions (mock)', () => {
  it('gates typeahead types at 2 characters, excluding spaces (LINX-7553)', async () => {
    expect(TYPEAHEAD_MIN_CHARS).toBe(2)
    expect(await getLookupOptions('owning-org', 'e')).toEqual([])
    expect(await getLookupOptions('owning-org', ' e ')).toEqual([]) // spaces don't count
    expect((await getLookupOptions('owning-org', 'er')).length).toBeGreaterThan(0)
  })

  it('matches case-insensitively across value, label, and description', async () => {
    const byLabel = await getLookupOptions('owning-org', 'erco systems')
    expect(byLabel.map(o => o.value)).toContain('ERCO_SYS_01')
    const byValue = await getLookupOptions('owning-org', 'erco_sys')
    expect(byValue.map(o => o.value)).toContain('ERCO_SYS_01')
    const byDesc = await getLookupOptions('special-service', 'lift')
    expect(byDesc.map(o => o.value)).toContain('LFT')
  })

  it('sorts by frequency descending', async () => {
    const all = await getLookupOptions('special-service', 'pallet') // PALEXG(90) + PJC(80)
    expect(all.map(o => o.value)).toEqual(['PALEXG', 'PJC'])
  })

  it('scopes equipment by owning organization (empty without one)', async () => {
    expect(await getLookupOptions('equipment', 'va')).toEqual([])
    const acme = await getLookupOptions('equipment', 'va', { orgId: 'ACME_LOG_01' })
    expect(acme.map(o => o.value)).toEqual(['VAN'])
    const acmeAll = await getLookupOptions('equipment', '  ', { orgId: 'ACME_LOG_01' })
    expect(acmeAll.map(o => o.value).sort()).toEqual(['FLT', 'VAN']) // restricted subset
    const erco = await getLookupOptions('equipment', '', { orgId: 'ERCO_SYS_01' })
    expect(erco).toHaveLength(4) // unrestricted org sees all codes
  })

  it('select-like types return the full list with no typeahead gate', async () => {
    const terms = await getLookupOptions('freight-term', '')
    expect(terms.map(o => o.value)).toEqual(['Pre-Paid', 'COL', 'Third Party'])
    const dirs = await getLookupOptions('ship-direction', '')
    expect(dirs.map(o => o.value)).toEqual(['Outbound', 'Inbound'])
  })

  it('org-address options carry the hydration meta (manual-grid autofill)', async () => {
    const [opt] = await getLookupOptions('org-address', 'EW-TX-001')
    expect(opt.value).toBe('EW-TX-001')
    expect(opt.meta).toMatchObject({
      longName: 'ERCO WORLDWIDE',
      city: 'Houston',
      state: 'TX',
      postal: '77001',
      country: 'United States',
    })
  })

  it('product options carry the description for the auto-filled cell', async () => {
    const [opt] = await getLookupOptions('product', '39011E6K')
    expect(opt.description).toBe('Polyethylene Resin HD')
  })
})
