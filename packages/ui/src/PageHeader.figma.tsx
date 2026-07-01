import figma from '@figma/code-connect'
import PageHeader from './PageHeader'
import ButtonToggle from './ButtonToggle'
import Button from './Button'
import { SlidersHorizontal, Route, ArrowRight, Plus } from 'lucide-react'

// PageHeader is a variant set (3965:5034). `Type` = Default | Last update (mutually exclusive):
//  - Default → actions cluster; Show toggle / Show link / Show button BOOLEANs map to children
//    presence (passing or omitting an action IS the toggle).
//  - Last update → the `Last update` TEXT → `supportingText` (the actions never render).
// The example always passes both; the component's mutual-exclusion logic renders one (no ternary
// — ternaries trip the Code Connect parser).
figma.connect(
  PageHeader,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3965-5034',
  {
    imports: [
      "import { PageHeader, ButtonToggle, Button } from '@odyssey/ui'",
      "import { SlidersHorizontal, Route, ArrowRight, Plus } from 'lucide-react'",
    ],
    props: {
      title: figma.string('Title'),
      supportingText: figma.enum('Type', {
        'Last update': figma.string('Last update'),
        Default: undefined,
      }),
      toggle: figma.boolean('Show toggle', {
        true: (
          <ButtonToggle
            firstIcon={<SlidersHorizontal size={20} />}
            secondIcon={<Route size={20} />}
            selected="first"
            firstAriaLabel="First view"
            secondAriaLabel="Second view"
          />
        ),
        false: undefined,
      }),
      link: figma.boolean('Show link', {
        true: (
          <Button variant="link" iconRight={<ArrowRight size={16} />}>
            Go to Tracking
          </Button>
        ),
        false: undefined,
      }),
      button: figma.boolean('Show button', {
        true: <Button icon={<Plus size={16} />}>Button</Button>,
        false: undefined,
      }),
    },
    example: ({ title, supportingText, toggle, link, button }) => (
      <PageHeader title={title} supportingText={supportingText}>
        {toggle}
        {link}
        {button}
      </PageHeader>
    ),
  },
)
