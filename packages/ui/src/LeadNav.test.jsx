// @vitest-environment jsdom
import { afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import LeadNav from './LeadNav.jsx'

afterEach(cleanup)

describe('LeadNav — showMenu', () => {
  it('renders the hamburger by default, unchanged behavior', () => {
    render(<LeadNav onMenuClick={() => {}} />)
    expect(screen.getByLabelText('Open menu')).toBeTruthy()
  })

  it('showMenu={false} removes the hamburger from the tree entirely (not just hidden)', () => {
    render(<LeadNav showMenu={false} />)
    expect(screen.queryByLabelText('Open menu')).toBeNull()
  })
})
