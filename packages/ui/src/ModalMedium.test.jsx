// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import ModalMedium from './ModalMedium.jsx'

afterEach(cleanup)

describe('ModalMedium onBack', () => {
  it('renders no back control by default', () => {
    render(<ModalMedium title="Plain" onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })

  it('renders a back control before the title when onBack is given', () => {
    render(<ModalMedium title="Edit Quote" onBack={() => {}} onClose={() => {}} />)
    const back = screen.getByRole('button', { name: 'Back' })
    expect(back).toBeTruthy()
    // Leading: the back control precedes the title in DOM order.
    expect(back.compareDocumentPosition(screen.getByText('Edit Quote')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('calls onBack without calling onClose', () => {
    const onBack = vi.fn(); const onClose = vi.fn()
    render(<ModalMedium title="Edit Quote" onBack={onBack} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()
  })
})
