// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ResolveTimeline from './ResolveTimeline.jsx'

afterEach(cleanup)

const steps = (over = {}) => [
  { key: 's1', label: 'Message errors', detail: '3 errors · in progress', status: 'error', ...over.s1 },
  { key: 's2', label: 'Data errors', detail: 'locked', status: 'off', ...over.s2 },
  { key: 's3', label: 'Order ready', detail: '—', status: 'off', ...over.s3 },
]

describe('ResolveTimeline', () => {
  test('renders one dot per step with label + detail and the current step marked', () => {
    render(<ResolveTimeline steps={steps()} current="s1" />)
    const list = screen.getByRole('list', { name: 'Resolution progress' })
    expect(list.querySelectorAll('.resolve-timeline__step').length).toBe(3)
    expect(screen.getByText('Message errors')).toBeTruthy()
    expect(screen.getByText('locked')).toBeTruthy()
    expect(list.querySelector('.resolve-timeline__step--current')?.textContent).toContain('Message errors')
    expect(list.querySelector('.step-indicator--error')).toBeTruthy()
  })

  test('a step without onClick is not a button and carries aria-disabled', () => {
    render(<ResolveTimeline steps={steps()} current="s1" />)
    const s2 = screen.getByText('Data errors').closest('.resolve-timeline__step')
    expect(s2.querySelector('button')).toBeNull()
    expect(s2.getAttribute('aria-disabled')).toBe('true')
  })

  test('a step with onClick renders a button that fires it', () => {
    const onClick = vi.fn()
    render(<ResolveTimeline steps={steps({ s1: { status: 'on', detail: 'passed', onClick } })} current="s2" />)
    fireEvent.click(screen.getByRole('button', { name: /Message errors/ }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('track segments take the status of the step they lead to', () => {
    const { container } = render(<ResolveTimeline steps={steps({ s1: { status: 'on' }, s2: { status: 'error' } })} current="s2" />)
    const segs = container.querySelectorAll('.resolve-timeline__segment')
    expect(segs.length).toBe(2)
    expect(segs[0].className).toContain('resolve-timeline__segment--error') // s1 → s2 (s2 erroring)
    expect(segs[1].className).toContain('resolve-timeline__segment--off')
  })
})
