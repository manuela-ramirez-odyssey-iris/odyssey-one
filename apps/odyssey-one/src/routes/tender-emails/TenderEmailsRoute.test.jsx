// @vitest-environment jsdom
import { afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import TenderEmailsRoute from './TenderEmailsRoute.jsx'

afterEach(cleanup)

describe('TenderEmailsRoute', () => {
  it('names itself a reference gallery, not an app screen', () => {
    render(<TenderEmailsRoute />)
    expect(screen.getByRole('heading', { name: /Tender notification email/i })).toBeTruthy()
    expect(screen.getByText(/reference/i)).toBeTruthy()
  })
  it('offers every scenario and previews the default in a sandboxed iframe', () => {
    render(<TenderEmailsRoute />)
    expect(screen.getByRole('button', { name: /Tender sent \(Email & EDI\)/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Consolidation tender/ })).toBeTruthy()
    const frame = screen.getByTitle('Email preview')
    expect(frame.getAttribute('sandbox')).toBe('allow-same-origin')
    expect(frame.getAttribute('srcdoc')).toContain('Tender Notification')
  })
  it('switching to the Email & EDI scenario previews the TE-2 informational copy', () => {
    render(<TenderEmailsRoute />)
    fireEvent.click(screen.getByRole('button', { name: /Tender sent \(Email & EDI\)/ }))
    expect(screen.getByText('TE-2')).toBeTruthy()
    const frame = screen.getByTitle('Email preview')
    expect(frame.getAttribute('srcdoc')).toContain('also sent to you by EDI')
  })
  it('the consolidation scenario\'s subject reads "multiple deliveries"', () => {
    render(<TenderEmailsRoute />)
    fireEvent.click(screen.getByRole('button', { name: /Consolidation tender/ }))
    expect(screen.getAllByText(/multiple deliveries/).length).toBeGreaterThan(0)
  })
})
