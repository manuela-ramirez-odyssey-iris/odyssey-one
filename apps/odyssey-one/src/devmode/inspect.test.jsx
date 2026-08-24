// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Star } from 'lucide-react'
import { cloneElement } from 'react'
import { Badge, Button, ComboBox, FormField, PageHeader } from '@odyssey/ui'
import { describeChain, findUiComponent, findUiComponentChain, isUiComponentName, uiNameSet } from './inspect.js'

afterEach(cleanup)

// App-local (non-ui) component — used to prove the walk skips over
// non-@odyssey/ui fibers to reach the enclosing real one.
function LocalWrapper({ children }) {
  return <div className="local-wrapper">{children}</div>
}

describe('isUiComponentName', () => {
  it('recognizes a real @odyssey/ui export', () => {
    expect(isUiComponentName('Badge')).toBe(true)
  })

  it('rejects a name that is not an @odyssey/ui export', () => {
    expect(isUiComponentName('LocalWrapper')).toBe(false)
  })

  // packages/ui/src/index.js exports ComboBox.jsx's default under two names
  // (`ComboBox` first, `SearchField` second — commented "former name, prefer
  // ComboBox"). uiTypeToName must be first-wins so the canonical name survives
  // the alias, not last-wins (which would collapse it to the deprecated name).
  it('resolves the canonical name for an aliased export, not the deprecated alias', () => {
    expect(isUiComponentName('ComboBox')).toBe(true)
    expect(isUiComponentName('SearchField')).toBe(false)
    expect(uiNameSet.has('SearchField')).toBe(false)
  })
})

describe('findUiComponent', () => {
  it('resolves a DOM node inside a real Badge to { name: "Badge", element: <root> }', () => {
    const { container } = render(
      <Badge variant="blue" leftIcon={<Star size={8} />}>Hi</Badge>
    )
    const svg = container.querySelector('svg')
    const result = findUiComponent(svg)
    expect(result).not.toBeNull()
    expect(result.name).toBe('Badge')
    expect(result.element).toBe(container.firstChild)
  })

  it('picks the OUTERMOST ui component when one wraps another (FormField > FieldSelect)', () => {
    const { container } = render(
      <FormField
        label="Currency"
        value=""
        onChange={() => {}}
        trailingSelect={{ label: 'USD', onClick: () => {} }}
      />
    )
    const trailingButton = screen.getByRole('button', { name: 'USD' })
    const result = findUiComponent(trailingButton)
    expect(result).not.toBeNull()
    expect(result.name).toBe('FormField')
    expect(result.element).toBe(container.firstChild)
  })

  it('returns null for a plain div outside any ui component', () => {
    render(<div data-testid="plain">hi</div>)
    const plain = screen.getByTestId('plain')
    expect(findUiComponent(plain)).toBeNull()
  })

  it('resolves through an app-local component nested inside a ui component', () => {
    const { container } = render(
      <Badge variant="blue">
        <LocalWrapper>
          <span data-testid="inner">Hi</span>
        </LocalWrapper>
      </Badge>
    )
    const inner = screen.getByTestId('inner')
    const result = findUiComponent(inner)
    expect(result).not.toBeNull()
    expect(result.name).toBe('Badge')
    expect(result.element).toBe(container.firstChild)
  })

  it('resolves a rendered ComboBox as "ComboBox", not its deprecated alias "SearchField"', () => {
    const { container } = render(<ComboBox placeholder="Search" />)
    const input = container.querySelector('input')
    const result = findUiComponent(input)
    expect(result).not.toBeNull()
    expect(result.name).toBe('ComboBox')
  })

  it('does NOT match an app-local component that merely shares a name with a real ui export (identity, not name string)', () => {
    // Minified prod bundles strip function names, so matching must key off
    // the actual exported component reference — not `type.name`/displayName
    // string equality, which a same-named local component could spoof.
    function Badge() {
      return <div data-testid="fake-badge">Not the real thing</div>
    }
    render(<Badge />)
    const fake = screen.getByTestId('fake-badge')
    expect(findUiComponent(fake)).toBeNull()
  })
})

describe('findUiComponentChain', () => {
  // FormField renders a real FieldSelect for `trailingSelect` (both are
  // @odyssey/ui exports) — a genuine nested pair, not a test-only fixture.
  it('returns the enclosing ui components OUTERMOST → INNERMOST', () => {
    const { container } = render(
      <FormField
        label="Currency"
        value=""
        onChange={() => {}}
        trailingSelect={{ label: 'USD', onClick: () => {} }}
      />
    )
    const trailingButton = screen.getByRole('button', { name: 'USD' })
    const chain = findUiComponentChain(trailingButton)

    expect(chain.map((c) => c.name)).toEqual(['FormField', 'FieldSelect'])
    expect(chain[0].element).toBe(container.firstChild)
    // The inner entry's host element is FieldSelect's own root, not the
    // FormField wrapper.
    expect(chain[1].element).not.toBe(chain[0].element)
    expect(chain[1].element.contains(trailingButton)).toBe(true)
  })

  it('returns a single-entry chain for an unnested component, and [] for a plain div', () => {
    render(
      <>
        <Badge variant="blue">
          <span data-testid="inner">Hi</span>
        </Badge>
        <div data-testid="plain">hi</div>
      </>
    )
    expect(findUiComponentChain(screen.getByTestId('inner')).map((c) => c.name)).toEqual(['Badge'])
    expect(findUiComponentChain(screen.getByTestId('plain'))).toEqual([])
  })

  it('findUiComponent stays the chain HEAD (outermost)', () => {
    render(
      <FormField
        label="Currency"
        value=""
        onChange={() => {}}
        trailingSelect={{ label: 'USD', onClick: () => {} }}
      />
    )
    const trailingButton = screen.getByRole('button', { name: 'USD' })
    expect(findUiComponent(trailingButton).name).toBe('FormField')
  })
})

// Relation detection runs on props IDENTITY (an element passed into a parent
// shows up in that parent's memoizedProps, and the fiber built from it keeps
// the same `props` object) — not on `_debugOwner`, which only exists in dev
// builds. Every fixture below is a real @odyssey/ui pair, so these assertions
// double as the empirical check that the production-safe signal holds.
describe('describeChain — slot vs internal', () => {
  it('labels a component the parent renders ITSELF as "internal" (FormField → FieldSelect)', () => {
    render(
      <FormField
        label="Currency"
        value=""
        onChange={() => {}}
        trailingSelect={{ label: 'USD', onClick: () => {} }}
      />
    )
    const chain = describeChain(screen.getByRole('button', { name: 'USD' }))

    expect(chain.map((c) => [c.name, c.relation])).toEqual([
      ['FormField', null],
      ['FieldSelect', 'internal'],
    ])
  })

  it('labels a component passed in as `children` as "slot" (Button inside PageHeader)', () => {
    render(
      <PageHeader title="Shipments">
        <Button>Create</Button>
      </PageHeader>
    )
    const chain = describeChain(screen.getByRole('button', { name: 'Create' }))

    expect(chain.map((c) => [c.name, c.relation])).toEqual([
      ['PageHeader', null],
      ['Button', 'slot'],
    ])
  })

  it('finds the match DEEPER inside a slot-passed subtree (Button wrapped in a plain div)', () => {
    render(
      <PageHeader title="Shipments">
        <div className="actions">
          <Button>Create</Button>
        </div>
      </PageHeader>
    )
    const chain = describeChain(screen.getByRole('button', { name: 'Create' }))
    expect(chain.map((c) => c.relation)).toEqual([null, 'slot'])
  })

  it('mixes both in one chain: slot-passed FormField that internally renders FieldSelect', () => {
    render(
      <PageHeader title="Shipments">
        <FormField label="Currency" value="" onChange={() => {}} trailingSelect={{ label: 'EUR', onClick: () => {} }} />
      </PageHeader>
    )
    const chain = describeChain(screen.getByRole('button', { name: 'EUR' }))

    expect(chain.map((c) => [c.name, c.relation])).toEqual([
      ['PageHeader', null],
      ['FormField', 'slot'],
      ['FieldSelect', 'internal'],
    ])
  })

  it('falls back to "unknown" when cloneElement breaks props identity but the type still matches', () => {
    function Cloner({ children }) {
      return <div>{cloneElement(children, { 'data-cloned': 'yes' })}</div>
    }
    render(
      <PageHeader title="Shipments">
        <Cloner>
          <Button>Create</Button>
        </Cloner>
      </PageHeader>
    )
    const chain = describeChain(screen.getByRole('button', { name: 'Create' }))
    expect(chain.map((c) => c.relation)).toEqual([null, 'unknown'])
  })

  it('exposes the live resolved props of each entry and returns [] for a plain div', () => {
    render(
      <>
        <Badge variant="blue">Hi</Badge>
        <div data-testid="plain">hi</div>
      </>
    )
    const [entry] = describeChain(screen.getByText('Hi'))
    expect(entry.props.variant).toBe('blue')
    expect(describeChain(screen.getByTestId('plain'))).toEqual([])
  })
})
