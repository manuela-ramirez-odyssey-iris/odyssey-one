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
    expect(screen.getAllByText(/no carrier bids submitted/).length).toBeGreaterThan(0)
  })
  it('defaults the preview to the out-of-tolerance scenario\'s own IE-2, no row click needed', () => {
    render(<SpotEmailsRoute />)
    fireEvent.click(screen.getByRole('button', { name: /Closed — out of tolerance/ }))
    const frame = screen.getByTitle('Email preview')
    expect(frame.getAttribute('srcdoc')).toContain('out of tolerance')
  })
  it('defaults the preview to the Awarded scenario\'s own CE-2, no row click needed', () => {
    render(<SpotEmailsRoute />)
    fireEvent.click(screen.getByRole('button', { name: /^Awarded$/ }))
    const frame = screen.getByTitle('Email preview')
    expect(frame.getAttribute('srcdoc')).not.toContain('Request for Quote')
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
