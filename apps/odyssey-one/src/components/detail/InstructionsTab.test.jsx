// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import InstructionsTab from './InstructionsTab'

afterEach(cleanup)

const data = {
  orders: [
    { orderId: 'OXU6IOCR7', instructions: [
      { seq: 1, text: 'Handle with care' },
      { seq: 2, text: 'Call before delivery' },
      { seq: 3, text: 'Dock 4 only' },
      { seq: 4, text: 'Signature required' },
    ] },
    { orderId: 'OXU6IOCR8', instructions: [
      { seq: 1, text: 'Fragile' },
    ] },
  ],
}

// LINX-12071 (2026-08-10) — InstructionGroup's `useState(true)` default applied
// identically to EVERY instance, so every order rendered expanded. AC (and the
// ticket, marked Done with this unmet) requires only the FIRST order expanded.
describe('InstructionsTab — first order expanded by default (LINX-12071)', () => {
  it('expands the first group and leaves the second collapsed', () => {
    render(<InstructionsTab data={data} />)
    const toggles = screen.getAllByRole('button', { name: /OXU6IOCR\d/ })
    expect(toggles[0].getAttribute('aria-expanded')).toBe('true')
    expect(toggles[1].getAttribute('aria-expanded')).toBe('false')
  })
})

// LINX-12070/12071 — Order Header must show the instruction count, e.g.
// "OXU6IOCR7 (4 instructions)". The header rendered only the chevron + id.
describe('InstructionsTab — order header instruction count (LINX-12070/12071)', () => {
  it('renders the count in the AC format for a multi-instruction group', () => {
    render(<InstructionsTab data={data} />)
    expect(screen.getByText('OXU6IOCR7 (4 instructions)')).toBeTruthy()
  })

  it('uses the singular form for exactly one instruction', () => {
    render(<InstructionsTab data={data} />)
    expect(screen.getByText('OXU6IOCR8 (1 instruction)')).toBeTruthy()
  })

  it('renders (0 instructions) for an empty group', () => {
    const empty = { orders: [{ orderId: 'OXU6IOCR9', instructions: [] }] }
    render(<InstructionsTab data={empty} />)
    expect(screen.getByText('OXU6IOCR9 (0 instructions)')).toBeTruthy()
  })
})
