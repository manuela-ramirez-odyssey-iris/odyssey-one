// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import ShipmentsPanelTabs from './ShipmentsPanelTabs'
import { PGIPGR_WIDGETS, widgetTotal } from '../../data/pgipgrWidgets'

afterEach(cleanup)

// Matches PGIPGR_WIDGETS' own widgetTotal() per card (130 / 354 / 61 / 61) —
// see the "the donut has one segment per slice…" test below.
const metrics = { postErrors: 130, allSellShipments: 354, ratingErrors: 61, notResponsible: 61 }
const setup = (props = {}) =>
  render(
    <ShipmentsPanelTabs
      activePanel="pgipgr"
      onPanelSelect={() => {}}
      activeTab="post-errors"
      onTabSelect={() => {}}
      metrics={metrics}
      viewMode="widgets"
      {...props}
    />,
  )

// S159 — PGI/PGR's four categories each carry a breakdown the other panels
// have no equivalent for, so widget mode renders them as 3xChart widgets, not
// the WidgetMini strip. No roll-up "All" card (retired with the 3-category
// shape) — exactly four selectable cards, one per category.
describe('ShipmentsPanelTabs — PGI/PGR widget mode', () => {
  it('renders one 3xChart widget per category, with its centre metric', () => {
    const { container } = setup()
    const widgets = [...container.querySelectorAll('.widget--3xChart')]
    expect(widgets).toHaveLength(PGIPGR_WIDGETS.length)
    for (const w of PGIPGR_WIDGETS) {
      const card = widgets.find((el) => el.textContent.includes(w.title))
      expect(card, w.title).toBeTruthy()
      expect(card.textContent).toContain(w.metricLabel)
      // Every slice appears as a legend row. Single-slice cards repeat the
      // card title verbatim as their one slice's label (per the mock), so
      // that text is expected TWICE in the card (title + legend row).
      for (const s of w.slices) expect(within(card).getAllByText(s.label).length).toBeGreaterThan(0)
    }
  })

  it('the donut has one segment per slice and the legend totals the centre metric', () => {
    const { container } = setup()
    const card = [...container.querySelectorAll('.widget--3xChart')]
      .find((el) => el.querySelector('.widget__title')?.textContent.trim() === 'Post PGI/PGR Errors')
    // 2 slices (SCAC Error, Shipment ID Not Found) + the --chart-rest backing circle.
    expect(card.querySelectorAll('svg circle')).toHaveLength(PGIPGR_WIDGETS[0].slices.length + 1)
    expect(widgetTotal(PGIPGR_WIDGETS[0])).toBe(metrics.postErrors)
  })

  // Single-slice cards (all but Post PGI/PGR Errors) render a PARTIAL ring —
  // chartTotal > the slice value, so a grey --chart-rest remainder shows,
  // matching the mock (user fix). The pie's grow-in animation is timer/RAF
  // driven (Widget's own concern, already covered elsewhere) — this checks
  // the DATA invariant that actually produces the partial fill, and that
  // ShipmentsPanelTabs wires `chartTotal` through to the Widget at all.
  it('single-slice cards carry a chartTotal greater than their slice value', () => {
    for (const w of PGIPGR_WIDGETS.filter((w) => w.slices.length === 1)) {
      expect(w.chartTotal).toBeGreaterThan(w.slices[0].value)
    }
  })

  it('a click on the card BODY selects that category', () => {
    const onTabSelect = vi.fn()
    const { container } = setup({ onTabSelect })
    const card = [...container.querySelectorAll('.widget--3xChart')]
      .find((el) => el.querySelector('.widget__title')?.textContent.trim() === 'Not Responsible')
    expect(card.className).toContain('widget--selectable')
    fireEvent.click(card.querySelector('.widget__title'))
    expect(onTabSelect).toHaveBeenCalledWith('not-responsible')
  })

  // No footer Go-to link on any of the four (user, 2026-09-18) — which is also
  // what makes the card safe to expose as a button: nothing interactive inside.
  it('carries no footer link and no interactive descendants', () => {
    const { container } = setup()
    for (const card of container.querySelectorAll('.widget--3xChart')) {
      expect(within(card).queryByText(/shipments →|View |Showing /)).toBeNull()
      // The card itself is the only control.
      const inner = [...card.querySelectorAll('button, a, input, [role="button"]')]
        .filter((el) => el !== card)
      expect(inner.map((el) => el.textContent.slice(0, 20))).toEqual([])
    }
  })

  it('each card is a keyboard-operable button announcing its pressed state', () => {
    const onTabSelect = vi.fn()
    const { container } = setup({ onTabSelect, activeTab: 'rating-errors' })
    const card = [...container.querySelectorAll('.widget--3xChart')]
      .find((el) => el.querySelector('.widget__title')?.textContent.trim() === 'Rating Errors')
    expect(card.getAttribute('role')).toBe('button')
    expect(card.getAttribute('tabindex')).toBe('0')
    expect(card.getAttribute('aria-pressed')).toBe('true')
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onTabSelect).toHaveBeenCalledWith('rating-errors')
  })

  it('marks the active category, and only it', () => {
    const { container } = setup({ activeTab: 'not-responsible' })
    const current = container.querySelectorAll('.widget--selected')
    expect(current).toHaveLength(1)
    expect(current[0].textContent).toContain('Not Responsible')
  })

  // A stray legacy 'all' (route default state, consolidate-mode restore) falls
  // back to the first card rather than selecting nothing.
  it('falls back to the first card when activeTab is the legacy "all" key', () => {
    const { container } = setup({ activeTab: 'all' })
    const current = container.querySelectorAll('.widget--selected')
    expect(current).toHaveLength(1)
    expect(current[0].textContent).toContain(PGIPGR_WIDGETS[0].title)
  })

  // The other two panels keep the WidgetMini strip — this is a PGI/PGR-only
  // treatment, not a change to widget mode everywhere.
  it('leaves the other panels on WidgetMini', () => {
    const { container } = setup({ activePanel: 'monitoring', metrics: { hold: 3, consolidation: 4 } })
    expect(container.querySelectorAll('.widget--3xChart')).toHaveLength(0)
    expect(container.querySelectorAll('.widget-mini').length).toBeGreaterThan(0)
  })

  // PGI/PGR has no Pill/Widget toggle — it is always widget mode (user,
  // 2026-09-22), even when viewMode (owned by the route) says 'pills'.
  it('is always widget mode, with no toggle, regardless of viewMode', () => {
    const { container } = setup({ viewMode: 'pills' })
    expect(container.querySelectorAll('.widget--3xChart').length).toBeGreaterThan(0)
    expect(screen.queryByText('Pill tabs mode')).toBeNull()
    expect(screen.queryByText('Widget mode')).toBeNull()
  })

  it('shows the toggle on other panels and honors viewMode there', () => {
    const { container } = setup({ activePanel: 'monitoring', viewMode: 'pills', metrics: { hold: 3, consolidation: 4 } })
    expect(screen.getByText('Pill tabs mode')).toBeTruthy()
    expect(screen.getByText('Widget mode')).toBeTruthy()
    expect(container.querySelectorAll('.widget-mini')).toHaveLength(0)
    expect(container.querySelectorAll('.widget--3xChart')).toHaveLength(0)
    expect(screen.getByText('Hold')).toBeTruthy()
  })
})
