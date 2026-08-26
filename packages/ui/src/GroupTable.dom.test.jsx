// @vitest-environment jsdom
// GroupTable rendering tests. The pure helpers live in GroupTable.test.jsx
// (node env); anything that needs a DOM belongs here.
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import GroupTable from './GroupTable.jsx'

const FILLER = '.odyssey-group-table__detail-filler'

afterEach(cleanup)

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'rank', label: 'Rank' },
  { key: 'status', label: 'Status' },
]
const DETAIL_COLUMNS = [
  { key: 'method', label: 'Method' },
  { key: 'user', label: 'User' },
]
const GROUPS = [{
  id: 'g1',
  label: 'ALPHA',
  values: { name: 'ALPHA', rank: '4', status: 'Accepted' },
  detailRows: [{ method: 'Automatic Update', user: 'Moses Johnson' }],
  action: <button type="button">act</button>,
}]

const STICKY = '.odyssey-group-table__cell--sticky-right'

describe('GroupTable — the nested band spans the full width', () => {
  it('spans the action lane too, so the nested table gets the whole width', () => {
    // RULED 2026-08-17 (user): "nested table is separate, doesn't need to follow
    // the boundaries of its parent." The nested table is an INDEPENDENT table
    // that happens to render inside a row, so it takes the action lane's width
    // as well rather than leaving ~158px of dead band under every expanded row.
    //
    // This reverses the earlier narrowing, which reserved the lane so the pinned
    // column stayed opaque top to bottom. Known, accepted trade: on a
    // horizontally scrolled table the pinned action column now has a gap at each
    // expanded row. Reserving the lane again is a one-line revert.
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS}
                  stickyActions defaultExpanded />
    )
    const detailRow = container.querySelector('.odyssey-group-table__detail-row')
    expect(detailRow, 'the nested detail row should render when expanded').toBeTruthy()

    const host = detailRow.querySelector('td[colspan]')
    expect(Number(host.getAttribute('colspan')),
      'host cell must span the action column too').toBe(COLUMNS.length + 1)

    // ...and it is the ONLY cell on the row — no reserved trailing lane.
    expect(detailRow.children.length,
      'the detail row is one full-width cell, nothing beside it').toBe(1)

    // the INNER table must STILL never grow an action cell of its own: it takes
    // the width, not the outer table's column structure.
    expect(container.querySelectorAll(`.odyssey-group-table__detail ${STICKY}`).length,
      'the inner table is independent — it gets no action column').toBe(0)
  })

  it('every outer row EXCEPT the nested band still has its pinned slot', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS}
                  stickyActions defaultExpanded
                  footerRow={{ name: 'TOTAL' }}
                  actionsHeader={<button type="button">cols</button>} />
    )
    // header, group row, detail row, footer — the outer table's own rows only
    const outer = container.querySelector('.odyssey-group-table__table')
    const outerRows = [...outer.children].flatMap(sec => [...sec.children])
    for (const row of outerRows) {
      // The detail row is the deliberate exception — it spans the lane instead
      // of reserving it. Every other row must still pin, or the column really
      // would read as one that scrolls away.
      if (row.classList.contains('odyssey-group-table__detail-row')) {
        expect(row.querySelector(STICKY),
          'the nested band spans the lane, it does not reserve it').toBeNull()
        continue
      }
      expect(row.querySelector(STICKY), `row "${row.textContent.slice(0, 30)}" has no pinned cell`).toBeTruthy()
    }
  })

  it('spans the full width again when stickyActions is off', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS} defaultExpanded />
    )
    const host = container.querySelector('.odyssey-group-table__detail-row td[colspan]')
    expect(Number(host.getAttribute('colspan'))).toBe(COLUMNS.length)
    expect(container.querySelector(STICKY)).toBeNull()
  })

  it('still renders the action node itself on the group row', () => {
    render(<GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS} stickyActions />)
    expect(screen.getByRole('button', { name: 'act' })).toBeTruthy()
  })
})

describe('GroupTable detailNote', () => {
  const withNote = (detailNote) => [{ ...GROUPS[0], detailNote }]

  it('renders { label, value } WITHOUT the consumer touching internal class names', () => {
    // The point of the object shape (user, 2026-08-17): a downstream team gets the
    // standard label treatment from props alone, not by hand-writing our internals.
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} defaultExpanded
        groups={withNote({ label: 'Reason Description', value: 'Prohibited for this lane.' })} />
    )
    const note = container.querySelector('.odyssey-group-table__detail-note > td')
    expect(note.querySelector('.odyssey-group-table__detail-note-label').textContent)
      .toBe('Reason Description:')   // the component owns the separator
    expect(note.textContent).toContain('Prohibited for this lane.')
    expect(Number(note.getAttribute('colspan'))).toBe(DETAIL_COLUMNS.length + 1) // + filler
  })

  it('still takes a bare node, for what a label/value pair cannot say', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} defaultExpanded
        groups={withNote(<em>free form</em>)} />
    )
    expect(container.querySelector('.odyssey-group-table__detail-note em').textContent)
      .toBe('free form')
  })

  it('renders no note row at all when a group has none', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS} defaultExpanded />
    )
    expect(container.querySelector('.odyssey-group-table__detail-note')).toBeNull()
  })
})

describe('GroupTable — detail scroller isolation + detailScroll', () => {
  it('the band scroller exists ONLY with detailScroll — off is the original behavior', () => {
    // Off: the nested table fills the band and rides the outer scroll exactly
    // as before (user, 2026-08-17). On: the wrapper becomes the band's own
    // scroller and the inner table takes its natural width.
    const off = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS} defaultExpanded />
    )
    expect(off.container.querySelector('.odyssey-group-table__detail-scroller')).toBeNull()

    const on = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS}
                  detailScroll defaultExpanded />
    )
    const scroller = on.container.querySelector('.odyssey-group-table__detail-scroller')
    expect(scroller).toBeTruthy()
    expect(scroller.querySelector('.odyssey-group-table__detail')).toBeTruthy()
  })

  it('routes the legacy detailScroll through the same per-section mechanism', () => {
    // One mechanism, not two: the single `detailColumns` section takes `scroll`
    // straight from `detailScroll`, so the width rule is keyed on the section for
    // both paths and the old root-scoped rule is gone.
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS}
                  detailScroll defaultExpanded />
    )
    const band = container.querySelector('.odyssey-group-table__detail-section')
    expect(band.classList.contains('odyssey-group-table__detail-section--scroll')).toBe(true)

    const off = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS} defaultExpanded />
    )
    expect(off.container.querySelector('.odyssey-group-table__detail-section--scroll')).toBeNull()
  })

  it('flags the root for sections too — the hook is per TABLE, not per flavor', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} groups={GROUPS} detailScroll defaultExpanded
        detailSections={[{ key: 'a', columns: DETAIL_COLUMNS }, { key: 'b', columns: [{ key: 'user', label: 'User' }] }]} />
    )
    expect(container.querySelector('.odyssey-group-table--detail-scroll')).toBeTruthy()
  })

  it('detailScroll flags the root; nested flavor only', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS}
                  detailScroll defaultExpanded />
    )
    expect(container.querySelector('.odyssey-group-table--detail-scroll')).toBeTruthy()
    // rows flavor ignores it — there is no nested table to scroll
    const rows = render(
      <GroupTable columns={COLUMNS} groups={[{ id: 'r', label: 'R', rows: [{ name: 'x' }] }]}
                  detailScroll defaultExpanded />
    )
    expect(rows.container.querySelector('.odyssey-group-table--detail-scroll')).toBeNull()
  })
})

describe('GroupTable detailSections — N independent sibling tables', () => {
  const ROUTING = [{ key: 'method', label: 'Method' }, { key: 'user', label: 'User' }]
  const COMMITMENT = [{ key: 'uom', label: 'UoM' }, { key: 'open', label: 'Open' }, { key: 'cvc', label: 'CVC ID' }]
  const SECTIONS = [
    { key: 'routing', columns: ROUTING, note: true },
    { key: 'commitment', columns: COMMITMENT },
  ]
  const ROW = { method: 'Automatic Update', user: 'Moses Johnson', uom: 'Loads/Week', open: '14', cvc: 'CVC90831' }
  const GROUP = [{ ...GROUPS[0], detailRows: [ROW] }]

  const sectionsOf = (c) => [...c.querySelectorAll('.odyssey-group-table__detail-section')]

  it('renders one table per section, each with its OWN columns', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailSections={SECTIONS} groups={GROUP} defaultExpanded />
    )
    const bands = sectionsOf(container)
    expect(bands).toHaveLength(2)
    // ...minus the trailing filler, which is spacing, not a column.
    const headersOf = (b) => [...b.querySelectorAll(`th:not(${FILLER})`)].map((th) => th.textContent)
    expect(headersOf(bands[0])).toEqual(['Method', 'User'])
    expect(headersOf(bands[1])).toEqual(['UoM', 'Open', 'CVC ID'])
    // Same rows, different column sets — a section is a view over the group's
    // detailRows, not its own data.
    expect(bands[0].textContent).toContain('Automatic Update')
    expect(bands[1].textContent).toContain('Loads/Week')
  })

  it('scales past two — the count is the consumer\'s', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      key: `s${i}`, columns: [{ key: 'method', label: `Group ${i}` }],
    }))
    const { container } = render(
      <GroupTable columns={COLUMNS} detailSections={many} groups={GROUP} defaultExpanded />
    )
    expect(sectionsOf(container)).toHaveLength(5)
  })

  it('follows detailScroll like the single-table flavor — same prop, same default', () => {
    // ONE prop, off unless asked for, identical in both flavors (user,
    // 2026-08-26: "detail scroll like we have for the non sibling version").
    const off = render(
      <GroupTable columns={COLUMNS} detailSections={SECTIONS} groups={GROUP} defaultExpanded />
    )
    for (const band of sectionsOf(off.container)) {
      expect(band.classList.contains('odyssey-group-table__detail-scroller')).toBe(false)
      expect(band.classList.contains('odyssey-group-table__detail-section--scroll')).toBe(false)
    }

    const on = render(
      <GroupTable columns={COLUMNS} detailSections={SECTIONS} groups={GROUP} detailScroll defaultExpanded />
    )
    for (const band of sectionsOf(on.container)) {
      // BOTH halves: the wrapper that scrolls, AND the modifier that lets the
      // inner table reach its natural width. With only the wrapper the table
      // compresses to the band and there is nothing to scroll — which is exactly
      // how sections first shipped (user, 2026-08-26).
      expect(band.classList.contains('odyssey-group-table__detail-scroller')).toBe(true)
      expect(band.classList.contains('odyssey-group-table__detail-section--scroll')).toBe(true)
    }
  })

  it('scrolls each sibling in its OWN band, not one shared scroller', () => {
    // The whole point of keying it on the section: a wide sibling overflowing
    // must not drag a narrow neighbour. Two bands, two scrollers.
    const { container } = render(
      <GroupTable columns={COLUMNS} detailSections={SECTIONS} groups={GROUP} detailScroll defaultExpanded />
    )
    expect(container.querySelectorAll('.odyssey-group-table__detail-scroller')).toHaveLength(2)
  })

  it('honours a per-section scroll override — one sibling scrolls, the other does not', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} groups={GROUP} defaultExpanded detailScroll
        detailSections={[{ key: 'a', columns: ROUTING, scroll: false }, { key: 'b', columns: COMMITMENT }]} />
    )
    const bands = sectionsOf(container)
    for (const cls of ['odyssey-group-table__detail-scroller', 'odyssey-group-table__detail-section--scroll']) {
      expect(bands[0].classList.contains(cls)).toBe(false)
      expect(bands[1].classList.contains(cls)).toBe(true)
    }
  })

  it('puts the note in the section that claims it, spanning THAT section\'s columns', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailSections={SECTIONS} defaultExpanded
        groups={[{ ...GROUP[0], detailNote: { label: 'Reason Description', value: 'Prohibited.' } }]} />
    )
    const notes = container.querySelectorAll('.odyssey-group-table__detail-note')
    expect(notes).toHaveLength(1)          // exactly one, never duplicated per section
    expect(Number(notes[0].querySelector('td').getAttribute('colspan'))).toBe(ROUTING.length + 1) // + filler
    expect(sectionsOf(container)[0].contains(notes[0])).toBe(true)
  })

  it('falls back to the first section when no section claims the note', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} defaultExpanded
        detailSections={[{ key: 'a', columns: ROUTING }, { key: 'b', columns: COMMITMENT }]}
        groups={[{ ...GROUP[0], detailNote: { label: 'R', value: 'v' } }]} />
    )
    const note = container.querySelector('.odyssey-group-table__detail-note')
    expect(sectionsOf(container)[0].contains(note)).toBe(true)
  })

  it('keeps actions on the group row alone — a section has no action lane', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailSections={SECTIONS} groups={GROUP} defaultExpanded
                  stickyActions actionsHeader="Action" />
    )
    for (const band of sectionsOf(container)) {
      expect(band.querySelector(STICKY)).toBeNull()
    }
    expect(container.querySelector('.odyssey-group-table__group-row ' + STICKY)).toBeTruthy()
  })

  it('ignores a section with no columns rather than rendering an empty table', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} groups={GROUP} defaultExpanded
        detailSections={[{ key: 'a', columns: ROUTING }, { key: 'empty', columns: [] }]} />
    )
    expect(sectionsOf(container)).toHaveLength(1)
  })
})

describe('GroupTable detailNote — clamp + Show more toggle', () => {
  const DETAIL = [{ key: 'method', label: 'Method' }]
  const LONG = 'No rate is available for this carrier on this lane and equipment. '.repeat(6)
  const withNote = () => [{
    ...GROUPS[0],
    detailNote: { label: 'Reason Description', value: LONG },
  }]
  const body = (c) => c.querySelector('.odyssey-group-table__detail-note-body--clamped')
  const toggle = () => screen.queryByRole('button', { name: /Show (more|less)/ })

  // jsdom reports 0 for both scrollHeight and clientHeight, so overflow is
  // undetectable without stubbing them (see DetailNote's JSDOM CEILING note).
  const stubOverflow = (scroll, client) => {
    const sh = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight')
    const ch = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')
    Object.defineProperty(Element.prototype, 'scrollHeight', { configurable: true, get: () => scroll })
    Object.defineProperty(Element.prototype, 'clientHeight', { configurable: true, get: () => client })
    return () => {
      Object.defineProperty(Element.prototype, 'scrollHeight', sh)
      Object.defineProperty(Element.prototype, 'clientHeight', ch)
    }
  }

  it('clamps to noteLines and offers Show more when the text overflows', () => {
    const restore = stubOverflow(120, 60)
    try {
      const { container } = render(
        <GroupTable columns={COLUMNS} detailColumns={DETAIL} groups={withNote()} defaultExpanded />
      )
      expect(body(container).style.webkitLineClamp).toBe('3')
      expect(toggle().textContent).toBe('Show more')
      expect(toggle().getAttribute('aria-expanded')).toBe('false')
    } finally { restore() }
  })

  it('un-clamps on Show more and clamps again on Show less', () => {
    const restore = stubOverflow(120, 60)
    try {
      const { container } = render(
        <GroupTable columns={COLUMNS} detailColumns={DETAIL} groups={withNote()} defaultExpanded />
      )
      fireEvent.click(toggle())
      expect(body(container)).toBeNull()            // clamp class gone = full text
      expect(toggle().textContent).toBe('Show less')
      expect(toggle().getAttribute('aria-expanded')).toBe('true')
      fireEvent.click(toggle())
      expect(body(container)).toBeTruthy()
      expect(toggle().textContent).toBe('Show more')
    } finally { restore() }
  })

  it('offers NO toggle when the text fits — a one-liner promising more is a lie', () => {
    const restore = stubOverflow(60, 60)
    try {
      render(<GroupTable columns={COLUMNS} detailColumns={DETAIL} groups={withNote()} defaultExpanded />)
      expect(toggle()).toBeNull()
    } finally { restore() }
  })

  it('noteLines={0} disables the clamp outright', () => {
    const restore = stubOverflow(120, 60)
    try {
      const { container } = render(
        <GroupTable columns={COLUMNS} detailColumns={DETAIL} groups={withNote()}
                    noteLines={0} defaultExpanded />
      )
      expect(body(container)).toBeNull()
      expect(toggle()).toBeNull()
    } finally { restore() }
  })
})

describe('GroupTable nested tables — the trailing filler column', () => {
  const NARROW = [{ key: 'method', label: 'Method' }]
  const GROUP = [{ ...GROUPS[0], detailRows: [{ method: 'Automatic Update', user: 'x' }] }]

  it('appends exactly ONE filler per nested table, header and body alike', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} groups={GROUP} defaultExpanded
        detailSections={[{ key: 'a', columns: NARROW }, { key: 'b', columns: DETAIL_COLUMNS }]} />
    )
    for (const band of container.querySelectorAll('.odyssey-group-table__detail-section')) {
      // :scope matters — a bare `tbody tr` selector resolves through the OUTER
      // table's tbody and matches the nested THEAD row too.
      const t = band.querySelector('.odyssey-group-table__detail')
      expect(t.querySelectorAll(`:scope > thead > tr > ${FILLER}`)).toHaveLength(1)
      expect(t.querySelectorAll(`:scope > tbody > tr:first-child > ${FILLER}`)).toHaveLength(1)
      // last cell in the row, so the slack lands at the END
      const cells = [...t.querySelectorAll(':scope > tbody > tr:first-child > *')]
      expect(cells[cells.length - 1].classList.contains('odyssey-group-table__detail-filler')).toBe(true)
    }
  })

  it('hides the filler from assistive tech — it is spacing, not a column', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={NARROW} groups={GROUP} defaultExpanded />
    )
    for (const cell of container.querySelectorAll(FILLER)) {
      expect(cell.getAttribute('aria-hidden')).toBe('true')
      expect(cell.textContent).toBe('')
    }
  })

  it('pins an explicit column width with min-width so the filler cannot squeeze it', () => {
    // Measured in Chrome: without the min-width floor, a width:100% filler
    // collapses 360px columns to 125px.
    const { container } = render(
      <GroupTable columns={COLUMNS} groups={GROUP} defaultExpanded
        detailSections={[{ key: 'a', columns: [{ key: 'method', label: 'Method', width: 360 }] }]} />
    )
    const th = container.querySelector(`.odyssey-group-table__detail th:not(${FILLER})`)
    expect(th.style.width).toBe('360px')
    expect(th.style.minWidth).toBe('360px')
  })

  it('leaves unsized columns unpinned, so they collapse to their content', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={NARROW} groups={GROUP} defaultExpanded />
    )
    const th = container.querySelector(`.odyssey-group-table__detail th:not(${FILLER})`)
    expect(th.style.width).toBe('')
    expect(th.style.minWidth).toBe('')
  })
})

describe('GroupTable detailNotes — one note per sibling table', () => {
  const A = [{ key: 'method', label: 'Method' }]
  const B = [{ key: 'user', label: 'User' }]
  const SECTIONS = [{ key: 'a', columns: A }, { key: 'b', columns: B, note: true }]
  const ROW = { method: 'Automatic Update', user: 'Moses Johnson' }
  const notesIn = (c) => [...c.querySelectorAll('.odyssey-group-table__detail-section')]
    .map((band) => band.querySelector('.odyssey-group-table__detail-note')?.textContent ?? null)

  it('renders a note in EVERY sibling that has one', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailSections={SECTIONS} defaultExpanded
        groups={[{ ...GROUPS[0], detailRows: [ROW],
          detailNotes: { a: { label: 'Routing', value: 'first note' },
                         b: { label: 'Commitment', value: 'second note' } } }]} />
    )
    const notes = notesIn(container)
    expect(notes[0]).toContain('first note')
    expect(notes[1]).toContain('second note')
    expect(container.querySelectorAll('.odyssey-group-table__detail-note')).toHaveLength(2)
  })

  it('leaves siblings without an entry noteless', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailSections={SECTIONS} defaultExpanded
        groups={[{ ...GROUPS[0], detailRows: [ROW], detailNotes: { b: { label: 'B', value: 'only b' } } }]} />
    )
    expect(notesIn(container)[0]).toBeNull()
    expect(notesIn(container)[1]).toContain('only b')
  })

  it('keeps the single detailNote shorthand working, once, on its host', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailSections={SECTIONS} defaultExpanded
        groups={[{ ...GROUPS[0], detailRows: [ROW], detailNote: { label: 'R', value: 'shorthand' } }]} />
    )
    expect(container.querySelectorAll('.odyssey-group-table__detail-note')).toHaveLength(1)
    expect(notesIn(container)[1]).toContain('shorthand')
  })

  it('spans each note across its OWN section\'s columns, not the widest sibling\'s', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} defaultExpanded
        detailSections={[{ key: 'a', columns: DETAIL_COLUMNS }, { key: 'b', columns: B }]}
        groups={[{ ...GROUPS[0], detailRows: [ROW],
          detailNotes: { a: { label: 'A', value: 'wide' }, b: { label: 'B', value: 'narrow' } } }]} />
    )
    const spans = [...container.querySelectorAll('.odyssey-group-table__detail-note > td')]
      .map((td) => Number(td.getAttribute('colspan')))
    expect(spans).toEqual([DETAIL_COLUMNS.length + 1, B.length + 1]) // + filler each
  })
})

describe('GroupTable detailNote — the label/value separator', () => {
  const DETAIL = [{ key: 'method', label: 'Method' }]
  const withNote = (label) => [{ ...GROUPS[0], detailNote: { label, value: 'the value' } }]
  const labelOf = (c) => c.querySelector('.odyssey-group-table__detail-note-label').textContent
  const rowText = (c) => c.querySelector('.odyssey-group-table__detail-note > td').textContent

  it('appends a colon AND a space, so label and value never run together', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL} groups={withNote('Reason Description')} defaultExpanded />
    )
    expect(labelOf(container)).toBe('Reason Description:')
    expect(rowText(container)).toBe('Reason Description: the value')
  })

  it('does not double a colon the consumer already wrote', () => {
    for (const given of ['Reason Description:', 'Reason Description :', 'Reason Description:  ']) {
      cleanup()
      const { container } = render(
        <GroupTable columns={COLUMNS} detailColumns={DETAIL} groups={withNote(given)} defaultExpanded />
      )
      expect(labelOf(container)).toBe('Reason Description:')
    }
  })

  it('leaves a NODE label alone — the component cannot rewrite what it did not author', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL} defaultExpanded
        groups={withNote(<em>Custom</em>)} />
    )
    expect(container.querySelector('.odyssey-group-table__detail-note-label em').textContent).toBe('Custom')
  })
})

describe('GroupTable detailNote — fills the band without sizing it', () => {
  const DETAIL = [{ key: 'method', label: 'Method' }]
  const LONG = 'No rate is available for this carrier on this lane and equipment. '.repeat(4)

  it('wraps the note in the isolation box that zeroes its max-content width', () => {
    // The CSS on this element (width:0 / min-width:100%) is what stops one long
    // sentence defining the whole table's width under `width: max-content` —
    // measured at 1305px on a 573px table before it existed. jsdom sees no
    // layout, so the DOM contract is what gets asserted here; the widths are
    // browser-verified.
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL} detailScroll defaultExpanded
        groups={[{ ...GROUPS[0], detailNote: { label: 'Reason', value: LONG } }]} />
    )
    const body = container.querySelector('.odyssey-group-table__detail-note-body')
    expect(body).toBeTruthy()
    expect(body.closest('.odyssey-group-table__detail-note')).toBeTruthy()
    expect(body.textContent).toContain('No rate is available')
  })

  it('keeps the clamp and the toggle INSIDE that box, not beside it', () => {
    const sh = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight')
    const ch = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')
    Object.defineProperty(Element.prototype, 'scrollHeight', { configurable: true, get: () => 120 })
    Object.defineProperty(Element.prototype, 'clientHeight', { configurable: true, get: () => 60 })
    try {
      const { container } = render(
        <GroupTable columns={COLUMNS} detailColumns={DETAIL} detailScroll defaultExpanded
          groups={[{ ...GROUPS[0], detailNote: { label: 'Reason', value: LONG } }]} />
      )
      const body = container.querySelector('.odyssey-group-table__detail-note-body')
      expect(body.querySelector('.odyssey-group-table__detail-note-body--clamped')).toBeTruthy()
      expect(body.querySelector('.odyssey-group-table__detail-note-toggle')).toBeTruthy()
    } finally {
      Object.defineProperty(Element.prototype, 'scrollHeight', sh)
      Object.defineProperty(Element.prototype, 'clientHeight', ch)
    }
  })
})
