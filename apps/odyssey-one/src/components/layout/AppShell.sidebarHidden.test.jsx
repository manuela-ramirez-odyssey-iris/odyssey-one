// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppShell from './AppShell.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import TableControls from '../shipments/TableControls.jsx'
import ShipmentsPanelTabs from '../shipments/ShipmentsPanelTabs.jsx'

afterEach(cleanup)

function wrap(ui) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <CustomersProvider><EditModeProvider><CreateOrderModeProvider>{ui}</CreateOrderModeProvider></EditModeProvider></CustomersProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('consolidate-mode chrome switches', () => {
  test('AppShell sidebarHidden adds the slide class to the rail', () => {
    const { container, rerender } = wrap(<AppShell><div /></AppShell>)
    expect(container.querySelector('.sidebar--hidden')).toBeNull()
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <CustomersProvider><EditModeProvider><CreateOrderModeProvider><AppShell sidebarHidden><div /></AppShell></CreateOrderModeProvider></EditModeProvider></CustomersProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(container.querySelector('.sidebar.sidebar--hidden')).toBeTruthy()
  })

  test('TableControls hideExport removes the Export button', () => {
    const { rerender } = render(<TableControls itemCount={3} onExport={() => {}} />)
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy()
    rerender(<TableControls itemCount={3} onExport={() => {}} hideExport />)
    expect(screen.queryByRole('button', { name: /export/i })).toBeNull()
    expect(screen.getByText('3 items')).toBeTruthy()
  })

  test('ShipmentsPanelTabs hideViewToggle removes the pills/widgets toggle', () => {
    const props = { activePanel: 'exceptions', onPanelSelect: () => {}, activeTab: 'all', onTabSelect: () => {}, metrics: {}, visiblePanels: ['exceptions', 'monitoring', 'pgipgr'] }
    const { container, rerender } = render(<ShipmentsPanelTabs {...props} />)
    expect(container.querySelector('.button-toggle')).toBeTruthy()
    rerender(<ShipmentsPanelTabs {...props} hideViewToggle />)
    expect(container.querySelector('.button-toggle')).toBeNull()
  })
})
