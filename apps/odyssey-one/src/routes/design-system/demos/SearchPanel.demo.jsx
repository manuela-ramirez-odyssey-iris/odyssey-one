import { useState } from 'react'
import { SearchPanel } from '@odyssey/ui'

export const meta = {
  name: 'SearchPanel',
  tier: 'organism',
  version: '0.2.0',
  figmaNode: '2462:149',
  codeConnect: 'packages/ui/src/SearchPanel.figma.tsx',
}

export const props = [
  { name: 'showHeader', type: 'boolean', desc: 'Render the header bar (back button + title + close X). Hidden by default (the Results state has no header).' },
  { name: 'showBack', type: 'boolean', desc: 'Show the ChevronLeft back button inside the header (requires showHeader). Default false.' },
  { name: 'title', type: 'string', desc: "Header title text. Default 'Filters'." },
  { name: 'onBack', type: '() => void', desc: 'Called when the back button is clicked.' },
  { name: 'onClose', type: '() => void', desc: 'Shows a close X button in the header; called on click.' },
  { name: 'children', type: 'ReactNode', desc: 'Content slot — filled by <SearchResults>, <SearchFilters>, etc. per search state.' },
  { name: 'showLink', type: 'boolean', desc: 'Show the leading-left link button in the footer (e.g. Save Filters). Default false.' },
  { name: 'linkLabel', type: 'string', desc: "Footer link button label. Default 'Save Filters'." },
  { name: 'linkIcon', type: 'ReactNode', desc: 'Leading icon for the footer link button. Default <CirclePlus>.' },
  { name: 'onLink', type: '() => void', desc: 'Called when the footer link button is clicked.' },
  { name: 'showSecondary', type: 'boolean', desc: 'Show the lead/left secondary button in the footer. Default true.' },
  { name: 'showTrailSecondary', type: 'boolean', desc: 'Show a second secondary button on the trail/right (for Filters·All "Clear all" next to "Show N"). Default false.' },
  { name: 'secondaryLabel', type: 'string', desc: "Secondary button label. Default 'Clear all'." },
  { name: 'onClear', type: '() => void', desc: 'Called when any secondary button is clicked.' },
  { name: 'count', type: 'number', desc: 'Result count used to build the default primary label ("Show N results").' },
  { name: 'primaryLabel', type: 'string', desc: 'Override the primary button label entirely (skips the count-based default).' },
  { name: 'onShowResults', type: '() => void', desc: 'Called when the primary button is clicked.' },
]

export const tokens = [
  { token: '--search-panel-width', resolves: '720px', usage: 'panel fixed width' },
  { token: '--shadow-2xl', resolves: 'shadow/2xl', usage: 'panel card elevation' },
  { token: '--bg-primary', resolves: 'white', usage: 'panel background' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'header and footer dividers' },
  { token: '--radius-lg', resolves: 'radius/lg', usage: 'panel corner radius' },
  { token: '--spacing-5', resolves: '20px', usage: 'header / footer horizontal padding' },
]

const PLACEHOLDER_CONTENT = (
  <div
    style={{
      padding: 'var(--spacing-5)',
      color: 'var(--text-tertiary)',
      fontSize: 'var(--font-size-sm)',
      fontFamily: 'var(--font-primary)',
      minHeight: 180,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px dashed var(--border-default)',
      borderRadius: 'var(--radius-md)',
      margin: 'var(--spacing-5)',
    }}
  >
    Content slot — fill with &lt;SearchResults&gt; or &lt;SearchFilters&gt;
  </div>
)

export default function SearchPanelDemo() {
  const [clearCount, setClearCount] = useState(0)
  const [showCount, setShowCount] = useState(0)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Modal-pattern shell for the GlobalSearch results / filters panel. Fixed 720px
        card with an optional header (back + title + close), a single{' '}
        <code>children</code> content slot, and a baked footer (link + secondary on
        lead; optional trail-secondary + primary on trail). Fill the content slot with{' '}
        <code>SearchResults</code> or <code>SearchFilters</code> per search state.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Results state — no header, secondary + primary footer</h4>
        <div style={{ maxWidth: 620 }}>
          <SearchPanel
            showHeader={false}
            showSecondary
            secondaryLabel="Clear all"
            count={12}
            onClear={() => setClearCount((n) => n + 1)}
            onShowResults={() => setShowCount((n) => n + 1)}
          >
            {PLACEHOLDER_CONTENT}
          </SearchPanel>
          {(clearCount > 0 || showCount > 0) && (
            <p style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
              Clear all: {clearCount}× · Show results: {showCount}×
            </p>
          )}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Filters state — header with back + close, save-link footer</h4>
        <div style={{ maxWidth: 620 }}>
          <SearchPanel
            showHeader
            showBack
            title="Filters"
            onBack={() => {}}
            onClose={() => {}}
            showLink
            linkLabel="Save Filters"
            onLink={() => {}}
            showSecondary={false}
            showTrailSecondary
            secondaryLabel="Clear all"
            count={4}
            onClear={() => {}}
            onShowResults={() => {}}
          >
            {PLACEHOLDER_CONTENT}
          </SearchPanel>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Header without back — title + close X only</h4>
        <div style={{ maxWidth: 620 }}>
          <SearchPanel
            showHeader
            showBack={false}
            title="Saved Searches"
            onClose={() => {}}
            showSecondary={false}
            count={0}
            primaryLabel="Done"
            onShowResults={() => {}}
          >
            {PLACEHOLDER_CONTENT}
          </SearchPanel>
        </div>
      </div>
    </div>
  )
}
