import figma from '@figma/code-connect'
import SearchChip from './SearchChip'

// Type=Single — the canonical attribute:value criterion chip. The X remove
// is always present in the master; onRemove is consumer-wired.
figma.connect(
  SearchChip,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4871-7334',
  {
    variant: { Type: 'Single' },
    imports: ["import { SearchChip } from '@odyssey/ui'"],
    props: {
      label: figma.string('Label'),
    },
    example: ({ label }) => <SearchChip label={label} onRemove={() => {}} />,
  },
)

// Type=Set — a multi-code list as ONE expandable chip (GS-21). Summary/Codes
// text is derived from data in code (typeLabel + codes with validity flags),
// so the Figma TEXT props don't map to React props; State=Expanded is the
// component's internal open state. Show invalid = codes carrying valid:false.
figma.connect(
  SearchChip,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4871-7334',
  {
    variant: { Type: 'Set' },
    imports: ["import { SearchChip } from '@odyssey/ui'"],
    props: {},
    example: () => (
      <SearchChip
        typeLabel={null}
        codes={[{ value: 'C814956', valid: true }, { value: 'INVALID01', valid: false }]}
        onCommit={() => {}}
        onRemove={() => {}}
      />
    ),
  },
)
