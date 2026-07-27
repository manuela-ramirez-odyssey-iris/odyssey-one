// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import OrdersExportModal, { EXPORT_CAP_MESSAGE } from './OrdersExportModal'

afterEach(cleanup)

describe('OrdersExportModal', () => {
  it('shows the current tab + row count', () => {
    render(<OrdersExportModal tab="draft" rowCount={42} onExport={() => {}} onClose={() => {}} />)
    expect(screen.getByText('Draft')).toBeTruthy()
    expect(screen.getByText(/42 orders/)).toBeTruthy()
    expect(screen.queryByText(EXPORT_CAP_MESSAGE)).toBeNull()
    expect(screen.getByRole('button', { name: 'Export' }).disabled).toBe(false)
  })

  it('blocks export over the 25k cap with the spec message', () => {
    render(<OrdersExportModal tab="all" rowCount={25001} onExport={() => {}} onClose={() => {}} />)
    expect(screen.getByText(EXPORT_CAP_MESSAGE)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Export' }).disabled).toBe(true)
  })
})
