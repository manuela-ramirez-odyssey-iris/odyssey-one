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

describe('ModalMedium composes ModalHeader', () => {
  it('renders the shared ModalHeader markup, not a hand-rolled copy', () => {
    const { container } = render(<ModalMedium title="Edit Quote" onBack={() => {}} onClose={() => {}} />)
    // ModalHeader owns this class; a hand-rolled header would never carry it. Kills a
    // regression back to a copy-pasted header even if back/close still behave right.
    const header = container.querySelector('header.modal-header')
    expect(header).toBeTruthy()
    expect(header.querySelector('.modal-header__back')).toBeTruthy()
  })
})

describe('ModalMedium headerTrail', () => {
  it('renders headerTrail content immediately BEFORE the close X', () => {
    const { container } = render(
      <ModalMedium title="Confirm Action" onClose={() => {}} headerTrail={<span data-testid="badge">02:14</span>} />
    )
    const trail = container.querySelector('.modal-header__trail')
    expect(trail).toBeTruthy()
    const kids = [...trail.children]
    expect(kids[0].getAttribute('data-testid')).toBe('badge')
    expect(kids[kids.length - 1].getAttribute('aria-label')).toBe('Close')
  })

  it('without headerTrail the close X is still the only trail child', () => {
    const { container } = render(<ModalMedium title="Confirm Action" onClose={() => {}} />)
    const trail = container.querySelector('.modal-header__trail')
    expect(trail.children).toHaveLength(1)
    expect(screen.getByLabelText('Close')).toBeTruthy()
  })
})

describe('ModalMedium stacked Escape', () => {
  it('Escape dismisses only the topmost of two open dialogs', () => {
    const onCloseBottom = vi.fn()
    const onCloseTop = vi.fn()
    render(<ModalMedium title="Bottom" onClose={onCloseBottom} />)
    render(<ModalMedium title="Top" onClose={onCloseTop} />)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onCloseTop).toHaveBeenCalledOnce()
    expect(onCloseBottom).not.toHaveBeenCalled()
  })

  it('survives out-of-order unmount — closing the bottom dialog first leaves the top dialog on top', () => {
    const onCloseBottom = vi.fn()
    const onCloseTop = vi.fn()
    const bottom = render(<ModalMedium title="Bottom" onClose={onCloseBottom} />)
    render(<ModalMedium title="Top" onClose={onCloseTop} />)

    // Bottom dialog unmounts first (e.g. closed via a non-Escape path), out of LIFO order.
    bottom.unmount()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onCloseTop).toHaveBeenCalledOnce()
    expect(onCloseBottom).not.toHaveBeenCalled()
  })
})
