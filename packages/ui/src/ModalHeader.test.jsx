// @vitest-environment jsdom
import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ModalHeader from './ModalHeader.jsx'


// `trail` slot (2026-08-24) — status that must stay legible while the body
// scrolls sits on the trail edge, immediately before the close X.
describe('ModalHeader — trail slot', () => {
  test('renders trail content immediately BEFORE the close X', () => {
    const { container } = render(
      <ModalHeader title="T" onClose={() => {}} trail={<span data-testid="badge">02:14</span>} />
    )
    const trail = container.querySelector('.modal-header__trail')
    expect(trail).toBeTruthy()
    const kids = [...trail.children]
    expect(kids[0].getAttribute('data-testid')).toBe('badge')
    expect(kids[kids.length - 1].getAttribute('aria-label')).toBe('Close')
  })

  test('without trail the close X is still the only trail child', () => {
    const { container } = render(<ModalHeader title="T" onClose={() => {}} />)
    const trail = container.querySelector('.modal-header__trail')
    expect(trail.children).toHaveLength(1)
    expect(screen.getByLabelText('Close')).toBeTruthy()
  })
})
