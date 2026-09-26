import { describe, test, expect, vi } from 'vitest'

vi.mock('../spotboard/token.js', () => ({ mintToken: vi.fn(() => 'TOKEN123') }))
vi.mock('../tender/email/tenderEmail.js', () => ({ isEmailNotify: (api) => api === 'Email' || api === 'Email & EDI' }))

import { applyTenderAction } from './tenderAction'

const ctx = { now: '09/25/2026 12:00', currentUserName: 'Amy Cook', sellShipment: '26000001' }
const opt = (rank, over = {}) => ({ rank, status: null, api: 'EDI', scac: `SCAC${rank}`, ...over })

describe('applyTenderAction', () => {
  test('Cancel: sets Cancelled + response fields on the clicked rank only (no cascade when nothing else is null)', () => {
    const options = [opt(1, { status: 'Sent' })]
    const { updated, touched } = applyTenderAction(options, 1, 'Cancel', ctx)
    expect(updated[0]).toMatchObject({ status: 'Cancelled', responseUser: 'Amy Cook', responseMethod: 'Manual Update', responseDateTime: ctx.now })
    expect(touched).toEqual([1])
  })

  // The cascade this whole module exists to share verbatim with Consolidation
  // Review's "Cancel tendered shipment(s)" (user ruling, 2026-09-25 — reuse
  // the SAME path, cascade included, not a cascade-free variant).
  test('Cancel cascades to the next null-status carrier by rank ascending', () => {
    const options = [opt(1, { status: 'Sent' }), opt(3), opt(2)]
    const { updated, touched } = applyTenderAction(options, 1, 'Cancel', ctx)
    expect(touched.sort()).toEqual([1, 2])
    const autoTendered = updated.find((o) => o.rank === 2)
    expect(autoTendered.status).toBe('Sent')
    expect(autoTendered.notifyDateTime).toBe(ctx.now)
    // rank 3 (also null-status, but rank 2 comes first ascending) is untouched
    expect(updated.find((o) => o.rank === 3).status).toBeNull()
  })

  test('Decline cascades the same way Cancel does', () => {
    const options = [opt(1, { status: 'Sent' }), opt(2)]
    const { updated, touched } = applyTenderAction(options, 1, 'Decline', ctx)
    expect(updated.find((o) => o.rank === 1).status).toBe('Declined')
    expect(touched).toEqual([1, 2])
  })

  test('Accept/Tender/Re-Tender never cascade', () => {
    const options = [opt(1, { status: 'Sent' }), opt(2)]
    expect(applyTenderAction(options, 1, 'Accept', ctx).touched).toEqual([1])
    expect(applyTenderAction([opt(1)], 1, 'Tender', ctx).touched).toEqual([1])
  })

  test('Tender/Re-Tender mint a token for an email carrier, not an EDI one', () => {
    const emailOpt = [opt(1, { api: 'Email' })]
    const { updated } = applyTenderAction(emailOpt, 1, 'Tender', ctx)
    expect(updated[0].tenderToken).toBe('TOKEN123')
    const ediOpt = [opt(1, { api: 'EDI' })]
    expect(applyTenderAction(ediOpt, 1, 'Tender', ctx).updated[0].tenderToken).toBeUndefined()
  })

  test('Re-Tender clears the prior cycle\'s response fields', () => {
    const options = [opt(1, { status: 'Declined', responseDateTime: '09/01/2026', responseUser: 'X', responseMethod: 'Manual Update' })]
    const { updated } = applyTenderAction(options, 1, 'Re-Tender', ctx)
    expect(updated[0]).toMatchObject({ status: 'Sent', responseDateTime: '--', responseMethod: '--', responseUser: null })
  })
})
