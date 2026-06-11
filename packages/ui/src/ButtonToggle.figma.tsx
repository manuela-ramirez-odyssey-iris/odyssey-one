import figma from '@figma/code-connect'
import ButtonToggle from './ButtonToggle'

const FIGMA_URL =
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2978-330'

// Content=Icon — icon slots. In Figma the selected segment's icon is set via
// the exposed nested Button (Icon/sm) picker; the unselected segment uses
// these swap props. In code both are plain props.
figma.connect(ButtonToggle, FIGMA_URL, {
  variant: { Content: 'Icon' },
  imports: ["import { ButtonToggle } from '@odyssey/ui'"],
  props: {
    selected: figma.enum('Selected', {
      First: 'first',
      Second: 'second',
    }),
    firstIcon: figma.instance('First icon'),
    secondIcon: figma.instance('Second icon'),
  },
  example: ({ selected, firstIcon, secondIcon }) => (
    <ButtonToggle
      selected={selected}
      firstIcon={firstIcon}
      secondIcon={secondIcon}
      firstAriaLabel="First view"
      secondAriaLabel="Second view"
    />
  ),
})

// Content=Text — label strings. Same nested-instance constraint as icons:
// the TEXT props reach the unselected label; the selected label is set via
// the exposed Button (Secondary/sm) picker. In code both are plain props.
figma.connect(ButtonToggle, FIGMA_URL, {
  variant: { Content: 'Text' },
  imports: ["import { ButtonToggle } from '@odyssey/ui'"],
  props: {
    selected: figma.enum('Selected', {
      First: 'first',
      Second: 'second',
    }),
    firstLabel: figma.string('First label'),
    secondLabel: figma.string('Second label'),
  },
  example: ({ selected, firstLabel, secondLabel }) => (
    <ButtonToggle
      selected={selected}
      firstLabel={firstLabel}
      secondLabel={secondLabel}
    />
  ),
})
