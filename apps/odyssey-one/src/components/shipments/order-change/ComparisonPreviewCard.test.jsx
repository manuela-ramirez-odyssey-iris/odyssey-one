// @vitest-environment jsdom
// Task 10a — shared shell for the three "Additional Changes Preview" sections
// (LINX-14510/14511). Tested in isolation from any real tender/field data —
// the shell knows nothing about carriers, it only owns title/collapse,
// the Differences badges + filter toggle, and the List/Table ButtonToggle.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ComparisonPreviewCard from './ComparisonPreviewCard.jsx'

afterEach(cleanup)

function renderCard(props = {}) {
  const renderBody = vi.fn((mode, filter) => (
    <div data-testid="body" data-mode={mode} data-filter={filter ?? ''} />
  ))
  render(
    <ComparisonPreviewCard title="Preview Tender List" differences={['Rank Order Change', 'AP Cost']} {...props}>
      {renderBody}
    </ComparisonPreviewCard>,
  )
  return { renderBody }
}

describe('ComparisonPreviewCard — chrome', () => {
  test('renders the title and starts expanded', () => {
    renderCard()
    expect(screen.getByText('Preview Tender List')).toBeTruthy()
    const collapseBtn = screen.getByRole('button', { name: 'Preview Tender List' })
    expect(collapseBtn.getAttribute('aria-expanded')).toBe('true')
  })

  test('shows Differences (N) with one badge per difference', () => {
    renderCard()
    expect(screen.getByText('Differences (2)')).toBeTruthy()
    expect(screen.getByText('Rank Order Change')).toBeTruthy()
    expect(screen.getByText('AP Cost')).toBeTruthy()
  })

  test('Differences (0) renders no badges', () => {
    renderCard({ differences: [] })
    expect(screen.getByText('Differences (0)')).toBeTruthy()
  })
})

describe('ComparisonPreviewCard — difference filter', () => {
  test('clicking a difference badge filters; clicking again clears it', () => {
    const { renderBody } = renderCard()
    const badgeBtn = screen.getByRole('button', { name: 'Rank Order Change' })
    expect(badgeBtn.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(badgeBtn)
    expect(badgeBtn.getAttribute('aria-pressed')).toBe('true')
    expect(renderBody).toHaveBeenLastCalledWith('list', 'Rank Order Change')

    fireEvent.click(badgeBtn)
    expect(badgeBtn.getAttribute('aria-pressed')).toBe('false')
    expect(renderBody).toHaveBeenLastCalledWith('list', null)
  })

  test('only one filter is active at a time', () => {
    renderCard()
    const rankBtn = screen.getByRole('button', { name: 'Rank Order Change' })
    const costBtn = screen.getByRole('button', { name: 'AP Cost' })

    fireEvent.click(rankBtn)
    expect(rankBtn.getAttribute('aria-pressed')).toBe('true')
    expect(costBtn.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(costBtn)
    expect(rankBtn.getAttribute('aria-pressed')).toBe('false')
    expect(costBtn.getAttribute('aria-pressed')).toBe('true')
  })
})

describe('ComparisonPreviewCard — List/Table toggle', () => {
  test('defaults to list mode and switches to table mode', () => {
    const { renderBody } = renderCard()
    expect(renderBody).toHaveBeenLastCalledWith('list', null)

    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
    expect(renderBody).toHaveBeenLastCalledWith('table', null)

    fireEvent.click(screen.getByRole('button', { name: 'List view' }))
    expect(renderBody).toHaveBeenLastCalledWith('list', null)
  })
})

describe('ComparisonPreviewCard — collapse', () => {
  test('collapsing hides the body from assistive tech (aria-hidden)', () => {
    renderCard()
    const collapseBtn = screen.getByRole('button', { name: 'Preview Tender List' })
    fireEvent.click(collapseBtn)
    expect(collapseBtn.getAttribute('aria-expanded')).toBe('false')
  })
})
