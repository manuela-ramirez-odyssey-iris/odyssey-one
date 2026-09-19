// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import ShipmentsPanelTabs from './ShipmentsPanelTabs'
import { PGIPGR_WIDGETS, widgetTotal } from '../../data/pgipgrWidgets'

afterEach(cleanup)

const metrics = { pgipgrErrors: 348, ratingFailure: 126, manualPgipgr: 194 }
const setup = (props = {}) =>
  render(
    <ShipmentsPanelTabs
      activePanel="pgipgr"
      onPanelSelect={() => {}}
      activeTab="all"
      onTabSelect={() => {}}
      metrics={metrics}
      viewMode="widgets"
      {...props}
    />,
  )

// S153 — PGI/PGR's three subtabs each carry a breakdown the other panels have no
// equivalent for, so widget mode renders them as 3xChart widgets, not the
// WidgetMini strip.
describe('ShipmentsPanelTabs — PGI/PGR widget mode', () => {
  it('leads with an All widget as 3x — multi-row, no donut of its own', () => {
    const { container } = setup()
    const all = container.querySelector('.widget--3x')
    expect(all).toBeTruthy()
    expect(all.querySelectorAll('svg circle')).toHaveLength(0)
    // Its rows are the three widgets beside it, at the same numbers.
    for (const w of PGIPGR_WIDGETS) expect(within(all).getByText(w.title)).toBeTruthy()
    expect(all.parentElement.firstElementChild).toBe(all)  // leads the row
  })

  it('an All row selects that subtab', () => {
    const onTabSelect = vi.fn()
    const { container } = setup({ onTabSelect })
    fireEvent.click(within(container.querySelector('.widget--3x')).getByText('Manual PGI/PGR'))
    expect(onTabSelect).toHaveBeenCalledWith('manual-pgipgr')
  })

  it('renders one 3xChart widget per subtab, with its centre metric', () => {
    const { container } = setup()
    const widgets = container.querySelectorAll('.widget--3xChart')
    expect(widgets).toHaveLength(3)
    for (const w of PGIPGR_WIDGETS) {
      const card = [...widgets].find((el) => el.textContent.includes(w.title))
      expect(card, w.title).toBeTruthy()
      expect(card.textContent).toContain(w.metricLabel)
      // Every slice appears as a legend row.
      for (const s of w.slices) expect(within(card).getByText(s.label)).toBeTruthy()
    }
  })

  it('the donut has one segment per slice and the legend totals the centre metric', () => {
    const { container } = setup()
    const card = [...container.querySelectorAll('.widget--3xChart')]
      .find((el) => el.textContent.includes('PGI/PGR Errors'))
    // 10 slices + the --chart-rest backing circle.
    expect(card.querySelectorAll('svg circle')).toHaveLength(PGIPGR_WIDGETS[0].slices.length + 1)
    expect(widgetTotal(PGIPGR_WIDGETS[0])).toBe(metrics.pgipgrErrors)
  })

  it('the footer link commits that subtab', () => {
    const onTabSelect = vi.fn()
    const { container } = setup({ onTabSelect })
    const card = [...container.querySelectorAll('.widget--3xChart')]
      .find((el) => el.textContent.includes('Rating Failure'))
    fireEvent.click(within(card).getByRole('button', { name: /View these shipments/ }))
    expect(onTabSelect).toHaveBeenCalledWith('rating-failure')
  })

  it('marks the active subtab, and only it — All included', () => {
    const { container } = setup({ activeTab: 'manual-pgipgr' })
    let current = container.querySelectorAll('.widget--current')
    expect(current).toHaveLength(1)
    expect(current[0].textContent).toContain('Manual PGI/PGR')
    cleanup()
    const onAll = setup({ activeTab: 'all' }).container
    current = onAll.querySelectorAll('.widget--current')
    expect(current).toHaveLength(1)
    expect(current[0].classList.contains('widget--3x')).toBe(true)
  })

  // The other two panels keep the WidgetMini strip — this is a PGI/PGR-only
  // treatment, not a change to widget mode everywhere.
  it('leaves the other panels on WidgetMini', () => {
    const { container } = setup({ activePanel: 'monitoring', metrics: { hold: 3, consolidation: 4 } })
    expect(container.querySelectorAll('.widget--3xChart')).toHaveLength(0)
    expect(container.querySelectorAll('.widget-mini').length).toBeGreaterThan(0)
  })

  it('pill mode is untouched on PGI/PGR', () => {
    const { container } = setup({ viewMode: 'pills' })
    expect(container.querySelectorAll('.widget--3xChart')).toHaveLength(0)
    expect(screen.getByText('PGI/PGR Errors')).toBeTruthy()
  })
})
