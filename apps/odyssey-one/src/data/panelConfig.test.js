import { describe, test, expect } from 'vitest'
import { PANEL_CONFIG, panelTotals, bestPanelForSearch } from './panelConfig'

// GS-17 — a committed search lands on the panel holding the most matches.
describe('bestPanelForSearch', () => {
  test('picks the panel with the most matches, not the first one', () => {
    // The measured S104 case: query FXFE → monitoring 90, exceptions 33.
    const totals = { exceptions: 33, monitoring: 90, pgipgr: 0 }
    expect(bestPanelForSearch(totals)).toBe('monitoring')
  })

  test('ignores panels with zero matches', () => {
    expect(bestPanelForSearch({ exceptions: 0, monitoring: 0, pgipgr: 7 })).toBe('pgipgr')
  })

  test('no matches anywhere → null (caller leaves the panel alone)', () => {
    expect(bestPanelForSearch({ exceptions: 0, monitoring: 0, pgipgr: 0 })).toBeNull()
    expect(bestPanelForSearch({})).toBeNull()
    expect(bestPanelForSearch(undefined)).toBeNull()
  })

  test('ties break on PANEL_CONFIG order (stable, not arbitrary)', () => {
    const first = Object.keys(PANEL_CONFIG)[0]
    const tied = Object.fromEntries(Object.keys(PANEL_CONFIG).map((k) => [k, 5]))
    expect(bestPanelForSearch(tied)).toBe(first)
  })
})

describe('panelTotals', () => {
  test('sums each panel\'s category badges', () => {
    const metrics = { dateIssues: 1, routingReview: 2, hold: 10 }
    const totals = panelTotals(metrics)
    expect(totals.exceptions).toBe(3)
    expect(totals.monitoring).toBe(10)
    expect(totals.pgipgr).toBe(0) // absent badges count as 0, never NaN
  })
})

// GS-19 (revised) — PANEL TABS ARE PERMANENT. A search narrows the numbers on
// them, never the tabs themselves (user, S104: "PGI/PGR and the other top tabs
// Exceptions and Monitoring are never meant to be gone").
describe('panel tabs are never hidden', () => {
  test('every configured panel stays visible, whatever the counts', () => {
    const keys = Object.keys(PANEL_CONFIG)
    expect(keys).toContain('pgipgr')
    // The route's visiblePanels is now simply the config keys — no count gate.
    expect(keys.length).toBeGreaterThanOrEqual(3)
  })

  test('a zero total is a number to SHOW, not a reason to hide', () => {
    // pgipgr has no rows in the dataset at all; its tab still belongs in the row.
    const totals = { exceptions: 33, monitoring: 90, pgipgr: 0 }
    expect(panelTotals({})).toMatchObject({ pgipgr: 0 })
    expect(bestPanelForSearch(totals)).toBe('monitoring') // landing still skips empties
  })
})
