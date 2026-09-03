// @vitest-environment jsdom
import { afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import SpotEmailsRoute from './SpotEmailsRoute.jsx'

afterEach(cleanup)

describe('SpotEmailsRoute', () => {
  it('names itself a reference gallery, not an app screen', () => {
    render(<SpotEmailsRoute />)
    expect(screen.getByRole('heading', { name: /Overflow email set/i })).toBeTruthy()
    expect(screen.getByText(/reference/i)).toBeTruthy()
  })
  it('labels the scenario nav with a visible heading', () => {
    render(<SpotEmailsRoute />)
    expect(screen.getByRole('heading', { name: 'Scenarios' })).toBeTruthy()
  })
  it('offers every scenario and previews the first email in a sandboxed iframe', () => {
    render(<SpotEmailsRoute />)
    expect(screen.getByRole('button', { name: /Closed — out of tolerance/ })).toBeTruthy()
    const frame = screen.getByTitle('Email preview')
    expect(frame.getAttribute('sandbox')).toBe('')
    expect(frame.getAttribute('srcdoc')).toContain('Request for Quote')
  })
  it('switching scenario switches the email list', () => {
    render(<SpotEmailsRoute />)
    fireEvent.click(screen.getByRole('button', { name: /Closed — no bids/ }))
    expect(screen.getByText('IE-1')).toBeTruthy()
    expect(screen.getByText(/no carrier bids submitted/)).toBeTruthy()
  })
  it('toggles between the HTML and the plain-text version', () => {
    render(<SpotEmailsRoute />)
    fireEvent.click(screen.getByRole('button', { name: 'Text' }))
    expect(screen.queryByTitle('Email preview')).toBeNull()
    expect(screen.getByText(/Offer Expires:/)).toBeTruthy()
  })
  it('shows the envelope so the sender rule is legible', () => {
    render(<SpotEmailsRoute />)
    expect(screen.getByText(/planning-charlotte@odysseylogistics\.com/)).toBeTruthy()
  })
})
