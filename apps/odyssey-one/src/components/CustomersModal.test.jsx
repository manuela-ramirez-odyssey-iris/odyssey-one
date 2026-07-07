// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import { CustomersProvider, useCustomers } from '../contexts/CustomersContext.jsx'
import CustomersModal from './CustomersModal.jsx'

// Staged-selection rework regression guard:
//   1 — edits inside the popover are STAGED; the live context selection only
//       changes after Save → confirmation → Apply.
//   2 — Save is dirty-gated (set equality, not reference).
//   3 — the confirmation lists added/removed customers by name; Back returns
//       to the panel with the stage intact.
//   4 — Cancel / dismissal discards the stage (reopen shows the applied set).
//   5 — search MODE (results list open): header/footer swap (Add More
//       Customers + Back link, no Save/Cancel); selecting a result closes the
//       list AND defocuses the search bar (back to default mode).

// Probe mirrors how AppShell consumes the context: mounts the popover only
// while modalOpen, and exposes the LIVE applied selection for assertions.
function Probe() {
  const { modalOpen, openModal, selectedIds } = useCustomers()
  return (
    <>
      <button onClick={openModal}>open-picker</button>
      <div data-testid="applied">{[...selectedIds].sort().join(',')}</div>
      {modalOpen && <CustomersModal />}
    </>
  )
}

const DEFAULT_APPLIED = 'ERCO_SYS_01,GEON_01,KEMIRA_EU_01,KEMIRA_NA_01'

function setup() {
  const utils = render(
    <CustomersProvider>
      <Probe />
    </CustomersProvider>,
  )
  fireEvent.click(screen.getByText('open-picker'))
  return utils
}

const applied = () => screen.getByTestId('applied').textContent
const popover = () => screen.getByRole('dialog', { name: 'Customers' })
const saveBtn = () => within(popover()).getByRole('button', { name: 'Save' })
const searchInput = () => within(popover()).getByPlaceholderText('Search Customers')

// Focus the search input (opens the results dropdown) and click a result row.
function addFromSearch(label) {
  fireEvent.focus(searchInput())
  fireEvent.click(screen.getByText(label))
}

// Remove a customer from the staged selected-list via its row's trash button.
function removeFromList(label) {
  const row = screen.getByText(label).closest('.customer-row')
  fireEvent.click(within(row).getByRole('button', { name: 'Delete' }))
}

afterEach(cleanup)

describe('staged selection — edits do not touch the live context until confirmed', () => {
  test('adding a customer stages locally; applied selection is unchanged', () => {
    setup()
    expect(applied()).toBe(DEFAULT_APPLIED)

    addFromSearch('Valtris')
    // Staged list shows it…
    expect(within(popover()).getByText('Valtris')).toBeTruthy()
    // …but the LIVE selection (what scopes the tables) has not moved.
    expect(applied()).toBe(DEFAULT_APPLIED)
  })

  test('removing a customer stages locally; applied selection is unchanged', () => {
    setup()
    removeFromList('Kemira NA')
    expect(applied()).toBe(DEFAULT_APPLIED)
  })

  test('Cancel discards the stage — reopening shows the applied set again', () => {
    setup()
    addFromSearch('Valtris')
    removeFromList('Kemira NA')

    fireEvent.click(within(popover()).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'Add Customers' })).toBeNull()
    expect(applied()).toBe(DEFAULT_APPLIED)

    fireEvent.click(screen.getByText('open-picker'))
    expect(within(popover()).getByText('Kemira NA')).toBeTruthy()
    expect(within(popover()).queryByText('Valtris')).toBeNull()
  })

  test('Escape dismissal discards the stage', () => {
    setup()
    addFromSearch('Valtris')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Add Customers' })).toBeNull()
    expect(applied()).toBe(DEFAULT_APPLIED)
  })
})

describe('dirty-gated Save (set equality)', () => {
  test('Save is disabled while the staged set equals the applied set', () => {
    setup()
    expect(saveBtn().disabled).toBe(true)
  })

  test('Save arms on a staged change and disarms when the change is undone', () => {
    setup()
    removeFromList('Geon')
    expect(saveBtn().disabled).toBe(false)

    // Re-add the same customer → staged set is content-equal to applied again.
    addFromSearch('Geon')
    expect(saveBtn().disabled).toBe(true)
  })
})

describe('save confirmation', () => {
  test('lists added and removed customers by name', () => {
    setup()
    addFromSearch('Valtris')
    removeFromList('Kemira NA')
    fireEvent.click(saveBtn())

    const confirm = screen.getByRole('dialog', { name: 'Apply customer changes' })
    const adding = within(confirm).getByText('Adding').parentElement
    const removing = within(confirm).getByText('Removing').parentElement
    expect(within(adding).getByText('Valtris')).toBeTruthy()
    expect(within(removing).getByText('Kemira NA')).toBeTruthy()
    // Nothing applied yet.
    expect(applied()).toBe(DEFAULT_APPLIED)
  })

  test('add-only change shows Adding but no Removing group', () => {
    setup()
    addFromSearch('Valtris')
    fireEvent.click(saveBtn())

    const confirm = screen.getByRole('dialog', { name: 'Apply customer changes' })
    expect(within(confirm).getByText('Adding')).toBeTruthy()
    expect(within(confirm).queryByText('Removing')).toBeNull()
  })

  test('Back returns to the panel with the stage intact, nothing applied', () => {
    setup()
    addFromSearch('Valtris')
    fireEvent.click(saveBtn())
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Apply customer changes' }))
        .getByRole('button', { name: 'Back' }),
    )

    expect(screen.queryByRole('dialog', { name: 'Apply customer changes' })).toBeNull()
    // Panel still open, staged addition still there, Save still armed.
    expect(within(popover()).getByText('Valtris')).toBeTruthy()
    expect(saveBtn().disabled).toBe(false)
    expect(applied()).toBe(DEFAULT_APPLIED)
  })

  test('Apply commits the staged set to the context and closes both layers', () => {
    setup()
    addFromSearch('Valtris')
    removeFromList('Kemira NA')
    fireEvent.click(saveBtn())
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Apply customer changes' }))
        .getByRole('button', { name: 'Apply changes' }),
    )

    expect(screen.queryByRole('dialog', { name: 'Apply customer changes' })).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Add Customers' })).toBeNull()
    expect(applied()).toBe('ERCO_SYS_01,GEON_01,KEMIRA_EU_01,VALTRIS_01')
  })

  test('Escape while the confirmation is up closes ONLY the confirmation — the panel and stage survive', () => {
    setup()
    addFromSearch('Valtris')
    fireEvent.click(saveBtn())
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Apply customer changes' })).toBeNull()
    expect(within(popover()).getByText('Valtris')).toBeTruthy()
    expect(applied()).toBe(DEFAULT_APPLIED)
  })
})

describe('search mode (results list open)', () => {
  test('selecting a result closes the list, defocuses the search bar, and stages the customer', () => {
    setup()
    const input = searchInput()
    input.focus()
    fireEvent.focus(input)
    expect(screen.getByText('All Customers')).toBeTruthy() // results open

    const row = screen.getByText('Valtris').closest('.customer-row')
    fireEvent.click(row)
    expect(screen.queryByText('All Customers')).toBeNull() // closed on select
    expect(document.activeElement).not.toBe(input) // search bar defocused
    // Row moved from results into the staged list, wearing the just-added pulse.
    expect(within(popover()).getByText('Valtris').closest('.customers-row-pulse')).toBeTruthy()

    // Refocusing reopens the list for the next add.
    input.focus()
    fireEvent.focus(input)
    expect(screen.getByText('All Customers')).toBeTruthy()
  })

  test('search-field label, footer, and header back chevron swap with the mode', () => {
    setup()
    // Default mode: static title, "Search more customers" label, Cancel/Save
    // footer, no back chevron (ModalHeader back renders on onBack presence).
    expect(within(popover()).getByText('Customers')).toBeTruthy()
    expect(within(popover()).getByText('Search more customers')).toBeTruthy()
    expect(saveBtn()).toBeTruthy()
    expect(within(popover()).queryByRole('button', { name: 'Back' })).toBeNull()

    // Search mode: label swaps, footer disappears entirely, back chevron appears.
    fireEvent.focus(searchInput())
    expect(within(popover()).getByText('Customers')).toBeTruthy() // title static
    expect(within(popover()).getByText('Select new customers')).toBeTruthy()
    expect(within(popover()).queryByRole('button', { name: 'Save' })).toBeNull()
    expect(within(popover()).queryByRole('button', { name: 'Cancel' })).toBeNull()

    // Back chevron exits search mode — popover stays open, default footer returns.
    fireEvent.click(within(popover()).getByRole('button', { name: 'Back' }))
    expect(within(popover()).getByText('Search more customers')).toBeTruthy()
    expect(screen.queryByText('All Customers')).toBeNull()
    expect(saveBtn()).toBeTruthy()
    expect(within(popover()).queryByRole('button', { name: 'Back' })).toBeNull()
  })

  test('the header X closes the popover without applying the stage', () => {
    setup()
    addFromSearch('Valtris')
    fireEvent.click(within(popover()).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Customers' })).toBeNull()
    expect(applied()).toBe(DEFAULT_APPLIED) // stage discarded
  })
})
