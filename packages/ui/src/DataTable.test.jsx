import { getColWidths } from './DataTable.jsx'

describe('getColWidths', () => {
  it('takes the per-column max of header vs first-row width and rounds up', () => {
    // container small enough that no slack is distributed
    expect(getColWidths([40, 100, 30], [48, 90, 35.2], 0, [false, true, false]))
      .toEqual([48, 100, 36])
  })

  it('distributes leftover container width evenly to flex columns only', () => {
    // widths = [50, 100, 50] = 200 total; container 260 → 60 slack;
    // flex = columns 1 and 2 → +30 each; column 0 (fixed) untouched
    expect(getColWidths([50, 100, 50], [0, 0, 0], 260, [false, true, true]))
      .toEqual([50, 130, 80])
  })

  it('floors the per-column slack (no fractional pixels)', () => {
    // 200 total, container 255 → 55 slack across 2 flex cols → floor(27.5)=27 each
    expect(getColWidths([50, 100, 50], [0, 0, 0], 255, [false, true, true]))
      .toEqual([50, 127, 77])
  })

  it('distributes nothing when there are no flex columns (avoids /0)', () => {
    expect(getColWidths([50, 100, 50], [0, 0, 0], 999, [false, false, false]))
      .toEqual([50, 100, 50])
  })

  it('distributes nothing when content already exceeds the container', () => {
    expect(getColWidths([200, 200], [0, 0], 100, [true, true]))
      .toEqual([200, 200])
  })
})
