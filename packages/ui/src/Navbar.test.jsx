// @vitest-environment jsdom
import { afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import Navbar from './Navbar.jsx'
import GlobalSearch from './GlobalSearch.jsx'
import TrailNav from './TrailNav.jsx'

afterEach(cleanup)

describe('Navbar — context variant', () => {
  it('defaults to internal (dark --navbar-bg), unchanged behavior', () => {
    render(<Navbar lead="lead" search="search" trail="trail" />)
    const header = screen.getByText('lead').closest('header')
    expect(header.style.background).toBe('var(--navbar-bg)')
    expect(header.style.padding).toBe('14px var(--spacing-6) 14px var(--spacing-4)')
  })

  it('context="external" renders the Figma 5152:3904 gradient (0-alpha white → var(--white)), not a solid fill', () => {
    render(<Navbar lead="lead" search="search" trail="trail" context="external" />)
    const header = screen.getByText('lead').closest('header')
    expect(header.style.background).toBe('linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, var(--white) 100%)')
    expect(header.style.padding).toBe('14px var(--spacing-6) 14px var(--spacing-6)')
  })

  it('context="external" carries a scoping class for descendant CSS, not new tone props', () => {
    render(<Navbar lead="lead" search="search" trail="trail" context="external" />)
    const header = screen.getByText('lead').closest('header')
    expect(header.classList.contains('navbar--external')).toBe(true)
  })

  it('does not add the scoping class in the default internal context', () => {
    render(<Navbar lead="lead" search="search" trail="trail" />)
    const header = screen.getByText('lead').closest('header')
    expect(header.classList.contains('navbar--external')).toBe(false)
  })
})

// GlobalSearch's title mode and TrailNav's profile group render no inline
// color/border of their own anymore — those live in
// apps/odyssey-one/src/styles/components.css as `.global-search-title` /
// `.trail-nav-profile-name` / `.trail-nav-profile-role`, recolored under
// `.navbar--external` (the external Navbar's descendant CSS, not a
// GlobalSearch/TrailNav tone prop). `.trail-nav-profile-group` carries no
// border in any context — removed component-wide per Figma (node 608:525).
// jsdom doesn't load that stylesheet, so these assert the class hooks exist
// and carry no hardcoded inline color/border for a scoping rule to fight.
describe('Navbar external — descendant hooks for GlobalSearch/TrailNav (no computed-color assertions, jsdom)', () => {
  it('GlobalSearch title mode exposes a .global-search-title class with no inline color', () => {
    render(<GlobalSearch mode="title" title="Carrier Portal" />)
    const el = screen.getByText('Carrier Portal')
    expect(el.classList.contains('global-search-title')).toBe(true)
    expect(el.style.color).toBe('')
  })

  it('TrailNav profile name/role expose their classes with no inline color', () => {
    render(<TrailNav name="Old Dominion" role="ODFL" />)
    const name = screen.getByText('Old Dominion')
    const role = screen.getByText('ODFL')
    expect(name.classList.contains('trail-nav-profile-name')).toBe(true)
    expect(name.style.color).toBe('')
    expect(role.classList.contains('trail-nav-profile-role')).toBe(true)
    expect(role.style.color).toBe('')
  })

  it('TrailNav wraps the profile in a .trail-nav-profile-group with no inline border', () => {
    render(<TrailNav name="Old Dominion" role="ODFL" />)
    const group = screen.getByText('Old Dominion').closest('.trail-nav-profile-group')
    expect(group).toBeTruthy()
    expect(group.style.borderLeft).toBe('')
  })
})
