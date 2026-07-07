import figma from '@figma/code-connect'
import SummaryStrip from './SummaryStrip'

// Master: `SummaryStrip` SET 4254:904 (Components-Molecules › Sections).
// Re-modeled 2026-07-06 after the original componentization: the lone
// component (Label 1–6 / Value 1–6 TEXT props) became a variant set with a
// single `Cells = 4 | 5 | 6 | 7 | 8` axis and BAKED per-variant label/value
// text — there are no TEXT props anymore, so the old per-cell string mapping
// died with the redesign (publish validation failed 2026-07-07; repaired to a
// static data-driven example). In code the cell count is just `items.length`,
// and `tone` remains a code-only extension (no Figma axis).
figma.connect(
  SummaryStrip,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4254-904',
  {
    imports: ["import { SummaryStrip } from '@odyssey/ui'"],
    example: () => (
      <SummaryStrip
        aria-label="Shipment KPIs"
        items={[
          { label: 'Distance', value: '364.14 mi' },
          { label: 'Gross Weight', value: '54,907 LB' },
          { label: 'Volume', value: '226 cuft' },
          { label: 'Accepted Carrier', value: 'SEFL - LTL' },
        ]}
      />
    ),
  },
)
