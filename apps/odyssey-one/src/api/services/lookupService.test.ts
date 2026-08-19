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
    // Real vocabulary (lookup-only swap 2026-07-28): TL/LTL/… families
    expect(await getLookupOptions('equipment', 'tl')).toEqual([])
    const acme = await getLookupOptions('equipment', 'ltr', { orgId: 'ACME_LOG_01' })
    expect(acme.map(o => o.value)).toEqual(['LTR'])
    const acmeAll = await getLookupOptions('equipment', '  ', { orgId: 'ACME_LOG_01' })
    expect(acmeAll.map(o => o.value).sort()).toEqual(['LTL', 'LTR', 'TL', 'TLR']) // restricted subset
    const erco = await getLookupOptions('equipment', '', { orgId: 'ERCO_SYS_01' })
    expect(erco).toHaveLength(11) // unrestricted org sees the full catalog
  })

  it('select-like types return the full list with no typeahead gate', async () => {
    const terms = await getLookupOptions('freight-term', '')
    expect(terms.map(o => o.value)).toEqual(['P', 'C', 'A', 'T', 'N'])
    expect(terms.map(o => o.label)).toEqual(['Pre-Paid', 'Collect', 'Pre-Paid/Add', 'Third Party', 'No Charge'])
    const dirs = await getLookupOptions('ship-direction', '')
    expect(dirs.map(o => o.value)).toEqual(['O', 'I'])
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
    const [opt] = await getLookupOptions('product', 'Polyethylene Resin HD')
    expect(opt.description).toBe('Polyethylene Resin HD')
    // Product ID = 13-digit external id (18-digit legacy minus 5 leading zeros)
    expect(opt.value).toMatch(/^\d{13}$/)
  })

  // LINX-13895 / LINX-3966 — Quote Entry's Currency comes from "TMS Master
  // Data Currency". A plain select (short closed list) like freight-term/
  // ship-direction above: full list, no typeahead gate.
  it('currency is a plain select sourced from the shared CURRENCIES pool', async () => {
    const currencies = await getLookupOptions('currency', '')
    expect(currencies.map(o => o.value)).toEqual(['CAD', 'EUR', 'MXN', 'USD'])
    expect(currencies.map(o => o.label)).toEqual(['CAD', 'EUR', 'MXN', 'USD'])
  })

  // LINX-13895 / LINX-3966 — Additional Charges' Charge Code is "Search by
  // Code or Description", so charge-code gates like the other true
  // typeaheads (special-service, etc.) rather than returning unfiltered.
  it('charge-code gates at 2 characters like special-service', async () => {
    expect(await getLookupOptions('charge-code', 'h')).toEqual([])
    expect((await getLookupOptions('charge-code', 'hz')).length).toBeGreaterThan(0)
  })

  it('charge-code matches on DESCRIPTION as well as code (the ticket\'s "Search by Code or Description")', async () => {
    const byDescription = await getLookupOptions('charge-code', 'tarping charges')
    expect(byDescription.map(o => o.value)).toEqual(['TAR'])
    const byCode = await getLookupOptions('charge-code', 'tar')
    expect(byCode.map(o => o.value)).toEqual(['TAR'])
    // The description rides on the option itself — what the ComboBox's
    // Charge Description auto-populate reads off the selected option.
    expect(byCode[0].description).toBe('Tarping Charges')
  })

  // Real legacy catalog (quote-model.md §5.6, `MFFOOCC`), not the invented
  // THC/FSC/SOC/HZC/ACC mnemonics this replaced.
  it('charge-code sorts by frequency descending, like special-service', async () => {
    const all = await getLookupOptions('charge-code', '')
    expect(all.map(o => o.value)).toEqual(['HZC', 'TKM', 'TAR', 'HT', 'MSC'])
  })
})
