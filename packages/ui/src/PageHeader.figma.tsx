import figma from '@figma/code-connect'
import PageHeader from './PageHeader'
import ButtonToggle from './ButtonToggle'
import Button from './Button'
import { SlidersHorizontal, Route, ArrowRight, Plus } from 'lucide-react'

// The Figma master's Show toggle / Show link / Show button BOOLEANs map to
// children presence in code — passing or omitting an action IS the toggle.
figma.connect(
  PageHeader,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1693-49',
  {
    imports: [
      "import { PageHeader, ButtonToggle, Button } from '@odyssey/ui'",
      "import { SlidersHorizontal, Route, ArrowRight, Plus } from 'lucide-react'",
    ],
    props: {
      title: figma.textContent('Title'),
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
    example: ({ title, toggle, link, button }) => (
      <PageHeader title={title}>
        {toggle}
        {link}
        {button}
      </PageHeader>
    ),
  },
)
