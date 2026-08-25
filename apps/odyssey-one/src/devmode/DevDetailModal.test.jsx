// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { Button, FormField, PageHeader } from '@odyssey/ui'
import DevDetailModal from './DevDetailModal.jsx'
import { getComponentInfo, dsmUrl, figmaUrl } from './componentInfo.js'
import { _resetForTests, setFramework } from './useDevMode.js'

vi.mock('./componentInfo.js', () => ({
  getComponentInfo: vi.fn(),
  dsmUrl: vi.fn((name, framework) => (framework === 'react' ? `/design-system#comp-${name}` : null)),
  figmaUrl: vi.fn(() => null),
}))

// The modal reads `framework` from the real useDevMode store (same
// self-contained pattern as DevOverlay/DevToggle) — reset it before every
// test so no test leaks its framework selection into the next one, and
// default to 'react' so all the PRE-EXISTING fixtures below (none of which
// populate `angular.props`) keep exercising a plain React API table exactly
// as before. Framework-specific behavior gets its own describe block below.
beforeEach(() => {
  _resetForTests()
  setFramework('react')
})

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
    // Same-app deep link — stays in the current tab, no target/rel.
    expect(reactLink.getAttribute('target')).toBeNull()
  })

  it('renders a real Angular DSM link, opened in a new tab, when dsmUrl resolves one', async () => {
    getComponentInfo.mockResolvedValue(PORTED_INFO)
    // Once-only overrides (not mockImplementation) — clearAllMocks() in
    // afterEach doesn't restore the vi.mock() factory's base implementation,
    // so a persistent override here would leak into later tests.
    dsmUrl.mockImplementationOnce((name) => `/design-system#comp-${name}`)
    dsmUrl.mockImplementationOnce((name) => `https://odyssey-dsm-angular-stage.vercel.app#comp-${name}`)
    render(<DevDetailModal name="Badge" onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    const angularLink = screen.getByRole('link', { name: /open in angular dsm/i })
    expect(angularLink.getAttribute('href')).toBe('https://odyssey-dsm-angular-stage.vercel.app#comp-Badge')
    // Cross-site DSM link — new tab, no tab-nabbing via noopener.
    expect(angularLink.getAttribute('target')).toBe('_blank')
    expect(angularLink.getAttribute('rel')).toBe('noopener')
  })

  it('renders a real Figma link, opened in a new tab, when figmaUrl resolves one', async () => {
    getComponentInfo.mockResolvedValue(PORTED_INFO)
    figmaUrl.mockReturnValueOnce('https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=213-27')
    render(<DevDetailModal name="Badge" onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    const figmaLink = screen.getByRole('link', { name: /open in figma/i })
    expect(figmaLink.getAttribute('href')).toBe(
      'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=213-27'
    )
    // External Figma link — new tab, no tab-nabbing via noopener.
    expect(figmaLink.getAttribute('target')).toBe('_blank')
    expect(figmaLink.getAttribute('rel')).toBe('noopener')
  })

  it('shows a disabled Figma link with the expected title when the component has no figmaNode', async () => {
    getComponentInfo.mockResolvedValue(PORTED_INFO)
    // vi.mock() factory default already returns null; asserting it explicitly here.
    figmaUrl.mockReturnValueOnce(null)
    render(<DevDetailModal name="Badge" onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    expect(screen.queryByRole('link', { name: /open in figma/i })).toBeNull()
    const disabledLink = screen.getByTitle('No Figma master for this component')
    expect(disabledLink.tagName).toBe('SPAN')
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

describe('DevDetailModal — load failure', () => {
  it('a rejected getComponentInfo calls onClose (chip stays clickable, no dead modal / unhandled rejection)', async () => {
    getComponentInfo.mockRejectedValue(new Error('stale chunk reference'))
    const onClose = vi.fn()
    render(<DevDetailModal name="Badge" onClose={onClose} />)

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})

const BUTTON_INFO = {
  name: 'Button',
  react: {
    tier: 'atom',
    version: '1.0.0',
    normalizing: false,
    props: [
      { name: 'variant', type: 'string', desc: 'Visual preset.' },
      { name: 'size', type: 'string', desc: 'Control size.' },
      { name: 'disabled', type: 'bool', desc: 'Disables the control.' },
    ],
  },
  angular: null,
  ported: false,
}

// Real component trees, so the fiber walk under test is exercised against
// genuine @odyssey/ui instances rather than a hand-built fake.
function renderProductTree() {
  return render(
    <PageHeader title="Shipments">
      <FormField label="Currency" value="" onChange={() => {}} trailingSelect={{ label: 'USD', onClick: () => {} }} />
    </PageHeader>
  )
}

describe('DevDetailModal — hierarchy', () => {
  it('lists the whole ancestry outermost → innermost with relation labels that state their evidence', async () => {
    getComponentInfo.mockResolvedValue(PORTED_INFO)
    renderProductTree()
    const target = screen.getByRole('button', { name: 'USD' })

    render(<DevDetailModal name="FieldSelect" element={target} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    const rows = Array.from(document.querySelectorAll('.devmode-detail__chain-row'))
    expect(rows.map((r) => r.querySelector('.devmode-detail__chain-name').textContent)).toEqual([
      'PageHeader',
      'FormField',
      'FieldSelect',
    ])
    // FormField was handed to PageHeader as children → "in slot". FieldSelect
    // is built by FormField's own render → "rendered inside" (not "internal":
    // that word overclaims ownership — see inspect.js's relationBetween
    // comment for the DataTable/ActionMenu counter-example). The outermost
    // row has no parent in this chain, so it carries no label.
    const relationEls = Array.from(document.querySelectorAll('.devmode-detail__relation'))
    expect(relationEls.map((n) => n.textContent)).toEqual(['in slot', 'rendered inside'])
    // The nuance ("rendered inside" isn't "part of the parent's
    // implementation") must survive as a tooltip, not just live in a comment.
    expect(relationEls[1].title).toContain('does not always mean the component is part of')
    expect(relationEls[1].title).toContain('FormField')
    // The inspected entry is emphasized, and is the one row that isn't a link.
    expect(rows[2].className).toContain('devmode-detail__chain-row--current')
    expect(rows[2].querySelector('button')).toBeNull()
  })

  it('clicking an ancestor row re-targets the modal at that ancestor (name + its element)', async () => {
    getComponentInfo.mockResolvedValue(PORTED_INFO)
    renderProductTree()
    const target = screen.getByRole('button', { name: 'USD' })
    const onInspect = vi.fn()

    render(<DevDetailModal name="FieldSelect" element={target} onInspect={onInspect} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'PageHeader' }))

    expect(onInspect).toHaveBeenCalledTimes(1)
    const [calledName, calledElement] = onInspect.mock.calls[0]
    expect(calledName).toBe('PageHeader')
    expect(calledElement.contains(target)).toBe(true)
  })
})

describe('DevDetailModal — "This instance"', () => {
  function renderButtonInstance(extraProps = {}) {
    const { container } = render(
      <Button variant="secondary" size="sm" disabled onClick={() => {}} className="hero-cta" {...extraProps}>
        Save
      </Button>
    )
    return container.querySelector('button')
  }

  it('shows the clicked instance\'s live resolved props — variant and disabled included', async () => {
    getComponentInfo.mockResolvedValue(BUTTON_INFO)
    const el = renderButtonInstance()

    render(<DevDetailModal name="Button" element={el} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    const cells = Array.from(document.querySelectorAll('.devmode-detail__section td')).map((td) => td.textContent)
    expect(cells).toContain('variant')
    expect(cells).toContain('"secondary"')
    expect(cells).toContain('disabled')
    expect(cells).toContain('true')
  })

  it('renders a function prop as ƒ and children as <ReactNode>, never expanded', async () => {
    getComponentInfo.mockResolvedValue(BUTTON_INFO)
    const el = renderButtonInstance()

    render(<DevDetailModal name="Button" element={el} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    const rowText = Array.from(document.querySelectorAll('.devmode-detail__section tr')).map((tr) => tr.textContent)
    expect(rowText).toContain('onClickƒ')
    expect(rowText).toContain('children<ReactNode>')
  })

  it('sorts documented API props before undocumented ones (which are muted)', async () => {
    getComponentInfo.mockResolvedValue(BUTTON_INFO)
    const el = renderButtonInstance()

    render(<DevDetailModal name="Button" element={el} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    const rows = Array.from(document.querySelectorAll('.devmode-detail__section tbody tr'))
    const names = rows.map((r) => r.querySelector('td').textContent)
    expect(names.slice(0, 3)).toEqual(['variant', 'size', 'disabled'])
    expect(names.slice(3).sort()).toEqual(['children', 'className', 'onClick'])
    expect(rows[0].className).not.toContain('--other')
    expect(rows[3].className).toContain('devmode-detail__instance-row--other')
  })

  it('omits a documented prop the instance never received (no invented defaults)', async () => {
    getComponentInfo.mockResolvedValue(BUTTON_INFO)
    const el = renderButtonInstance({ size: undefined })

    render(<DevDetailModal name="Button" element={el} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    const names = Array.from(document.querySelectorAll('.devmode-detail__section tbody tr')).map(
      (r) => r.querySelector('td').textContent
    )
    expect(names).not.toContain('size')
  })
})

describe('DevDetailModal — no element (portal / childless fiber)', () => {
  it('falls back to the API section only, without crashing', async () => {
    getComponentInfo.mockResolvedValue(PORTED_INFO)
    render(<DevDetailModal name="Badge" element={null} onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    expect(document.querySelector('.devmode-detail__chain')).toBeNull()
    expect(screen.queryByText('This instance')).toBeNull()
    // The documented API table is still there.
    expect(screen.getByText('variant')).toBeTruthy()
    expect(screen.getByText('Color preset.')).toBeTruthy()
  })
})

// Modeled on the real Tab component/tab.demo.meta.ts divergence: React's
// onClick vs Angular's (clicked) — the exact case that motivated this task.
const TAB_BOTH_SIDES_INFO = {
  name: 'Tab',
  react: {
    tier: 'atom',
    version: '0.2.0',
    normalizing: false,
    props: [
      { name: 'label', type: 'string', desc: 'Tab label.' },
      { name: 'onClick', type: '() => void', desc: 'Click handler; consumers manage which tab is current.' },
    ],
  },
  angular: {
    selector: 'odyssey-tab',
    version: '0.2.0',
    normalizing: false,
    props: [
      { name: 'label', type: 'string', desc: 'Tab label.' },
      { name: '(clicked)', type: 'EventEmitter<MouseEvent>', desc: 'Click handler; consumers manage which tab is current.' },
    ],
  },
  ported: true,
}

const UNPORTED_WITH_REACT_INFO = {
  name: 'Cell',
  react: {
    tier: 'atom',
    version: '0.1.0',
    normalizing: false,
    props: [{ name: 'value', type: 'string', desc: 'Cell content.' }],
  },
  angular: null,
  ported: false,
}

const NO_REACT_NO_ANGULAR_PROPS_INFO = {
  name: 'Mystery',
  react: null,
  angular: { selector: 'odyssey-mystery', version: '0.1.0', normalizing: false, props: [] },
  ported: true,
}

function apiTableCaption() {
  return document.querySelector('.devmode-detail__caption')
}

function apiRowNames() {
  return Array.from(document.querySelectorAll('.devmode-detail__props tbody tr td:first-child')).map(
    (td) => td.textContent
  )
}

describe('DevDetailModal — per-framework API table', () => {
  it('framework=angular renders the ANGULAR prop rows ((clicked), not onClick)', async () => {
    setFramework('angular')
    getComponentInfo.mockResolvedValue(TAB_BOTH_SIDES_INFO)
    render(<DevDetailModal name="Tab" onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    expect(apiTableCaption().textContent).toBe('Angular API')
    const names = apiRowNames()
    expect(names).toContain('(clicked)')
    expect(names).not.toContain('onClick')
  })

  it('framework=react renders the REACT prop rows (onClick, not (clicked))', async () => {
    setFramework('react')
    getComponentInfo.mockResolvedValue(TAB_BOTH_SIDES_INFO)
    render(<DevDetailModal name="Tab" onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    expect(apiTableCaption().textContent).toBe('React API')
    const names = apiRowNames()
    expect(names).toContain('onClick')
    expect(names).not.toContain('(clicked)')
  })

  it('divergence line lists exactly the names unique to each side', async () => {
    setFramework('angular')
    getComponentInfo.mockResolvedValue(TAB_BOTH_SIDES_INFO)
    render(<DevDetailModal name="Tab" onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    const divergence = document.querySelector('.devmode-detail__divergence')
    expect(divergence.textContent).toBe('Only in React: onClick · Only in Angular: (clicked)')
  })

  it('omits the divergence line when both sides document the same prop names', async () => {
    setFramework('angular')
    getComponentInfo.mockResolvedValue({
      name: 'Badge',
      react: { tier: 'atom', version: '0.4.0', normalizing: false, props: [{ name: 'variant', type: 'string', desc: 'Color preset.' }] },
      angular: { selector: 'odyssey-badge', version: '0.4.0', normalizing: false, props: [{ name: 'variant', type: 'string', desc: 'Color preset.' }] },
      ported: true,
    })
    render(<DevDetailModal name="Badge" onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    expect(document.querySelector('.devmode-detail__divergence')).toBeNull()
  })

  it('an unported component falls back to React\'s table with a visible note', async () => {
    setFramework('angular')
    getComponentInfo.mockResolvedValue(UNPORTED_WITH_REACT_INFO)
    render(<DevDetailModal name="Cell" onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    expect(apiTableCaption().textContent).toBe('React API')
    expect(apiRowNames()).toContain('value')
    expect(document.querySelector('.devmode-detail__api-fallback')).toBeTruthy()
    expect(document.querySelector('.devmode-detail__divergence')).toBeNull()
  })

  it('a component with no React demo and no Angular props renders neither table, without crashing', async () => {
    setFramework('angular')
    getComponentInfo.mockResolvedValue(NO_REACT_NO_ANGULAR_PROPS_INFO)
    render(<DevDetailModal name="Mystery" onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    expect(document.querySelector('.devmode-detail__props')).toBeNull()
    expect(document.querySelector('.devmode-detail__api-fallback')).toBeNull()
    expect(document.querySelector('.devmode-detail__divergence')).toBeNull()
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
