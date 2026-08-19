// @vitest-environment jsdom
import { afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import Alert from './Alert.jsx'

afterEach(cleanup)

describe('Alert — error/validation mode (unchanged behavior)', () => {
  const errors = [
    { field: 'Equipment *', reason: 'Invalid Data' },
    { field: 'Freight Term *', reason: 'Missing Mandatory' },
  ]

  it('renders the error header + hardwired error classes, list collapsed by default', () => {
    render(<Alert errors={errors} />)
    expect(screen.getByText('2 Errors: Validation Required')).toBeTruthy()
    const root = screen.getByRole('status')
    expect(root.className).toContain('alert--error')
    expect(root.className).toContain('alert--validation')
    expect(root.querySelector('.alert__reveal').className).not.toContain('alert__reveal--open')
  })

  it('chevron expands the error list, rendering one row per error', () => {
    render(<Alert errors={errors} />)
    fireEvent.click(screen.getByLabelText('Expand error list'))
    expect(screen.getByText('Equipment *')).toBeTruthy()
    expect(screen.getByText('Freight Term *')).toBeTruthy()
  })
})

describe('Alert — generic collapsible list (items/summary)', () => {
  const items = [
    { key: 'a', content: 'Row A' },
    { key: 'b', content: 'Row B' },
  ]

  it('renders collapsed by default with the caller-supplied summary, success-colored', () => {
    render(<Alert variant="success" items={items} summary="RFQ sent — 2 bid links" />)
    expect(screen.getByText('RFQ sent — 2 bid links')).toBeTruthy()
    const root = screen.getByRole('status')
    expect(root.className).toContain('alert--success')
    expect(root.className).toContain('alert--list')
    expect(root.querySelector('.alert__reveal').className).not.toContain('alert__reveal--open')
    // header text is not the hardcoded error wording
    expect(screen.queryByText(/Validation Required/)).toBeNull()
  })

  it('chevron expands the list and renders item content', () => {
    render(<Alert variant="success" items={items} summary="RFQ sent — 2 bid links" />)
    fireEvent.click(screen.getByLabelText('Expand list'))
    expect(screen.getByText('Row A')).toBeTruthy()
    expect(screen.getByText('Row B')).toBeTruthy()
  })

  it('close button fires onClose without toggling the list', () => {
    const onClose = vi.fn()
    render(<Alert variant="success" items={items} summary="RFQ sent" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Dismiss'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Expand list').getAttribute('aria-expanded')).toBe('false')
  })

  it('falls back to plain message mode when items is empty', () => {
    render(<Alert variant="success">Plain message</Alert>)
    expect(screen.getByText('Plain message')).toBeTruthy()
    expect(screen.queryByLabelText('Expand list')).toBeNull()
  })
})
