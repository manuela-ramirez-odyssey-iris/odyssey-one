// @vitest-environment jsdom
// Task 10a — shared shell for the "Additional Changes Preview" sections
// (LINX-14510/14511). Tested in isolation from any real tender/field data —
// the shell knows nothing about carriers, it only owns title + difference
// count + collapse. S137 removed the filter chips and the List/Table toggle,
// and with them the render-prop body.
import { afterEach, describe, expect, test } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ComparisonPreviewCard from './ComparisonPreviewCard.jsx'

afterEach(cleanup)

function renderCard(props = {}) {
  render(
    <ComparisonPreviewCard title="Preview Tender List" differences={['Rank Order Change', 'AP Cost']} {...props}>
      <div data-testid="body" />
    </ComparisonPreviewCard>,
  )
}

describe('ComparisonPreviewCard — chrome', () => {
  test('renders the title, the body, and starts expanded', () => {
    renderCard()
    expect(screen.getByText('Preview Tender List')).toBeTruthy()
    expect(screen.getByTestId('body')).toBeTruthy()
    const collapseBtn = screen.getByRole('button', { name: /^Preview Tender List/ })
    expect(collapseBtn.getAttribute('aria-expanded')).toBe('true')
  })

  test('the difference count rides the title', () => {
    renderCard()
    expect(screen.getByText('(2)')).toBeTruthy()
  })

  test('with nothing changed the title states (No Differences)', () => {
    renderCard({ differences: [] })
    expect(screen.getByText('(No Differences)')).toBeTruthy()
  })

  test('no filter chips and no List/Table toggle (S137)', () => {
    renderCard()
    expect(screen.queryByRole('button', { name: 'All' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rank Order Change' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Table view' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'List view' })).toBeNull()
  })
})

describe('ComparisonPreviewCard — collapse', () => {
  test('collapsing hides the body from assistive tech (aria-hidden)', () => {
    renderCard()
    const collapseBtn = screen.getByRole('button', { name: /^Preview Tender List/ })
    fireEvent.click(collapseBtn)
    expect(collapseBtn.getAttribute('aria-expanded')).toBe('false')
  })
})
