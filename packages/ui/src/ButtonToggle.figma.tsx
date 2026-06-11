import figma from '@figma/code-connect'
import ButtonToggle from './ButtonToggle'

figma.connect(
  ButtonToggle,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2978-330',
  {
    imports: ["import { ButtonToggle } from '@odyssey/ui'"],
    props: {
      selected: figma.enum('Selected', {
        First: 'first',
        Second: 'second',
      }),
      // In Figma the selected segment's icon is set via the exposed nested
      // Button (Icon/sm) picker; the unselected segment uses these swap props.
      // In code both are plain props.
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
  },
)
