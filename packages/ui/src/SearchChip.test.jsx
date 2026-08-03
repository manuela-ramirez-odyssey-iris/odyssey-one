// @vitest-environment jsdom
// SearchChip (GS-21) — summary naming, invalid decount, edit-commit cycle,
// single variant, remove affordance.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import SearchChip, { splitCodes } from './SearchChip.jsx'

afterEach(cleanup)

const codes = (...values) => values.map((value) => ({ value, valid: true }))

describe('splitCodes', () => {
  it('splits on commas, whitespace and newlines', () => {
    expect(splitCodes('a, b\nc  d,,e')).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(splitCodes('')).toEqual([])
  })
})

describe('single chip (label)', () => {
  it('renders the label with no expand affordance', () => {
    render(<SearchChip label="Carrier: ABC Logistic" />)
    expect(screen.getByText('Carrier: ABC Logistic')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Set •/ })).toBeNull()
  })

  it('fires onRemove from the X', () => {
    const onRemove = vi.fn()
    render(<SearchChip label="Mode: LTL" onRemove={onRemove} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('renders no X without onRemove', () => {
    render(<SearchChip label="Mode: LTL" />)
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull()
  })
})

describe('set chip summary badge', () => {
  it('names the set after typeLabel when given', () => {
    render(<SearchChip typeLabel="Pro#/Booking #" codes={codes('1', '2')} />)
    expect(screen.getByRole('button', { name: 'Pro#/Booking # Set • 2 IDs' })).toBeTruthy()
  })

  it('falls back to Multiple without a typeLabel, and decounts invalid codes', () => {
    render(
      <SearchChip
        codes={[{ value: 'a', valid: true }, { value: 'b', valid: false }, { value: 'c', valid: true }]}
      />,
    )
    // 3 codes, 1 invalid → 2 IDs (GS-21 rule 5: invalid codes are decounted)
    expect(screen.getByRole('button', { name: 'Multiple Set • 2 IDs' })).toBeTruthy()
  })

  it('uses the singular for one valid code', () => {
    render(<SearchChip codes={codes('a')} />)
    expect(screen.getByRole('button', { name: 'Multiple Set • 1 ID' })).toBeTruthy()
  })

  it('offers remove alongside the toggle', () => {
    const onRemove = vi.fn()
    render(<SearchChip codes={codes('a', 'b')} onRemove={onRemove} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onRemove).toHaveBeenCalledOnce()
  })
})

describe('date mode', () => {
  it('invalid date reads red and the calendar never mounts', () => {
    render(<SearchChip dateLabel="Pickup Date" invalid open={false} onOpenChange={() => {}} />)
    const toggle = screen.getByRole('button', { name: 'Pickup Date: Invalid Date' })
    expect(toggle.className).toContain('--invalid')
    fireEvent.click(toggle) // controlled open stays false — consumer refuses invalid opens
    expect(screen.queryByRole('group', { name: 'Pick date' })).toBeNull()
  })

  it('range summary mirrors the bounds', () => {
    render(<SearchChip dateLabel="Pickup Date Range" range from="2/6/2026" to={null} open={false} onOpenChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Pickup Date Range: 2/6/2026-' })).toBeTruthy()
  })
})

describe('expanded panel', () => {
  it('opens on badge click and paints invalid codes red', () => {
    render(
      <SearchChip codes={[{ value: 'GOOD1', valid: true }, { value: 'BAD1', valid: false }]} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Set •/ }))
    expect(screen.getByText(/GOOD1/).className).not.toContain('--invalid')
    expect(screen.getByText(/BAD1/).className).toContain('--invalid')
  })

  it('commits edits on Enter — not per keystroke', () => {
    const onCommit = vi.fn()
    render(<SearchChip codes={codes('111', '222')} onCommit={onCommit} />)
    fireEvent.click(screen.getByRole('button', { name: /Set •/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit codes' }))
    const editor = screen.getByRole('textbox', { name: 'Codes' })
    fireEvent.change(editor, { target: { value: '111,\n222,\n333' } })
    expect(onCommit).not.toHaveBeenCalled()
    fireEvent.keyDown(editor, { key: 'Enter' })
    expect(onCommit).toHaveBeenCalledWith(['111', '222', '333'])
  })

  it('collapsing while editing also commits', () => {
    const onCommit = vi.fn()
    render(<SearchChip codes={codes('111')} onCommit={onCommit} />)
    fireEvent.click(screen.getByRole('button', { name: /Set •/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit codes' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Codes' }), { target: { value: '111 999' } })
    fireEvent.click(screen.getByRole('button', { name: /Set •/ })) // collapse
    expect(onCommit).toHaveBeenCalledWith(['111', '999'])
    expect(screen.queryByRole('group', { name: 'Codes' })).toBeNull()
  })

  it('clicking outside collapses the panel and commits a pending edit', () => {
    const onCommit = vi.fn()
    render(
      <div>
        <SearchChip codes={codes('111')} onCommit={onCommit} />
        <button>outside</button>
      </div>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Set •/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit codes' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Codes' }), { target: { value: '111 222' } })
    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }))
    expect(onCommit).toHaveBeenCalledWith(['111', '222'])
    expect(screen.queryByRole('group', { name: 'Codes' })).toBeNull()
  })

  it('clicks inside the panel never collapse it', () => {
    render(<SearchChip codes={codes('111')} />)
    fireEvent.click(screen.getByRole('button', { name: /Set •/ }))
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Edit codes' }))
    expect(screen.getByRole('group', { name: 'Codes' })).toBeTruthy()
  })

  it('click-to-edit places the caret at the end when the point cannot be resolved (jsdom fallback)', () => {
    render(<SearchChip codes={codes('111', '222')} />)
    fireEvent.click(screen.getByRole('button', { name: /Set •/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit codes' }))
    const editor = screen.getByRole('textbox', { name: 'Codes' })
    expect(editor.selectionStart).toBe('111,\n222'.length)
  })

  it('Escape cancels the edit without committing', () => {
    const onCommit = vi.fn()
    render(<SearchChip codes={codes('111')} onCommit={onCommit} />)
    fireEvent.click(screen.getByRole('button', { name: /Set •/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit codes' }))
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Codes' }), { key: 'Escape' })
    expect(onCommit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Edit codes' })).toBeTruthy() // back to read view
  })
})
