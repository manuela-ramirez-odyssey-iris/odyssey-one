// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AwardModal, { FORCE_CLOSE_MIN_MS } from './AwardModal'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function makeQuote(closeAt) {
  return { quoteId: 'q-1', status: 'open', closeAt, openAt: closeAt - 60 * 60000, carriers: [] }
}

function openForceClose(props) {
  render(<AwardModal quote={props.quote} closed={false} {...props} />)
  fireEvent.click(screen.getByText('Force Close'))
}

describe('AwardModal — SPB-75 force-close threshold', () => {
  test('disables force-close and shows the note when the quote closes on its own within 5 minutes', () => {
    const quote = makeQuote(Date.now() + FORCE_CLOSE_MIN_MS - 1000)
    openForceClose({ quote })
    expect(screen.getByText(/closes in under 5 minutes/i)).toBeTruthy()
    expect(screen.getByText('Force Close Bidding').closest('button').disabled).toBe(true)
  })

  test('leaves force-close enabled when more than 5 minutes remain', () => {
    const quote = makeQuote(Date.now() + FORCE_CLOSE_MIN_MS + 60000)
    openForceClose({ quote })
    expect(screen.queryByText(/closes in under 5 minutes/i)).toBeFalsy()
    expect(screen.getByText('Force Close Bidding').closest('button').disabled).toBe(false)
  })
})
