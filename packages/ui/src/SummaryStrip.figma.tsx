import figma from '@figma/code-connect'
import SummaryStrip from './SummaryStrip'

// Master: `Overview` 4178:8365 (Components-Molecules › Sections). STAGING
// (S79e) — NOT PUBLISHED yet: the master is still a plain FRAME (no component
// properties/variants), so there is nothing to map dynamically. Componentize
// (cell sub-component + repeatable instances, Label/Value TEXT props; a
// possible value Tone axis is a code extension today) — flagged for Efrain —
// then wire real prop mappings and publish.
figma.connect(
  SummaryStrip,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4178-8365',
  {
    imports: ["import { SummaryStrip } from '@odyssey/ui'"],
    props: {},
    example: () => (
      <SummaryStrip
        aria-label="Shipment KPIs"
        items={[
          { label: 'Distance', value: '364.14 mi' },
          { label: 'Gross Weight', value: '54,907 LB' },
          { label: 'Volume', value: '226 cuft' },
          { label: 'Accepted Carrier', value: 'SEFL - LTL' },
          { label: 'Seed Equipment', value: 'LTH' },
          { label: 'Utilization', value: '96%' },
        ]}
      />
    ),
  },
)
