// @vitest-environment jsdom
import { afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import TrailNav from './TrailNav.jsx'

afterEach(cleanup)

describe('TrailNav — showBell', () => {
  it('renders the bell by default, unchanged behavior', () => {
    render(<TrailNav mode="profile" name="Manuela" notificationCount={2} />)
    expect(screen.getByLabelText('Notifications')).toBeTruthy()
  })

  it('showBell={false} removes the whole bell button, not just the badge', () => {
    render(<TrailNav mode="profile" name="Manuela" notificationCount={2} showBell={false} />)
    expect(screen.queryByLabelText('Notifications')).toBeNull()
  })

  it('showNotification still controls only the badge when the bell is shown', () => {
    render(<TrailNav mode="profile" name="Manuela" notificationCount={2} showNotification={false} />)
    expect(screen.getByLabelText('Notifications')).toBeTruthy()
    expect(screen.queryByText('2')).toBeNull()
  })
})
