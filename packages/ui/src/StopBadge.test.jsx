// @vitest-environment jsdom
import { render, cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import StopBadge from './StopBadge.jsx'

describe('StopBadge', () => {
  afterEach(cleanup)

  test('status picks the skin class and the announced status text', () => {
    for (const [status, text] of [
      ['completed', 'completed'],
      ['issue', 'issue reported'],
      ['pending', 'pending'],
      ['changed', 'changed'],
    ]) {
      cleanup()
      const { container } = render(<StopBadge label="P1" status={status} />)
      expect(container.querySelector(`.stop-badge--${status}`)).toBeTruthy()
      // A changed stop must NOT announce itself as an issue — a change is not
      // a problem, and the rail used to borrow `issue` for exactly this.
      expect(screen.getByLabelText(`P1 — ${text}`)).toBeTruthy()
    }
  })

  test('changed carries a status circle, pending does not', () => {
    const { container, rerender } = render(<StopBadge label="P1" status="changed" />)
    expect(container.querySelector('.stop-badge__status')).toBeTruthy()
    rerender(<StopBadge label="P1" status="pending" />)
    expect(container.querySelector('.stop-badge__status')).toBeNull()
  })

  test("changed's glyph is the dot, not the check or the exclamation", () => {
    const { container } = render(<StopBadge label="P1" status="changed" />)
    const circle = container.querySelector('.stop-badge__status')
    // The dot is the only glyph drawn as a <circle>; check and "!" are paths.
    expect(circle.querySelector('circle')).toBeTruthy()
    expect(circle.querySelector('path')).toBeNull()
  })

  test('showStatusBadge cannot ADD a circle to pending — it only force-hides', () => {
    // The prop table promised a "gray-outline" pending circle until
    // 2026-09-09. It never existed: the pending check short-circuits before
    // the flag is consulted, and there is no pending-circle CSS either.
    const { container } = render(<StopBadge label="D2" status="pending" showStatusBadge />)
    expect(container.querySelector('.stop-badge__status')).toBeNull()
  })

  test('showStatusBadge={false} force-hides the circle on changed', () => {
    const { container } = render(<StopBadge label="P1" status="changed" showStatusBadge={false} />)
    expect(container.querySelector('.stop-badge__status')).toBeNull()
  })
})
