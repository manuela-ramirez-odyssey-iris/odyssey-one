import { describe, test, expect } from 'vitest'
import { stripPhoneDigits } from './ContactFields.jsx'

// S158, user ruling 2026-09-23: the phone input accepts digits only as
// typed — a leading `+` survives (E.164, schema.ts), everything else
// (letters, spaces, punctuation) is stripped.
describe('stripPhoneDigits', () => {
  test('strips letters and punctuation, keeps digits', () => {
    expect(stripPhoneDigits('(765) 670-4444')).toBe('7656704444')
  })

  test('keeps a leading +, strips everything else non-digit', () => {
    expect(stripPhoneDigits('+1 (765) 670-4444')).toBe('+17656704444')
  })

  test('a + anywhere but the start is dropped, not kept mid-string', () => {
    expect(stripPhoneDigits('765+4444')).toBe('7654444')
  })

  test('letters never survive — the old "letters in a phone" case is unreachable', () => {
    expect(stripPhoneDigits('not-a-number')).toBe('')
  })
})
