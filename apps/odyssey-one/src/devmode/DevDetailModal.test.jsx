// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import DevDetailModal from './DevDetailModal.jsx'
import { getComponentInfo, dsmUrl } from './componentInfo.js'

vi.mock('./componentInfo.js', () => ({
  getComponentInfo: vi.fn(),
  dsmUrl: vi.fn((name, framework) => (framework === 'react' ? `/design-system#comp-${name}` : null)),
}))

const PORTED_INFO = {
  name: 'Badge',
  react: {
    tier: 'atom',
    version: '0.4.0',
    normalizing: true,
    props: [{ name: 'variant', type: 'string', desc: 'Color preset.' }],
  },
  angular: { selector: 'odyssey-badge', version: '0.3.0', normalizing: false },
  ported: true,
}

const UNPORTED_INFO = {
  name: 'Cell',
  react: { tier: 'atom', version: '0.1.0', normalizing: false, props: [] },
  angular: null,
  ported: false,
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('DevDetailModal — null name', () => {
  it('renders nothing when name is null', () => {
    const { container } = render(<DevDetailModal name={null} onClose={() => {}} />)
    expect(container.innerHTML).toBe('')
    expect(getComponentInfo).not.toHaveBeenCalled()
  })
})

describe('DevDetailModal — ported component', () => {
  it('renders both framework columns, props rows, and a NORMALIZING badge', async () => {
    getComponentInfo.mockResolvedValue(PORTED_INFO)
    render(<DevDetailModal name="Badge" onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    expect(screen.getByText(/atom/)).toBeTruthy()
    // "odyssey-badge" also appears in the modal title/header — scope to the
    // Angular column's body text (selector · version) to avoid ambiguity.
    expect(screen.getByText(/odyssey-badge · 0\.3\.0/)).toBeTruthy()
    expect(screen.getByText('NORMALIZING')).toBeTruthy()
    expect(screen.getByText('variant')).toBeTruthy()
    expect(screen.getByText('Color preset.')).toBeTruthy()

    const reactLink = screen.getByRole('link', { name: /open in react dsm/i })
    expect(reactLink.getAttribute('href')).toBe('/design-system#comp-Badge')
  })
})

describe('DevDetailModal — unported component', () => {
  it('shows "not ported" and a disabled Angular link with the expected title', async () => {
    getComponentInfo.mockResolvedValue(UNPORTED_INFO)
    render(<DevDetailModal name="Cell" onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    expect(screen.getByText('not ported')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /open in angular dsm/i })).toBeNull()
    const disabledLink = screen.getByTitle('Angular DSM not published yet')
    expect(disabledLink.tagName).toBe('SPAN')
  })
})

describe('DevDetailModal — close', () => {
  it('Escape calls onClose (via ModalMedium/useEscapeStack)', async () => {
    getComponentInfo.mockResolvedValue(PORTED_INFO)
    const onClose = vi.fn()
    render(<DevDetailModal name="Badge" onClose={onClose} />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })
})
