// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import HeaderStrip from './HeaderStrip.jsx'

afterEach(cleanup)

describe('HeaderStrip', () => {
  test('renders the title', () => {
    render(<HeaderStrip title="Prior Tender List" />)
    expect(screen.getByText('Prior Tender List')).toBeTruthy()
  })

  test('icon and trail render only when supplied', () => {
    const { container, rerender } = render(<HeaderStrip title="T" />)
    expect(container.querySelector('.header-strip__trail')).toBeNull()
    expect(container.querySelector('svg')).toBeNull()

    rerender(
      <HeaderStrip
        title="T"
        icon={<svg data-testid="icon" />}
        trail={<button type="button">Trail</button>}
      />
    )
    expect(screen.getByTestId('icon')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Trail' }).closest('.header-strip__trail')).toBeTruthy()
  })

  test('titleId lands on the title element', () => {
    const { container } = render(<HeaderStrip title="T" titleId="my-title" />)
    const title = container.querySelector('.header-strip__title')
    expect(title.id).toBe('my-title')
  })

  test('className merges with the base class', () => {
    const { container } = render(<HeaderStrip title="T" className="odyssey-group-table__header" />)
    const root = container.firstChild
    expect(root.classList.contains('header-strip')).toBe(true)
    expect(root.classList.contains('odyssey-group-table__header')).toBe(true)
  })

  test('extra props spread to the root', () => {
    const { container } = render(<HeaderStrip title="T" data-testid="strip" aria-label="Header" />)
    const root = container.firstChild
    expect(root.getAttribute('data-testid')).toBe('strip')
    expect(root.getAttribute('aria-label')).toBe('Header')
  })

  test('badge renders inside the title group, not the trail', () => {
    const { container } = render(
      <HeaderStrip title="Stop 3" badge={<span data-testid="badge">Pickup</span>} />,
    )
    const group = container.querySelector('.header-strip__group')
    // Glued to the text it qualifies: if it ever lands outside the group it
    // would drift toward the trail, which is the bug this pins.
    expect(group.contains(screen.getByTestId('badge'))).toBe(true)
    expect(container.querySelector('.header-strip__trail')).toBeNull()
  })

})