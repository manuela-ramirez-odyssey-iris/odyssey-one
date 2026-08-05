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
