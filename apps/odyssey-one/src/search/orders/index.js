// The Orders search adapter the app consumes — mock or live, chosen by API mode
// behind the domain seam. Same dispatch (and same reason for living in its own
// file rather than in adapter.js) as `search/shipments/index.js`: liveAdapter
// imports adapter's row helpers, so choosing inside adapter.js would be a cycle.
// Tests import ./adapter directly and always get the mock.
import { getApiMode } from '../../api/config'
import { ordersSearchAdapter as mockAdapter } from './adapter'
import { makeLiveAdapter } from './liveAdapter'

// Mock stays the case-discovery environment and the behavioural reference the
// live path is written against (the S104 ruling, applied to Orders) — not dead
// code, and still what every test drives.
export const ordersSearchAdapter =
  getApiMode() === 'live' ? makeLiveAdapter(mockAdapter) : mockAdapter
