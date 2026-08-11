// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import DocumentsTab from './DocumentsTab'

afterEach(cleanup)

// LINX-8120 / LINX-7629/7628/7634 / LINX-8091 (ruling 2026-08-06, audit
// 2026-08-10) — source precedence covers design DESCRIPTIONS, not DATA
// FORMATS. formatCreationTime used to split the timestamp: date via the
// platform canon (24h-safe MM/DD/YYYY) but TIME via toLocaleTimeString with
// hour12: true, following Efrain's mock literally instead of the Jira 24-hour
// mandate. This is the last 12-hour instance in production code.
describe('DocumentsTab — 24-hour creation timestamp', () => {
  it('renders the Creation Time in 24-hour MM/DD/YYYY HH:MM, not 12-hour', () => {
    const data = { documents: [
      { fileName: 'bol.pdf', createdAt: '2025-12-16T18:48:00.000Z', fileSize: 120 },
    ] }
    render(<DocumentsTab data={data} />)
    const cell = screen.getByText(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)
    expect(cell.textContent).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
    // No AM/PM marker and no zone abbreviation — the old format smuggled in a
    // browser-locale zone (toLocaleTimeString) that never came from the data.
    expect(cell.textContent).not.toMatch(/[AP]M/i)
  })
})

// LINX-12113 (2026-08-10) — the preview modal's Download Button had no
// onClick at all, and the row kebab's Download was an explicit no-op. Both
// entry points must behave consistently: a real File/Blob (this-session
// uploads) downloads for real; seeded/remote documents (no Blob available)
// must be visibly disabled, never silently inert.
describe('DocumentsTab — Download affordance (LINX-12113)', () => {
  it('disables the row kebab Download for a seeded document with no attached file', () => {
    const data = { documents: [{ fileName: 'bol.pdf', createdAt: '2025-12-16T18:48:00.000Z', fileSize: 120 }] }
    render(<DocumentsTab data={data} />)
    fireEvent.click(screen.getByRole('button', { name: 'Document actions' }))
    const downloadRow = screen.getByText(/Download/)
    expect(downloadRow.closest('[role="menuitem"]').getAttribute('aria-disabled')).toBe('true')
  })

  it('disables the preview-modal Download button for a seeded document with no attached file', () => {
    const data = { documents: [{ fileName: 'bol.pdf', createdAt: '2025-12-16T18:48:00.000Z', fileSize: 120 }] }
    render(<DocumentsTab data={data} />)
    fireEvent.click(screen.getByText('bol.pdf'))
    const downloadBtn = screen.getByRole('button', { name: 'Download' })
    expect(downloadBtn.disabled).toBe(true)
  })

  it('triggers a real object-URL download for a locally-uploaded document that carries a real File', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    const origCreate = global.URL.createObjectURL
    const origRevoke = global.URL.revokeObjectURL
    global.URL.createObjectURL = createObjectURL
    global.URL.revokeObjectURL = revokeObjectURL

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<DocumentsTab data={{ documents: [] }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Document' }))
    const file = new File(['content'], 'invoice.pdf', { type: 'application/pdf' })
    const fileInput = document.querySelector('input[type="file"]')
    fireEvent.change(fileInput, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

    fireEvent.click(screen.getByRole('button', { name: 'Document actions' }))
    const downloadRow = screen.getByText(/^Download$/)
    expect(downloadRow.closest('[role="menuitem"]').getAttribute('aria-disabled')).toBeFalsy()
    fireEvent.click(downloadRow)

    expect(createObjectURL).toHaveBeenCalledWith(file)
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    clickSpy.mockRestore()
    global.URL.createObjectURL = origCreate
    global.URL.revokeObjectURL = origRevoke
  })
})
