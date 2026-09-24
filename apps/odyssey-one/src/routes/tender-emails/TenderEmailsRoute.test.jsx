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
    expect(frame.getAttribute('sandbox')).toContain('allow-same-origin')
    expect(frame.getAttribute('sandbox')).toContain('allow-popups')
    expect(frame.getAttribute('srcdoc')).toContain('Tender Notification')
    expect(frame.getAttribute('srcdoc')).toContain('<base target="_blank">')
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
  it('the accepted scenario previews TE-3 — acceptance subject, big check, no CTA or rate', () => {
    render(<TenderEmailsRoute />)
    fireEvent.click(screen.getByRole('button', { name: /Tender accepted \(confirmation\)/ }))
    expect(screen.getByText('TE-3')).toBeTruthy()
    const frame = screen.getByTitle('Email preview')
    expect(frame.getAttribute('srcdoc')).toContain('Tender Acceptance Confirmation to')
    expect(frame.getAttribute('srcdoc')).toContain('check-success.png')
    expect(frame.getAttribute('srcdoc')).not.toContain('View Tender')
    expect(frame.getAttribute('srcdoc')).not.toContain('Rate')
  })
  it('the canceled scenario previews TE-4 — cancellation subject, no review link', () => {
    render(<TenderEmailsRoute />)
    fireEvent.click(screen.getByRole('button', { name: /Tender canceled \(by planner\)/ }))
    expect(screen.getByText('TE-4')).toBeTruthy()
    const doc = screen.getByTitle('Email preview').getAttribute('srcdoc')
    expect(doc).toContain('Tender Cancellation to')
    expect(doc).toContain('x-error.png')
    expect(doc).not.toContain('/tender-review/')
  })
})
