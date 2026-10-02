// @vitest-environment jsdom
import { afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import TimelineDot from './TimelineDot.jsx'

afterEach(cleanup)

const COLORS = ['amber', 'blue', 'green', 'red', 'purple', 'gray', 'info']

describe('TimelineDot', () => {
  it('defaults to gray', () => {
    const { container } = render(<TimelineDot />)
    expect(container.firstChild.className).toContain('odyssey-timeline-dot--gray')
  })

  it.each(COLORS)('color=%s gets its modifier', (color) => {
    const { container } = render(<TimelineDot color={color} />)
    expect(container.firstChild.className).toContain(`odyssey-timeline-dot--${color}`)
  })

  it('unknown color falls back to gray', () => {
    const { container } = render(<TimelineDot color="hotpink" />)
    expect(container.firstChild.className).toContain('odyssey-timeline-dot--gray')
    expect(container.firstChild.className).not.toContain('hotpink')
  })

  it('is aria-hidden', () => {
    const { container } = render(<TimelineDot />)
    expect(container.firstChild.getAttribute('aria-hidden')).toBe('true')
  })

  it('forwards className and rest props', () => {
    const { container } = render(<TimelineDot className="history-dot" data-testid="d" />)
    expect(container.firstChild.className).toContain('history-dot')
    expect(container.firstChild.className).toContain('odyssey-timeline-dot')
    expect(container.firstChild.getAttribute('data-testid')).toBe('d')
  })
})
