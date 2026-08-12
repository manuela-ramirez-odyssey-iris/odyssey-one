// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import DiscardChangesModal from './DiscardChangesModal'

afterEach(cleanup)

describe('DiscardChangesModal', () => {
  it('offers discard and save', () => {
    render(<DiscardChangesModal onDiscard={() => {}} onSave={() => {}} onStay={() => {}} />)
    expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy()
  })

  it('calls onDiscard', () => {
    const onDiscard = vi.fn()
    render(<DiscardChangesModal onDiscard={onDiscard} onSave={() => {}} onStay={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Discard Changes' }))
    expect(onDiscard).toHaveBeenCalledOnce()
  })

  it('calls onSave', () => {
    const onSave = vi.fn()
    render(<DiscardChangesModal onDiscard={() => {}} onSave={onSave} onStay={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('the header close returns to editing rather than choosing for the user', () => {
    const onStay = vi.fn(); const onDiscard = vi.fn()
    render(<DiscardChangesModal onDiscard={onDiscard} onSave={() => {}} onStay={onStay} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onStay).toHaveBeenCalledOnce()
    expect(onDiscard).not.toHaveBeenCalled()
  })
})
