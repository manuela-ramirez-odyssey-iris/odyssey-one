// @vitest-environment jsdom
import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TolerancePanel from './TolerancePanel'
import { evaluateTolerance } from './tolerance'
import { fmtDollar } from '../utils/money'

describe('TolerancePanel', () => {
  test('within-tolerance renders the success Alert', () => {
    const props = { benchmark: 2800, tolerancePct: 5, lowestBid: 2540, manualReview: false }
    render(<TolerancePanel {...props} />)
    expect(screen.getByText(/Within tolerance/)).toBeTruthy()
  })

  test('out-of-tolerance renders the warning Alert', () => {
    const props = { benchmark: 2800, tolerancePct: 5, lowestBid: 3000, manualReview: false }
    const { withinTolerance } = evaluateTolerance(props)
    expect(withinTolerance).toBe(false)
    render(<TolerancePanel {...props} />)
    expect(screen.queryByText(/Within tolerance/)).toBeFalsy()
    // out-of-tolerance reason surfaced in human words
    expect(screen.getByText(/out of tolerance/i)).toBeTruthy()
  })

  test('manual-review reason is surfaced in human words', () => {
    const props = { benchmark: 2800, tolerancePct: 5, lowestBid: 2540, manualReview: true }
    render(<TolerancePanel {...props} />)
    expect(screen.getByText(/manual review/i)).toBeTruthy()
  })

  test('total-cap reason is surfaced in human words', () => {
    const props = { benchmark: 2800, tolerancePct: 10, lowestBid: 2900, totalCap: 2850, manualReview: false }
    render(<TolerancePanel {...props} />)
    expect(screen.getByText(/cap/i)).toBeTruthy()
  })

  test('displayed ceiling equals evaluateTolerance(...).ceiling formatted', () => {
    const props = { benchmark: 2800, tolerancePct: 5, lowestBid: 2540, manualReview: false }
    const { ceiling } = evaluateTolerance(props)
    render(<TolerancePanel {...props} />)
    expect(screen.getByText(fmtDollar(ceiling))).toBeTruthy()
  })

  test('renders benchmark and lowest bid values through fmtDollar', () => {
    const props = { benchmark: 2800, tolerancePct: 5, lowestBid: 2540, manualReview: false }
    render(<TolerancePanel {...props} />)
    expect(screen.getByText(fmtDollar(2800))).toBeTruthy()
    expect(screen.getByText(fmtDollar(2540))).toBeTruthy()
    expect(screen.getByText('5%')).toBeTruthy()
  })
})
