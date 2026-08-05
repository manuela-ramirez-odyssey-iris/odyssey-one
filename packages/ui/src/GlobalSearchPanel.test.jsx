// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import GlobalSearchPanel from './GlobalSearchPanel.jsx'

afterEach(cleanup)

// `primaryDisabled` binds the footer's primary to Button's own disabled state.
// The alternative a consumer is left with — omitting onShowResults — produces a
// button that LOOKS enabled and silently does nothing on click.
describe('GlobalSearchPanel primaryDisabled', () => {
  test('primary is enabled by default', () => {
    render(<GlobalSearchPanel count={4} onShowResults={() => {}} />)
    expect(screen.getByText('Show all 4 results').closest('button').disabled).toBe(false)
  })

  test('primaryDisabled disables the primary button and blocks its handler', () => {
    const onShowResults = vi.fn()
    render(<GlobalSearchPanel count={4} primaryDisabled onShowResults={onShowResults} />)
    const btn = screen.getByText('Show all 4 results').closest('button')
    expect(btn.disabled).toBe(true)
    fireEvent.click(btn)
    expect(onShowResults).not.toHaveBeenCalled()
  })

  test('disabling the primary leaves the secondary actionable', () => {
    const onClear = vi.fn()
    render(<GlobalSearchPanel count={0} primaryDisabled onClear={onClear} onShowResults={() => {}} />)
    fireEvent.click(screen.getByText('Clear all'))
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
