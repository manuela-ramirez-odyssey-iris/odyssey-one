// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import MenuRowRadio from './MenuRowRadio.jsx'

describe('MenuRowRadio', () => {
  test('draggable=false (default) hides the grip', () => {
    const { container } = render(<MenuRowRadio label="Option A" value="a" />)
    expect(container.querySelector('.menu-row-radio__grip')).toBeNull()
  })

  test('draggable=true renders a leading grip before the radio control', () => {
    const { container } = render(
      <MenuRowRadio label="Option A" value="a" draggable />,
    )
    const grip = container.querySelector('.menu-row-radio__grip')
    expect(grip).toBeTruthy()
    const row = container.querySelector('.menu-row-radio')
    expect(row.children[0]).toBe(grip)
  })

  test('no badge by default', () => {
    const { container } = render(<MenuRowRadio label="Option A" value="a" />)
    expect(container.querySelector('.menu-row-radio__badge')).toBeNull()
  })

  test('a string badge renders our Badge in the nav zone, before the chevron', () => {
    const { container, getByText } = render(
      <MenuRowRadio label="Option A" value="a" badge="by: mramirez" />,
    )
    const badge = container.querySelector('.menu-row-radio__badge')
    expect(badge).toBeTruthy()
    expect(getByText('by: mramirez')).toBeTruthy()
    // chevron still owns the trailing slot — badge sits immediately before it
    const nav = container.querySelector('.menu-row-radio__nav')
    const kids = [...nav.children]
    expect(kids.indexOf(badge)).toBe(kids.length - 2)
    expect(kids[kids.length - 1].className).toContain('menu-row__trailing')
  })

  test('a node badge is rendered as-is', () => {
    const { getByTestId } = render(
      <MenuRowRadio label="Option A" value="a" badge={<span data-testid="custom" />} />,
    )
    expect(getByTestId('custom')).toBeTruthy()
  })

  test('clicking the radio control still selects (onSelect)', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <MenuRowRadio label="Option A" value="a" draggable onSelect={onSelect} />,
    )
    fireEvent.click(container.querySelector('.menu-row__control input'))
    expect(onSelect).toHaveBeenCalledWith('a')
  })

  test('clicking the nav zone still navigates (onNavigate)', () => {
    const onNavigate = vi.fn()
    const { container } = render(
      <MenuRowRadio label="Option A" value="a" draggable onNavigate={onNavigate} />,
    )
    fireEvent.click(container.querySelector('.menu-row-radio__nav'))
    expect(onNavigate).toHaveBeenCalledWith('a')
  })
})
