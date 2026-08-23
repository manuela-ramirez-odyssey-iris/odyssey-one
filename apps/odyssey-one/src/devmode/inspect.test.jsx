// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Star } from 'lucide-react'
import { Badge, FormField } from '@odyssey/ui'
import { findUiComponent, isUiComponentName } from './inspect.js'

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
