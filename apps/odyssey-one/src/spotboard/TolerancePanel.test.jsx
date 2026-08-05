// @vitest-environment jsdom
import { describe, test, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import TolerancePanel from './TolerancePanel'
import { evaluateTolerance } from './tolerance'
import { fmtDollar } from '../utils/money'

// The Result field intentionally echoes the Alert's exact verdict text (same
// wording, two places), so string queries need to be scoped to one or the
// other rather than a bare getByText — otherwise a match on both throws.
function fieldValue(container, label) {
  return within(container).getByText(label).nextSibling.textContent
}

describe('TolerancePanel', () => {
  test('card heading is present', () => {
    render(<TolerancePanel benchmark={2800} tolerancePct={5} lowestBid={2540} manualReview={false} />)
    expect(screen.getByText('Tolerance Evaluation')).toBeTruthy()
  })

  test('within-tolerance renders the success Alert', () => {
    const props = { benchmark: 2800, tolerancePct: 5, lowestBid: 2540, manualReview: false }
    render(<TolerancePanel {...props} />)
    const alert = document.querySelector('.alert--success')
    expect(alert).toBeTruthy()
    expect(alert.textContent).toContain('Within tolerance — eligible for auto-award')
  })

  test('out-of-tolerance renders the warning Alert', () => {
    const props = { benchmark: 2800, tolerancePct: 5, lowestBid: 3000, manualReview: false }
    const { withinTolerance } = evaluateTolerance(props)
    expect(withinTolerance).toBe(false)
    render(<TolerancePanel {...props} />)
    expect(document.querySelector('.alert--success')).toBeFalsy()
    // out-of-tolerance reason surfaced in human words
    const alert = document.querySelector('.alert--warning')
    expect(alert.textContent).toMatch(/out of tolerance/i)
  })

  test('manual-review reason is surfaced in human words', () => {
    const props = { benchmark: 2800, tolerancePct: 5, lowestBid: 2540, manualReview: true }
    render(<TolerancePanel {...props} />)
    const alert = document.querySelector('.alert--warning')
    expect(alert.textContent).toMatch(/manual review/i)
  })

  test('total-cap reason is surfaced in human words', () => {
    const props = { benchmark: 2800, tolerancePct: 10, lowestBid: 2900, totalCap: 2850, manualReview: false }
    render(<TolerancePanel {...props} />)
    const alert = document.querySelector('.alert--warning')
    expect(alert.textContent).toMatch(/cap/i)
  })

  test('displayed ceiling equals evaluateTolerance(...).ceiling formatted, under the "Tolerance ceiling" label', () => {
    const props = { benchmark: 2800, tolerancePct: 5, lowestBid: 2540, manualReview: false }
    const { ceiling } = evaluateTolerance(props)
    const { container } = render(<TolerancePanel {...props} />)
    expect(fieldValue(container, 'Tolerance ceiling')).toBe(fmtDollar(ceiling))
  })

  test('renders benchmark and lowest bid values through fmtDollar, and Tolerance (% above)', () => {
    const props = { benchmark: 2800, tolerancePct: 5, lowestBid: 2540, manualReview: false }
    render(<TolerancePanel {...props} />)
    expect(screen.getByText(fmtDollar(2800))).toBeTruthy()
    expect(screen.getByText(fmtDollar(2540))).toBeTruthy()
    expect(screen.getByText('Tolerance (% above)')).toBeTruthy()
    expect(screen.getByText('5%')).toBeTruthy()
  })

  test('Result field echoes the verdict text', () => {
    const withinProps = { benchmark: 2800, tolerancePct: 5, lowestBid: 2540, manualReview: false }
    const { container: c1 } = render(<TolerancePanel {...withinProps} />)
    expect(fieldValue(c1, 'Result')).toBe('Within tolerance — eligible for auto-award')

    const outProps = { benchmark: 2800, tolerancePct: 5, lowestBid: 3000, manualReview: false }
    const { container: c2 } = render(<TolerancePanel {...outProps} />)
    expect(fieldValue(c2, 'Result')).toMatch(/out of tolerance/i)
  })

  test('Manual-review flag row shows ON → routed to planner when true, OFF when false', () => {
    const base = { benchmark: 2800, tolerancePct: 5, lowestBid: 2540 }
    const { container: onContainer } = render(<TolerancePanel {...base} manualReview />)
    expect(fieldValue(onContainer, 'Manual-review flag')).toBe('ON → routed to planner')

    const { container: offContainer } = render(<TolerancePanel {...base} manualReview={false} />)
    expect(fieldValue(offContainer, 'Manual-review flag')).toBe('OFF')
  })
})
