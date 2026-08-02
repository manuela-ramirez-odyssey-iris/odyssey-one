// The Shipments search adapter the app actually consumes — mock or live,
// chosen by API mode behind the domain seam (S104 Task 8).
//
// The dispatch lives here rather than in adapter.js because liveAdapter.js
// imports adapter.js's row-shape helpers; putting the choice in adapter.js would
// make that a cycle. Tests import ./adapter directly and always get the mock.
import { getApiMode } from '../../api/config'
import { shipmentsSearchAdapter as mockAdapter } from './adapter'
import { makeLiveAdapter } from './liveAdapter'

// Mock stays the CASE-DISCOVERY environment and the behavioural reference the
// live path is written against (user ruling, S104) — it is not dead code.
export const shipmentsSearchAdapter =
  getApiMode() === 'live' ? makeLiveAdapter(mockAdapter) : mockAdapter

export { panelForResults } from './adapter'
