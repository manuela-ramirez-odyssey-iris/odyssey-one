import { describe, test, expect } from 'vitest'
import { getErrorDetail } from './errorDetail.js'

describe('getErrorDetail', () => {
  test('no error → generic fallback', () => {
    expect(getErrorDetail(undefined)).toBe('Something went wrong. Please try again.')
  })

  test('AbortError → timeout copy', () => {
    expect(getErrorDetail({ name: 'AbortError', message: 'The operation was aborted.' }))
      .toBe('The request timed out.')
  })

  test('TypeError (native fetch network failure) → offline copy', () => {
    expect(getErrorDetail(new TypeError('Failed to fetch'))).toBe('No connection to the server.')
  })

  test('status 401 → access copy', () => {
    expect(getErrorDetail({ name: 'ApiError', status: 401, message: 'Unauthorized' }))
      .toBe("You don't have access to this data.")
  })

  test('status 403 → access copy', () => {
    expect(getErrorDetail({ name: 'ApiError', status: 403, message: 'Forbidden' }))
      .toBe("You don't have access to this data.")
  })

  test('5xx status → service unavailable copy', () => {
    expect(getErrorDetail({ name: 'ApiError', status: 503, message: 'upstream 503' }))
      .toBe('The service is temporarily unavailable.')
  })

  test('500 status → service unavailable copy', () => {
    expect(getErrorDetail({ name: 'ApiError', status: 500, message: 'Internal error' }))
      .toBe('The service is temporarily unavailable.')
  })

  test('an unmapped status (e.g. a 409) never leaks the raw server message', () => {
    expect(getErrorDetail({ name: 'ApiError', status: 409, message: 'Order number already exists: ORD-9' }))
      .toBe('Something went wrong. Please try again.')
  })

  test('an error with no recognizable status falls to the generic fallback', () => {
    expect(getErrorDetail({ name: 'Error', message: 'boom' })).toBe('Something went wrong. Please try again.')
  })
})
