// @vitest-environment jsdom
import { beforeEach, describe, test, expect } from 'vitest'
import { mintToken, decodeToken } from './token'

beforeEach(() => {
  localStorage.clear()
})

describe('mintToken / decodeToken', () => {
  test('round-trips exactly', () => {
    const input = { shipmentId: '0000000091105', scac: 'ODFL' }
    const token = mintToken(input.shipmentId, input.scac)
    expect(decodeToken(token)).toEqual(input)
  })

  test('decodeToken returns null for an unknown key', () => {
    expect(decodeToken('not-a-real-key')).toBeNull()
  })

  test('decodeToken returns null on malformed input, never throws', () => {
    expect(() => decodeToken('!!bad!!')).not.toThrow()
    expect(decodeToken('!!bad!!')).toBeNull()
  })

  test('decodeToken returns null for absent/falsy input', () => {
    expect(decodeToken(undefined)).toBeNull()
    expect(decodeToken(null)).toBeNull()
    expect(decodeToken('')).toBeNull()
  })

  test('decodeToken returns null when the stored mapping is corrupt JSON', () => {
    localStorage.setItem('spotboard:token:bad-key', '{not json')
    expect(decodeToken('bad-key')).toBeNull()
  })

  test('decodeToken returns null when the stored mapping is missing required fields', () => {
    localStorage.setItem('spotboard:token:incomplete-key', JSON.stringify({ foo: 'bar' }))
    expect(decodeToken('incomplete-key')).toBeNull()
  })

  test('the minted token does not carry the shipmentId — opaque, not reversible', () => {
    const shipmentId = '0000000091105'
    const token = mintToken(shipmentId, 'ODFL')

    expect(token).not.toContain(shipmentId)

    // The old design was reversible base64 — assert atob() no longer yields
    // the id (either it throws on invalid base64, or decodes to garbage).
    let decoded = ''
    try {
      decoded = atob(token)
    } catch {
      decoded = ''
    }
    expect(decoded).not.toContain(shipmentId)
  })
})
