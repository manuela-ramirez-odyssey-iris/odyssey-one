// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import ProcessScacBar from './ProcessScacBar.jsx'
import { TENDER_SCAC_OPTIONS, equipmentForScac } from '../../data/master-data.js'

beforeAll(() => {
  // jsdom has no scrollIntoView; GlobalSearch's highlight-scroll calls it
  // optional-chained, but stub it anyway (same convention ComboBox's own
  // typeahead tests use).
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(cleanup)

// Real catalog data, not invented — picked for known equipment-count shape:
//   KNGT (TL)  → 5 equipment options
//   SCNN (TL)  → 5 equipment options (a second TL carrier for the reset test)
//   WERN (TL)  → 0 (PS2 — the one seeded no-equipment SCAC)
const scacIndex = (code) => TENDER_SCAC_OPTIONS.findIndex((c) => c.scac === code)
const carrierName = (code) => TENDER_SCAC_OPTIONS.find((c) => c.scac === code).name

// Selects the option at `index` in whichever ComboBox owns `input`/`wrapper`:
// focus opens the popover on the full unfiltered list, ArrowDown walks the
// in-memory `matches` array (keyboard selection isn't blocked by jsdom's lack
// of virtualization — FieldSearchResults' rows are what's invisible, not the
// index the keyboard walks), Enter commits.
function selectAt(input, index) {
  fireEvent.focus(input)
  const wrapper = input.closest('.combo-box')
  for (let i = 0; i <= index; i++) fireEvent.keyDown(wrapper, { key: 'ArrowDown' })
  fireEvent.keyDown(wrapper, { key: 'Enter' })
}

function getCombos() {
  const [scacInput, equipmentInput] = screen.getAllByRole('combobox')
  return { scacInput, equipmentInput }
}

// S140 — ONE persistent toggle: the same button reads "Add Carrier" collapsed
// and "Cancel" expanded. Keep the queries distinct so a rename of one can't
// silently start matching the other.
function getToggleButton() {
  return screen.getByRole('button', { name: 'Add Carrier' })
}

// The confirm button inside the expanded fields — "Add", primary variant
// (S140; was "Process"). Once SCAC + Equipment are already visible as picked
// fields in this row, the button only has to name the outcome.
function getConfirmButton() {
  return screen.getByRole('button', { name: 'Add' })
}

function expand() {
  fireEvent.click(getToggleButton())
}

// Collapsing is animated, so the real unmount is keyed off the LAST control's
// animationend (the divider, first child of the controls wrapper — it leaves
// last under the reversed exit stagger). jsdom runs no animations and fires no
// animationend, so the bar would sit in its collapsing state forever.
function finishExitAnimation() {
  const controls = document.querySelector('.process-scac-bar__controls--collapsing')
  if (controls) fireEvent.animationEnd(controls.firstChild)
}

describe('ProcessScacBar (LINX-15075) — collapse/expand', () => {
  it('starts collapsed, showing only the Add Carrier button', () => {
    render(<ProcessScacBar onProcess={() => {}} />)
    expect(getToggleButton()).toBeTruthy()
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
  })

  it('the toggle is the SAME element before and after expanding, only its label flips', () => {
    render(<ProcessScacBar onProcess={() => {}} />)
    const el = getToggleButton()
    fireEvent.click(el)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBe(el)
  })

  it('clicking the button reveals both fields and Cancel', () => {
    render(<ProcessScacBar onProcess={() => {}} />)
    expand()
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })

  it('Cancel collapses and clears both selections', () => {
    render(<ProcessScacBar onProcess={() => {}} />)
    expand()
    selectAt(getCombos().scacInput, scacIndex('KNGT'))
    selectAt(getCombos().equipmentInput, 0)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    // Still on screen mid-exit — that is the point of the collapsing state.
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
    finishExitAnimation()

    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()

    // Re-expanding proves the selections did not survive.
    expand()
    expect(getCombos().scacInput.value).toBe('')
    expect(getCombos().equipmentInput.disabled).toBe(true)
  })

  it('collapses immediately under prefers-reduced-motion, with no animationend to wait for', () => {
    // Load-bearing, not a nicety: reduced motion sets `animation: none`, so no
    // animationend ever fires. Without the JS check reading the same query,
    // the row would stay open permanently for these users — the exit animation
    // would make the picker impossible to close.
    const original = window.matchMedia
    window.matchMedia = (q) => ({ matches: q.includes('prefers-reduced-motion'), media: q, addEventListener() {}, removeEventListener() {} })
    try {
      render(<ProcessScacBar onProcess={() => {}} />)
      expand()
      expect(screen.getAllByRole('combobox')).toHaveLength(2)

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      // Gone on the same commit — no collapsing state, nothing to drive.
      expect(document.querySelector('.process-scac-bar__controls--collapsing')).toBeNull()
      expect(screen.queryAllByRole('combobox')).toHaveLength(0)
      expect(getToggleButton()).toBeTruthy()
    } finally {
      window.matchMedia = original
    }
  })

  it('a successful process collapses the bar back to the button', async () => {
    const onProcess = vi.fn().mockResolvedValue(true)
    render(<ProcessScacBar onProcess={onProcess} />)
    expand()
    selectAt(getCombos().scacInput, scacIndex('KNGT'))
    selectAt(getCombos().equipmentInput, 0)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    })

    expect(onProcess).toHaveBeenCalledTimes(1)
    finishExitAnimation()
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
  })

  it('a failed/duplicate process keeps the bar expanded with selections intact', async () => {
    const onProcess = vi.fn().mockResolvedValue(false)
    render(<ProcessScacBar onProcess={onProcess} />)
    expand()
    selectAt(getCombos().scacInput, scacIndex('KNGT'))
    selectAt(getCombos().equipmentInput, 0)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    })

    expect(onProcess).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
    const { scacInput, equipmentInput } = getCombos()
    expect(scacInput.value).toContain('KNGT')
    expect(equipmentInput.value).not.toBe('')
  })
})

describe('ProcessScacBar (LINX-15075) — expanded field behaviour', () => {
  it('starts with Equipment disabled and the button disabled', () => {
    render(<ProcessScacBar onProcess={() => {}} />)
    expand()
    const { equipmentInput } = getCombos()
    expect(equipmentInput.disabled).toBe(true)
    expect(getConfirmButton().disabled).toBe(true)
  })

  it('enables Equipment once a SCAC is picked, and the button once both are set', () => {
    render(<ProcessScacBar onProcess={() => {}} />)
    expand()
    const { scacInput } = getCombos()
    selectAt(scacInput, scacIndex('KNGT'))
    expect(getCombos().equipmentInput.disabled).toBe(false)
    expect(getConfirmButton().disabled).toBe(true) // equipment not picked yet

    selectAt(getCombos().equipmentInput, 0) // first of KNGT's (TL) equipment options
    expect(getConfirmButton().disabled).toBe(false)
  })

  it('never auto-selects Equipment, even when exactly one option would resolve', () => {
    // equipmentForScac always resolves >1 entry for every seeded mode (TL: 5,
    // LTL: 3) — there is no length-based branch in this component that could
    // behave differently for a hypothetical single-option list, so exercising
    // it against the real (multi-option) catalog exercises the same code path.
    render(<ProcessScacBar onProcess={() => {}} />)
    expand()
    const { scacInput } = getCombos()
    expect(equipmentForScac('KNGT').length).toBeGreaterThan(1)
    selectAt(scacInput, scacIndex('KNGT'))
    // No equipment interaction at all — button must still be disabled.
    expect(getConfirmButton().disabled).toBe(true)
    expect(getCombos().equipmentInput.value).toBe('')
  })

  it('WERN resolves to an empty equipment list, no validation message, button stays disabled', () => {
    render(<ProcessScacBar onProcess={() => {}} />)
    expand()
    expect(equipmentForScac('WERN')).toEqual([])
    const { scacInput } = getCombos()
    selectAt(scacInput, scacIndex('WERN'))
    const { equipmentInput } = getCombos()
    expect(equipmentInput.disabled).toBe(false) // a SCAC IS chosen
    fireEvent.focus(equipmentInput)
    // The panel's own neutral copy, not an error/validation surface — no
    // role="alert" anywhere in the bar.
    expect(screen.getByText('No equipment options')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(getConfirmButton().disabled).toBe(true)
  })

  it('resets Equipment when the SCAC selection changes', () => {
    render(<ProcessScacBar onProcess={() => {}} />)
    expand()
    const { scacInput } = getCombos()
    selectAt(scacInput, scacIndex('KNGT'))
    selectAt(getCombos().equipmentInput, 0)
    expect(getConfirmButton().disabled).toBe(false)

    // Switch to a different SCAC — Equipment must clear and the button must
    // re-lock, even though the new SCAC also resolves TL equipment. Blur first:
    // ComboBox only resyncs its displayed text from an external `value` change
    // while unfocused (mid-typing edits must not be clobbered), and jsdom's
    // fireEvent.focus on a sibling field doesn't auto-blur this one the way a
    // real click would.
    fireEvent.blur(getCombos().equipmentInput)
    selectAt(getCombos().scacInput, scacIndex('SCNN'))
    expect(getCombos().equipmentInput.value).toBe('')
    expect(getConfirmButton().disabled).toBe(true)
  })

  it('reports {scac, carrierName, equipment} on click, matching droppedCarrierToOption\'s field names', () => {
    const onProcess = vi.fn().mockResolvedValue(true)
    render(<ProcessScacBar onProcess={onProcess} />)
    expand()
    const { scacInput } = getCombos()
    selectAt(scacInput, scacIndex('KNGT'))
    selectAt(getCombos().equipmentInput, 0)
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onProcess).toHaveBeenCalledTimes(1)
    const carrier = onProcess.mock.calls[0][0]
    expect(carrier.scac).toBe('KNGT')
    expect(carrier.carrierName).toBe(carrierName('KNGT'))
    expect(carrier.equipment).toBe(equipmentForScac('KNGT')[0])
  })

  it('excludeScacs removes those SCACs from the option list entirely', () => {
    render(<ProcessScacBar onProcess={() => {}} excludeScacs={['ODFL']} />)
    expand()
    // The option ROWS are virtualized, so jsdom can't read them (see
    // project_jsdom_test_ceilings) — filter instead: an excluded SCAC has no
    // match left at all, while a kept one still does.
    const input = getCombos().scacInput
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'ODFL' } })
    expect(screen.getByText('No matching SCACs')).toBeTruthy()
    fireEvent.change(input, { target: { value: 'KNGT' } })
    expect(screen.queryByText('No matching SCACs')).toBeNull()
  })

  it('disables the button while a process is in flight, whichever SCAC is locked', () => {
    render(<ProcessScacBar onProcess={() => {}} processingScac="RLCA" />)
    expand()
    const { scacInput } = getCombos()
    selectAt(scacInput, scacIndex('KNGT'))
    selectAt(getCombos().equipmentInput, 0)
    // Both fields ARE set, but the shared lock still wins.
    expect(getConfirmButton().disabled).toBe(true)
  })
})
