// GroupTable pure helpers — node env (no DOM), vitest globals.
import { alignClass, isGroupExpanded, isGroupExpandable, groupHeaderValue, totalColumnCount, actionToneClass, ACTION_TONES, splitHeaderRow, HEADER_VALUE_COLUMNS, normalizeDetailSections, noteSectionIndex, noteForSection, stripTrailingColon } from './GroupTable.jsx'

describe('alignClass', () => {
  it('maps right/center to the modifier classes', () => {
    expect(alignClass('right')).toBe('odyssey-group-table__cell--right')
    expect(alignClass('center')).toBe('odyssey-group-table__cell--center')
  })

  it('defaults to left (empty string) for undefined or "left"', () => {
    expect(alignClass(undefined)).toBe('')
    expect(alignClass('left')).toBe('')
  })
})

describe('isGroupExpanded', () => {
  it('falls back to defaultExpanded when the group has no override', () => {
    expect(isGroupExpanded({}, true, 'g1')).toBe(true)
    expect(isGroupExpanded({}, false, 'g1')).toBe(false)
  })

  it('a per-group override wins over the default', () => {
    expect(isGroupExpanded({ g1: false }, true, 'g1')).toBe(false)
    expect(isGroupExpanded({ g1: true }, false, 'g1')).toBe(true)
  })

  it('other groups are unaffected by an override', () => {
    expect(isGroupExpanded({ g1: false }, true, 'g2')).toBe(true)
  })
})

describe('isGroupExpandable', () => {
  it('explicit expandable: false always wins, even with rows present', () => {
    expect(isGroupExpandable({ expandable: false, rows: [{ a: 1 }] })).toBe(false)
  })

  it('rows flavor: expandable iff rows has at least one row', () => {
    expect(isGroupExpandable({ rows: [{ a: 1 }] })).toBe(true)
    expect(isGroupExpandable({ rows: [] })).toBe(false)
    expect(isGroupExpandable({})).toBe(false)
  })

  it('nested flavor (detailColumns/detailSections present): keys off detailRows', () => {
    expect(isGroupExpandable({ detailRows: [{ a: 1 }] }, { detailColumns: [{ key: 'a' }] })).toBe(true)
    expect(isGroupExpandable({ detailRows: [] }, { detailColumns: [{ key: 'a' }] })).toBe(false)
    expect(isGroupExpandable({}, { detailSections: [{ columns: [{ key: 'a' }] }] })).toBe(false)
    expect(isGroupExpandable({ detailRows: [{ a: 1 }] }, { detailSections: [{ columns: [{ key: 'a' }] }] })).toBe(true)
  })

  it('a note-only group is still expandable in either flavor', () => {
    expect(isGroupExpandable({ rows: [], detailNote: 'reason' })).toBe(true)
    expect(isGroupExpandable({ detailRows: [], detailNotes: { a: 'x' } }, { detailColumns: [{ key: 'a' }] })).toBe(true)
    expect(isGroupExpandable({ rows: [], detailNotes: {} })).toBe(false)
  })

  it('opts.flat always wins, even over rows/detailNote that would otherwise expand', () => {
    expect(isGroupExpandable({ rows: [{ a: 1 }] }, { flat: true })).toBe(false)
    expect(isGroupExpandable({ rows: [], detailNote: 'reason' }, { flat: true })).toBe(false)
    expect(isGroupExpandable({ detailRows: [{ a: 1 }] }, { detailColumns: [{ key: 'a' }], flat: true })).toBe(false)
  })
})

describe('groupHeaderValue', () => {
  it('returns the value from group.values when present', () => {
    const group = { id: 'g1', label: 'G1', rows: [], values: { ap: '$1,240.00', ar: '$1,350.00' } }
    expect(groupHeaderValue(group, 'ap')).toBe('$1,240.00')
    expect(groupHeaderValue(group, 'ar')).toBe('$1,350.00')
  })

  it('returns empty string for a key absent from group.values', () => {
    const group = { id: 'g1', label: 'G1', rows: [], values: { ap: '$1,240.00' } }
    expect(groupHeaderValue(group, 'diff')).toBe('')
  })

  it('returns empty string when group.values is not provided (label-only header style)', () => {
    const group = { id: 'g1', label: 'G1', rows: [] }
    expect(groupHeaderValue(group, 'ap')).toBe('')
  })

  it('returns empty string when group.values is explicitly undefined', () => {
    const group = { id: 'g1', label: 'G1', rows: [], values: undefined }
    expect(groupHeaderValue(group, 'ap')).toBe('')
  })

  it('passes through non-string values (nodes, numbers) unchanged', () => {
    const node = { type: 'span' }  // mock React node
    const group = { id: 'g1', label: 'G1', rows: [], values: { diff: node } }
    expect(groupHeaderValue(group, 'diff')).toBe(node)
  })
})

describe('totalColumnCount', () => {
  const cols = [{ key: 'a' }, { key: 'b' }, { key: 'c' }]

  it('is just the column count when there is no pinned action column', () => {
    expect(totalColumnCount(cols, false)).toBe(3)
  })

  it('counts the pinned action column — the nested table must span it too', () => {
    expect(totalColumnCount(cols, true)).toBe(4)
  })

  it('defaults to no columns and no action column', () => {
    expect(totalColumnCount()).toBe(0)
  })
})

describe('actionToneClass', () => {
  it('maps every shipped tone to its modifier class', () => {
    expect(ACTION_TONES).toEqual(['danger', 'warning', 'success', 'info'])
    for (const tone of ACTION_TONES) {
      expect(actionToneClass(tone)).toBe(`odyssey-group-table__cell--tone-${tone}`)
    }
  })

  it('returns no class when the group carries no tone', () => {
    expect(actionToneClass(undefined)).toBe('')
    expect(actionToneClass(null)).toBe('')
  })

  it('degrades an unknown tone to neutral rather than a class with no styles', () => {
    expect(actionToneClass('chartreuse')).toBe('')
    expect(actionToneClass('DANGER')).toBe('')
  })
})


// The Figma HeaderRow master merges the group label across every column except
// the trailing three — the header row deliberately does NOT follow the body's
// column grid (S112).
describe('splitHeaderRow', () => {
  const cols = (n) => new Array(n).fill(0).map((_, i) => ({ key: `c${i}` }))

  it('reserves the trailing three columns for values', () => {
    const { labelSpan, valueColumns } = splitHeaderRow(cols(7))
    expect(labelSpan).toBe(4)
    expect(valueColumns.map((c) => c.key)).toEqual(['c4', 'c5', 'c6'])
  })

  it('clamps to a real label cell when the table is narrower than the reserve', () => {
    expect(splitHeaderRow(cols(2)).labelSpan).toBe(1)
    expect(splitHeaderRow(cols(1)).labelSpan).toBe(1)
    expect(splitHeaderRow([]).labelSpan).toBe(1)
  })

  it('labelSpan + valueColumns always covers every column', () => {
    for (const n of [1, 2, 3, 4, 7, 12]) {
      const { labelSpan, valueColumns } = splitHeaderRow(cols(n))
      expect(labelSpan + valueColumns.length).toBe(Math.max(labelSpan, n))
    }
  })

  it('HEADER_VALUE_COLUMNS is the documented master value', () => {
    expect(HEADER_VALUE_COLUMNS).toBe(3)
  })
})

describe('normalizeDetailSections', () => {
  const A = [{ key: 'a', label: 'A' }]
  const B = [{ key: 'b', label: 'B' }]

  it('returns [] when neither prop is passed — the rows flavor', () => {
    expect(normalizeDetailSections({})).toEqual([])
    expect(normalizeDetailSections({ detailColumns: [] })).toEqual([])
    expect(normalizeDetailSections({ detailSections: [] })).toEqual([])
  })

  it('treats detailColumns as ONE section that hosts the note', () => {
    const [only] = normalizeDetailSections({ detailColumns: A })
    expect(only).toMatchObject({ key: 'default', columns: A, note: true, scroll: false })
  })

  it('carries detailScroll into the legacy single section, default off', () => {
    expect(normalizeDetailSections({ detailColumns: A, detailScroll: true })[0].scroll).toBe(true)
    expect(normalizeDetailSections({ detailColumns: A })[0].scroll).toBe(false)
  })

  it('gives sections the SAME detailScroll default as the single-table flavor', () => {
    // No divergent default: a consumer who knows detailScroll should not have to
    // learn a second rule to use siblings (user, 2026-08-26).
    expect(normalizeDetailSections({ detailSections: [{ columns: A }, { columns: B }] })
      .map((s) => s.scroll)).toEqual([false, false])
    expect(normalizeDetailSections({ detailSections: [{ columns: A }, { columns: B }], detailScroll: true })
      .map((s) => s.scroll)).toEqual([true, true])
  })

  it('lets ONE section opt out of a table-wide detailScroll', () => {
    const out = normalizeDetailSections({
      detailSections: [{ columns: A }, { columns: B, scroll: false }], detailScroll: true })
    expect(out.map((s) => s.scroll)).toEqual([true, false])
  })

  it('keys sections positionally when the consumer omits key', () => {
    expect(normalizeDetailSections({ detailSections: [{ columns: A }, { columns: B }] })
      .map((s) => s.key)).toEqual(['section-0', 'section-1'])
  })

  it('drops sections with no columns instead of rendering an empty table', () => {
    expect(normalizeDetailSections({ detailSections: [{ columns: A }, { columns: [] }, {}] }))
      .toHaveLength(1)
  })

  it('THROWS on both props — silently picking one would hide the mistake', () => {
    expect(() => normalizeDetailSections({ detailColumns: A, detailSections: [{ columns: B }] }))
      .toThrow(/not both/)
  })
})

describe('noteSectionIndex', () => {
  it('picks the section that claims the note', () => {
    expect(noteSectionIndex([{ key: 'a' }, { key: 'b', note: true }])).toBe(1)
  })

  it('falls back to the first — a note is never dropped for want of a claim', () => {
    expect(noteSectionIndex([{ key: 'a' }, { key: 'b' }])).toBe(0)
    expect(noteSectionIndex([])).toBe(0)
  })

  it('takes the FIRST claim when several claim it, so the note renders once', () => {
    expect(noteSectionIndex([{ note: true }, { note: true }])).toBe(0)
  })
})

describe('noteForSection', () => {
  const SECTIONS = [{ key: 'a' }, { key: 'b', note: true }]
  const at = (group, i) => noteForSection(group, SECTIONS[i], SECTIONS, i)

  it('gives each sibling its OWN note from the detailNotes map', () => {
    const g = { detailNotes: { a: 'note A', b: 'note B' } }
    expect(at(g, 0)).toBe('note A')
    expect(at(g, 1)).toBe('note B')
  })

  it('leaves a sibling with no entry noteless', () => {
    const g = { detailNotes: { b: 'only B' } }
    expect(at(g, 0)).toBeNull()
    expect(at(g, 1)).toBe('only B')
  })

  it('still honours the single detailNote shorthand on its host section', () => {
    const g = { detailNote: 'the one note' }
    expect(at(g, 0)).toBeNull()
    expect(at(g, 1)).toBe('the one note')   // b claims it via note: true
  })

  it('lets a map entry override the shorthand on that section only', () => {
    // Both shapes on one group: the shorthand still lands on its host, the map
    // wins where it speaks.
    const g = { detailNote: 'shorthand', detailNotes: { a: 'mine' } }
    expect(at(g, 0)).toBe('mine')
    expect(at(g, 1)).toBe('shorthand')
  })

  it('returns null when the group has no notes at all', () => {
    expect(at({}, 0)).toBeNull()
    expect(at({}, 1)).toBeNull()
  })
})

describe('stripTrailingColon', () => {
  it('drops a trailing colon and any space around it', () => {
    expect(stripTrailingColon('Reason Description:')).toBe('Reason Description')
    expect(stripTrailingColon('Reason Description :')).toBe('Reason Description')
    expect(stripTrailingColon('Reason Description:  ')).toBe('Reason Description')
  })

  it('leaves a clean label untouched, colons INSIDE it included', () => {
    expect(stripTrailingColon('Reason Description')).toBe('Reason Description')
    expect(stripTrailingColon('Note: extra')).toBe('Note: extra')
  })

  it('passes non-strings through — a node label is the consumer\'s markup', () => {
    const node = { type: 'em' }
    expect(stripTrailingColon(node)).toBe(node)
    expect(stripTrailingColon(undefined)).toBe(undefined)
  })
})
