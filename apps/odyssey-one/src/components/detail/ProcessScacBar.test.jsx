// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
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

function getButton() {
  return screen.getByRole('button', { name: /Process SCAC/ })
}

describe('ProcessScacBar (LINX-15075)', () => {
  it('starts with Equipment disabled and the button disabled', () => {
    render(<ProcessScacBar onProcess={() => {}} />)
    const { equipmentInput } = getCombos()
    expect(equipmentInput.disabled).toBe(true)
    expect(getButton().disabled).toBe(true)
  })

  it('enables Equipment once a SCAC is picked, and the button once both are set', () => {
    render(<ProcessScacBar onProcess={() => {}} />)
    const { scacInput } = getCombos()
    selectAt(scacInput, scacIndex('KNGT'))
    expect(getCombos().equipmentInput.disabled).toBe(false)
    expect(getButton().disabled).toBe(true) // equipment not picked yet

    selectAt(getCombos().equipmentInput, 0) // first of KNGT's (TL) equipment options
    expect(getButton().disabled).toBe(false)
  })

  it('never auto-selects Equipment, even when exactly one option would resolve', () => {
    // equipmentForScac always resolves >1 entry for every seeded mode (TL: 5,
    // LTL: 3) — there is no length-based branch in this component that could
    // behave differently for a hypothetical single-option list, so exercising
    // it against the real (multi-option) catalog exercises the same code path.
    render(<ProcessScacBar onProcess={() => {}} />)
    const { scacInput } = getCombos()
    expect(equipmentForScac('KNGT').length).toBeGreaterThan(1)
    selectAt(scacInput, scacIndex('KNGT'))
    // No equipment interaction at all — button must still be disabled.
    expect(getButton().disabled).toBe(true)
    expect(getCombos().equipmentInput.value).toBe('')
  })

  it('WERN resolves to an empty equipment list, no validation message, button stays disabled', () => {
    render(<ProcessScacBar onProcess={() => {}} />)
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
    expect(getButton().disabled).toBe(true)
  })

  it('resets Equipment when the SCAC selection changes', () => {
    render(<ProcessScacBar onProcess={() => {}} />)
    const { scacInput } = getCombos()
    selectAt(scacInput, scacIndex('KNGT'))
    selectAt(getCombos().equipmentInput, 0)
    expect(getButton().disabled).toBe(false)

    // Switch to a different SCAC — Equipment must clear and the button must
    // re-lock, even though the new SCAC also resolves TL equipment. Blur first:
    // ComboBox only resyncs its displayed text from an external `value` change
    // while unfocused (mid-typing edits must not be clobbered), and jsdom's
    // fireEvent.focus on a sibling field doesn't auto-blur this one the way a
    // real click would.
    fireEvent.blur(getCombos().equipmentInput)
    selectAt(getCombos().scacInput, scacIndex('SCNN'))
    expect(getCombos().equipmentInput.value).toBe('')
    expect(getButton().disabled).toBe(true)
  })

  it('reports {scac, carrierName, equipment} on click, matching droppedCarrierToOption\'s field names', () => {
    const onProcess = vi.fn()
    render(<ProcessScacBar onProcess={onProcess} />)
    const { scacInput } = getCombos()
    selectAt(scacInput, scacIndex('KNGT'))
    selectAt(getCombos().equipmentInput, 0)
    fireEvent.click(getButton())
    expect(onProcess).toHaveBeenCalledTimes(1)
    const carrier = onProcess.mock.calls[0][0]
    expect(carrier.scac).toBe('KNGT')
    expect(carrier.carrierName).toBe(carrierName('KNGT'))
    expect(carrier.equipment).toBe(equipmentForScac('KNGT')[0])
  })

  it('disables the button while a process is in flight, whichever SCAC is locked', () => {
    render(<ProcessScacBar onProcess={() => {}} processingScac="RLCA" />)
    const { scacInput } = getCombos()
    selectAt(scacInput, scacIndex('KNGT'))
    selectAt(getCombos().equipmentInput, 0)
    // Both fields ARE set, but the shared lock still wins.
    expect(getButton().disabled).toBe(true)
  })
})
