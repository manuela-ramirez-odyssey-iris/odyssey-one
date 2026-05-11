import figma from '@figma/code-connect'
import Widget from './Widget'

// Master: Components-Organisms page, node 1825:7 (Widget component set).
// Variants: 1x / 2x / 3x / 3xChart.
// Content (`value`, `label`, `rows`, `chartSegments`, `percentage`) is consumer-
// driven and not exposed as Figma properties — content lives inside the slot.
figma.connect(
  Widget,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1825-7',
  {
    imports: ["import { Widget } from '@odyssey/ui'"],
    props: {
      variant: figma.enum('Variant', {
        '1x': '1x',
        '2x': '2x',
        '3x': '3x',
        '3xChart': '3xChart',
      }),
      title: figma.textContent('Title'),
      domainIcon: figma.instance('Domain icon'),
      showGrip: figma.boolean('Show grip'),
      goToLabel: figma.textContent('Go to label'),
    },
    example: ({ variant, title, domainIcon, showGrip, goToLabel }) => (
      <Widget
        variant={variant}
        title={title}
        domainIcon={domainIcon}
        showGrip={showGrip}
        goToLabel={goToLabel}
      />
    ),
  },
)
