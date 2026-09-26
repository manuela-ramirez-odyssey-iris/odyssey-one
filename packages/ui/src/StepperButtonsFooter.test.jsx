// @vitest-environment jsdom
import { afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import StepperButtonsFooter from './StepperButtonsFooter.jsx'

afterEach(cleanup)

it('primaryTooltip is inert while the primary is enabled', () => {
  render(<StepperButtonsFooter primaryTooltip="Set a date on every stop" onPrimary={() => {}} onCancel={() => {}} />)
  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('shows the normalized Tooltip on hover when the primary is disabled', () => {
  render(
    <StepperButtonsFooter
      primaryDisabled
      primaryTooltip="Set a date on every stop"
      onPrimary={() => {}}
      onCancel={() => {}}
    />,
  )
  const primary = screen.getByRole('button', { name: 'Continue' })
  expect(primary.disabled).toBe(true)
  expect(screen.queryByRole('tooltip')).toBeNull()
  // The disabled button fires no events itself — the wrapping span does.
  fireEvent.mouseEnter(primary.parentElement)
  expect(screen.getByRole('tooltip').textContent).toContain('Set a date on every stop')
  fireEvent.mouseLeave(primary.parentElement)
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('shows the tooltip on focus too, and no tooltip wrapper renders without primaryTooltip', () => {
  render(<StepperButtonsFooter primaryDisabled primaryTooltip="Blocked" onPrimary={() => {}} onCancel={() => {}} />)
  const primary = screen.getByRole('button', { name: 'Continue' })
  fireEvent.focus(primary.parentElement)
  expect(screen.getByRole('tooltip').textContent).toContain('Blocked')
  fireEvent.blur(primary.parentElement)
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('disabled primary with no primaryTooltip renders no tooltip wrapper (byte-identical default)', () => {
  render(<StepperButtonsFooter primaryDisabled onPrimary={() => {}} onCancel={() => {}} />)
  const primary = screen.getByRole('button', { name: 'Continue' })
  fireEvent.mouseEnter(primary.parentElement)
  expect(screen.queryByRole('tooltip')).toBeNull()
})
