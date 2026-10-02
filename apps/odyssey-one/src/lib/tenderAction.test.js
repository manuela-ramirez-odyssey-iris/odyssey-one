import { describe, test, expect, vi } from 'vitest'

vi.mock('../spotboard/token.js', () => ({ mintToken: vi.fn(() => 'TOKEN123') }))
vi.mock('../tender/email/tenderEmail.js', () => ({ isEmailNotify: (api) => api === 'Email' || api === 'Email & EDI' }))

import { applyTenderAction, tenderWriteExtras } from './tenderAction'

const ctx = { now: '09/25/2026 12:00', currentUserName: 'Amy Cook', sellShipment: '26000001' }
const opt = (rank, over = {}) => ({ rank, status: null, api: 'EDI', scac: `SCAC${rank}`, ...over })
const decline = { code: 'WRP', description: 'Wrong Price', comments: 'Lane too far', carrierGaveBack: true }

describe('applyTenderAction', () => {
  test('result per action (LINX-15899)', () => {
    const run = (status, action) => applyTenderAction([opt(1, { status })], 1, action, { ...ctx, decline }).updated[0].status
    expect(run(null, 'Tender')).toBe('Sent')
    expect(run('Sent', 'Re-Tender')).toBe('Sent')
    expect(run('Sent', 'Accept')).toBe('Accepted')
    expect(run('Accepted', 'Decline')).toBe('Declined')
    expect(run('To Be Cancelled', 'Cancel')).toBe('Cancelled')
  })

  test('Cancel: sets Cancelled + response fields on the clicked rank only', () => {
    const { updated, touched } = applyTenderAction([opt(1, { status: 'Sent' })], 1, 'Cancel', ctx)
    expect(updated[0]).toMatchObject({ status: 'Cancelled', responseUser: 'Amy Cook', responseMethod: 'Manual Update', responseDateTime: ctx.now })
    expect(touched).toEqual([1])
  })

  // A1 — the auto-tender cascade is gone: the next null-status carrier stays put.
  test.each(['Cancel', 'Decline'])('%s no longer cascades to the next null-status carrier', (action) => {
    const options = [opt(1, { status: 'Sent' }), opt(2), opt(3)]
    const { updated, touched } = applyTenderAction(options, 1, action, { ...ctx, decline })
    expect(touched).toEqual([1])
    expect(updated.find((o) => o.rank === 2)).toBe(options[1])
    expect(updated.find((o) => o.rank === 2).status).toBeNull()
  })

  test('Manual comm method: Tender/Re-Tender → To Be Tendered, no token', () => {
    for (const [status, action] of [[null, 'Tender'], ['Sent', 'Re-Tender']]) {
      const { updated } = applyTenderAction([opt(1, { status, api: 'Manual' })], 1, action, ctx)
      expect(updated[0].status).toBe('To Be Tendered')
      expect(updated[0].tenderToken).toBeUndefined()
    }
  })

  test('Tender/Re-Tender mint a token for an email carrier, not an EDI one', () => {
    expect(applyTenderAction([opt(1, { api: 'Email' })], 1, 'Tender', ctx).updated[0].tenderToken).toBe('TOKEN123')
    expect(applyTenderAction([opt(1, { api: 'EDI' })], 1, 'Tender', ctx).updated[0].tenderToken).toBeUndefined()
  })

  test('Decline stores the §5 answer; giveback only from Accepted (A5)', () => {
    const fromAccepted = applyTenderAction([opt(1, { status: 'Accepted' })], 1, 'Decline', { ...ctx, decline }).updated[0]
    expect(fromAccepted).toMatchObject({ status: 'Declined', declineReasonCode: 'WRP', declineReason: 'Wrong Price', responseComments: 'Lane too far', carrierGaveBack: true })
    const fromSent = applyTenderAction([opt(1, { status: 'Sent' })], 1, 'Decline', { ...ctx, decline }).updated[0]
    expect(fromSent.carrierGaveBack).toBeUndefined()
  })

  // Bug 13 (LINX-15897) — a new cycle drops the old decline but keeps the giveback.
  test.each(['Tender', 'Re-Tender'])('%s clears the prior response + decline, keeps carrierGaveBack', (action) => {
    const options = [opt(1, {
      status: 'Declined', responseDateTime: '09/01/2026', responseUser: 'X', responseMethod: 'Manual Update',
      declineReason: 'Wrong Price', declineReasonCode: 'WRP', responseComments: 'c', carrierGaveBack: true,
    })]
    const { updated } = applyTenderAction(options, 1, action, ctx)
    expect(updated[0]).toMatchObject({
      status: 'Sent', responseDateTime: '--', responseMethod: '--', responseUser: null,
      declineReason: null, declineReasonCode: null, responseComments: null, carrierGaveBack: true,
    })
  })
})

describe('tenderWriteExtras', () => {
  test('every write names its action; Decline on email records TE-4', () => {
    expect(tenderWriteExtras(opt(1, { api: 'EDI' }), 'Accept')).toEqual({ tenderAction: 'Accept' })
    expect(tenderWriteExtras(opt(1, { api: 'EDI' }), 'Decline')).toEqual({ tenderAction: 'Decline' })
    expect(tenderWriteExtras(opt(1, { api: 'Email & EDI' }), 'Decline')).toEqual({ tenderAction: 'Decline', tenderCommMessage: 'TE-4' })
  })
})
