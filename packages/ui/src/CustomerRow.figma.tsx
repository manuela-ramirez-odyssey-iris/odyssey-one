import figma from '@figma/code-connect'
import CustomerRow from './CustomerRow'

// Master: Components-Molecules page, set `CustomerRow` at 2029:461.
// Two `Favorite` variants — same JSX with `favorite` prop driving the star fill.
figma.connect(
  CustomerRow,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2029-461',
  {
    variant: { Favorite: 'False' },
    imports: ["import { CustomerRow } from '@odyssey/ui'"],
    props: {
      label: figma.string('Label'),
      icon: figma.instance('Icon'),
    },
    example: ({ label, icon }) => (
      <CustomerRow label={label} icon={icon} favorite={false} />
    ),
  },
)

figma.connect(
  CustomerRow,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2029-461',
  {
    variant: { Favorite: 'True' },
    imports: ["import { CustomerRow } from '@odyssey/ui'"],
    props: {
      label: figma.string('Label'),
      icon: figma.instance('Icon'),
    },
    example: ({ label, icon }) => (
      <CustomerRow label={label} icon={icon} favorite={true} />
    ),
  },
)
