// @vitest-environment jsdom
// ActionMenu's two trigger flavors. The icon flavor is the original 3-dot
// button; the LABELLED flavor (S112) renders the normalized DropdownButton so a
// toolbar action menu can announce itself instead of hiding behind a glyph.
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import ActionMenu from './ActionMenu.jsx'

afterEach(cleanup)

const options = [
  { label: 'Send RFQ', onSelect: vi.fn() },
  { label: 'Save Draft', onSelect: vi.fn() },
]

describe('ActionMenu — labelled trigger', () => {
  test('renders a DropdownButton showing the label, not an icon button', () => {
    const { container } = render(<ActionMenu label="Actions" ariaLabel="Actions" options={options} />)
    const trigger = screen.getByRole('button', { name: 'Actions' })
    expect(trigger.classList.contains('dropdown-button')).toBe(true)
    expect(trigger.textContent).toContain('Actions')
    expect(container.querySelector('.action-menu__trigger')).toBeFalsy()
  })

  test('opens the menu and fires the picked action', () => {
    const onSelect = vi.fn()
    render(<ActionMenu label="Actions" ariaLabel="Actions" options={[{ label: 'Send RFQ', onSelect }]} />)
    expect(screen.queryByRole('menuitem')).toBeFalsy()
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Send RFQ' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menuitem')).toBeFalsy() // closes on pick
  })

  test('the trigger carries menu semantics and tracks open state', () => {
    render(<ActionMenu label="Actions" ariaLabel="Actions" options={options} />)
    const trigger = screen.getByRole('button', { name: 'Actions' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(trigger)
    expect(screen.getByRole('button', { name: 'Actions' }).getAttribute('aria-expanded')).toBe('true')
  })

  test('a disabled option is inert', () => {
    const onSelect = vi.fn()
    render(
      <ActionMenu label="Actions" ariaLabel="Actions"
        options={[{ label: 'Send RFQ', onSelect, disabled: true }]} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
    const item = screen.getByRole('menuitem', { name: 'Send RFQ' })
    expect(item.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(item)
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('ActionMenu — icon trigger (unchanged)', () => {
  test('still renders the bare trigger button when no label is passed', () => {
    const { container } = render(
      <ActionMenu icon={<span data-testid="glyph">⋮</span>} ariaLabel="Row actions" options={options} />
    )
    expect(container.querySelector('.action-menu__trigger')).toBeTruthy()
    expect(screen.getByTestId('glyph')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Row actions' }).classList.contains('dropdown-button')).toBe(false)
  })
})
