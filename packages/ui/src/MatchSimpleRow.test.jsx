// @vitest-environment jsdom
import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import MatchSimpleRow from './MatchSimpleRow.jsx'

describe('MatchSimpleRow', () => {
  test('showAvatar=false hides avatar span', () => {
    const { container } = render(
      <MatchSimpleRow matchId="61-X" showAvatar={false} />,
    )
    expect(container.querySelector('.match-simple-row__avatar')).toBeNull()
  })

  test('showAvatar=true (default) renders avatar span', () => {
    const { container } = render(<MatchSimpleRow matchId="61-X" />)
    expect(container.querySelector('.match-simple-row__avatar')).toBeTruthy()
  })

  test('showInfo=false hides address sub-line', () => {
    const { container } = render(
      <MatchSimpleRow matchId="61-X" address="123 Main St" showInfo={false} />,
    )
    expect(container.querySelector('.match-simple-row__address')).toBeNull()
  })

  test('showInfo=true (default) renders address sub-line when address provided', () => {
    const { container } = render(
      <MatchSimpleRow matchId="61-X" address="123 Main St" />,
    )
    expect(container.querySelector('.match-simple-row__address')).toBeTruthy()
  })

  test('clickable row (onClick) gets --clickable class', () => {
    const { container } = render(
      <MatchSimpleRow matchId="61-X" onClick={() => {}} />,
    )
    const row = container.querySelector('.match-simple-row')
    expect(row.classList.contains('match-simple-row--clickable')).toBe(true)
  })

  test('non-clickable row (no onClick) does NOT get --clickable class', () => {
    const { container } = render(<MatchSimpleRow matchId="61-X" />)
    const row = container.querySelector('.match-simple-row')
    expect(row.classList.contains('match-simple-row--clickable')).toBe(false)
  })

  test('role=option (via rest) still gets --clickable when onClick provided', () => {
    const { container } = render(
      <MatchSimpleRow matchId="61-X" role="option" onClick={() => {}} />,
    )
    const row = container.querySelector('.match-simple-row')
    expect(row.classList.contains('match-simple-row--clickable')).toBe(true)
    expect(row.getAttribute('role')).toBe('option')
  })
})
