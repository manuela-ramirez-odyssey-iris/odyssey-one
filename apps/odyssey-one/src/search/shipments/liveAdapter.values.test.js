// getAttributeValues, live (S130). Until the /v1/search/values endpoint existed
// this was `null`, which made every `letters` control in the Filters panel
// degrade to a plain text field — the "dropdowns don't populate" report.
import { test, expect, vi, beforeEach } from 'vitest'

const calls = []
vi.mock('../../api/client', () => ({
  apiPost: vi.fn(async (path, body) => {
    calls.push({ path, body })
    return { values: ['Weyerhaeuser Company', 'Westrock'], total: 120 }
  }),
}))

import { makeLiveAdapter } from './liveAdapter'
import { shipmentsSearchAdapter as mockAdapter } from './adapter'

beforeEach(() => { calls.length = 0 })

test('the Filters dataKey is translated to the registry attr key the endpoint wants', async () => {
  const live = makeLiveAdapter(mockAdapter)
  await live.getAttributeValues('customerName', 'we')
  expect(calls[0].path).toBe('/v1/search/values')
  expect(calls[0].body.attr).toBe('customer-name')
  expect(calls[0].body.query).toBe('we')
})

test('resolves { options, total } — the shape that puts the ComboBox in lazy-load mode', async () => {
  const live = makeLiveAdapter(mockAdapter)
  const page = await live.getAttributeValues('customerName', '')
  // A plain array would make the ComboBox treat one page as the whole catalog
  // and never fetch the rest.
  expect(page).toEqual({ options: ['Weyerhaeuser Company', 'Westrock'], total: 120 })
})

test('skip is forwarded, so the next page is a NEW page and not page 1 again', async () => {
  const live = makeLiveAdapter(mockAdapter)
  await live.getAttributeValues('customerName', '', 50)
  expect(calls[0].body.page).toEqual({ limit: 50, skip: 50 })
})

test('an unmapped dataKey answers honest-empty without a request', async () => {
  const live = makeLiveAdapter(mockAdapter)
  expect(await live.getAttributeValues('notAField', 'x')).toEqual({ options: [], total: 0 })
  expect(calls).toHaveLength(0)
})
