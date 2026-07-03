import { useState } from 'react'
import { PillTab } from '@odyssey/ui'

export const meta = {
  name: 'PillTab',
  tier: 'atom',
  version: '0.2.0',
  figmaNode: '2787:330',
  codeConnect: 'packages/ui/src/PillTab.figma.tsx',
}

export const props = [
  { name: 'label', type: 'string', desc: 'Tab label text.' },
  { name: 'count', type: 'number', desc: 'Count rendered as a metric Badge. Only shown when showCount is true and count is not null/undefined.' },
  { name: 'selected', type: 'boolean', desc: 'Selected state. Drives active background + text. Default false.' },
  { name: 'showCount', type: 'boolean', desc: 'Controls Badge visibility. Default true.' },
  { name: 'onClick', type: '() => void', desc: 'Click handler.' },
  { name: 'className', type: 'string', desc: 'Extra class names.' },
]

export const tokens = [
  { token: '--tab-active-bg', resolves: 'DSN/900', usage: 'selected pill background' },
  { token: '--tab-active-text', resolves: 'white', usage: 'selected label color' },
  { token: '--tab-inactive-text', resolves: 'DSN/500', usage: 'unselected label color' },
  { token: '--tab-hover-bg', resolves: 'DSN/100', usage: 'unselected hover surface' },
  { token: '--radius-full', resolves: '9999px', usage: 'pill shape' },
  { token: '--badge-gray-bg', resolves: 'DSN/100', usage: 'metric Badge background (from Badge component)' },
]

const TABS_WITH_COUNTS = [
  { label: 'All', count: 142 },
  { label: 'Saved', count: 8 },
  { label: 'Recent', count: 24 },
]

const TABS_SIMPLE = ['Overview', 'Activity', 'Documents']

export default function PillTabDemo() {
  const [selectedWithCount, setSelectedWithCount] = useState(0)
  const [selectedSimple, setSelectedSimple] = useState(0)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Pill-shaped tab with optional metric <code>Badge</code> count. Used for
        the All / Saved filter tabs in GlobalSearchPanel. Hover is CSS-only; only{' '}
        <code>selected</code> is a prop.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive tab group — with counts</h4>
        <div className="ds-demo-row">
          {TABS_WITH_COUNTS.map((tab, i) => (
            <PillTab
              key={tab.label}
              label={tab.label}
              count={tab.count}
              selected={selectedWithCount === i}
              showCount
              onClick={() => setSelectedWithCount(i)}
            />
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive tab group — without counts</h4>
        <div className="ds-demo-row">
          {TABS_SIMPLE.map((label, i) => (
            <PillTab
              key={label}
              label={label}
              selected={selectedSimple === i}
              showCount={false}
              onClick={() => setSelectedSimple(i)}
            />
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">showCount variations</h4>
        <div className="ds-demo-row">
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <PillTab label="With count" count={37} selected showCount />
            <span className="ds-demo-label">selected + count</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <PillTab label="No count" count={37} selected showCount={false} />
            <span className="ds-demo-label">selected, showCount=false</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <PillTab label="With count" count={5} showCount />
            <span className="ds-demo-label">unselected + count</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <PillTab label="No count" showCount />
            <span className="ds-demo-label">count=undefined (hidden)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
