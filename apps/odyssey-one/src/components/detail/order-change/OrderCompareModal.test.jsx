// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import OrderCompareModal from './OrderCompareModal'
afterEach(cleanup)
const rows = [
  { field: 'Incoterm Info', source: 'Order', prior: 'FOB', new: 'FOB', changed: false },
  { field: 'Gross Weight', source: 'Order', prior: '100 LB', new: '120 LB', changed: true },
]
it('titles the dialog, names the order, and lists changed rows before unchanged (LINX-15437 → 14512)', () => {
  render(<OrderCompareModal orderId="000000004852" rows={rows} onClose={() => {}} />)
  expect(screen.getByRole('dialog', { name: 'Order Changes 000000004852' })).toBeTruthy()
  expect(screen.queryByText(/Order Number:/)).toBeNull()
  const gw = screen.getByText('Gross Weight'), inc = screen.getByText('Incoterm Info')
  expect(!!(gw.compareDocumentPosition(inc) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  expect(screen.getByText('120 LB').closest('.text-badge')).toBeTruthy()
  expect(screen.getAllByText('FOB')[0].closest('.text-badge')).toBeNull()
  expect(screen.queryByText('Preview Tender Details')).toBeNull()
})
it('no footer (user 2026-09-29); Esc closes; empty rows render both bands without crashing', () => {
  const onClose = vi.fn()
  render(<OrderCompareModal orderId="1" rows={[]} onClose={onClose} />)
  expect(screen.getAllByText('(No Differences)')).toHaveLength(2)
  expect(screen.queryByText('Go Back')).toBeNull()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(onClose).toHaveBeenCalled()
})
it('lines are tabs with changed counts; opens on the first changed tab, else Order; switching swaps the table (DEC-196 amended)', () => {
  const l1 = { lineNumber: '001', shipItem: '100034', hazmatUnNumber: 'UN1830', flashPoint: '106 F' }
  const l2 = { lineNumber: '002', shipItem: '100035', hazmatUnNumber: 'UN1830', flashPoint: '90 F' }
  const { unmount } = render(<OrderCompareModal orderId="1" rows={[rows[0]]} lines={[l1, l2]} onClose={() => {}} />)
  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Order', 'Line 001', 'Line 002'])   // no changes → no counts
  expect(screen.getByRole('tab', { name: 'Order' }).getAttribute('aria-selected')).toBe('true')
  fireEvent.click(screen.getByRole('tab', { name: 'Line 002' }))
  expect(screen.getByRole('tabpanel').textContent).toContain('90 F')
  expect(screen.queryByText('Incoterm Info')).toBeNull()
  expect(screen.queryByText('Changed')).toBeNull()
  unmount()
  render(<OrderCompareModal orderId="1" rows={rows} linePairs={[{ prior: l1, new: l1 }, { prior: l2, new: { ...l2, flashPoint: '95 F' } }]} onClose={() => {}} />)
  const tabs = screen.getAllByRole('tab')
  expect(tabs.map((t) => t.textContent)).toEqual(['Order1', 'Line 001', 'Line 0021'])
  expect(tabs[0].getAttribute('aria-selected')).toBe('true')            // Order has a change → first
  fireEvent.keyDown(tabs[0].parentElement, { key: 'ArrowRight' })
  fireEvent.keyDown(tabs[1].parentElement, { key: 'ArrowRight' })
  expect(screen.getByRole('tab', { name: /Line 002/ }).getAttribute('aria-selected')).toBe('true')
  expect(screen.getByText('95 F').closest('.text-badge')).toBeTruthy()
})
it('opens on the first line tab with a change when the Order tab has none', () => {
  const l = { lineNumber: '001', flashPoint: '90 F' }
  render(<OrderCompareModal orderId="1" rows={[rows[0]]} linePairs={[{ prior: l, new: { ...l, flashPoint: '95 F' } }]} onClose={() => {}} />)
  expect(screen.getByRole('tab', { name: /Line 001/ }).getAttribute('aria-selected')).toBe('true')
})
