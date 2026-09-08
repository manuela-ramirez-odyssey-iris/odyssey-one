// @vitest-environment jsdom
// S142 — the rail grew a second width, counts, and two more levels. The logic
// worth pinning is the disclosure state: which submenu is open is DERIVED from
// activeId, overridable by a click, and reset by navigating.
import React from 'react'
import { describe, expect, it, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import Sidebar from './Sidebar.jsx'

afterEach(cleanup)

const TOP = [
  { id: 'home', label: 'Home', icon: <svg /> },
  { id: 'tracking', label: 'Tracking', icon: <svg />, count: 3 },
]

const BOTTOM = [
  {
    id: 'users',
    label: 'User Management',
    icon: <svg />,
    items: [
      { id: 'users-accounts', label: 'Users Accounts' },
      {
        id: 'users-access',
        label: 'Access Management',
        items: [
          { id: 'access-domains', label: 'Domains' },
          { id: 'access-roles', label: 'Roles' },
        ],
      },
    ],
  },
  { id: 'partners', label: 'Partners', icon: <svg /> },
]

const setup = (props = {}) =>
  render(<Sidebar topItems={TOP} bottomItems={BOTTOM} {...props} />)

const rows = (type) => document.querySelectorAll(`.sidebar-button--${type}`)

describe('Sidebar width', () => {
  it('renders collapsed icon rows by default, with no labels or counts', () => {
    setup()
    expect(rows('collapsed').length).toBe(4)
    expect(rows('domain').length).toBe(0)
    expect(screen.queryByText('Tracking')).toBeNull()
    expect(document.querySelector('.sidebar-button__count')).toBeNull()
  })

  it('renders labelled domain rows and the count when expanded', () => {
    setup({ expanded: true })
    expect(rows('domain').length).toBe(4)
    expect(screen.getByText('Tracking')).toBeTruthy()
    expect(document.querySelector('.sidebar-button__count').textContent).toBe('3')
  })
})

describe('Sidebar submenu disclosure', () => {
  it('stays closed when nothing inside it is active', () => {
    setup({ expanded: true, activeId: 'home' })
    expect(document.querySelector('.sidebar__submenu')).toBeNull()
  })

  it('opens the submenu that owns activeId and lights the visible ancestor only', () => {
    setup({ expanded: true, activeId: 'access-domains' })
    expect(document.querySelector('.sidebar__submenu')).toBeTruthy()
    const selected = [...document.querySelectorAll('[data-state="selected"]')]
      .map((n) => n.textContent)
    // Access Management stands in for the active leaf, which lives in a card
    expect(selected.some((t) => t.includes('Access Management'))).toBe(true)
    // ...but User Management does not, because Access Management is on screen
    expect(selected.some((t) => t.includes('User Management'))).toBe(false)
  })

  it('a click toggles the submenu against what activeId derived', () => {
    setup({ expanded: true, activeId: 'access-domains' })
    fireEvent.click(screen.getByText('User Management'))
    expect(document.querySelector('.sidebar__submenu')).toBeNull()
    fireEvent.click(screen.getByText('User Management'))
    expect(document.querySelector('.sidebar__submenu')).toBeTruthy()
  })

  it('never indents while collapsed — the rail has no room', () => {
    setup({ activeId: 'access-domains' })
    expect(document.querySelector('.sidebar__submenu')).toBeNull()
  })
})

describe('Sidebar collapsed cascade', () => {
  it('opens a floating card off the icon instead of indenting anything', () => {
    setup({ activeId: 'home' })
    expect(document.querySelector('.sidebar__flyout')).toBeNull()

    fireEvent.click(screen.getByLabelText('User Management'))
    const cards = document.querySelectorAll('.sidebar__flyout')
    expect(cards.length).toBe(1)
    // level 2 is a MenuRow on a card here, never an indented rail row
    expect(document.querySelector('.sidebar__submenu')).toBeNull()
    expect(document.querySelectorAll('.sidebar-button--submenu').length).toBe(0)
    expect(screen.getByText('Users Accounts')).toBeTruthy()
  })

  it('chains a second card to the right for a row that owns children', () => {
    setup({ activeId: 'home' })
    fireEvent.click(screen.getByLabelText('User Management'))
    fireEvent.click(screen.getByText('Access Management'))
    expect(document.querySelectorAll('.sidebar__flyout').length).toBe(2)
    expect(screen.getByText('Roles')).toBeTruthy()

    // picking a destination closes the whole chain, not just the last card
    fireEvent.click(screen.getByText('Roles'))
    expect(document.querySelectorAll('.sidebar__flyout').length).toBe(0)
  })

  it('drops the chain when the rail expands', () => {
    const { rerender } = setup({ activeId: 'home' })
    fireEvent.click(screen.getByLabelText('User Management'))
    expect(document.querySelectorAll('.sidebar__flyout').length).toBe(1)

    rerender(<Sidebar topItems={TOP} bottomItems={BOTTOM} expanded activeId="home" />)
    expect(document.querySelectorAll('.sidebar__flyout').length).toBe(0)
  })
})

describe('Sidebar flyout (level 3)', () => {
  it('opens on the submenu row that owns children, and closes on a selection', () => {
    setup({ expanded: true, activeId: 'access-domains' })
    expect(document.querySelector('.sidebar__flyout')).toBeNull()

    fireEvent.click(screen.getByText('Access Management'))
    expect(document.querySelector('.sidebar__flyout')).toBeTruthy()
    expect(screen.getByText('Roles')).toBeTruthy()

    // A click inside the rail can't reach the outside-mousedown handler, so the
    // row itself has to dismiss it.
    fireEvent.click(screen.getByText('Roles'))
    expect(document.querySelector('.sidebar__flyout')).toBeNull()
  })

  it('closes when the rail collapses', () => {
    const { rerender } = setup({ expanded: true, activeId: 'access-domains' })
    fireEvent.click(screen.getByText('Access Management'))
    expect(document.querySelector('.sidebar__flyout')).toBeTruthy()

    rerender(<Sidebar topItems={TOP} bottomItems={BOTTOM} expanded={false} activeId="access-domains" />)
    expect(document.querySelector('.sidebar__flyout')).toBeNull()
  })
})

describe('Sidebar disclosure semantics (S142 DSM bugs)', () => {
  // A disclosure used to fire onItemClick; a consumer wiring that to setActiveId
  // then tripped the navigation-resets-the-override effect, so the submenu shut
  // in the same click that opened it and you had to click twice.
  it('opens the submenu on the FIRST click, even when the consumer sets activeId', () => {
    function Harness() {
      const [activeId, setActiveId] = React.useState('home')
      return (
        <Sidebar
          expanded
          topItems={TOP}
          bottomItems={BOTTOM}
          activeId={activeId}
          onItemClick={setActiveId}
        />
      )
    }
    render(<Harness />)
    expect(document.querySelector('.sidebar__submenu')).toBeNull()
    fireEvent.click(screen.getByText('User Management'))
    expect(document.querySelector('.sidebar__submenu')).toBeTruthy()
  })

  it('never reports a disclosure through onItemClick — it is not a destination', () => {
    const clicked = []
    setup({ expanded: true, onItemClick: (id) => clicked.push(id) })
    fireEvent.click(screen.getByText('User Management'))
    fireEvent.click(screen.getByText('Access Management'))
    expect(clicked).toEqual([])
    // a real destination still reports
    fireEvent.click(screen.getByText('Users Accounts'))
    expect(clicked).toEqual(['users-accounts'])
  })

  // The fill means "a descendant is the current page" — pointing at a row must
  // not claim it. Hover styling is what says "you are pointing at me".
  it('does NOT mark a drill-in row selected merely because its card is open', () => {
    setup({ expanded: true, activeId: 'home' })
    fireEvent.click(screen.getByText('User Management'))
    const row = () => screen.getByText('Access Management').closest('.sidebar-button')
    expect(row().getAttribute('data-state')).toBeNull()
    fireEvent.mouseEnter(screen.getByText('Access Management').closest('.sidebar__flyout-anchor'))
    expect(document.querySelector('.sidebar__flyout')).toBeTruthy()
    expect(row().getAttribute('data-state')).toBeNull()
  })

  it('marks it selected once one of its own options IS the current page', () => {
    setup({ expanded: true, activeId: 'access-roles' })
    const row = () => screen.getByText('Access Management').closest('.sidebar-button')
    expect(row().getAttribute('data-state')).toBe('selected')
  })

  // The parent only stands in for a child that is out of sight; once the submenu
  // is open the child carries the fill itself. (user, 2026-09-08)
  it('drops the domain fill while its submenu is open, and restores it when shut', () => {
    setup({ expanded: true, activeId: 'users-accounts' })
    const domain = () => screen.getByText('User Management').closest('.sidebar-button')
    // activeId opens the submenu by derivation, so the child is visible
    expect(document.querySelector('.sidebar__submenu')).toBeTruthy()
    expect(domain().getAttribute('data-state')).toBeNull()
    expect(
      screen.getByText('Users Accounts').closest('.sidebar-button').getAttribute('data-state'),
    ).toBe('selected')

    fireEvent.click(screen.getByText('User Management'))
    expect(document.querySelector('.sidebar__submenu')).toBeNull()
    expect(domain().getAttribute('data-state')).toBe('selected')
  })

  it('keeps the collapsed icon standing in for its child — there is no submenu to show it', () => {
    setup({ activeId: 'users-accounts' })
    expect(screen.getByLabelText('User Management').getAttribute('data-state')).toBe('selected')
  })

  it('leaves a collapsed domain icon unselected while its chain is merely open', () => {
    setup({ activeId: 'home' })
    const icon = () => screen.getByLabelText('User Management')
    fireEvent.click(icon())
    expect(document.querySelector('.sidebar__flyout')).toBeTruthy()
    expect(icon().getAttribute('data-state')).toBeNull()
  })
})

describe('Sidebar hover-opened disclosures', () => {
  // Hover belongs to the floating cards only. The inline submenu is real layout,
  // so a passing pointer must not open or collapse it. (user, 2026-09-08)
  it('does NOT open the expanded inline submenu on hover — click only', () => {
    setup({ expanded: true, activeId: 'home' })
    const row = screen.getByText('User Management').closest('.sidebar-button')
    fireEvent.mouseEnter(row)
    fireEvent.mouseOver(row)
    expect(document.querySelector('.sidebar__submenu')).toBeNull()
    fireEvent.click(screen.getByText('User Management'))
    expect(document.querySelector('.sidebar__submenu')).toBeTruthy()
  })

  it('opens the collapsed card chain on hover and drops it on leave', () => {
    vi.useFakeTimers()
    try {
      setup({ activeId: 'home' })
      const anchor = () => screen.getByLabelText('User Management').closest('.sidebar__flyout-anchor')
      fireEvent.mouseEnter(anchor())
      expect(document.querySelectorAll('.sidebar__flyout').length).toBe(1)
      fireEvent.mouseLeave(anchor())
      act(() => { vi.advanceTimersByTime(300) })
      expect(document.querySelectorAll('.sidebar__flyout').length).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('closes an open collapsed chain when another domain is chosen', () => {
    const clicked = []
    setup({ activeId: 'home', onItemClick: (id) => clicked.push(id) })
    fireEvent.click(screen.getByLabelText('User Management'))
    expect(document.querySelectorAll('.sidebar__flyout').length).toBe(1)
    fireEvent.click(screen.getByLabelText('Tracking'))
    expect(document.querySelectorAll('.sidebar__flyout').length).toBe(0)
    expect(clicked).toEqual(['tracking'])
  })
})

describe('Sidebar hover-opened cards', () => {
  it('opens a drill-in card on hover, expanded and collapsed alike', () => {
    const { rerender } = setup({ expanded: true, activeId: 'home' })
    fireEvent.click(screen.getByText('User Management'))
    expect(document.querySelector('.sidebar__flyout')).toBeNull()
    fireEvent.mouseEnter(screen.getByText('Access Management').closest('.sidebar__flyout-anchor'))
    expect(document.querySelector('.sidebar__flyout')).toBeTruthy()

    rerender(<Sidebar topItems={TOP} bottomItems={BOTTOM} activeId="home" />)
    fireEvent.click(screen.getByLabelText('User Management'))
    expect(document.querySelectorAll('.sidebar__flyout').length).toBe(1)
    fireEvent.mouseEnter(screen.getByText('Access Management').closest('.sidebar__flyout-anchor'))
    expect(document.querySelectorAll('.sidebar__flyout').length).toBe(2)
  })

  it('keeps the card open across the gap, then closes after the grace period', async () => {
    vi.useFakeTimers()
    try {
      setup({ expanded: true, activeId: 'home' })
      fireEvent.click(screen.getByText('User Management'))
      const anchor = screen.getByText('Access Management').closest('.sidebar__flyout-anchor')
      fireEvent.mouseEnter(anchor)
      expect(document.querySelector('.sidebar__flyout')).toBeTruthy()

      fireEvent.mouseLeave(anchor)
      // still open immediately — the pointer may be crossing to the card
      expect(document.querySelector('.sidebar__flyout')).toBeTruthy()
      act(() => { vi.advanceTimersByTime(200) })
      expect(document.querySelector('.sidebar__flyout')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('re-entering before the grace period elapses cancels the close', () => {
    vi.useFakeTimers()
    try {
      setup({ expanded: true, activeId: 'home' })
      fireEvent.click(screen.getByText('User Management'))
      const anchor = screen.getByText('Access Management').closest('.sidebar__flyout-anchor')
      fireEvent.mouseEnter(anchor)
      fireEvent.mouseLeave(anchor)
      act(() => { vi.advanceTimersByTime(100) })
      fireEvent.mouseEnter(anchor)
      act(() => { vi.advanceTimersByTime(300) })
      expect(document.querySelector('.sidebar__flyout')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('Sidebar empty-rail click', () => {
  it('shuts an open expanded submenu when empty rail is clicked', () => {
    setup({ expanded: true, activeId: 'home' })
    fireEvent.click(screen.getByText('User Management'))
    expect(document.querySelector('.sidebar__submenu')).toBeTruthy()
    fireEvent.click(document.querySelector('.sidebar__nav'))
    expect(document.querySelector('.sidebar__submenu')).toBeNull()
  })

  it('shuts an open collapsed card chain too — the rail is inside itself, so the outside handler cannot', () => {
    setup({ activeId: 'home' })
    fireEvent.click(screen.getByLabelText('User Management'))
    expect(document.querySelectorAll('.sidebar__flyout').length).toBe(1)
    fireEvent.click(document.querySelector('.sidebar__nav'))
    expect(document.querySelectorAll('.sidebar__flyout').length).toBe(0)
  })

  it('does not swallow a click on a row', () => {
    const clicked = []
    setup({ expanded: true, activeId: 'home', onItemClick: (id) => clicked.push(id) })
    fireEvent.click(screen.getByText('User Management'))
    fireEvent.click(screen.getByText('Users Accounts'))
    expect(clicked).toEqual(['users-accounts'])
  })
})

describe('Sidebar renderItem', () => {
  it('wraps leaf rows but never the disclosure that owns children', () => {
    const wrapped = []
    setup({
      expanded: true,
      activeId: 'users-accounts',
      renderItem: (item, node, ctx) => {
        wrapped.push({ id: item.id, level: ctx.level })
        return <a href={`/${item.id}`}>{node}</a>
      },
    })
    const ids = wrapped.map((w) => w.id)
    expect(ids).toContain('home')
    expect(ids).toContain('users-accounts')
    // `users` owns a submenu and `users-access` owns a flyout — both disclosures.
    expect(ids).not.toContain('users')
    expect(ids).not.toContain('users-access')
    expect(wrapped.find((w) => w.id === 'users-accounts').level).toBe(2)
  })

  it('fires onItemClick with the clicked leaf id', () => {
    const clicked = []
    setup({ expanded: true, onItemClick: (id) => clicked.push(id) })
    fireEvent.click(screen.getByText('Partners'))
    expect(clicked).toEqual(['partners'])
  })
})
