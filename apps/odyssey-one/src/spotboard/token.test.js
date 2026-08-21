// @vitest-environment jsdom
import { describe, test, expect } from 'vitest'
import { mintToken, decodeToken } from './token'

describe('mintToken / decodeToken', () => {
  test('round-trips exactly', () => {
    const input = { shipmentId: '0000000091105', scac: 'ODFL' }
    const token = mintToken(input.shipmentId, input.scac)
    expect(decodeToken(token)).toEqual(input)
  })

  test('two mints for the same (shipmentId, scac) still produce distinct tokens (nonce)', () => {
    const a = mintToken('0000000091105', 'ODFL')
    const b = mintToken('0000000091105', 'ODFL')
    expect(a).not.toBe(b)
    expect(decodeToken(a)).toEqual({ shipmentId: '0000000091105', scac: 'ODFL' })
    expect(decodeToken(b)).toEqual({ shipmentId: '0000000091105', scac: 'ODFL' })
  })

  test('decodeToken returns null on malformed/garbage input, never throws', () => {
    expect(() => decodeToken('!!bad!!')).not.toThrow()
    expect(decodeToken('!!bad!!')).toBeNull()
    expect(decodeToken('not-a-real-token')).toBeNull()
  })

  test('decodeToken returns null for absent/falsy input', () => {
    expect(decodeToken(undefined)).toBeNull()
    expect(decodeToken(null)).toBeNull()
    expect(decodeToken('')).toBeNull()
  })

  test('decodeToken returns null when the decoded shape is missing required fields', () => {
    const token = btoa(JSON.stringify({ foo: 'bar' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(decodeToken(token)).toBeNull()
  })

  // Defect 2 fix: the token must be self-contained (no localStorage lookup)
  // so a carrier opening the link in a browser that never minted it — the
  // real-world case — still resolves shipmentId/scac.
  test('cross-browser: decode works with zero localStorage state', () => {
    const token = mintToken('0000000091105', 'ODFL')
    localStorage.clear() // simulate a fresh browser — nothing was ever stored here
    expect(decodeToken(token)).toEqual({ shipmentId: '0000000091105', scac: 'ODFL' })
  })

  // decodeToken alone can't distinguish a forged-but-valid-shaped token from
  // the real minted one — anyone who knows a shipmentId/scac pair can build
  // one. That's expected; the actual forgery guard is the raw-token
  // string-equality check against quote.carriers[].token in CarrierBid.jsx
  // (see CarrierBid.test.jsx's "forged token" case).
  test('a well-shaped token with a different nonce still decodes to the same identity', () => {
    const real = mintToken('0000000091105', 'ODFL')
    const forged = mintToken('0000000091105', 'ODFL')
    expect(forged).not.toBe(real)
    expect(decodeToken(forged)).toEqual({ shipmentId: '0000000091105', scac: 'ODFL' })
  })
})
