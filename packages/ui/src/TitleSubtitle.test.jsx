// @vitest-environment jsdom
import { render, cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import TitleSubtitle from './TitleSubtitle.jsx'

describe('TitleSubtitle', () => {
  afterEach(cleanup)

  test('badge renders on the title row, after the title', () => {
    const { container } = render(
      <TitleSubtitle title="Title" subtitle="Subtitle" badge={<span data-testid="badge">B</span>} />,
    )
    const row = container.querySelector('.title-subtitle__title-row')
    const badge = screen.getByTestId('badge')
    // It qualifies the title, so it belongs to the title row, never the eyebrow.
    expect(row.contains(badge)).toBe(true)
    expect(row.querySelector('.title-subtitle__title').compareDocumentPosition(badge))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  test('an omitted title renders no title element, leaving subtitle + badge', () => {
    // Figma's `Show Text` can switch the title off; the row must not keep an
    // empty span, which would still take the row's 4px gap.
    const { container } = render(
      <TitleSubtitle subtitle="Subtitle" badge={<span data-testid="badge">B</span>} />,
    )
    expect(container.querySelector('.title-subtitle__title')).toBeNull()
    expect(screen.getByTestId('badge')).toBeTruthy()
    expect(screen.getByText('Subtitle')).toBeTruthy()
  })

  test('without a badge nothing extra renders on the row', () => {
    const { container } = render(<TitleSubtitle title="Title" subtitle="Subtitle" />)
    const row = container.querySelector('.title-subtitle__title-row')
    expect(row.children.length).toBe(1)
  })
})
